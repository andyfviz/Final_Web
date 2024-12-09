import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'
import {GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let scene, camera, renderer
let mesh, texture
let mouse = { x: 0, y: 0 }
const worldWidth = 256, worldDepth = 256
let Alebrije
let isDragging =false
let previousMousePosition = {x:0, y:0}
const raycaster = new THREE.Raycaster()
let selectedPart = null


/**MENU */
// Función que alterna la visibilidad del menú
function toggleMenu() {
    const menu = document.getElementById("menu")
    menu.classList.toggle("hidden")
}
document.querySelector('.icono-menu').addEventListener('click', toggleMenu)

//MOVIMIENTO MOUSE
window.addEventListener('mousedown', (event) => {
    isDragging = true
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}); 
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (isDragging && Alebrije) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x
        }
        Alebrije.rotation.y += deltaMove.x * 0.01

        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        }
    }
})

window.addEventListener('mouseup', () => {
    isDragging = false
})

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
}
init()
animate()

function init() {
    // Crear escena
    scene = new THREE.Scene()

    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008)// Niebla suave

    // Crear cámara
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.set(1000, 800, -800)
    camera.lookAt(0, 300, 0)

    // Crear renderizador
    const canvas = document.querySelector('.webgl');

    // Usa el canvas existente para inicializar el renderizador
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Generar altura y geometría del terreno
    const data = generateHeight(worldWidth, worldDepth)
    const geometry = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1)
    geometry.rotateX(-Math.PI / 2)

    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
        vertices[j + 1] = data[i] * 10
    }

    // Generar textura del terreno
    texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    // Crear malla y añadirla a la escena
    mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture }))
    mesh.position.y -=450
    scene.add(mesh)

    // Luz ambiental y direccional
    const ambientLight = new THREE.AmbientLight(0x1F818C, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xB7B5AD, 1)
    directionalLight.position.set(100, 500, -100).normalize()
    scene.add(directionalLight)

    // Ajustar tamaño al cambiar el tamaño de la ventana
    window.addEventListener('resize', onWindowResize)
    
}

function generateHeight(width, height) {
    const size = width * height, data = new Uint8Array(size)
    const perlin = new ImprovedNoise(), z = Math.random() * 2
    let quality = 1

    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < size; i++) {
            const x = i % width, y = ~~(i / width)
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75)
        }
        quality *= 5
    }
    return data
}

function generateTexture(data, width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.fillStyle = '#F6B79C'
    context.fillRect(0, 0, width, height)

    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const imageData = image.data

    const vector3 = new THREE.Vector3(0, 0, 0)
    const sun = new THREE.Vector3(1, 1, 1).normalize()

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
        vector3.x = data[j - 2] - data[j + 2];
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2];
        vector3.normalize();

        const shade = vector3.dot(sun)
        imageData[i] = (96 + shade * 128) * (0.5 + data[j] * 0.007)
        imageData[i + 1] = (32 + shade * 96) * (0.5 + data[j] * 0.007)
        imageData[i + 2] = (shade * 96) * (0.5 + data[j] * 0.007)
    }

    context.putImageData(image, 0, 0);
    return canvas;
}

/**
 * Shader
 */


// Color shader material
function createPatternShaderMaterial(originalMaterial, patternType = 'none') {
    return new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: originalMaterial.color || new THREE.Color(1,1,1) },
            patternColor: { value: new THREE.Color(0,0,0) },
            time: { value: 0.0 },
            scale: { value: 5.0 },
            patternType: { value: getPatternTypeValue(patternType) }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform float time;
            
            void main() {
                vUv = uv;
                vec3 transformed = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 patternColor;
            uniform float time;
            uniform float scale;
            uniform int patternType;
            
            varying vec2 vUv;

            // Noise functions
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) +
                        (c - a)* u.y * (1.0 - u.x) +
                        (d - b) * u.x * u.y;
            }

            // Pattern generation functions
            float stripes(vec2 st, float width) {
                return step(width, mod(st.x * scale, 1.0));
            }

            float checkers(vec2 st) {
                return step(0.5, mod(floor(st.x * scale) + floor(st.y * scale), 2.0));
            }

            float dots(vec2 st) {
                vec2 pos = st * scale;
                float dist = length(fract(pos) - 0.5);
                return 1.0 - smoothstep(0.2, 0.3, dist);
            }

            float waves(vec2 st) {
                return sin(st.x * scale + time) * 0.5 + 0.5;
            }

            void main() {
                vec3 finalColor = baseColor;
                float pattern = 0.0;

                // Pattern selection
                if (patternType == 1) {
                    // Stripes
                    pattern = stripes(vUv, 0.5);
                } else if (patternType == 2) {
                    // Checkers
                    pattern = checkers(vUv);
                } else if (patternType == 3) {
                    // Dots
                    pattern = dots(vUv);
                } else if (patternType == 4) {
                    // Waves
                    pattern = waves(vUv);
                } else if (patternType == 5) {
                    // Noise
                    pattern = noise(vUv * scale);
                }

                // Mix base color with pattern color
                finalColor = mix(baseColor, patternColor, pattern);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        transparent: true
    });
}
function getPatternTypeValue(patternType) {
    const patternTypes = {
        'none': 0,
        'stripes': 1,
        'checkers': 2,
        'dots': 3,
        'waves': 4,
        'noise': 5
    };
    return patternTypes[patternType] || 0;
}
/**
 * MODELS
 */
function cargarAlebrije() {
    return new Promise((resolve, reject) => {
        Alebrije = new THREE.Group()
        const gltfLoader = new GLTFLoader()
        
        const partPositions = {
            Head: { 
                position: new THREE.Vector3(0, 320, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            Body: { 
                position: new THREE.Vector3(0, 300, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            Tails: { 
                position: new THREE.Vector3(0, 300, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            FrontLegs: { 
                position: new THREE.Vector3(-25, 300, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            BackLegs: { 
                position: new THREE.Vector3(300, 290, 0),
                rotation: new THREE.Euler(0, 0, 0) 
            },
            Ears: { 
                position: new THREE.Vector3(-25, 320, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            Feet: { 
                position: new THREE.Vector3(-25, 300, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            },
            Back: { 
                position: new THREE.Vector3(-30, 300, 0),
                rotation: new THREE.Euler(0, Math.PI, 0) 
            }
        };

        const partes = {
            Head: ["Heads/HEAD_Bird.gltf","Heads/HEAD_Dog.gltf","Heads/HEAD_Frog.gltf","Heads/HEAD_Rabbit.gltf"],
            Tails: ["Tails/TAIL_Bola.gltf","Tails/TAIL_Dog.gltf","Tails/TAIL_Fish.gltf","Tails/TAIL_Lizzard.gltf"],
            Feet: ["Feet/Patas1.gltf","Feet/Patas2.gltf"],
            FrontLegs: ["F_Legs/F_LegsBird.gltf","F_Legs/F_LegsDog.gltf","F_Legs/F_LegsFrog.gltf"],
            BackLegs: ["B_Legs/B_LegsDog.gltf","B_Legs/B_LegsFrog.gltf","B_Legs/B_LegsRabbot.gltf"],
            Ears: ["Ears/EARS_Dog.gltf","Ears/EARS_Rabbit.gltf","Ears/Horns.gltf"],
            Body: ["Body/BODY_dog.gltf","Body/BODY_Fish.gltf","Body/BODY_Frog.gltf","Body/BODY_Rabbit.gltf"],
            Back: ["Back/Butterfly.gltf","Back/Fish.gltf","Back/WINGS01.gltf"]
        };

        const loadPromises = Object.entries(partes).map(([categoria, modelos]) => {
            const modeloAleatorio = modelos[Math.floor(Math.random() * modelos.length)]
            
            return new Promise((partResolve, partReject) => {
                gltfLoader.load(
                    `./Models/${modeloAleatorio}`,
                    (gltf) => {
                        const parte = gltf.scene
                        
                        const partConfig = partPositions[categoria]
                        
                        // shader material
                        parte.traverse((child) => {
                            if (child.isMesh) {
                                const originalMaterial = child.material;
                                const shaderMaterial = createPatternShaderMaterial(originalMaterial, 'none');
                                child.material = shaderMaterial;
                                child.userData.originalMaterial = originalMaterial;
                                child.userData.shaderMaterial = shaderMaterial;
                            }
                        })
                        parte.scale.set(150, 150, 150)
                        if (partConfig.position) {
                            parte.position.copy(partConfig.position)
                        }
                        if (partConfig.rotation) {
                            parte.rotation.copy(partConfig.rotation)
                        }

                        // Debug logging
                        console.log(`Loaded ${categoria} model:`, {
                            modelName: modeloAleatorio,
                            position: parte.position,
                            scale: parte.scale,
                            boundingBox: new THREE.Box3().setFromObject(parte)
                        });

                        parte.userData.categoria = categoria

                        Alebrije.add(parte)
                        partResolve(parte)
                    },
                    // Progress callback
                    (xhr) => {
                        console.log(`${categoria} model ${modeloAleatorio} ${(xhr.loaded / xhr.total * 100)}% loaded`);
                    },
                    (error) => {
                        console.error(`Error loading model ${modeloAleatorio} from ${categoria}:`, error);
                        partReject(error);
                    }
                )
            })
        })

        Promise.all(loadPromises)
            .then(() => {
                scene.add(Alebrije)
                setupPartSelection()
                resolve(Alebrije)
            })
            .catch((error) => {
                console.error('Error loading Alebrije parts:', error)
                reject(error)
            })
    })
}
function adjustCameraForModels() {
    camera.position.set(1000, 800, -800)
    camera.lookAt(0, 300, 0)
}


// Update UI for part selection
function updatePartSelectionUI(part) {
    const partInfoElement = document.getElementById('part-info')
    partInfoElement.textContent = `Selected: ${part.userData.categoria}`

    // Color 
    const baseColorPicker = document.getElementById('base-color-picker')
    const patternColorPicker = document.getElementById('pattern-color-picker')
    const patternSelect = document.getElementById('pattern-select')

    // Remove previous event listeners
    const oldBaseColorPicker = baseColorPicker.cloneNode(true)
    baseColorPicker.parentNode.replaceChild(oldBaseColorPicker, baseColorPicker)

    const oldPatternColorPicker = patternColorPicker.cloneNode(true);
    patternColorPicker.parentNode.replaceChild(oldPatternColorPicker, patternColorPicker)

    const oldPatternSelect = patternSelect.cloneNode(true)
    patternSelect.parentNode.replaceChild(oldPatternSelect, patternSelect)

    // Base color change
    oldBaseColorPicker.addEventListener('input', (event) => {
        const baseColor = new THREE.Color(event.target.value);
        
        part.traverse((child) => {
            if (child.isMesh && child.material.uniforms) {
                child.material.uniforms.baseColor.value = baseColor
            }
        })
    })
// Pattern color 
oldPatternColorPicker.addEventListener('input', (event) => {
    const patternColor = new THREE.Color(event.target.value)
    
    part.traverse((child) => {
        if (child.isMesh && child.material.uniforms) {
            child.material.uniforms.patternColor.value = patternColor
        }
    })
})
// Pattern type 
oldPatternSelect.addEventListener('change', (event) => {
    const patternType = event.target.value
    
    part.traverse((child) => {
        if (child.isMesh) {
            // Recreate shader material with new pattern
            const shaderMaterial = createPatternShaderMaterial(
                child.userData.originalMaterial, 
                patternType
            )
            child.material = shaderMaterial
        }
    })
})
}
function setupPartSelection() {
    window.addEventListener('click', (event) => {
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Alebrije.children, true)

        if (intersects.length > 0) {
            let selectedPart = intersects[0].object
            while (selectedPart.parent !== Alebrije) {
                selectedPart = selectedPart.parent
            }
            //No reset
             window.currentlySelectedPart = selectedPart

            //new part
            window.currentlySelectedPart = selectedPart
            //pattern shader
            selectedPart.traverse((child) => {
                if (child.isMesh) {
                    const shaderMaterial = createPatternShaderMaterial(child.material)
                    child.userData.originalMaterial = child.material
                    child.material = shaderMaterial
                }
            })
            updatePartSelectionUI(selectedPart)
        }
    })
}

init()
adjustCameraForModels()
cargarAlebrije()


/**
 * SS of Input
 */
document.querySelector('.name-confirm').addEventListener('click', () => {
    renderer.render(scene, camera)
    const screenshotDataURL = renderer.domElement.toDataURL('image/png')
    const fileName = document.querySelector('.name-input').value || 'screenshot'

    // Download
    const downloadLink = document.createElement('a')
    downloadLink.href = screenshotDataURL
    downloadLink.download = `${fileName}.png`
    downloadLink.click()
});


/**
 * ANIMACION/MOVIMIENTO DE CAMARA
 */
function animate() {
    const targetX = mouse.x * 100
    const targetY = camera.position.y
    camera.position.x += (targetX - camera.position.x) * 0.05 
    camera.position.y = targetY
    camera.lookAt(new THREE.Vector3(0, 300, 0))
    requestAnimationFrame(animate)
    //animated patterns
    scene.traverse((child) => {
        if (child.isMesh && child.material.uniforms && child.material.uniforms.time) {
            child.material.uniforms.time.value = performance.now() * 0.001
        }
    })
    renderer.render(scene, camera)
}
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
    // Check if the mouse is over the Alebrije
    isDragging = true;
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

        // Rotate around Y-axis based on horizontal mouse movement
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
    geometry.rotateX(-Math.PI / 2); // Coloca el plano horizontalmente

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
function createColorShaderMaterial(originalMaterial) {
    return new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: originalMaterial.color || new THREE.Color(1,1,1) },
            mixColor: { value: new THREE.Color(1, 1, 1) },
            mixAmount: { value: 0.0 },
            map: { value: originalMaterial.map || null }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 mixColor;
            uniform float mixAmount;
            uniform sampler2D map;
            varying vec2 vUv;

            void main() {
                vec3 texColor = texture2D(map, vUv).rgb;
                vec3 finalColor = mix(baseColor * texColor, mixColor, mixAmount);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        transparent: true,
        opacity: 1.0
    });
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
                        
                        // Apply shader material to each mesh in the part
                        parte.traverse((child) => {
                            if (child.isMesh) {
                                const originalMaterial = child.material;
                                const shaderMaterial = createColorShaderMaterial(originalMaterial);
                                child.material = shaderMaterial;
                                child.userData.originalMaterial = originalMaterial;
                                child.userData.shaderMaterial = shaderMaterial;
                            }
                        })

                        // Adjust scale more carefully
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
    camera.position.set(1000, 800, -800);
    camera.lookAt(0, 300, 0);
}

// Setup part selection
function setupPartSelection() {
    window.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(Alebrije.children, true);

        if (intersects.length > 0) {
            // Find the top-level parent (Alebrije part)
            let selectedPart = intersects[0].object;
            while (selectedPart.parent !== Alebrije) {
                selectedPart = selectedPart.parent;
            }

            // Deselect previous part if exists
            if (window.currentlySelectedPart) {
                window.currentlySelectedPart.traverse((child) => {
                    if (child.isMesh && child.userData.originalMaterial) {
                        child.material = child.userData.originalMaterial;
                    }
                });
            }

            // Select new part
            window.currentlySelectedPart = selectedPart;
            
            // Apply shader to selected part
            selectedPart.traverse((child) => {
                if (child.isMesh) {
                    // Create a new shader material based on the original material
                    const shaderMaterial = createColorShaderMaterial(child.material);
                    child.userData.originalMaterial = child.material;
                    child.material = shaderMaterial;
                }
            });

            // Update UI to show selected part details
            updatePartSelectionUI(selectedPart);
        }
    });
}

// Update UI for part selection
function updatePartSelectionUI(part) {
    const partInfoElement = document.getElementById('part-info');
    partInfoElement.textContent = `Selected: ${part.userData.categoria}`;

    // Color picker setup
    const colorPicker = document.getElementById('color-picker');
    
    // Remove previous event listeners to prevent multiple bindings
    const oldColorPicker = colorPicker.cloneNode(true);
    colorPicker.parentNode.replaceChild(oldColorPicker, colorPicker);

    oldColorPicker.addEventListener('input', (event) => {
        const color = new THREE.Color(event.target.value);
        
        // Apply color only to the currently selected part
        part.traverse((child) => {
            if (child.isMesh && child.material.uniforms) {
                child.material.uniforms.mixColor.value = color;
                child.material.uniforms.mixAmount.value = 0.5; // 50% mix
            }
        });
    });
}



init()
adjustCameraForModels()
cargarAlebrije()


/**
 * SS of Input
 */
document.querySelector('.name-confirm').addEventListener('click', () => {
    renderer.render(scene, camera);
    const screenshotDataURL = renderer.domElement.toDataURL('image/png');
    const fileName = document.querySelector('.name-input').value || 'screenshot';

    // Download
    const downloadLink = document.createElement('a');
    downloadLink.href = screenshotDataURL;
    downloadLink.download = `${fileName}.png`;
    downloadLink.click();
});


/**
 * ANIMACION/MOVIMIENTO DE CAMARA
 */
function animate() {
    const targetX = mouse.x * 100
    const targetY = camera.position.y;
    camera.position.x += (targetX - camera.position.x) * 0.05 
    camera.position.y = targetY;
    camera.lookAt(new THREE.Vector3(0, 300, 0));
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}
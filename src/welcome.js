import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'


let scene, camera, renderer
let mesh, texture
let mouse = { x: 0, y: 0 }
const worldWidth = 256, worldDepth = 256
let Alebrije
let isDragging =false
let previousMousePosition = {x:0, y:0}



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
    const canvas = document.querySelector('.webgl_2');

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

function animate() {
    const targetX = mouse.x * 100
    const targetY = camera.position.y;
    const targetZ = Math.min(Math.max(mouse.y * 10, 500), 1500);
    camera.position.x += (targetX - camera.position.x) * 0.05 
    camera.position.y = targetY;
    // Mantén la cámara mirando hacia el centro de la escena
    camera.lookAt(new THREE.Vector3(0, 300, 0));
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}
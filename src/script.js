import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js'
import { Sky } from 'three/addons/objects/Sky.js'

function toggleMenu() {
    const menu = document.getElementById("menu");
    menu.classList.toggle("hidden");
}

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * TEXTURES
 */
const textureLoader = new THREE.TextureLoader ()

//FLOOR
const floor = new THREE.Mesh (
    new THREE.PlaneGeometry (20,20,100,100),
)
floor.rotation.x = -Math.PI * 0.5
scene.add (floor)

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#86cdff', 0.275)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#86cdff', 1)
directionalLight.position.set(3, 2, -8)
scene.add(directionalLight)

//GHOST

const ghost1 = new THREE.PointLight ('#8800ff', 6)
const ghost2 = new THREE.PointLight ('#ff0088', 6)
const ghost3 = new THREE.PointLight ('#ff0000', 6)
scene.add (ghost1,ghost2, ghost3)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


//mapping
directionalLight.shadow.mapSize.width = 256
directionalLight.shadow.mapSize.height = 256
directionalLight.shadow.camera.top =8
directionalLight.shadow.camera.right =8
directionalLight.shadow.camera.bottom =-8
directionalLight.shadow.camera.left =-8
directionalLight.shadow.camera.near =1
directionalLight.shadow.camera.far = 20



//SKY
const sky = new Sky ()
sky.scale.set (100,100,100)
scene.add (sky)

sky.material.uniforms['turbidity'].value = 10
sky.material.uniforms['rayleigh'].value = 3
sky.material.uniforms['mieCoefficient'].value = 0.1
sky.material.uniforms['mieDirectionalG'].value = 0.95
sky.material.uniforms['sunPosition'].value.set(0.3, -0.038, -0.95)

//FOG
scene.fog = new THREE.FogExp2('#02343f',0.1)

 //Animate
 
const timer = new Timer()

const tick = () =>
{
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
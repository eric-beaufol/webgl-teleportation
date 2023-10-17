import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import planeFragment from './shaders/plane/fragment.glsl'
import planeVertex from './shaders/plane/vertex.glsl'
import Stats from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

/**
 * Base
 */

// Elements
const closeBtn = document.querySelector('.close')

// Constants
const MOUSE = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  vX: 0,
  vY: 0
}

const CITIES = [
  {
    name: 'Kiev',
    latLon: [50.4501, 30.5234],
  },
  {
    name: 'Paris',
    latLon: [48.864716, 2.349014],
  },
  {
    name: 'New York',
    latLon: [40.730610, -73.935242]
  },
  {
    name: 'Berlin',
    latLon: [52.520008, 13.404954]
  },
  {
    name: 'Tokyo',
    latLon: [35.712223, 139.771118]
  },
  {
    name: 'Cancun',
    latLon: [21.161908, -86.8515279]
  }
]

// Debug
const params = {
  progress: 0
}

// Stats
const stats = new Stats()
document.body.appendChild(stats.dom)

// canvas
const canvas = document.querySelector('canvas.webgl')

// Scenes
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Render target
const rtPlanet = new THREE.WebGLRenderTarget(sizes.width, sizes.height)
const rtShop = new THREE.WebGLRenderTarget(sizes.width, sizes.height)

/**
 * Render target
 */

/**
 * Camera
 */
// Base planetCamera
const { width, height } = sizes

const planetCamera = new THREE.PerspectiveCamera(70, width / height, 0.1, 10)
planetCamera.position.z = 2.5
scene.add(planetCamera)

const shopCamera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100)
shopCamera.position.z = 2
scene.add(shopCamera)

const finalCamera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, -1000, 1000)

// Controls
const controls = new OrbitControls(shopCamera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.autoRotateSpeed = 0.5
// controls.autoRotate = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  background: 0xff0000
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


let gui

const addGUI = () => {
  gui = new dat.GUI()
}

const getTextureResolution = () => {
  const textureResolution = textureSize.width / textureSize.height
  const screenResolution = sizes.width / sizes.height
  const rX = textureResolution > screenResolution
    ? screenResolution / textureResolution
    : 1
  const rY = textureResolution > screenResolution
    ? 1
    : textureResolution / screenResolution

  return new THREE.Vector2(rX, rY)
}

function onResize() {

  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // For fullscreen plane
  // const resolution = getTextureResolution()

  // uniforms update
  // screenPlane.material.uniforms.uResolution.value = resolution

  // Update planetCamera
  planetCamera.aspect = sizes.width / sizes.height
  planetCamera.updateProjectionMatrix()

  shopCamera.aspect = sizes.width / sizes.height
  shopCamera.updateProjectionMatrix()

  // Update scale
  rtPlanet.setSize(sizes.width, sizes.height)
  rtShop.setSize(sizes.width, sizes.height)

  finalCamera.left = -sizes.width / 2
  finalCamera.right = sizes.width / 2
  finalCamera.top = -sizes.height / 2
  finalCamera.bottom = sizes.height / 2

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

const addEvents = () => {
  window.addEventListener('mousemove', e => {
    MOUSE.x = e.clientX / sizes.width
    MOUSE.y = e.clientY / sizes.height
    MOUSE.vX = MOUSE.x - MOUSE.prevX
    MOUSE.vY = MOUSE.y - MOUSE.prevY
    MOUSE.prevX = MOUSE.x
    MOUSE.prevY = MOUSE.y
  })

  window.addEventListener('resize', onResize)
}

const getPositionFromLatLng = (lat, lon) => {
  const phi = lat * (Math.PI / 180) // radian conversion
  const theta = (lon + 180) * (Math.PI/180) // radian conversion
  const theta1 = (270 - lon) * (Math.PI/180) // radian conversion
  const x = -(Math.cos(phi) * Math.cos(theta))
  const y = ( Math.sin(phi))
  const z = ( Math.cos(phi) * Math.sin(theta))
  const vector = new THREE.Vector3(x, y, z)
  const euler = new THREE.Euler(phi, theta1, 0, 'XYZ')
  const quaternion = new THREE.Quaternion().setFromEuler(euler)

  return { vector, quaternion }
}

let planet, planetTween
const addPlanet = () => {
  planet = new THREE.Group()
  scene.add(planet)

  // Planet mesh
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 50, 50),
    new THREE.MeshBasicMaterial({ 
      map: new THREE.TextureLoader().load('earth.jpg')
    })
  )

  planet.add(mesh)

  // Cities mesh and list items 
  const cityListEl = document.querySelector('.cities')

  CITIES.forEach(({ latLon, name }) => {

    const cityMesh = new THREE.Mesh(
      new THREE.SphereGeometry(.02, 20, 20),
      new THREE.MeshBasicMaterial({ color: 'red' })
    )
    
    const position = getPositionFromLatLng(latLon[0], latLon[1])
    cityMesh.position.copy(position.vector)

    planet.add(cityMesh)

    const cityEl = document.createElement('li')
    cityEl.innerText = name
    cityListEl.appendChild(cityEl)

    cityEl.addEventListener('click', () => {
      const coords = getPositionFromLatLng(latLon[0], latLon[1])
      const obj = { progress: 0 }
      const baseQuaternion = planet.quaternion.clone()

      if (planetTween) planetTween.kill()
      planetTween = gsap.to(obj, { 
        progress: 1,
        duration: 1,
        onUpdate: () => {
          planet.quaternion.slerpQuaternions(
            baseQuaternion,
            coords.quaternion, 
            obj.progress
          )
        },
        onComplete: () => {
          gsap.to(params, { 
            progress: 1,
            duration: .7,
            onComplete: () => {
              closeBtn.style.display = 'block'
            }
          })
        }
      })
    })
  })

  closeBtn.addEventListener('click', () => {
    closeBtn.style.display = 'none'

    gsap.to(params, { 
      progress: 0,
      duration: .7
    })
  })
}

let shop
const addShop = () => {
  const texture = new THREE.TextureLoader().load('/boule-bleue.jpg')
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.x = -1

  shop = new THREE.Mesh(
    new THREE.SphereGeometry(3, 50, 50),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    })
  )

  scene.add(shop)
}

let screenPlane
const addScreenPlane = () => {

  // plane
  screenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(sizes.width, sizes.height),
    new THREE.ShaderMaterial({
      fragmentShader: planeFragment,
      vertexShader: planeVertex,
      uniforms: {
        uPlanetTexture: { value: rtPlanet.texture },
        uShopTexture: { value: rtShop.texture },
        uTime: { value: 0 },
        uProgress: { value: params.progress }
      }
    })
  )
  
  scene.add(screenPlane)
  gui.add(params, 'progress', 0, 1)
}

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
  stats.begin()

  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Update controls
  if (typeof controls !== 'undefined') {
    controls.update(elapsedTime)
  }

  // Uniforms
  if (screenPlane) {
    screenPlane.material.uniforms.uProgress.value = params.progress
  }
   
  // shop
  shop.visible = true
  planet.visible = false
  screenPlane.visible = false

  renderer.setRenderTarget(rtShop)
  renderer.render(scene, shopCamera)
  
  shop.visible = false
  planet.visible = true

  // planet
  renderer.setRenderTarget(rtPlanet)
  renderer.render(scene, planetCamera)

  screenPlane.visible = false
  planet.visible = false
  screenPlane.visible = true

  // merge
  renderer.setRenderTarget(null)
  renderer.render(scene, finalCamera)

  stats.end()

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

addEvents()
addGUI()
addScreenPlane()
addPlanet()
addShop()
tick()

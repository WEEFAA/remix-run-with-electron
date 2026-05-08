import { clientEntry, ref, type Handle, type SerializableProps } from 'remix/ui'

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

interface ParrotSceneProps extends SerializableProps {
  modelUrl: string
}

export const ParrotScene = clientEntry(
  import.meta.url,
  function ParrotScene(handle: Handle<ParrotSceneProps>) {
    return () => (
      <div
        class="parrotOverlay"
        aria-hidden="true"
        mix={ref((overlay, signal) => mountParrotOverlay(overlay, handle.props.modelUrl, signal))}
      >
        <canvas class="parrotCanvas" />
      </div>
    )
  },
)

function mountParrotOverlay(overlay: HTMLDivElement, modelUrl: string, signal: AbortSignal) {
  const canvas = overlay.querySelector('canvas')
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('ParrotScene: expected a <canvas> inside .parrotOverlay')
  }
  const canvasEl: HTMLCanvasElement = canvas

  let renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  })

  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95

  let scene = new THREE.Scene()

  scene.add(new THREE.AmbientLight(0xffffff, 0.9))
  let keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
  keyLight.position.set(2.5, 3.5, 4.0)
  scene.add(keyLight)

  let camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100)
  camera.position.set(1.6, 1.05, 2.4)
  camera.lookAt(0, 0, 0)

  let clock = new THREE.Clock()
  let mixer: THREE.AnimationMixer | null = null
  let model: THREE.Object3D | null = null
  let overlayMotion = createOverlayMotion(overlay, signal)

  function resize() {
    let width = canvasEl.clientWidth || 1
    let height = canvasEl.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    camera.lookAt(0, 0, 0)
  }

  resize()
  let resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvasEl)

  let loader = new GLTFLoader()
  loader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene
      scene.add(model)
      centerAndFit(model)

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)
        mixer.clipAction(gltf.animations[0]).play()
      }
    },
    undefined,
    (error) => {
      console.error('Failed to load GLB:', error)
    },
  )

  let raf = 0
  function tick() {
    if (signal.aborted) return
    raf = requestAnimationFrame(tick)

    let delta = clock.getDelta()
    let t = clock.elapsedTime

    if (mixer) mixer.update(delta)
    if (model) {
      model.position.y = Math.sin(t * 1.2) * 0.05
    }

    let motion = overlayMotion.update(t)
    if (model) {
      // Map 2D overlay velocity (px/s) to subtle 3D steering.
      let yawTarget = THREE.MathUtils.clamp(motion.vx * 0.0012, -0.55, 0.55)
      let rollTarget = THREE.MathUtils.clamp(-motion.vx * 0.0009, -0.28, 0.28)
      let pitchTarget = THREE.MathUtils.clamp(motion.vy * 0.0006, -0.18, 0.18)

      // Smooth it so it feels weighty.
      model.rotation.y += (yawTarget - model.rotation.y) * 0.06
      model.rotation.z += (rollTarget - model.rotation.z) * 0.06
      model.rotation.x += (pitchTarget - model.rotation.x) * 0.05
    }
    renderer.render(scene, camera)
  }

  tick()

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    if (model) disposeThreeObject(model)
    renderer.dispose()
  })
}

function createOverlayMotion(overlay: HTMLElement, signal: AbortSignal) {
  let reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  let noise = new ImprovedNoise()

  let pointer = {
    x: 0,
    y: 0,
    inside: false,
    lastSeenAt: 0,
    pointerType: 'unknown',
  }

  function onPointerMove(event: PointerEvent) {
    // Avoid moving the overlay on touch scroll.
    if (event.pointerType === 'touch') return

    pointer.pointerType = event.pointerType
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.inside =
      event.clientX >= 0 &&
      event.clientY >= 0 &&
      event.clientX <= window.innerWidth &&
      event.clientY <= window.innerHeight
    pointer.lastSeenAt = performance.now()
  }

  function onMouseOut(event: MouseEvent) {
    // When the mouse leaves the window, relatedTarget is typically null.
    let related = event.relatedTarget as Node | null
    if (related == null) {
      pointer.inside = false
    }
  }

  function onBlur() {
    pointer.inside = false
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('mouseout', onMouseOut, { passive: true })
  window.addEventListener('blur', onBlur, { passive: true })

  signal.addEventListener('abort', () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('mouseout', onMouseOut)
    window.removeEventListener('blur', onBlur)
  })

  function readPx(cssValue: string | null, fallback: number) {
    if (!cssValue) return fallback
    let n = Number.parseFloat(cssValue)
    return Number.isFinite(n) ? n : fallback
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }

  let currentX: number | null = null
  let currentY: number | null = null
  let lastX: number | null = null
  let lastY: number | null = null
  let lastAt: number | null = null
  let vx = 0
  let vy = 0

  return {
    update(t: number) {
      let computed = window.getComputedStyle(overlay)
      let w = overlay.offsetWidth || readPx(computed.width, 260)
      let h = overlay.offsetHeight || readPx(computed.height, 220)

      let marginRight = readPx(computed.getPropertyValue('--parrot-margin-right'), 24)
      let marginBottom = readPx(computed.getPropertyValue('--parrot-margin-bottom'), 96)

      let homeX = Math.max(0, window.innerWidth - marginRight - w)
      let homeY = Math.max(0, window.innerHeight - marginBottom - h)

      let now = performance.now()
      let following = pointer.inside && now - pointer.lastSeenAt < 1500

      let targetX = homeX
      let targetY = homeY

      if (following) {
        let padding = 6
        targetX = clamp(pointer.x - w * 0.5, padding, Math.max(padding, window.innerWidth - w - padding))
        targetY = clamp(pointer.y - h * 0.5, padding, Math.max(padding, window.innerHeight - h - padding))
      }

      if (currentX == null || currentY == null || reduceMotion) {
        currentX = targetX
        currentY = targetY
      } else {
        let followStrength = following ? 0.013 : 0.008
        currentX += (targetX - currentX) * followStrength
        currentY += (targetY - currentY) * followStrength
      }

      let amp = reduceMotion ? 0 : following ? 10 : 6
      let nX = noise.noise(10.23, t * 0.55, 0.12)
      let nY = noise.noise(2.17, t * 0.55, 9.41)
      let floatY = reduceMotion ? 0 : Math.sin(t * 1.1) * 2.5

      let noisyX = currentX + nX * amp
      let noisyY = currentY + nY * amp + floatY

      let at = performance.now()
      if (lastX != null && lastY != null && lastAt != null) {
        let dt = Math.max(0.001, (at - lastAt) / 1000)
        vx = (noisyX - lastX) / dt
        vy = (noisyY - lastY) / dt
      }
      lastX = noisyX
      lastY = noisyY
      lastAt = at

      overlay.style.setProperty('--parrot-x', `${noisyX.toFixed(2)}px`)
      overlay.style.setProperty('--parrot-y', `${noisyY.toFixed(2)}px`)

      return { vx, vy }
    },
  }
}

function centerAndFit(object: THREE.Object3D) {
  let box = new THREE.Box3().setFromObject(object)
  let size = box.getSize(new THREE.Vector3())
  let center = box.getCenter(new THREE.Vector3())

  let maxDim = Math.max(size.x, size.y, size.z) || 1
  let scale = 1.15 / maxDim

  object.scale.setScalar(scale)
  object.position.sub(center.multiplyScalar(scale))
}

function disposeThreeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    let mesh = node as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    let material = (mesh as unknown as { material?: unknown }).material
    if (!material) return

    if (Array.isArray(material)) {
      for (let item of material) disposeMaterial(item)
      return
    }

    disposeMaterial(material)
  })
}

function disposeMaterial(material: unknown) {
  let mat = material as Record<string, unknown> & { dispose?: () => void }

  for (let value of Object.values(mat)) {
    if (value && typeof value === 'object') {
      let maybeTexture = value as { dispose?: () => void }
      if (typeof maybeTexture.dispose === 'function') maybeTexture.dispose()
    }
  }

  if (typeof mat.dispose === 'function') mat.dispose()
}

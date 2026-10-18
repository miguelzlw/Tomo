import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createMonkeyModel } from '../modelos/macaco3d';
import './studio.css';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = element<HTMLDivElement>('stage');
const loading = element<HTMLDivElement>('loading');
const status = element<HTMLParagraphElement>('status');
const download = element<HTMLButtonElement>('download');
const motionButton = element<HTMLButtonElement>('motion');
const autoButton = element<HTMLButtonElement>('auto-rotate');
const darkButton = element<HTMLButtonElement>('dark-stage');
const viewName = element<HTMLSpanElement>('view-name');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function startStudio() {
  const canvas = element<HTMLCanvasElement>('viewer');
  canvas.tabIndex = 0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.03;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const lightBackground = new THREE.Color('#e7dfd3');
  const darkBackground = new THREE.Color('#14171b');
  scene.background = lightBackground.clone(); scene.fog = new THREE.Fog(lightBackground, 14, 35);
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(.23, 1.30, 0); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 2.7; controls.maxDistance = 10;
  controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI / 2 + .04;
  controls.enablePan = false; controls.autoRotateSpeed = .7;
  camera.position.copy(controls.target).add(new THREE.Vector3(3.2, .9, 5.6)); controls.update();

  scene.add(new THREE.HemisphereLight('#fff5e5', '#8e806d', 1.25));
  const key = new THREE.DirectionalLight('#fff0d9', 3.1);
  key.position.set(-3.5, 6, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
  key.shadow.camera.near = .5; key.shadow.camera.far = 15;
  key.shadow.bias = -.0002; key.shadow.normalBias = .025;
  key.shadow.radius = 4; key.shadow.blurSamples = 12; scene.add(key);
  const fill = new THREE.DirectionalLight('#e1e9ff', .9); fill.position.set(4, 3, 2); scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffc78c', 1.6); rim.position.set(2, 4, -4); scene.add(rim);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#e7dfd3', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = .001;
  ground.receiveShadow = true; ground.name = 'Studio_floor_not_exported'; scene.add(ground);
  const model = createMonkeyModel(); scene.add(model.root);
  const mixer = new THREE.AnimationMixer(model.root);
  mixer.clipAction(model.animations[0]).play();
  let playing = !reducedMotion.matches;
  motionButton.setAttribute('aria-pressed', String(playing));
  let exporting = false; let disposed = false; let visible = true; let renderNeeded = true;
  let transition: { start: THREE.Vector3; end: THREE.Vector3; time: number } | undefined;

  const views: Record<string, { name: string; offset: [number, number, number] }> = {
    'three-quarter': { name: 'Três quartos', offset: [3.2, .9, 5.6] },
    front: { name: 'Frente', offset: [0, .65, 6.25] },
    side: { name: 'Lado', offset: [6.25, .65, 0] },
    back: { name: 'Costas', offset: [0, .65, -6.25] },
  };
  const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
  viewButtons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.view!; const view = views[selected];
    const end = controls.target.clone().add(new THREE.Vector3(...view.offset));
    controls.autoRotate = false; autoButton.setAttribute('aria-pressed', 'false');
    transition = { start: camera.position.clone(), end, time: performance.now() };
    if (reducedMotion.matches) { camera.position.copy(end); transition = undefined; controls.update(); }
    viewName.textContent = view.name;
    viewButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  controls.addEventListener('start', () => {
    transition = undefined; viewName.textContent = 'Ângulo livre';
    viewButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  });
  controls.addEventListener('change', () => { renderNeeded = true; });
  motionButton.addEventListener('click', () => {
    playing = !playing; motionButton.setAttribute('aria-pressed', String(playing));
  });
  autoButton.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    autoButton.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  darkButton.addEventListener('click', () => {
    const dark = darkButton.getAttribute('aria-pressed') !== 'true';
    darkButton.setAttribute('aria-pressed', String(dark)); stage.classList.toggle('dark', dark);
    const color = dark ? darkBackground : lightBackground;
    (scene.background as THREE.Color).copy(color); (scene.fog as THREE.Fog).color.copy(color);
    groundMaterial.color.copy(color);
    renderNeeded = true;
  });
  const swatches = [...document.querySelectorAll<HTMLButtonElement>('[data-color]')];
  swatches.forEach(button => button.addEventListener('click', () => {
    model.fur.color.set(button.dataset.color!);
    renderNeeded = true;
    swatches.forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch === button)));
  }));
  const preferenceChanged = () => {
    playing = !reducedMotion.matches; motionButton.setAttribute('aria-pressed', String(playing));
    if (reducedMotion.matches) { controls.autoRotate = false; autoButton.setAttribute('aria-pressed', 'false'); }
  };
  reducedMotion.addEventListener('change', preferenceChanged);

  download.addEventListener('click', async () => {
    if (exporting) return;
    exporting = true; download.disabled = true;
    const time = mixer.time;
    status.textContent = 'Preparando o arquivo 3D…';
    try {
      mixer.setTime(0); model.root.updateMatrixWorld(true);
      const file = await new GLTFExporter().parseAsync(model.root, {
        binary: true, animations: model.animations, trs: true, onlyVisible: true,
      });
      if (!(file instanceof ArrayBuffer)) throw new Error('Formato de exportação inesperado.');
      const url = URL.createObjectURL(new Blob([file], { type: 'model/gltf-binary' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tomo-macaquinho-estudo-01.glb';
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      status.textContent = 'Modelo exportado com a animação de repouso.';
    } catch (error) {
      console.error('Falha ao exportar o modelo:', error);
      status.textContent = 'Não foi possível exportar. Tente novamente.';
    } finally {
      mixer.setTime(time); exporting = false; download.disabled = false;
    }
  });

  const resize = () => {
    const width = stage.clientWidth; const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    // Preserve the vertical framing on narrow phone screens.
    camera.fov = width / height < .75 ? 45 : 36; camera.updateProjectionMatrix();
    renderNeeded = true;
  };
  const observer = new ResizeObserver(resize); observer.observe(stage); resize();
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  intersection.observe(stage);
  let previous = performance.now();
  renderer.setAnimationLoop((now: number) => {
    if (now - previous < 1000 / 30) return;
    const delta = Math.min(.05, (now - previous) / 1000); previous = now;
    if (!visible || document.hidden || disposed) return;
    if (playing && !exporting) { mixer.update(Math.max(0, delta)); renderNeeded = true; }
    if (transition) {
      const t = Math.min(1, (performance.now() - transition.time) / 650);
      camera.position.lerpVectors(transition.start, transition.end, t * t * (3 - 2 * t));
      renderNeeded = true;
      if (t === 1) transition = undefined;
    }
    controls.update(delta);
    if (renderNeeded) { renderer.render(scene, camera); renderNeeded = false; loading.hidden = true; }
  });
  const dispose = () => {
    if (disposed) return; disposed = true;
    renderer.setAnimationLoop(null); controls.dispose(); observer.disconnect(); intersection.disconnect();
    reducedMotion.removeEventListener('change', preferenceChanged);
    mixer.stopAllAction(); mixer.uncacheRoot(model.root);
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    renderer.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}

try { startStudio(); } catch (error) {
  console.error('Não foi possível abrir o estúdio 3D:', error);
  loading.hidden = false;
  loading.textContent = 'Não foi possível iniciar o 3D. Abra esta prévia num navegador com WebGL habilitado.';
  download.disabled = true;
  status.textContent = 'O modelo 2D do Tomo continua disponível na página principal.';
}

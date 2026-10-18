import * as THREE from 'three';
import { createMonkeyModel } from './macaco3d';
import { movimentoEm, suave } from '../animacaoMacaco';

/** A composição da tela de login. O modelo é o mesmo usado no estudo 3D. */
export function criarCenaMacacoLivro(canvas: HTMLCanvasElement, pronto: () => void, falhou: () => void) {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
  catch (error) { console.error('WebGL indisponível:', error); falhou(); return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.5, -2.5, .1, 40);
  camera.position.set(-4.1, 3.2, 8); camera.lookAt(-.20, 1.75, .1);
  scene.add(new THREE.HemisphereLight('#fff1de', '#58627b', 2));
  const light = new THREE.DirectionalLight('#ffe9ca', 3.2); light.position.set(-2, 10, 4);
  light.castShadow = true; light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: .5, far: 20 });
  light.shadow.normalBias = .025; light.shadow.bias = -.0002; light.shadow.radius = 3; scene.add(light);
  const fill = new THREE.DirectionalLight('#c4d5ff', 1.4); fill.position.set(4, 3, -1); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = -.015; scene.add(floor);
  const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 128;
  const haloContext = haloCanvas.getContext('2d')!;
  const haloGradient = haloContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  haloGradient.addColorStop(0, 'rgba(125,140,180,.24)'); haloGradient.addColorStop(1, 'rgba(125,140,180,0)');
  haloContext.fillStyle = haloGradient; haloContext.fillRect(0, 0, 128, 128);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(-.2, -.02, .3); scene.add(halo);

  const book = new THREE.Group(); book.position.set(-.65, .025, -.12); scene.add(book);
  const cover = new THREE.MeshStandardMaterial({ color: '#303d82', roughness: .65 });
  const edge = new THREE.MeshStandardMaterial({ color: '#d8d7ce', roughness: 1 });
  const textures: THREE.CanvasTexture[] = [];
  function paginaTextura(indice: number) {
    const papel = document.createElement('canvas'); papel.width = 512; papel.height = 1024;
    const c = papel.getContext('2d')!;
    c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, 512, 1024);
    c.strokeStyle = '#b68b96'; c.lineWidth = 2; c.strokeRect(30, 40, 452, 944);
    for (let coluna = 0; coluna < 11; coluna++) {
      const x = 50 + coluna * 40;
      c.strokeStyle = '#ceb7b9'; c.lineWidth = .8; c.beginPath(); c.moveTo(x + 17, 48); c.lineTo(x + 17, 974); c.stroke();
      for (let linha = 0; linha < 36; linha++) {
        const y = 58 + linha * 25; const variante = (coluna * 7 + linha * 11 + indice) % 3;
        c.strokeStyle = '#49505c'; c.lineWidth = 1.45; c.beginPath();
        c.moveTo(x, y - 7); c.lineTo(x, y + 8); c.moveTo(x - 6, y - 3); c.lineTo(x + 6, y - 3);
        c.moveTo(x - 5, y + 2); c.lineTo(x + 5, y + 2);
        if (variante === 0) { c.moveTo(x - 5, y - 6); c.lineTo(x - 5, y + 5); c.lineTo(x + 5, y + 5); c.lineTo(x + 5, y - 6); }
        else if (variante === 1) { c.moveTo(x - 4, y); c.lineTo(x - 7, y + 8); c.moveTo(x + 2, y); c.lineTo(x + 7, y + 8); }
        else { c.moveTo(x - 6, y - 7); c.lineTo(x - 2, y - 5); c.moveTo(x - 4, y + 5); c.lineTo(x + 4, y + 8); }
        c.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(papel); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.push(texture); return texture;
  }
  const papers = [0, 1, 2].map(paginaTextura);
  const pageMaterial = new THREE.MeshStandardMaterial({ map: papers[0], roughness: .95, side: THREE.DoubleSide });
  const leafGeometry = new THREE.PlaneGeometry(1.52, 3.32, 16, 22); leafGeometry.translate(.76, 1.66, 0);
  const restPositions = new Float32Array(leafGeometry.attributes.position.array);
  const right = new THREE.Group(); right.rotation.y = -.13; book.add(right);
  const left = new THREE.Group(); left.rotation.y = .58; book.add(left);
  for (const [group, side] of [[right, 1], [left, -1]] as const) {
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.61, 3.43, .075), cover);
    shell.position.set(side * .78, 1.66, -.10); shell.castShadow = true; shell.receiveShadow = true; group.add(shell);
    for (let i = 0; i < 5; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.53, 3.32, .012), edge);
      sheet.position.set(side * .765, 1.66, -.052 + i * .018); sheet.receiveShadow = true; group.add(sheet);
    }
    const leaf = new THREE.Mesh(leafGeometry, pageMaterial);
    leaf.scale.x = side; leaf.position.z = .045; leaf.castShadow = true; leaf.receiveShadow = true; group.add(leaf);
  }
  const binding = new THREE.Mesh(new THREE.CapsuleGeometry(.085, 3.23, 6, 14), cover);
  binding.position.set(0, 1.66, -.075); binding.castShadow = true; book.add(binding);
  const turningGeometry = leafGeometry.clone();
  const turning = new THREE.Mesh(turningGeometry, pageMaterial.clone());
  turning.castShadow = true; turning.receiveShadow = true; turning.position.z = .075; book.add(turning);

  const model = createMonkeyModel(-1);
  const pivot = new THREE.Group(); pivot.position.set(.7, .95, .45); scene.add(pivot);
  model.root.scale.setScalar(.7); model.root.rotation.y = Math.PI; model.root.position.y = -.95; pivot.add(model.root);
  const mixer = new THREE.AnimationMixer(model.root); mixer.clipAction(model.animations[0]).play();
  const head = model.root.getObjectByName('Head')!;
  const legs = ['L', 'R'].map(side => model.root.getObjectByName(`LegRoot_${side}`)!);
  const arms = ['L', 'R'].map(side => ({
    side, shoulder: model.root.getObjectByName(`Shoulder_${side}`)!,
    bones: [0, 1, 2].map(i => model.root.getObjectByName(`Arm_${side}_Joint_${i}`) as THREE.Bone),
  }));
  function moverBraco(arm: typeof arms[number], destino: THREE.Vector3, palmas: number) {
    const [upper, lower, wrist] = arm.bones;
    const local = arm.shoulder.worldToLocal(destino.clone());
    const stretch = 1 + palmas * .18; upper.scale.setScalar(stretch);
    const a = lower.position.length() * stretch; const b = wrist.position.length() * stretch;
    const distance = Math.max(.04, Math.min(a + b - .005, local.length()));
    const direction = local.clone().normalize();
    const pole = new THREE.Vector3(arm.side === 'L' ? -1 : 1, -.18, -.15);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    const cosine = THREE.MathUtils.clamp((a * a + distance * distance - b * b) / (2 * a * distance), -1, 1);
    const elbow = direction.clone().multiplyScalar(cosine * a).addScaledVector(pole, Math.sqrt(1 - cosine * cosine) * a);
    upper.quaternion.setFromUnitVectors(lower.position.clone().normalize(), elbow.clone().normalize());
    const forearm = direction.clone().multiplyScalar(distance).sub(elbow).normalize().applyQuaternion(upper.quaternion.clone().invert());
    lower.quaternion.setFromUnitVectors(wrist.position.clone().normalize(), forearm);
    const desired = new THREE.Quaternion().setFromEuler(new THREE.Euler(0,
      (arm.side === 'L' ? 1 : -1) * palmas * Math.PI / 2, Math.PI));
    wrist.quaternion.copy(upper.quaternion).multiply(lower.quaternion).invert().multiply(desired);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ativo = true; let fechado = false; let frame = 0; let anterior = performance.now();
  let tempo = 0; let primeira = true; let paginaAtual = -1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    const height = 4.65; const width = height * rect.width / rect.height;
    camera.left = -width / 2; camera.right = width / 2; camera.top = height / 2; camera.bottom = -height / 2; camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const intersection = new IntersectionObserver(([entry]) => { ativo = entry.isIntersecting; }); intersection.observe(canvas);
  const desenhar = (agora: number) => {
    if (fechado) return; frame = requestAnimationFrame(desenhar);
    if (agora - anterior < 1000 / 30) return;
    const delta = Math.min(.08, (agora - anterior) / 1000); anterior = agora;
    if (!ativo || document.hidden) return;
    if (!reduced.matches) { tempo += delta; mixer.update(delta); }
    const motion = movimentoEm(reduced.matches ? 0 : tempo);
    pivot.position.set(.7, .95 * (1 - motion.agachar) + motion.salto * .009, .45);
    pivot.rotation.x = motion.giro; pivot.scale.set(1 + motion.agachar * .3, 1 - motion.agachar, 1);
    model.root.position.x = motion.peso * .008; head.rotation.z = motion.cabeca;
    legs.forEach(leg => { leg.rotation.x = motion.encolher * .9; leg.scale.y = 1 - motion.encolher * .35; });
    model.root.updateWorldMatrix(true, true);
    const palmas = 1 - suave((motion.esquerda[1] - 240) / 40);
    for (const arm of arms) {
      const point = arm.side === 'L' ? motion.direita : motion.esquerda;
      const coçando = tempo % 4 >= 3 && arm.side === 'L';
      const z = coçando || palmas > .1 || motion.encolher > .1 ? .5 : .16;
      const target = new THREE.Vector3(.7 + (point[0] - 300) * .009, (416 - point[1]) * .0103, z);
      target.sub(new THREE.Vector3(.7, .95, .45)); pivot.localToWorld(target);
      moverBraco(arm, target, palmas);
    }
    const page = Math.floor(tempo / 4);
    if (paginaAtual !== page) { paginaAtual = page; pageMaterial.map = papers[page % papers.length]; pageMaterial.needsUpdate = true; }
    turning.visible = motion.pagina !== null;
    if (motion.pagina !== null) {
      const t = suave(motion.pagina); turning.rotation.y = -.13 + t * (-Math.PI + .58 + .13);
      const positions = turningGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = restPositions[i * 3];
        positions.setZ(i, Math.sin(x / 1.52 * Math.PI) * Math.sin(t * Math.PI) * .18);
      }
      positions.needsUpdate = true; turningGeometry.computeVertexNormals();
    }
    try { renderer.render(scene, camera); if (primeira) { primeira = false; pronto(); } }
    catch (error) { console.error('Falha na cena 3D:', error); falhou(); limpar(); }
  };
  function limpar() {
    if (fechado) return; fechado = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
    mixer.stopAllAction(); mixer.uncacheRoot(model.root);
    const geometrias = new Set<THREE.BufferGeometry>(); const materiais = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometrias.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materiais.add(material));
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      }
    });
    geometrias.forEach(geometry => geometry.dispose()); materiais.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose()); haloTexture.dispose(); renderer.dispose();
  }
  frame = requestAnimationFrame(desenhar);
  return limpar;
}

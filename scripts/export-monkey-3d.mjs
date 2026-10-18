import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = fs.readFileSync(path.join(project, 'src/modelos/macaco3d.ts'), 'utf8');
const threeURL = pathToFileURL(path.join(project, 'node_modules/three/build/three.module.js')).href;
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
} }).outputText.replace(/from ['"]three['"]/, `from '${threeURL}'`);
const { createMonkeyModel } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { root, animations } = createMonkeyModel();

// GLTFExporter only needs FileReader for its Blob buffers; no DOM or textures.
class BufferFileReader {
  result = null;
  onloadend = null;
  onload = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => {
      this.result = result; this.onload?.({ target: this }); this.onloadend?.({ target: this });
    }).catch(error => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(result => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
      this.onload?.({ target: this }); this.onloadend?.({ target: this });
    }).catch(error => this.onerror?.(error));
  }
}
globalThis.FileReader = BufferFileReader;

let triangles = 0;
root.traverse(object => {
  if (object.isMesh) {
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    const positions = object.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      assert.ok([positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite), `Invalid vertex in ${object.name}`);
    }
  }
  if (object.isSkinnedMesh) {
    const weights = object.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++) {
      const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
      assert.ok(Math.abs(sum - 1) < 1e-5, `Invalid skin weight in ${object.name}`);
    }
  }
});
assert.ok(triangles < 150000, 'Study geometry budget exceeded');
assert.ok(new THREE.Box3().setFromObject(root).min.y >= -.02, 'Feet below ground');

const binary = await new GLTFExporter().parseAsync(root, { binary: true, animations, trs: true });
assert.ok(binary instanceof ArrayBuffer);
const buffer = Buffer.from(binary);
assert.equal(buffer.readUInt32LE(0), 0x46546c67);
assert.equal(buffer.readUInt32LE(4), 2);
const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
assert.equal(json.skins.length, 3); assert.equal(json.animations.length, 1);

// Re-import the exported artifact, including all skins and its animation.
const imported = await new GLTFLoader().parseAsync(binary, '');
assert.equal(imported.animations.length, 1);
const mixer = new THREE.AnimationMixer(imported.scene);
mixer.clipAction(imported.animations[0]).play();
for (let frame = 0; frame <= 48; frame++) {
  mixer.setTime(frame / 12); imported.scene.updateMatrixWorld(true);
  imported.scene.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), `Invalid animated transform: ${object.name}`));
}
const destination = path.join(project, 'public/models/tomo-macaquinho-estudo-01.glb');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, buffer);
console.log(`GLB exported and re-imported: ${buffer.length} bytes, ${triangles} triangles, 3 skins, ${json.skins.reduce((n, skin) => n + skin.joints.length, 0)} joints, 1 animation.\n${destination}`);

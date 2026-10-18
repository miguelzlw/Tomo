import * as THREE from 'three';

type V3 = [number, number, number];
const v = (point: V3) => new THREE.Vector3(...point);

/** Original procedural study. Y-up, +Z forward, soles at Y=0. Units: meters. */
export function createMonkeyModel(tailSide = 1) {
  const root = new THREE.Group();
  root.name = 'Tomo_Monkey_Study_01';
  root.userData = { status: 'visual-prototype', authoring: 'procedural', forward: '+Z', units: 'meters' };
  const fur = new THREE.MeshStandardMaterial({ color: '#94552f', roughness: .91 });
  fur.name = 'Fur_chestnut';
  const skin = new THREE.MeshStandardMaterial({ color: '#e2b08a', roughness: .8 });
  skin.name = 'Skin_warm_peach';
  const innerEar = new THREE.MeshStandardMaterial({ color: '#bc795c', roughness: .88 });
  const belly = new THREE.MeshStandardMaterial({ color: '#c18a5b', roughness: .95 });
  const dark = new THREE.MeshStandardMaterial({ color: '#492c23', roughness: .65 });
  const white = new THREE.MeshStandardMaterial({ color: '#fff5df', roughness: .3 });
  const iris = new THREE.MeshStandardMaterial({ color: '#623720', roughness: .22 });
  const pupil = new THREE.MeshStandardMaterial({ color: '#170f0c', roughness: .16 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const sphere = new THREE.SphereGeometry(1, 36, 28);
  function ellipsoid(parent: THREE.Object3D, name: string, position: V3, scale: V3,
    material: THREE.Material = fur) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.name = name; mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }

  function tubeGeometry(points: V3[], radius: (t: number) => number, segments = 40, sides = 14) {
    const curve = new THREE.CatmullRomCurve3(points.map(v), false, 'centripetal');
    const frames = curve.computeFrenetFrames(segments, false);
    const positions: number[] = []; const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; const center = curve.getPointAt(t); const r = radius(t);
      for (let j = 0; j <= sides; j++) {
        const theta = j / sides * Math.PI * 2;
        const offset = frames.normals[i].clone().multiplyScalar(Math.cos(theta) * r)
          .addScaledVector(frames.binormals[i], Math.sin(theta) * r);
        positions.push(center.x + offset.x, center.y + offset.y, center.z + offset.z);
      }
    }
    for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j; const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // Close both ends; wrists and roots are also concealed inside adjoining forms.
    for (const ring of [0, segments]) {
      const center = curve.getPointAt(ring / segments); const index = positions.length / 3;
      positions.push(center.x, center.y, center.z);
      for (let j = 0; j < sides; j++) {
        const a = ring * (sides + 1) + j;
        if (ring === 0) indices.push(index, a + 1, a);
        else indices.push(index, a, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return { geometry, curve, segments, sides };
  }

  function tube(parent: THREE.Object3D, name: string, points: V3[], radius: (t: number) => number,
    material: THREE.Material = fur, segments = 32, sides = 12) {
    const { geometry } = tubeGeometry(points, radius, segments, sides);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }

  function skinTube(parent: THREE.Object3D, name: string, points: V3[],
    radius: (t: number) => number, count: number, segments: number) {
    const { geometry, curve, sides } = tubeGeometry(points, radius, segments, 16);
    const bones: THREE.Bone[] = [];
    for (let i = 0; i < count; i++) {
      const bone = new THREE.Bone(); bone.name = `${name}_Joint_${i}`;
      const position = curve.getPointAt(i / (count - 1));
      if (i > 0) {
        bone.position.copy(position.sub(curve.getPointAt((i - 1) / (count - 1))));
        bones[i - 1].add(bone);
      } else bone.position.copy(position);
      bones.push(bone);
    }
    const skinIndices: number[] = []; const skinWeights: number[] = [];
    const vertexCount = geometry.getAttribute('position').count;
    const ringVertices = (segments + 1) * (sides + 1);
    for (let index = 0; index < vertexCount; index++) {
      const t = index < ringVertices ? Math.floor(index / (sides + 1)) / segments
        : index === ringVertices ? 0 : 1;
      const progress = t * (count - 1); const joint = Math.min(count - 2, Math.floor(progress));
      const weight = progress - joint;
      skinIndices.push(joint, joint + 1, 0, 0); skinWeights.push(1 - weight, weight, 0, 0);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, fur);
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); mesh.add(bones[0]); mesh.bind(new THREE.Skeleton(bones));
    return { mesh, bones };
  }

  const torso = new THREE.Group(); torso.name = 'Torso'; torso.position.y = .82; root.add(torso);
  const profile = [[0, 0], [.19, .015], [.28, .09], [.325, .25], [.32, .43],
    [.28, .63], [.225, .79], [.155, .88], [.13, .92], [0, .93]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48), fur);
  body.name = 'Body_pear_silhouette'; body.castShadow = true; body.receiveShadow = true; torso.add(body);
  // A patch fitted to the torso surface reads as a lighter coat, not a badge.
  const patchPositions: number[] = []; const patchIndices: number[] = [];
  const radiusAt = (height: number) => {
    const upper = profile.findIndex(([, y]) => y >= height);
    const [r0, y0] = profile[Math.max(0, upper - 1)]; const [r1, y1] = profile[upper];
    return THREE.MathUtils.lerp(r0, r1, (height - y0) / (y1 - y0));
  };
  patchPositions.push(0, .39, radiusAt(.39) + .004);
  for (let ring = 1; ring <= 12; ring++) for (let step = 0; step < 48; step++) {
    const angle = step / 48 * Math.PI * 2; const t = ring / 12;
    const x = Math.cos(angle) * .185 * t; const y = .39 + Math.sin(angle) * .278 * t;
    const radius = radiusAt(y);
    patchPositions.push(x, y, Math.sqrt(radius * radius - x * x) + .004);
  }
  for (let step = 0; step < 48; step++) patchIndices.push(0, step + 1, (step + 1) % 48 + 1);
  for (let ring = 1; ring < 12; ring++) for (let step = 0; step < 48; step++) {
    const a = 1 + (ring - 1) * 48 + step; const b = a + 48;
    const nextA = 1 + (ring - 1) * 48 + (step + 1) % 48; const nextB = nextA + 48;
    patchIndices.push(a, b, nextA, nextA, b, nextB);
  }
  const patchGeometry = new THREE.BufferGeometry();
  patchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(patchPositions, 3));
  patchGeometry.setIndex(patchIndices); patchGeometry.computeVertexNormals();
  const patch = new THREE.Mesh(patchGeometry, belly); patch.name = 'Abdomen_fitted_coat';
  patch.receiveShadow = true; torso.add(patch);
  ellipsoid(torso, 'Neck', [0, .87, 0], [.16, .18, .155]);

  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    tube(root, `Leg_${tag}`, [[side * .17, .94, -.01], [side * .235, .7, .005],
      [side * .27, .46, .06], [side * .245, .15, .065]],
    t => .065 + .065 * (1 - t) + Math.sin(t * Math.PI) * .014);
    ellipsoid(root, `Foot_${tag}`, [side * .245, .09, .17], [.135, .085, .205]);
    ellipsoid(root, `Foot_skin_${tag}`, [side * .245, .073, .285], [.12, .06, .13], skin);
    for (let toe = 0; toe < 4; toe++) {
      ellipsoid(root, `Toe_${tag}_${toe}`, [side * .245 + (toe - 1.5) * .051, .054, .365 - Math.abs(toe - 1) * .018],
        [.03, .032, .062], skin);
    }
    const leg = new THREE.Group(); leg.name = `LegRoot_${tag}`;
    leg.position.set(side * .17, .94, 0); root.add(leg); root.updateMatrixWorld(true);
    [...root.children].filter(child => child.name === `Leg_${tag}` || child.name === `Foot_${tag}`
      || child.name === `Foot_skin_${tag}` || child.name.startsWith(`Toe_${tag}_`)).forEach(child => leg.attach(child));
    const shoulder = new THREE.Group(); shoulder.name = `Shoulder_${tag}`;
    shoulder.position.set(side * .255, 1.565, 0); root.add(shoulder);
    const arm = skinTube(shoulder, `Arm_${tag}`, [[0, 0, 0], [side * .17, -.14, -.015],
      [side * .225, -.42, .015], [side * .27, -.72, .10]],
    t => .048 + .081 * (1 - t) + Math.sin(t * Math.PI * 2) * .009, 3, 42);
    const hand = new THREE.Group(); hand.name = `Hand_${tag}`;
    hand.rotation.z = side * -.08; arm.bones[2].add(hand);
    ellipsoid(hand, `Palm_${tag}`, [0, -.073, .01], [.087, .113, .06], skin);
    const lengths = [.115, .16, .15, .115];
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger - 1.5) * .042; const length = lengths[finger];
      tube(hand, `Finger_${tag}_${finger}`, [[x, -.14, .013], [x * 1.08, -.14 - length * .45, .028],
        [x * 1.1, -.14 - length * .9, .055], [x * 1.08, -.14 - length, .075]],
      t => .022 * (1 - t * .45), skin, 18, 10);
      ellipsoid(hand, `Fingertip_${tag}_${finger}`, [x * 1.08, -.14 - length, .075], [.0125, .014, .013], skin);
    }
    tube(hand, `Thumb_${tag}`, [[-side * .065, -.05, .025], [-side * .115, -.10, .065],
      [-side * .105, -.16, .083]], t => .027 - t * .011, skin, 20, 12);
    ellipsoid(hand, `Thumb_tip_${tag}`, [-side * .105, -.16, .083], [.017, .018, .017], skin);
  }

  const head = new THREE.Group(); head.name = 'Head'; head.position.set(0, 2.035, .018);
  head.scale.setScalar(.88); root.add(head);
  const skull = ellipsoid(head, 'Head_volume', [0, 0, 0], [.535, .565, .47]);
  // Slightly fuller cheeks and a soft crown avoid a perfect ball silhouette.
  const sculpt = sphere.clone();
  const sculptPositions = sculpt.getAttribute('position');
  for (let i = 0; i < sculptPositions.count; i++) {
    const x = sculptPositions.getX(i); const y = sculptPositions.getY(i); const z = sculptPositions.getZ(i);
    const fullness = 1 + .035 * Math.cos(y * Math.PI) + .004 * Math.sin(x * 17 + z * 13);
    sculptPositions.setXYZ(i, x * fullness, y, z * (1 + .016 * Math.cos(y * 4)));
  }
  sculpt.computeVertexNormals(); skull.geometry = sculpt;

  const mask = new THREE.Shape();
  mask.moveTo(0, .235);
  mask.bezierCurveTo(-.12, .365, -.38, .34, -.40, .13);
  mask.bezierCurveTo(-.43, -.035, -.32, -.135, -.285, -.20);
  mask.bezierCurveTo(-.28, -.39, .28, -.39, .285, -.20);
  mask.bezierCurveTo(.32, -.135, .43, -.035, .40, .13);
  mask.bezierCurveTo(.38, .34, .12, .365, 0, .235);
  const faceGeometry = new THREE.ExtrudeGeometry(mask, {
    depth: .02, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .012, bevelThickness: .012, curveSegments: 30,
  });
  const vertices = faceGeometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i); const y = vertices.getY(i);
    const surface = .47 * Math.sqrt(Math.max(.05, 1 - (x / .554) ** 2 - (y / .565) ** 2));
    vertices.setZ(i, vertices.getZ(i) + surface + .006);
  }
  faceGeometry.computeVertexNormals();
  const face = new THREE.Mesh(faceGeometry, skin); face.name = 'Curved_face_mask';
  face.castShadow = true; face.receiveShadow = true; head.add(face);
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    const ear = new THREE.Group(); ear.name = `Ear_${tag}`;
    ear.position.set(side * .535, -.005, -.015); ear.rotation.y = side * -.22; head.add(ear);
    ellipsoid(ear, `Ear_rim_${tag}`, [side * .027, 0, 0], [.205, .255, .13]);
    ellipsoid(ear, `Ear_inner_${tag}`, [side * .035, 0, .085], [.144, .19, .065], skin);
    ellipsoid(ear, `Ear_fold_${tag}`, [side * .035, -.012, .13], [.076, .115, .02], innerEar);
    const eye = new THREE.Group(); eye.name = `Eye_${tag}`;
    eye.position.set(side * .178, .085, .435); head.add(eye);
    ellipsoid(eye, `Sclera_${tag}`, [0, 0, .038], [.105, .119, .047], white);
    ellipsoid(eye, `Iris_${tag}`, [-side * .005, -.005, .077], [.065, .082, .025], iris);
    ellipsoid(eye, `Pupil_${tag}`, [-side * .005, -.005, .099], [.039, .058, .013], pupil);
    ellipsoid(eye, `Catchlight_${tag}`, [-.019, .028, .109], [.015, .019, .008], shine);
    tube(head, `Brow_${tag}`, [[side * .075, .244, .463], [side * .17, .266, .46],
      [side * .267, .24, .424]], t => .018 * Math.sin(t * Math.PI) + .004, fur, 24, 10);
  }
  ellipsoid(head, 'Muzzle', [0, -.175, .465], [.232, .146, .116], skin);
  ellipsoid(head, 'Nose', [0, -.105, .565], [.073, .042, .03], dark);
  for (const side of [-1, 1]) ellipsoid(head, `Nostril_${side}`, [side * .027, -.115, .59], [.012, .009, .006], pupil);
  tube(head, 'Smile', [[-.116, -.216, .552], [-.065, -.25, .572], [0, -.257, .577],
    [.065, -.25, .572], [.116, -.216, .552]], () => .007, dark, 36, 8);
  for (let i = 0; i < 3; i++) {
    tube(head, `Crown_tuft_${i}`, [[-.075 + i * .065, .50, -.015],
      [-.085 + i * .07, .60 + i * .015, .015], [-.14 + i * .068, .665 - i * .012, .04]],
    t => .036 * (1 - t) + .0015, fur, 24, 12);
  }

  const tailPoints: V3[] = [[0, .94, -.235], [.27, .67, -.48], [.73, .67, -.49],
    [.97, .94, -.43], [.96, 1.35, -.39], [1.12, 1.59, -.34],
    [1.34, 1.57, -.28], [1.40, 1.40, -.25], [1.27, 1.34, -.23], [1.22, 1.43, -.24]];
  const tail = skinTube(root, 'Tail', tailPoints.map(([x, y, z]) => [x * tailSide, y, z]),
  t => .072 * (1 - t * .69), 12, 110);
  ellipsoid(tail.bones[tail.bones.length - 1], 'Tail_rounded_tip', [0, 0, 0], [.0225, .0225, .0225]);

  const times = Array.from({ length: 49 }, (_, i) => i / 12);
  const tracks: THREE.KeyframeTrack[] = [];
  const quaternionTrack = (name: string, axis: THREE.Vector3, angle: (t: number) => number) => {
    const values = times.flatMap(t => new THREE.Quaternion().setFromAxisAngle(axis, angle(t)).toArray());
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  };
  const cycle = Math.PI * 2 / 4;
  tracks.push(new THREE.VectorKeyframeTrack('Torso.scale', times,
    times.flatMap(t => [1 + Math.sin(t * cycle) * .012, 1 + Math.sin(t * cycle) * .015, 1 + Math.sin(t * cycle) * .012])));
  quaternionTrack('Head', new THREE.Vector3(0, 1, 0), t => Math.sin(t * cycle) * .055);
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    quaternionTrack(`Shoulder_${tag}`, new THREE.Vector3(0, 0, 1), t => Math.sin(t * cycle - side * .4) * .025);
    quaternionTrack(`Arm_${tag}_Joint_1`, new THREE.Vector3(1, 0, 0), t => Math.sin(t * cycle - .5) * .035);
    quaternionTrack(`Arm_${tag}_Joint_2`, new THREE.Vector3(0, 0, 1), t => Math.sin(t * cycle - side) * .045);
    const blinkTimes = [0, 2.7, 2.77, 2.84, 2.94, 4];
    tracks.push(new THREE.VectorKeyframeTrack(`Eye_${tag}.scale`, blinkTimes,
      [1, 1, 1, 1, 1, 1, 1, .1, 1, 1, .1, 1, 1, 1, 1, 1, 1, 1]));
  }
  tail.bones.forEach((bone, index) => quaternionTrack(bone.name, new THREE.Vector3(0, 0, 1),
    t => Math.sin(t * cycle - index * .32) * (.012 + index * .002)));
  const idle = new THREE.AnimationClip('Idle_breathing_tail_blink', 4, tracks);
  root.animations = [idle]; root.updateMatrixWorld(true);
  const normalized = new Set<THREE.BufferGeometry>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh && !normalized.has(object.geometry)) {
      object.geometry.normalizeNormals(); normalized.add(object.geometry);
    }
  });
  return { root, animations: [idle], fur, skin };
}

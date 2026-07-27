// ============================================================================
// build-character-assets.mjs — authors the game's rigged character assets.
//
//   node tools/build-character-assets.mjs
//
// Produces assets/characters/base_female.glb and base_male.glb:
//   • a standard humanoid skeleton (Hips→Spine→Chest→Neck→Head, L/R arms+legs)
//   • one skinned Body mesh with per-vertex bone weights
//   • a modular wardrobe: every top/bottom/dress/shoe as its own named
//     SkinnedMesh bound to the same skeleton (hidden until equipped)
//   • baked animation clips ('idle', 'groove') for the runtime mixer
//
// These are FIRST-GENERATION assets: the runtime only depends on the skeleton
// bone names and the mesh/material slot names, so studio-authored GLBs from
// Blender/Maya can replace these files without any code changes.
// ============================================================================

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';

// --- Node shims for the exporter (browser APIs it may touch) ---------------
if (!globalThis.FileReader) {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((ab) => { this.result = ab; this.onloadend?.(); }); }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((ab) => {
        this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64');
        this.onloadend?.();
      });
    }
  };
}

const OUT_DIR = path.resolve('assets/characters');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ============================================================================
// Measurement sheets (from the validated Phase-1 fashion-doll silhouette)
// ============================================================================
function measurements(bodyType) {
  const female = {
    hipY: 1.055, waistY: 1.24, chestY: 1.405, shoulderY: 1.52,
    kneeY: 0.595, ankleY: 0.09, headC: 1.72,
    hipR: 0.148, waistR: 0.085, shoulderX: 0.148,
    bustR: 0.121, neckR: 0.033,
    thighR: 0.066, calfR: 0.046, ankleR: 0.024,
    armR: 0.038, foreR: 0.028, wristR: 0.02,
  };
  if (bodyType === 'male') {
    return { ...female,
      hipR: 0.122, waistR: 0.108, shoulderX: 0.185, bustR: 0.128,
      neckR: 0.042, thighR: 0.075, calfR: 0.052, armR: 0.046, foreR: 0.035, wristR: 0.026,
      shoulderY: 1.56, chestY: 1.42, headC: 1.76,
    };
  }
  return female;
}

// Torso silhouette control points (radius, y).
function bodyProfile(M, bodyType) {
  if (bodyType === 'male') {
    return [
      [0.082, M.hipY - 0.085], [M.hipR, M.hipY + 0.02],
      [0.112, M.waistY - 0.05], [M.waistR, M.waistY],
      [0.118, M.waistY + 0.09], [M.bustR, M.chestY],
      [0.122, M.chestY + 0.06], [0.07, M.shoulderY + 0.005],
    ];
  }
  return [
    [0.085, M.hipY - 0.085], [M.hipR * 0.985, M.hipY + 0.005], [M.hipR, M.hipY + 0.07],
    [0.117, M.waistY - 0.06], [M.waistR, M.waistY], [0.104, M.waistY + 0.085],
    [M.bustR, M.chestY], [0.101, M.chestY + 0.07], [0.058, M.shoulderY + 0.005],
  ];
}
function profileRadiusAt(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0));
  }
  return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
}

// ============================================================================
// Skeleton — standard humanoid naming, symmetric A-pose rest
// ============================================================================
function buildSkeleton(M) {
  const J = { // rest-pose joint positions (world)
    Hips: [0, M.hipY - 0.005, 0],
    Spine: [0, M.waistY, 0],
    Chest: [0, M.chestY, 0],
    Neck: [0, M.shoulderY + 0.01, 0],
    Head: [0, M.shoulderY + 0.115, 0],
    L_Shoulder: [0.05, M.shoulderY - 0.015, 0],
    L_UpperArm: [M.shoulderX, M.shoulderY - 0.018, 0],
    L_LowerArm: [M.shoulderX + 0.085, M.waistY + 0.02, 0.015],
    L_Hand: [M.shoulderX + 0.15, M.hipY - 0.02, 0.03],
    L_UpperLeg: [0.088, M.hipY - 0.01, 0],
    L_LowerLeg: [0.09, M.kneeY, 0.008],
    L_Foot: [0.09, M.ankleY, 0],
  };
  for (const [n, p] of Object.entries({ ...J })) {
    if (n.startsWith('L_')) J['R_' + n.slice(2)] = [-p[0], p[1], p[2]];
  }
  const HIER = {
    Hips: null, Spine: 'Hips', Chest: 'Spine', Neck: 'Chest', Head: 'Neck',
    L_Shoulder: 'Chest', L_UpperArm: 'L_Shoulder', L_LowerArm: 'L_UpperArm', L_Hand: 'L_LowerArm',
    R_Shoulder: 'Chest', R_UpperArm: 'R_Shoulder', R_LowerArm: 'R_UpperArm', R_Hand: 'R_LowerArm',
    L_UpperLeg: 'Hips', L_LowerLeg: 'L_UpperLeg', L_Foot: 'L_LowerLeg',
    R_UpperLeg: 'Hips', R_LowerLeg: 'R_UpperLeg', R_Foot: 'R_LowerLeg',
  };
  const ORDER = Object.keys(HIER);           // fixed bone order = stable skinIndex
  const bones = {};
  for (const name of ORDER) {
    const b = new THREE.Bone();
    b.name = name;
    bones[name] = b;
    const parent = HIER[name];
    const wp = J[name], pp = parent ? J[parent] : [0, 0, 0];
    b.position.set(wp[0] - pp[0], wp[1] - pp[1], wp[2] - pp[2]);
    if (parent) bones[parent].add(b);
  }
  return { root: bones.Hips, bones, ORDER, J,
    index: Object.fromEntries(ORDER.map((n, i) => [n, i])) };
}

// ============================================================================
// Skinned geometry helpers
// ============================================================================
function setWeights(geo, weightFn) {
  const pos = geo.attributes.position;
  const si = new Uint16Array(pos.count * 4);
  const sw = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    let pairs = weightFn(pos.getX(i), pos.getY(i), pos.getZ(i)).slice(0, 4);
    const total = pairs.reduce((a, [, w]) => a + w, 0) || 1;
    pairs.forEach(([bi, w], k) => { si[i * 4 + k] = bi; sw[i * 4 + k] = w / total; });
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return geo;
}

// Tapered tube from a→b owned by `bone`, blending to prev/next bones at ends.
function tube(a, b, rA, rB, S, bone, prevBone, nextBone, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va), len = dir.length();
  const geo = new THREE.CylinderGeometry(rB, rA, len, 22, seg, false);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  m.setPosition(va.clone().add(vb).multiplyScalar(0.5));
  geo.applyMatrix4(m);
  const axis = dir.clone().normalize();
  return setWeights(geo, (x, y, z) => {
    const t = new THREE.Vector3(x, y, z).sub(va).dot(axis) / len;   // 0 at a, 1 at b
    const bi = S.index[bone];
    if (prevBone != null && t < 0.24) {
      const f = t / 0.24;
      return [[S.index[prevBone], 1 - f * 0.5 - 0.5], [bi, 0.5 + f * 0.5]];
    }
    if (nextBone != null && t > 0.76) {
      const f = (t - 0.76) / 0.24;
      return [[bi, 1 - f * 0.5], [S.index[nextBone], f * 0.5]];
    }
    return [[bi, 1]];
  });
}

function capSphere(at, r, S, weights, widthSeg = 20, scale = null) {
  const geo = new THREE.SphereGeometry(r, widthSeg, 14);
  if (scale) geo.applyMatrix4(new THREE.Matrix4().makeScale(...scale));
  geo.translate(...at);
  return setWeights(geo, () => weights.map(([n, w]) => [S.index[n], w]));
}

// Lathe surface with y-band torso weighting (Hips → Spine → Chest).
function torsoLathe(pts, S, zSquash = 0.88, offset = 0, yMin = -1, yMax = 99) {
  const use = pts.filter(([, y]) => y >= yMin && y <= yMax).map(([r, y]) => [r + offset, y]);
  if (yMin > 0) use.unshift([profileRadiusAt(pts, yMin) + offset, yMin]);
  if (yMax < 10) use.push([profileRadiusAt(pts, yMax) + offset, yMax]);
  const curve = new THREE.SplineCurve(use.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)));
  const geo = new THREE.LatheGeometry(curve.getPoints(40), 30);
  geo.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, zSquash));
  const bandY = { hips: 1.16, spine: 1.35 };
  return setWeights(geo, (x, y) => {
    const blend = (edge, w) => THREE.MathUtils.smoothstep(y, edge - w, edge + w);
    const s1 = blend(bandY.hips, 0.05), s2 = blend(bandY.spine, 0.05);
    return [[S.index.Hips, (1 - s1)], [S.index.Spine, s1 * (1 - s2)], [S.index.Chest, s1 * s2]];
  });
}

function ring(y, r, tubeR, S, weights, zSquash = 0.88) {
  const geo = new THREE.TorusGeometry(r, tubeR, 8, 22);
  geo.rotateX(Math.PI / 2);
  geo.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, zSquash));
  geo.translate(0, y, 0);
  return setWeights(geo, () => weights.map(([n, w]) => [S.index[n], w]));
}

function skinnedMesh(name, geos, matName, skeleton, color = 0xcccccc, visible = true) {
  const geo = mergeGeometries(geos, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, name: matName });
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.name = name;
  mesh.visible = visible;
  mesh.frustumCulled = false;
  return mesh;
}

// ============================================================================
// Body + limbs
// ============================================================================
function buildBodyGeos(M, S, bodyType) {
  const P = bodyProfile(M, bodyType);
  const g = [];
  g.push(torsoLathe(P, S, bodyType === 'male' ? 0.95 : 0.88));

  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1;
    const hip = [s * 0.088, M.hipY - 0.01, 0], knee = [s * 0.09, M.kneeY, 0.008], ankle = [s * 0.09, M.ankleY, 0];
    g.push(tube(hip, knee, M.thighR, M.calfR, S, `${side}_UpperLeg`, 'Hips', `${side}_LowerLeg`));
    g.push(capSphere(knee, M.calfR, S, [[`${side}_UpperLeg`, 0.5], [`${side}_LowerLeg`, 0.5]]));
    g.push(tube(knee, ankle, M.calfR, M.ankleR, S, `${side}_LowerLeg`, `${side}_UpperLeg`, `${side}_Foot`));
    // simple foot wedge (shoes cover it)
    g.push(capSphere([s * 0.09, 0.055, 0.05], 0.035, S, [[`${side}_Foot`, 1]], 12, [1, 0.65, 1.9]));

    const sh = S.J[`${side}_UpperArm`], el = S.J[`${side}_LowerArm`], wr = S.J[`${side}_Hand`];
    g.push(capSphere(sh, 0.047, S, [[`${side}_Shoulder`, 0.4], [`${side}_UpperArm`, 0.6]]));
    g.push(tube(sh, el, M.armR, M.foreR, S, `${side}_UpperArm`, `${side}_Shoulder`, `${side}_LowerArm`));
    g.push(capSphere(el, M.foreR, S, [[`${side}_UpperArm`, 0.5], [`${side}_LowerArm`, 0.5]]));
    g.push(tube(el, wr, M.foreR, M.wristR, S, `${side}_LowerArm`, `${side}_UpperArm`, `${side}_Hand`));
    // small rounded hand: palm + finger mitt + thumb, rigid to the hand bone
    const hw = [[`${side}_Hand`, 1]];
    g.push(capSphere(wr, 0.026, S, hw, 12, [0.9, 1.2, 1.15]));
    g.push(capSphere([wr[0] + s * 0.008, wr[1] - 0.045, wr[2] + 0.008], 0.019, S, hw, 10, [1.05, 0.85, 1.4]));
    g.push(capSphere([wr[0] - s * 0.018, wr[1] - 0.014, wr[2] + 0.018], 0.011, S, hw, 8));
  }

  // neck
  g.push(tube([0, M.shoulderY - 0.025, 0.004], [0, M.shoulderY + 0.12, 0.006],
    M.neckR + 0.002, M.neckR - 0.004, S, 'Neck', 'Chest', 'Head'));
  return g;
}

// ============================================================================
// Wardrobe (female) — each item a named SkinnedMesh on the shared skeleton
// ============================================================================
function buildWardrobe(M, S) {
  const P = bodyProfile(M, 'female');
  const meshes = [];
  const add = (name, geos, color = 0xffffff) =>
    meshes.push({ name, geos, color });

  const topBand = (yBottom, extra = []) => [
    torsoLathe(P, S, 0.88, 0.016, yBottom, M.shoulderY),
    ring(yBottom, profileRadiusAt(P, yBottom) + 0.014, 0.013, S, [[ 'Spine', 1 ]]),
    ...extra,
  ];
  const sleeves = (len) => { // len 0..1 along upper arm
    const out = [];
    for (const side of ['L', 'R']) {
      const sh = S.J[`${side}_UpperArm`], el = S.J[`${side}_LowerArm`];
      const end = new THREE.Vector3(...sh).lerp(new THREE.Vector3(...el), len).toArray();
      out.push(capSphere(sh, 0.052, S, [[`${side}_Shoulder`, 0.4], [`${side}_UpperArm`, 0.6]]));
      out.push(tube(sh, end, M.armR + 0.012, M.foreR + 0.012, S, `${side}_UpperArm`, `${side}_Shoulder`, null, 6));
    }
    return out;
  };
  const pantsHip = () => [
    torsoLathe(P, S, 0.88, 0.013, M.hipY - 0.088, M.waistY + 0.005),
    ring(M.waistY + 0.005, profileRadiusAt(P, M.waistY) + 0.024, 0.014, S, [['Spine', 1]]),
  ];
  const pantLegs = (rT, rB, cuffY) => {
    const out = [];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const hip = [s * 0.088, M.hipY - 0.01, 0], knee = [s * 0.09, M.kneeY, 0.008];
      out.push(tube(hip, knee, rT, rB + 0.012, S, `${side}_UpperLeg`, 'Hips', `${side}_LowerLeg`));
      out.push(capSphere(knee, rB + 0.012, S, [[`${side}_UpperLeg`, 0.5], [`${side}_LowerLeg`, 0.5]]));
      out.push(tube(knee, [s * 0.09, cuffY, 0.004], rB + 0.012, rB, S, `${side}_LowerLeg`, `${side}_UpperLeg`, null, 6));
      const cuff = new THREE.TorusGeometry(rB + 0.004, 0.013, 8, 18);
      cuff.rotateX(Math.PI / 2);
      cuff.translate(s * 0.09, cuffY, 0.004);
      out.push(setWeights(cuff, () => [[S.index[`${side}_LowerLeg`], 1]]));
    }
    return out;
  };

  // --- tops ---
  add('top_cropHoodie', [
    ...topBand(M.waistY + 0.055),
    ...sleeves(1),
    capSphere([0, M.shoulderY - 0.005, -0.115], 0.082, S, [['Chest', 1]], 14, [1.35, 0.72, 0.85]), // hood
    ring(M.shoulderY - 0.02, 0.083, 0.018, S, [['Chest', 1]]),
  ]);
  add('top_cropZip', [...topBand(M.waistY + 0.055), ...sleeves(1),
    ring(M.shoulderY - 0.015, 0.075, 0.014, S, [['Chest', 1]])]);
  add('top_strap', [
    torsoLathe(P, S, 0.88, 0.015, M.waistY + 0.05, M.chestY + 0.06),
    ring(M.waistY + 0.05, profileRadiusAt(P, M.waistY + 0.05) + 0.013, 0.012, S, [['Spine', 1]]),
  ]);
  { // fur coat: band + fluff bumps
    const fur = [torsoLathe(P, S, 0.88, 0.02, M.hipY + 0.05, M.shoulderY), ...sleeves(1)];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const y = M.hipY + 0.08 + (i % 5) * 0.085;
      const r = profileRadiusAt(P, y) + 0.026;
      fur.push(capSphere([Math.cos(a) * r, y, Math.sin(a) * r * 0.88], 0.038 + (i % 3) * 0.011, S,
        [[y > 1.35 ? 'Chest' : y > 1.16 ? 'Spine' : 'Hips', 1]], 8));
    }
    add('top_fur', fur);
  }

  // --- bottoms ---
  add('bottom_joggers', [...pantsHip(), ...pantLegs(0.084, 0.048, 0.185)]);
  add('bottom_cargo', [...pantsHip(), ...pantLegs(0.088, 0.05, 0.185),
    capSphere([0.135, 0.72, 0.03], 0.036, S, [['L_UpperLeg', 1]], 10, [0.7, 1.3, 1.1]),
    capSphere([-0.135, 0.72, 0.03], 0.036, S, [['R_UpperLeg', 1]], 10, [0.7, 1.3, 1.1])]);
  { // flares
    const fl = [...pantsHip()];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      fl.push(tube([s * 0.088, M.hipY - 0.01, 0], [s * 0.09, M.kneeY, 0.008], 0.078, 0.058, S, `${side}_UpperLeg`, 'Hips', `${side}_LowerLeg`));
      fl.push(tube([s * 0.09, M.kneeY, 0.008], [s * 0.09, 0.085, 0.004], 0.058, 0.135, S, `${side}_LowerLeg`, `${side}_UpperLeg`, null, 6));
    }
    add('bottom_flare', fl);
  }
  add('bottom_skirt', [
    torsoLathe([[0.245, 0.86], [0.2, 0.95], [M.hipR + 0.018, M.hipY + 0.03], [M.waistR + 0.018, M.waistY - 0.02]], S, 0.88),
    ring(M.waistY - 0.02, M.waistR + 0.03, 0.016, S, [['Spine', 1]]),
    ring(0.86, 0.24, 0.013, S, [['Hips', 1]]),
  ]);
  add('dress_slip', [
    torsoLathe([[0.30, 0.64], [0.24, 0.80], [M.hipR + 0.02, M.hipY + 0.02],
      [M.waistR + 0.02, M.waistY], [M.bustR + 0.016, M.chestY], [0.104, M.chestY + 0.055]], S, 0.88),
    ring(0.64, 0.295, 0.014, S, [['Hips', 1]]),
  ]);

  // --- shoes (both feet in one mesh, rigid to foot bones) ---
  const shoeGeos = (style) => {
    const out = [];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const w = [[`${side}_Foot`, 1]];
      const x = s * 0.09;
      if (style === 'heel') {
        out.push(tube([x, 0.115, -0.01], [x, 0.055, 0.07], 0.026, 0.02, S, `${side}_Foot`, null, null, 4));
        out.push(capSphere([x, 0.035, 0.14], 0.024, S, w, 10, [1, 0.62, 1.5]));
        const pin = new THREE.CylinderGeometry(0.008, 0.01, 0.1, 8);
        pin.translate(x, 0.05, -0.04);
        out.push(setWeights(pin, () => [[S.index[`${side}_Foot`], 1]]));
      } else {
        const sole = new THREE.CapsuleGeometry(0.05, 0.135, 6, 12);
        sole.rotateX(Math.PI / 2);
        sole.applyMatrix4(new THREE.Matrix4().makeScale(1, 0.42, 1));
        sole.translate(x, 0.03, 0.055);
        out.push(setWeights(sole, () => [[S.index[`${side}_Foot`], 1]]));
        out.push(tube([x, 0.08, -0.02], [x, 0.066, 0.115], 0.045, 0.037, S, `${side}_Foot`, null, null, 4));
        out.push(capSphere([x, 0.06, 0.13], 0.036, S, w, 10, [1, 0.8, 1.2]));
      }
    }
    return out;
  };
  add('shoe_sneaker', shoeGeos('sneaker'));
  add('shoe_heel', shoeGeos('heel'));

  return meshes;
}

// ============================================================================
// Baked animation clips (subtle idle + groovier sway for blending demos)
// ============================================================================
function makeClips(M) {
  // Generic sampled tracks: fn(u) with u in [0,1) over the loop.
  const qT = (bone, dur, steps, fn) => {
    const times = [], values = [];
    const e = new THREE.Euler(), q = new THREE.Quaternion();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      times.push(u * dur);
      const [x, y, z] = fn(u);
      e.set(x, y, z);
      q.setFromEuler(e);
      values.push(q.x, q.y, q.z, q.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
  };
  const pT = (bone, dur, steps, base, fn) => {
    const times = [], values = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      times.push(u * dur);
      const [x, y, z] = fn(u);
      values.push(base[0] + x, base[1] + y, base[2] + z);
    }
    return new THREE.VectorKeyframeTrack(`${bone}.position`, times, values);
  };
  const TAU = Math.PI * 2;
  const hipsBase = [0, M.hipY - 0.005, 0];

  // --- idle: breathing + slow weight shift + arm micro-motion (additive) ---
  const idle = new THREE.AnimationClip('idle', 6, [
    qT('Spine', 6, 48, (u) => [Math.sin(u * TAU * 1.5) * 0.022, 0, Math.sin(u * TAU) * 0.02]),
    qT('Chest', 6, 48, (u) => [Math.sin(u * TAU * 1.5 + 0.8) * 0.014, 0, Math.sin(u * TAU + 0.6) * 0.012]),
    qT('Hips', 6, 48, (u) => [0, 0, Math.sin(u * TAU) * 0.018]),
    qT('Neck', 6, 48, (u) => [0, Math.sin(u * TAU * 0.5 + 1.1) * 0.03, Math.sin(u * TAU + 1.6) * 0.015]),
    qT('L_UpperArm', 6, 48, (u) => [Math.sin(u * TAU + 0.2) * 0.018, 0, Math.sin(u * TAU * 1.5) * 0.02]),
    qT('R_UpperArm', 6, 48, (u) => [Math.sin(u * TAU + 1.1) * 0.018, 0, Math.sin(u * TAU * 1.5 + 0.9) * 0.02]),
  ]);

  // --- walk: full-body in-place walk cycle (base clip) ---
  const W = 1.05, ws = 40;
  const swing = 0.52, knee = 0.85;
  const walk = new THREE.AnimationClip('walk', W, [
    qT('L_UpperLeg', W, ws, (u) => [swing * Math.sin(u * TAU), 0.04, 0]),
    qT('R_UpperLeg', W, ws, (u) => [swing * Math.sin(u * TAU + Math.PI), -0.04, 0]),
    qT('L_LowerLeg', W, ws, (u) => [Math.max(0.06, knee * Math.sin(u * TAU + 2.4)), 0, 0]),
    qT('R_LowerLeg', W, ws, (u) => [Math.max(0.06, knee * Math.sin(u * TAU + 2.4 + Math.PI)), 0, 0]),
    qT('L_Foot', W, ws, (u) => [-0.28 * Math.sin(u * TAU + 0.5), 0, 0]),
    qT('R_Foot', W, ws, (u) => [-0.28 * Math.sin(u * TAU + 0.5 + Math.PI), 0, 0]),
    qT('L_UpperArm', W, ws, (u) => [0.4 * Math.sin(u * TAU + Math.PI), 0, 0.08]),
    qT('R_UpperArm', W, ws, (u) => [0.4 * Math.sin(u * TAU), 0, -0.08]),
    qT('L_LowerArm', W, ws, (u) => [-0.3 + 0.14 * Math.sin(u * TAU + Math.PI), 0, 0]),
    qT('R_LowerArm', W, ws, (u) => [-0.3 + 0.14 * Math.sin(u * TAU), 0, 0]),
    qT('Hips', W, ws, (u) => [0, 0.09 * Math.sin(u * TAU), 0.03 * Math.sin(u * TAU * 2 + 1.2)]),
    qT('Spine', W, ws, (u) => [0.03, -0.08 * Math.sin(u * TAU), 0]),
    qT('Chest', W, ws, (u) => [0.02, -0.05 * Math.sin(u * TAU), 0]),
    qT('Head', W, ws, (u) => [-0.03, 0.04 * Math.sin(u * TAU), 0]),
    pT('Hips', W, ws, hipsBase, (u) => [0, 0.024 * Math.sin(u * TAU * 2 + Math.PI / 2) - 0.012, 0]),
  ]);

  // --- dance: hip sway, alternating arm raises, head bounce (base clip) ---
  const D = 1.9, ds = 40;
  const dance = new THREE.AnimationClip('dance', D, [
    qT('Hips', D, ds, (u) => [0, 0.18 * Math.sin(u * TAU * 0.5), 0.14 * Math.sin(u * TAU)]),
    qT('Spine', D, ds, (u) => [0.05 * Math.sin(u * TAU * 2), 0, -0.11 * Math.sin(u * TAU)]),
    qT('Chest', D, ds, (u) => [0.04 * Math.sin(u * TAU * 2 + 0.6), 0, -0.08 * Math.sin(u * TAU + 0.4)]),
    qT('Head', D, ds, (u) => [0.09 * Math.sin(u * TAU * 2 + 1.2), 0, 0.06 * Math.sin(u * TAU + 1)]),
    qT('L_UpperArm', D, ds, (u) => [0.15 * Math.sin(u * TAU * 2), 0, 0.55 + 0.75 * Math.sin(u * TAU)]),
    qT('R_UpperArm', D, ds, (u) => [0.15 * Math.sin(u * TAU * 2 + Math.PI), 0, -0.55 - 0.75 * Math.sin(u * TAU + Math.PI)]),
    qT('L_LowerArm', D, ds, (u) => [-1.05 + 0.25 * Math.sin(u * TAU * 2), 0, 0]),
    qT('R_LowerArm', D, ds, (u) => [-1.05 + 0.25 * Math.sin(u * TAU * 2 + Math.PI), 0, 0]),
    qT('L_UpperLeg', D, ds, (u) => [0.06 * Math.sin(u * TAU), 0, 0.05 * Math.sin(u * TAU)]),
    qT('R_UpperLeg', D, ds, (u) => [0.06 * Math.sin(u * TAU + Math.PI), 0, 0.05 * Math.sin(u * TAU)]),
    pT('Hips', D, ds, hipsBase, (u) => [0, 0.03 * Math.sin(u * TAU * 2 + Math.PI / 2) - 0.015, 0]),
  ]);

  // --- wave: right arm raised, forearm waving (base clip) ---
  const V = 1.6, vs = 32;
  const wave = new THREE.AnimationClip('wave', V, [
    qT('R_UpperArm', V, vs, () => [-0.35, 0, -1.9]),
    qT('R_LowerArm', V, vs, (u) => [-0.5, 0, -0.45 * Math.sin(u * TAU * 2)]),
    qT('R_Hand', V, vs, (u) => [0, 0, -0.25 * Math.sin(u * TAU * 2)]),
    qT('L_UpperArm', V, vs, () => [0.08, 0, 0.12]),
    qT('L_LowerArm', V, vs, () => [-0.3, 0, 0]),
    qT('Hips', V, vs, (u) => [0, 0, 0.04 + 0.015 * Math.sin(u * TAU)]),
    qT('Spine', V, vs, (u) => [0, 0, -0.03 + 0.01 * Math.sin(u * TAU + 1)]),
    qT('Head', V, vs, (u) => [0, -0.08, 0.05 + 0.02 * Math.sin(u * TAU)]),
  ]);

  return [idle, walk, dance, wave];
}

// ============================================================================
// Assemble + export
// ============================================================================
async function exportBody(bodyType) {
  const M = measurements(bodyType);
  const S = buildSkeleton(M);
  const scene = new THREE.Scene();
  scene.name = `ccs_${bodyType}`;
  scene.add(S.root);
  scene.updateMatrixWorld(true);

  const skeleton = new THREE.Skeleton(S.ORDER.map((n) => S.bones[n]));

  const attach = (mesh) => { mesh.bind(skeleton); scene.add(mesh); };

  attach(skinnedMesh('Body', buildBodyGeos(M, S, bodyType), 'MAT_skin', skeleton, 0xb98055));

  if (bodyType === 'female') {
    for (const { name, geos } of buildWardrobe(M, S)) {
      const mesh = skinnedMesh(name, geos, 'MAT_' + name, skeleton, 0xdddddd, true);
      attach(mesh);
    }
  } else {
    // basic starter outfit so the male base is presentable out of the box
    const P = bodyProfile(M, 'male');
    attach(skinnedMesh('top_tee', [
      torsoLathe(P, S, 0.95, 0.016, M.hipY + 0.03, M.shoulderY),
      ...(() => { // short sleeves
        const out = [];
        for (const side of ['L', 'R']) {
          const sh = S.J[`${side}_UpperArm`], el = S.J[`${side}_LowerArm`];
          const end = new THREE.Vector3(...sh).lerp(new THREE.Vector3(...el), 0.45).toArray();
          out.push(tube(sh, end, M.armR + 0.014, M.armR + 0.01, S, `${side}_UpperArm`, `${side}_Shoulder`, null, 4));
        }
        return out;
      })(),
    ], 'MAT_top_tee', skeleton, 0x8899aa, true));
    attach(skinnedMesh('bottom_shorts', [
      torsoLathe(P, S, 0.95, 0.013, M.hipY - 0.088, M.waistY + 0.005),
      ...(() => {
        const out = [];
        for (const side of ['L', 'R']) {
          const s = side === 'L' ? 1 : -1;
          out.push(tube([s * 0.088, M.hipY - 0.01, 0], [s * 0.09, M.kneeY + 0.12, 0.005],
            M.thighR + 0.014, M.thighR + 0.008, S, `${side}_UpperLeg`, 'Hips', null, 4));
        }
        return out;
      })(),
    ], 'MAT_bottom_shorts', skeleton, 0x445566, true));
  }

  const clips = makeClips(M);
  const exporter = new GLTFExporter();
  const glb = await new Promise((resolve, reject) =>
    exporter.parse(scene, resolve, reject, { binary: true, animations: clips, onlyVisible: false }));
  const file = path.join(OUT_DIR, `base_${bodyType}.glb`);
  fs.writeFileSync(file, Buffer.from(glb));
  console.log(`✓ ${file}  (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}

await exportBody('female');
await exportBody('male');
console.log('done');

// ============================================================================
// avatar3d.js — the real-time character viewer (Three.js).
//
// The player is a fully rigged humanoid: a skinned GLB body on a standard
// humanoid skeleton (assets/characters/base_*.glb, loaded via CharacterRig).
// Customization SWAPS meshes and materials — outfits are named SkinnedMesh
// slots on the shared skeleton; nothing is rebuilt from primitives.
//
// Pipeline per character:
//   body (GLB, skinned) → skin material → wardrobe slots (clothing/shoes)
//   → face module (Head bone) → hair module (Head bone) → jewelry (bones)
//   → pose (baked base clip) → additive animation layers (idle/groove)
//
// The face + hair modules and the living expression system ride on the Head
// bone, so they follow every animation for free. Drag to spin; look changes
// re-equip the rig without reloading assets.
// ============================================================================

import * as THREE from 'three';
import { CharacterRig } from './character-rig.js';

const CCS = window.CCS;

let renderer = null, scene, camera, stage, charGroup;
let host = null, rafId = 0, clock = null;
let swayers = [];            // hair meshes that sway: { m, phase, amp, baseX }
let spinTarget = 0.5, spin = 0.5, dragging = false, lastX = 0;
let available = true;

// --- rig + facial animation state ------------------------------------------
let rig = null;              // the CharacterRig instance
let headModule = null;       // face+hair group attached to the Head bone
let buildToken = 0;
let readyPromise = Promise.resolve();
let faceRig = null;
let prevT = 0;
let lastHeadC = 1.72;
let camFocus = 'full';
const anim = {
  expr: {},
  blink: { next: 1.5, start: -1, count: 0 },
  gaze: { x: 0, y: 0, tx: 0, ty: 0, next: 0 },
  browPulse: { next: 4, until: -1 },
};

// The signature stance: selfie arm up, soft contrapposto. Baked into a base
// pose clip so the additive idle/groove layers play on top of it.
const POSE = {
  Hips: [0, 0, 0.04],
  Spine: [0, 0, -0.025],
  Chest: [0, 0, -0.012],
  L_UpperArm: [-0.55, 0, 0.30],
  L_LowerArm: [-1.75, 0, 0.15],
  R_UpperArm: [0.08, 0, 0.10],
  R_LowerArm: [-0.35, 0, 0.05],
  L_UpperLeg: [-0.10, 0.15, 0],
  L_LowerLeg: [0.18, 0, 0],
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
function ensureRenderer() {
  if (renderer || !available) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  } catch (e) {
    console.warn('[avatar3d] WebGL unavailable', e);
    available = false;
    return null;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120b1c);
  scene.fog = new THREE.Fog(0x120b1c, 6, 14);

  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 1.42, 4.7);
  camera.lookAt(0, 1.04, 0);

  buildStage();
  charGroup = new THREE.Group();
  scene.add(charGroup);

  clock = new THREE.Clock();

  // Drag to spin.
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spinTarget += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', () => { dragging = false; });

  return renderer;
}

function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.roughness ?? 0.72, metalness: o.metalness ?? 0.05,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
    ...(o.flat ? { flatShading: true } : {}),
  });
}

function ball(group, pos, r, material, scale = null) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 18), material);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  group.add(m);
  return m;
}

// Tapered capsule between two points (used by the brow builder).
function limbT(group, a, b, rA, rB, material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rB, rA, len, 16, 1), material);
  cyl.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  group.add(cyl);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(rA, 16, 12), material);
  capA.position.copy(va);
  group.add(capA);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(rB, 16, 12), material);
  capB.position.copy(vb);
  group.add(capB);
  return cyl;
}

// ---------------------------------------------------------------------------
// The neon-glam stage
// ---------------------------------------------------------------------------
function buildStage() {
  stage = new THREE.Group();
  scene.add(stage);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x18101f, roughness: 0.35, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  stage.add(floor);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.09, 48),
    new THREE.MeshStandardMaterial({ color: 0x241631, roughness: 0.3, metalness: 0.5 }));
  platform.position.y = 0.045;
  stage.add(platform);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.022, 12, 64),
    mat(0xff5fae, { emissive: 0xff2f92, emissiveIntensity: 2.2, roughness: 0.4 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.095;
  stage.add(ring);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 7),
    new THREE.MeshStandardMaterial({ color: 0x191024, roughness: 0.9 }));
  wall.position.set(0, 3.5, -3.2);
  stage.add(wall);

  const heartShape = new THREE.Shape();
  heartShape.moveTo(0.25, 0.25);
  heartShape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  heartShape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  heartShape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  heartShape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  heartShape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  heartShape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape, { depth: 0.04, bevelEnabled: false }),
    mat(0xff7fc0, { emissive: 0xff2f92, emissiveIntensity: 2.6 }));
  heart.scale.set(0.55, 0.55, 0.55);
  heart.rotation.z = Math.PI;
  heart.position.set(1.95, 2.45, -3.1);
  stage.add(heart);

  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.95 - i * 0.16, 4, 8),
      mat(0xff8fc8, { emissive: 0xff4fa6, emissiveIntensity: 2.2 }));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(1.15 - i * 0.07, 2.62 - i * 0.3, -3.1);
    stage.add(bar);
  }

  for (let i = 0; i < 6; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10),
      mat(0xfff2d9, { emissive: 0xffd9a0, emissiveIntensity: 2.4 }));
    dot.position.set(-2.4, 1.4 + i * 0.42, -3.05);
    stage.add(dot);
  }

  scene.add(new THREE.AmbientLight(0x8a6faf, 0.55));
  const key = new THREE.SpotLight(0xfff0f6, 55, 0, 0.55, 0.5, 1.6);
  key.position.set(1.6, 4.4, 3.6);
  key.target.position.set(0, 1, 0);
  scene.add(key, key.target);
  const pink = new THREE.PointLight(0xff4fa0, 26, 12, 1.7);
  pink.position.set(-2.4, 2.2, -1.2);
  scene.add(pink);
  const blue = new THREE.PointLight(0x5f8fff, 16, 12, 1.7);
  blue.position.set(2.6, 1.6, -1.6);
  scene.add(blue);
  const fill = new THREE.PointLight(0xffc9e2, 8, 10, 1.8);
  fill.position.set(0, 1.2, 3.2);
  scene.add(fill);
}

// ---------------------------------------------------------------------------
// Character assembly — load rig, equip wardrobe, attach modules, pose, animate
// ---------------------------------------------------------------------------
function buildCharacter() {
  const token = ++buildToken;
  readyPromise = (async () => {
    const look = CCS.sim.avatar.resolved();
    const bodyType = CCS.sim.avatar.get().bodyType || 'female';

    let newRig;
    try {
      newRig = await CharacterRig.create({ bodyType });
    } catch (e) {
      console.error('[avatar3d] failed to load character asset', e);
      return;
    }
    if (token !== buildToken) { newRig.dispose(); return; }

    // swap in the new rig
    if (rig) rig.dispose();
    faceRig = null;
    swayers = [];
    rig = newRig;
    charGroup.add(rig.root);

    applyLookToRig(look);
    rig.pose(POSE);
    rig.playAdditive('idle');

    // jewelry + phone as bone accessories
    const gold = () => mat(0xd4af37, { metalness: 0.85, roughness: 0.25 });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.005, 8, 22), gold());
    chain.position.set(0, 0.115, 0.042);
    chain.rotation.x = Math.PI / 2 - 0.52;
    rig.attachTo('Chest', chain);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.014),
      mat(0xf27ab8, { roughness: 0.35, metalness: 0.2 }));
    phone.position.set(0.015, -0.06, 0.05);
    phone.rotation.set(-0.5, 0.3, 0.1);
    rig.attachTo('L_Hand', phone);

    buildHeadModule(look);
  })();
  return readyPromise;
}

// Equip wardrobe slots + tint materials from the outfit preset (data-avatar).
function applyLookToRig(look) {
  const o = look.outfit;
  rig.tintSkin(look.skin);
  rig.equip(o.slots || {});
  const s = o.slots || {};
  if (s.top) rig.tintMesh(s.top, { color: o.top.color, roughness: o.top.fur ? 0.95 : 0.78 });
  if (s.bottom) rig.tintMesh(s.bottom, {
    color: o.bottom.color,
    roughness: o.bottom.sheen ? 0.32 : 0.8,
    emissive: o.bottom.sparkle ? o.bottom.color : 0x000000,
    emissiveIntensity: o.bottom.sparkle ? 0.18 : 1,
  });
  if (s.dress) rig.tintMesh(s.dress, { color: o.bottom.color, roughness: o.bottom.sheen ? 0.32 : 0.7 });
  if (s.shoe) rig.tintMesh(s.shoe, { color: o.shoes.main, roughness: o.shoes.style === 'heel' ? 0.3 : 0.5 });
}

// The face + hair module rides on the Head bone (follows all animation).
function buildHeadModule(look) {
  if (headModule) {
    headModule.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
    headModule.removeFromParent();
  }
  faceRig = null;
  swayers = [];

  const P = CCS.sim.avatar.proportions();
  const M = { headR: 0.115 * P.headScale };
  lastHeadC = 1.72;

  headModule = new THREE.Group();
  headModule.position.set(0, 0.085, 0.004);   // head-bone origin → head center
  headModule.rotation.z = 0.028;               // soft tilt (animated around this)
  headModule.rotation.y = -0.06;
  if (P.headScale !== 1) headModule.scale.setScalar(P.headScale);
  rig.attachTo('Head', headModule);

  const skin = () => mat(look.skin, { roughness: 0.5 });
  const hairM = () => mat(look.hairColor, { roughness: 0.82 });
  const gold = () => mat(0xd4af37, { metalness: 0.85, roughness: 0.25 });
  buildFace(headModule, M, look, skin, hairM, gold);
  buildHair(headModule, look.hairStyle, hairM, M);
}

// --- Face ---------------------------------------------------------------------
// Local space: head center = origin, radius M.headR (default 0.115).
// Builds the glam face AND registers every animatable part on `faceRig`.
function buildFace(h, M, look, skin, hairM, gold) {
  const r = M.headR;

  const skinC = new THREE.Color(look.skin);
  const faceSkin = () => new THREE.MeshPhysicalMaterial({
    color: look.skin, roughness: 0.5, metalness: 0.02,
    sheen: 0.45, sheenColor: skinC.clone().lerp(new THREE.Color(0xfff1e6), 0.3), sheenRoughness: 0.65,
  });
  const lipC = skinC.clone().lerp(new THREE.Color(0xb84a66), 0.62);
  const blushC = skinC.clone().lerp(new THREE.Color(0xff5f7e), 0.42);
  const linerC = 0x1c1116;

  // ---- head structure ----
  ball(h, [0, 0, 0], r, faceSkin(), [0.96, 1.08, 0.98]);                    // cranium
  ball(h, [0, -0.05, 0.018], 0.08, faceSkin(), [0.88, 0.8, 0.92]);          // jaw
  ball(h, [0, -0.1, 0.038], 0.024, faceSkin(), [1.05, 0.78, 0.9]);          // chin
  for (const side of [-1, 1]) {
    ball(h, [side * 0.056, -0.02, 0.05], 0.026, faceSkin(), [0.9, 0.7, 0.55]); // cheekbone (embedded)
  }

  faceRig = {
    head: h, eyes: [], brows: [], blushMats: [], skinC, blushC,
    headBase: { tilt: h.rotation.z, yaw: h.rotation.y },
  };

  // ---- blush layer (color animates between skin and blush) ----
  for (const side of [-1, 1]) {
    const bm = new THREE.MeshStandardMaterial({ color: skinC.clone(), roughness: 0.55 });
    ball(h, [side * 0.055, -0.028, 0.066], 0.021, bm, [1.05, 0.62, 0.42]);
    faceRig.blushMats.push(bm);
  }

  // ---- eyes: white + lids + liner/lashes + mobile iris group ----
  for (const side of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(side * 0.047, 0.014, 0.082);
    h.add(eg);

    const white = new THREE.Mesh(new THREE.SphereGeometry(0.0255, 20, 16),
      mat(0xfefefe, { roughness: 0.22 }));
    white.scale.set(1.18, 1.05, 0.55);
    eg.add(white);

    const ig = new THREE.Group();
    ig.position.set(0, 0, 0.009);
    eg.add(ig);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 12), mat(0x4a2a18, { roughness: 0.25 }));
    iris.scale.set(1, 1, 0.5);
    iris.position.z = 0.004;
    ig.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 12, 10), mat(0x120a08, { roughness: 0.2 }));
    pupil.scale.set(1, 1, 0.5);
    pupil.position.z = 0.0075;
    ig.add(pupil);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 8),
      mat(0xffffff, { roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    spark.position.set(side * 0.0045, 0.005, 0.0105);
    ig.add(spark);

    const lidUp = new THREE.Group();
    lidUp.position.set(0, 0.0195, 0.001);
    eg.add(lidUp);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0265, 18, 14), faceSkin());
    lid.scale.set(1.18, 0.72, 0.62);
    lidUp.add(lid);
    const liner = new THREE.Mesh(new THREE.SphereGeometry(0.0245, 18, 12), mat(linerC, { roughness: 0.45 }));
    liner.scale.set(1.24, 0.17, 0.5);
    liner.position.set(0, -0.003, 0.009);
    lidUp.add(liner);
    for (let i = 0; i < 2; i++) {
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.0012, 0.0085 - i * 0.002, 3, 5), mat(linerC, { roughness: 0.5 }));
      lash.position.set(side * (0.027 + i * 0.0035), 0.0015 + i * 0.0035, 0.007);
      lash.rotation.z = side * -(0.95 + i * 0.25);
      lidUp.add(lash);
    }

    const lidLo = new THREE.Mesh(new THREE.SphereGeometry(0.023, 16, 12), faceSkin());
    lidLo.scale.set(1.12, 0.42, 0.55);
    lidLo.position.set(0, -0.0205, 0.002);
    eg.add(lidLo);

    faceRig.eyes.push({
      group: eg, white, whiteBaseY: 1.05, irisGroup: ig,
      lidUp, lidUpBaseY: lidUp.position.y, lidLo, lidLoBaseY: lidLo.position.y,
    });
  }

  // ---- brows: arched, two tapered segments meeting at a peak ----
  for (const side of [-1, 1]) {
    const bg = new THREE.Group();
    bg.position.set(side * 0.049, 0.05, 0.086);
    h.add(bg);
    const bm = hairM();
    limbT(bg, [side * -0.021, -0.003, 0], [side * 0.004, 0.0065, 0.003], 0.0048, 0.0038, bm);
    limbT(bg, [side * 0.004, 0.0065, 0.003], [side * 0.027, -0.0015, -0.002], 0.0038, 0.0022, bm);
    faceRig.brows.push({ g: bg, baseY: bg.position.y, side });
  }

  // ---- nose: bridge + tip ----
  limbT(h, [0, 0.026, 0.104], [0, -0.004, 0.114], 0.006, 0.0078, faceSkin());
  ball(h, [0, -0.009, 0.115], 0.0095, faceSkin(), [1.08, 0.8, 0.8]);

  // ---- lips: cupid's-bow upper, full lower, corners, gloss ----
  const lipMat = () => new THREE.MeshPhysicalMaterial({
    color: lipC, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.35,
  });
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.056, 0.096);
  h.add(mouth);
  ball(mouth, [-0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, 0.6, 0.6]);
  ball(mouth, [0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, 0.6, 0.6]);
  const lower = ball(mouth, [0, -0.0075, 0.001], 0.0152, lipMat(), [1.28, 0.72, 0.66]);
  const cornerL = ball(mouth, [-0.0245, -0.001, -0.005], 0.0062, lipMat());
  const cornerR = ball(mouth, [0.0245, -0.001, -0.005], 0.0062, lipMat());
  ball(mouth, [0, -0.0095, 0.0105], 0.0048, mat(0xffd9e2, { roughness: 0.2, emissive: 0xffb9cc, emissiveIntensity: 0.35 }), [1.5, 0.45, 0.5]);
  faceRig.mouth = {
    group: mouth, lower, lowerBaseSX: lower.scale.x,
    corners: [cornerL, cornerR],
    cornerBase: [cornerL.position.clone(), cornerR.position.clone()],
  };

  // ---- ears + hoops ----
  for (const side of [-1, 1]) {
    ball(h, [side * 0.099, -0.008, 0.002], 0.017, faceSkin(), [0.45, 0.92, 0.7]);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0045, 8, 20), gold());
    hoop.position.set(side * 0.102, -0.052, 0.004);
    hoop.rotation.y = Math.PI / 2;
    h.add(hoop);
  }
}

// --- Hair -----------------------------------------------------------------------
// Local space: head center = origin. Swayers still work (local X sway).
function buildHair(h, style, hairM, M) {
  const r = M.headR;
  const hair = hairM();
  ball(h, [0, 0.012, -0.014], r * 1.05, hair, [1.02, 1.0, 0.99]);          // scalp
  ball(h, [0, 0.052, 0.055], r * 0.64, hair, [1.32, 0.55, 0.85]);          // front swoop

  const chainDown = (startX, curlAmp) => {
    let y = 0.12, z = -0.085, rr = 0.058;
    for (let i = 0; i < 12; i++) {
      const x = startX + Math.sin(i * 1.25) * curlAmp;
      const m = ball(h, [x, y, z], rr, hair);
      swayers.push({ m, phase: i * 0.45, amp: 0.005 + i * 0.003, baseX: x });
      y -= 0.062 + rr * 0.15;
      z -= i < 4 ? 0.016 : 0.003;
      rr *= 0.94;
    }
  };

  switch (style) {
    case 'ponytail':
      ball(h, [0, 0.148, -0.02], 0.072, hair);
      ball(h, [0, 0.125, -0.02], 0.043, mat(0xd4af37, { metalness: 0.8, roughness: 0.3 }), [1, 0.38, 1]);
      chainDown(0, 0.028);
      break;
    case 'curls': {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = 0.095 + (i % 3) * 0.02;
        const z = -0.055 + Math.sin(a) * 0.068;
        const m = ball(h, [Math.cos(a) * 0.102, 0.066 + Math.sin(i * 2.3) * 0.045, z], rr * 0.62, hair);
        swayers.push({ m, phase: i, amp: 0.0035, baseX: m.position.x });
      }
      ball(h, [0, -0.05, -0.09], 0.098, hair, [1.15, 1.2, 0.8]);
      break;
    }
    case 'braids':
      chainDown(-0.075, 0.01);
      chainDown(0.075, 0.01);
      for (const side of [-1, 1]) {
        let y = -0.03, rr = 0.036;
        for (let i = 0; i < 8; i++) {
          const m = ball(h, [side * 0.1, y, 0.05 + i * 0.004], rr, hair);
          swayers.push({ m, phase: i * 0.5 + side, amp: 0.0045, baseX: m.position.x });
          y -= 0.06;
          rr *= 0.96;
        }
      }
      break;
    case 'bob':
      for (const side of [-1, 1]) {
        ball(h, [side * 0.09, -0.03, -0.012], 0.075, hair, [0.78, 1.35, 1]);
        ball(h, [side * 0.078, -0.12, 0.01], 0.055, hair, [0.85, 1.1, 1]);
      }
      ball(h, [0, -0.015, -0.07], 0.1, hair, [1.05, 1.15, 0.9]);
      break;
    case 'buns':
      for (const side of [-1, 1]) {
        ball(h, [side * 0.09, 0.145, -0.012], 0.054, hair);
        ball(h, [side * 0.09, 0.145, -0.012], 0.035, mat(0xf27ab8, { roughness: 0.6 }), [1, 0.35, 1]);
      }
      break;
    case 'short':
      ball(h, [0, 0.05, -0.02], r * 1.12, hair, [1.02, 0.88, 1.0]);
      break;
  }
}

// ---------------------------------------------------------------------------
// Facial animation — expression states mapped from the live mood, plus
// blinking, gaze saccades, smile drift, brow micro-raises, breathing.
// ---------------------------------------------------------------------------
function animateFace(t, dt) {
  if (!faceRig) return;

  const targetId = CCS.sim?.avatar?.expression?.() || 'neutral';
  anim.exprId = targetId;
  const target = (CCS.data.expressions || {})[targetId] || {};
  const e = anim.expr;
  const k = Math.min(1, dt * 3.2);
  for (const key of ['smile', 'browLift', 'browTilt', 'browAsym', 'lid', 'eyeOpen',
                     'gazeX', 'gazeY', 'wander', 'headTilt', 'headPitch', 'blush']) {
    const tv = target[key] ?? (key === 'eyeOpen' || key === 'wander' ? 1 : 0);
    e[key] = (e[key] ?? tv) + (tv - (e[key] ?? tv)) * k;
  }

  if (t >= anim.blink.next && anim.blink.start < 0) {
    anim.blink.start = t;
    anim.blink.count++;
    anim.blink.next = t + (Math.random() < 0.18 ? 0.4 : 2.2 + Math.random() * 3.6);
  }
  let blinkAmt = 0;
  if (anim.blink.start >= 0) {
    const p = (t - anim.blink.start) / 0.15;
    if (p >= 1) anim.blink.start = -1;
    else blinkAmt = Math.sin(Math.min(p, 1) * Math.PI);
  }

  if (t >= anim.gaze.next) {
    const w = e.wander ?? 1;
    anim.gaze.tx = (e.gazeX ?? 0) * 0.5 + (Math.random() - 0.5) * 0.9 * w;
    anim.gaze.ty = (e.gazeY ?? 0) * 0.5 + (Math.random() - 0.5) * 0.5 * w;
    anim.gaze.next = t + 1.4 + Math.random() * 2.4;
  }
  anim.gaze.x += (anim.gaze.tx - anim.gaze.x) * Math.min(1, dt * 9);
  anim.gaze.y += (anim.gaze.ty - anim.gaze.y) * Math.min(1, dt * 9);

  if (t >= anim.browPulse.next) {
    anim.browPulse.until = t + 0.55;
    anim.browPulse.next = t + 4.5 + Math.random() * 5;
  }
  const pulse = anim.browPulse.until > t ? Math.sin(((anim.browPulse.until - t) / 0.55) * Math.PI) * 0.5 : 0;

  const smile = (e.smile ?? 0.18) + Math.sin(t * 0.31 + 1.7) * 0.05 + Math.sin(t * 0.53) * 0.03;
  const breath = Math.sin(t * 1.6);

  const H = faceRig.head;
  H.rotation.z = faceRig.headBase.tilt + (e.headTilt ?? 0) + Math.sin(t * 0.23) * 0.012;
  H.rotation.x = (e.headPitch ?? 0) + breath * 0.007;
  H.rotation.y = faceRig.headBase.yaw + Math.sin(t * 0.17) * 0.015 + anim.gaze.x * 0.06;

  for (const eye of faceRig.eyes) {
    const closed = Math.min(1, blinkAmt + (e.lid ?? 0) * 0.55);
    eye.lidUp.position.y = eye.lidUpBaseY - 0.008 * (e.lid ?? 0) - 0.024 * blinkAmt;
    eye.lidLo.position.y = eye.lidLoBaseY + 0.006 * blinkAmt;
    eye.white.scale.y = Math.max(0.08, eye.whiteBaseY * (e.eyeOpen ?? 1) * (1 - 0.85 * blinkAmt));
    eye.irisGroup.position.x = anim.gaze.x * 0.006;
    eye.irisGroup.position.y = anim.gaze.y * 0.005 - closed * 0.002;
  }

  faceRig.brows.forEach((b, i) => {
    const asym = (e.browAsym ?? 0) * (i === 1 ? 1 : 0.1);
    b.g.position.y = b.baseY + ((e.browLift ?? 0) * 0.45 + pulse + asym) * 0.009;
    b.g.rotation.z = b.side * -(e.browTilt ?? 0) * 0.22;
  });

  const m = faceRig.mouth;
  m.lower.scale.x = m.lowerBaseSX * (1 + smile * 0.14);
  m.corners.forEach((c, i) => {
    const base = m.cornerBase[i];
    c.position.y = base.y + smile * 0.0085;
    c.position.x = base.x * (1 + smile * 0.1);
  });
  m.group.rotation.x = -smile * 0.06;

  faceRig.blushMats.forEach((bm) =>
    bm.color.copy(faceRig.skinC).lerp(faceRig.blushC, Math.min(1, e.blush ?? 0.2)));
}

// ---------------------------------------------------------------------------
// Loop + public API
// ---------------------------------------------------------------------------
function tick() {
  rafId = requestAnimationFrame(tick);
  if (!host || !host.isConnected || !renderer) return;

  const t = clock.getElapsedTime();
  const dt = Math.min(0.1, t - prevT || 0.016);
  prevT = t;
  if (!dragging) spinTarget += 0.0028;
  spin += (spinTarget - spin) * 0.1;
  charGroup.rotation.y = spin;

  rig?.update(dt);                              // skeleton animation (mixer)

  for (const s of swayers) {
    s.m.position.x = s.baseX + Math.sin(t * 1.8 + s.phase) * s.amp;
  }

  animateFace(t, dt);

  const w = host.clientWidth, h = host.clientHeight;
  const c = renderer.domElement;
  if (w > 0 && h > 0 && (c.width !== Math.floor(w * renderer.getPixelRatio()) || c.height !== Math.floor(h * renderer.getPixelRatio()))) {
    renderer.setSize(w, h, false);
    c.style.width = '100%'; c.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
}

CCS.avatar3d = {
  get available() { return available; },
  get ready() { return readyPromise; },

  mount(el) {
    if (!el) return false;
    if (!ensureRenderer()) {
      el.innerHTML = '<div class="a3d-fallback">3D view needs WebGL 😢</div>';
      return false;
    }
    if (host !== el) {
      host = el;
      el.appendChild(renderer.domElement);
    }
    if (!rig) buildCharacter();
    if (!rafId) tick();
    return true;
  },

  // Look changed: re-equip the SAME rig (mesh/material swap — no reload).
  refresh() {
    if (!renderer) return;
    if (!rig) { buildCharacter(); return; }
    const look = CCS.sim.avatar.resolved();
    const bodyType = CCS.sim.avatar.get().bodyType || 'female';
    if (bodyType !== rig.bodyType) { buildCharacter(); return; }
    applyLookToRig(look);
    buildHeadModule(look);
  },

  // Animation blending demo/API: crossfade additive layers ('idle', 'groove').
  play(name, fade = 0.5) { return rig?.blendTo(name, fade); },

  focus(mode = 'full') {
    if (!camera) return;
    camFocus = mode;
    if (mode === 'face') {
      camera.position.set(0.05, lastHeadC + 0.02, 1.0);
      camera.lookAt(0, lastHeadC, 0);
    } else {
      camera.position.set(0, 1.42, 4.7);
      camera.lookAt(0, 1.04, 0);
    }
  },

  get _debug() {
    return {
      blinks: anim.blink.count, expression: anim.exprId || 'neutral', focus: camFocus,
      rigged: !!rig, bodyType: rig?.bodyType,
      bones: rig ? Object.keys(rig.bones).length : 0,
      slots: rig ? rig.slotNames() : [],
      playing: rig ? Object.entries(rig._actions).filter(([, a]) => a.isRunning()).map(([n]) => n) : [],
    };
  },

  unmount() { host = null; },

  dispose() {
    cancelAnimationFrame(rafId); rafId = 0;
    rig?.dispose(); rig = null;
    renderer?.dispose(); renderer = null; host = null;
  },
};

// Rebuild/re-equip whenever the look changes.
CCS.events?.on('avatar-changed', () => CCS.avatar3d.refresh());

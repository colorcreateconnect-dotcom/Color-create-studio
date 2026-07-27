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
import { createHeadModule } from './face-hair.js';
import { RoomEnvironment } from '../../vendor/environments/RoomEnvironment.js';
import './npc-portraits.js';   // registers CCS.portraits (NPC portrait renderer)

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
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (e) {
    console.warn('[avatar3d] WebGL unavailable', e);
    available = false;
    return null;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120b1c);
  scene.fog = new THREE.Fog(0x120b1c, 6, 14);

  // Image-based lighting: a PMREM-filtered room environment gives every PBR
  // material (skin sheen, fabric, gold, gloss) something real to reflect.
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.4;
    pmrem.dispose();
  } catch (e) {
    console.warn('[avatar3d] environment map unavailable', e);
  }

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

// ---------------------------------------------------------------------------
// The neon-glam stage
// ---------------------------------------------------------------------------
function buildStage() {
  stage = new THREE.Group();
  scene.add(stage);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x18101f, roughness: 0.35, metalness: 0.4 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  stage.add(floor);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.09, 48),
    new THREE.MeshStandardMaterial({ color: 0x241631, roughness: 0.3, metalness: 0.5 }));
  platform.position.y = 0.045;
  platform.receiveShadow = true;
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

  scene.add(new THREE.AmbientLight(0x8a6faf, 0.3));
  const key = new THREE.SpotLight(0xfff0f6, 44, 0, 0.55, 0.5, 1.6);
  key.position.set(1.6, 4.4, 3.6);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;                       // real contact shadow on the stage
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
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
    rig.root.traverse((o) => { if (o.isSkinnedMesh) o.castShadow = true; });

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
// Built by the shared face-hair.js builder — the same one NPC portraits use.
function buildHeadModule(look) {
  if (headModule) {
    headModule.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
    headModule.removeFromParent();
  }
  faceRig = null;
  swayers = [];

  const P = CCS.sim.avatar.proportions();
  lastHeadC = 1.72;

  const face = CCS.sim.avatar.get().face || {};   // optional per-player face opts
  const res = createHeadModule(look, { headR: 0.115, ...face });
  headModule = res.group;
  faceRig = res.faceRig;
  swayers = res.swayers;

  headModule.position.set(0, 0.085, 0.004);   // head-bone origin → head center
  headModule.rotation.z = 0.028;               // soft tilt (animated around this)
  headModule.rotation.y = -0.06;
  faceRig.headBase = { tilt: 0.028, yaw: -0.06 };
  if (P.headScale !== 1) headModule.scale.setScalar(P.headScale);
  rig.attachTo('Head', headModule);
  headModule.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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

  // Full-body motions ('pose', 'walk', 'dance', 'wave'): crossfaded base
  // clips with the additive idle breathing layered on top.
  play(name = 'pose', fade = 0.45) { return rig?.setMotion(name, fade); },
  get motions() { return rig ? rig.motions() : []; },
  get motion() { return rig?._baseName || 'pose'; },

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
      rigged: !!rig, bodyType: rig?.bodyType, motion: rig?._baseName || 'pose',
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

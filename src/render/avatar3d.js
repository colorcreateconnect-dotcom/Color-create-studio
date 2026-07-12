// ============================================================================
// avatar3d.js — the real-time 3D character renderer (Three.js).
//
// Draws the player's Sim as a stylized fashion-doll character — skin tone,
// hair style/color and outfit presets come from data-avatar.js — standing on
// a neon-glam stage (pink/blue rim light, glowing heart sign, spotlight).
//
// The body is built parametrically from a measurement sheet (see layout()):
// a smooth lathe-profile torso (real waist/hip curves, no stacked-sphere
// seams), tapered limbs that share joint radii (no toy bulges), a slight
// contrapposto pose, and a head group that hair/face attach to in local
// space. Proportion multipliers come from CCS.sim.avatar.proportions().
//
// One renderer instance exists; mount(el) moves the canvas between hosts
// (Sim tab viewport, Style Studio modal). Look changes call refresh().
// Drag horizontally to spin her; she idles with a soft bob + hair sway.
// ============================================================================

import * as THREE from '../../vendor/three.module.js';

const CCS = window.CCS;

let renderer = null, scene, camera, stage, charGroup;
let host = null, rafId = 0, clock = null;
let swayers = [];            // meshes that sway: { m, phase, amp, baseX }
let spinTarget = 0.5, spin = 0.5, dragging = false, lastX = 0;
let available = true;

// --- facial rig + animation state (rebuilt with the character) --------------
let faceRig = null;          // mesh refs + base transforms (see buildFace)
let prevT = 0;
let lastHeadC = 1.72;        // for camera focus modes
let camFocus = 'full';
const anim = {
  expr: {},                              // current blended expression params
  blink: { next: 1.5, start: -1, count: 0 },
  gaze: { x: 0, y: 0, tx: 0, ty: 0, next: 0 },
  browPulse: { next: 4, until: -1 },
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

// ---------------------------------------------------------------------------
// The neon-glam stage
// ---------------------------------------------------------------------------
function buildStage() {
  stage = new THREE.Group();
  scene.add(stage);

  // Glossy dark floor + round platform
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

  // Back wall hint
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 7),
    new THREE.MeshStandardMaterial({ color: 0x191024, roughness: 0.9 }));
  wall.position.set(0, 3.5, -3.2);
  stage.add(wall);

  // Neon heart sign (like the bedroom wall art)
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
  heart.rotation.z = Math.PI;               // drawn upside-down; flip it
  heart.position.set(1.95, 2.45, -3.1);
  stage.add(heart);

  // Three neon "script lines" beside the heart (Discipline / Dreams / Destiny)
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.95 - i * 0.16, 4, 8),
      mat(0xff8fc8, { emissive: 0xff4fa6, emissiveIntensity: 2.2 }));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(1.15 - i * 0.07, 2.62 - i * 0.3, -3.1);
    stage.add(bar);
  }

  // Vanity-style light dots on the right
  for (let i = 0; i < 6; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10),
      mat(0xfff2d9, { emissive: 0xffd9a0, emissiveIntensity: 2.4 }));
    dot.position.set(-2.4, 1.4 + i * 0.42, -3.05);
    stage.add(dot);
  }

  // Lights: warm key, pink + blue rims, soft ambient
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
// Small geometry helpers
// ---------------------------------------------------------------------------

// Tapered limb segment between two points: a cylinder whose radius shrinks
// from rA (at `a`) to rB (at `b`), with sphere caps at both ends. Consecutive
// segments that share a point and radius join seamlessly — no toy bulges.
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

function ball(group, pos, r, material, scale = null) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 18), material);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  group.add(m);
  return m;
}

// Smooth lathe surface from (radius, y) control points (Catmull-Rom sampled).
// The workhorse for the torso, garments and skirts — one flowing silhouette.
function lathe(group, pts, material, zSquash = 0.88) {
  const curve = new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y)));
  const geo = new THREE.LatheGeometry(curve.getPoints(32), 28);
  material.side = THREE.DoubleSide;  // curvy profiles stay visible from any angle
  const m = new THREE.Mesh(geo, material);
  m.scale.z = zSquash;        // slightly elliptical cross-section (feminine profile)
  group.add(m);
  return m;
}

// Horizontal hem/cuff ring (matches the lathe's elliptical squash).
function hemRing(group, y, r, tube, material, zSquash = 0.88) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 26), material);
  m.rotation.x = Math.PI / 2;
  m.position.y = y;
  m.scale.set(1, zSquash, 1); // torus lies flat; its local Y is world Z
  group.add(m);
  return m;
}

function star(group, pos, size, colorHex, rotY = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? size : size * 0.45;
    i === 0 ? s.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad)
            : s.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.25,
      roughness: 0.6, side: THREE.DoubleSide }));
  m.position.set(...pos);
  m.rotation.y = rotY;
  group.add(m);
  return m;
}

// Small rounded hand: palm ellipsoid + finger mitt + thumb. `down` = fingers
// pointing down (relaxed arm) vs. gripping up (phone hand).
function hand(group, pos, side, material, down = true) {
  const h = new THREE.Group();
  h.position.set(...pos);
  ball(h, [0, 0, 0], 0.026, material, [0.9, 1.15, 1.2]);                        // palm
  ball(h, [0, down ? -0.045 : 0.04, down ? 0.008 : 0.012], 0.019, material, [1.05, 0.85, 1.45]); // fingers
  ball(h, [side * -0.02, down ? -0.012 : 0.012, 0.02], 0.011, material);        // thumb
  group.add(h);
  return h;
}

// ---------------------------------------------------------------------------
// Measurement sheet — fashion-doll proportions (~7.3 heads tall by default),
// scaled by the proportion parameters from data-avatar.js.
// ---------------------------------------------------------------------------
function layout(P) {
  const hipY = 0.075 + 0.98 * P.legLength;          // floor → hip crease
  const waistY = hipY + 0.185 * P.torsoLength;
  const chestY = waistY + 0.165 * P.torsoLength;
  const shoulderY = chestY + 0.115 * P.torsoLength;
  const headR = 0.115 * P.headScale;
  const headC = shoulderY + 0.115 + headR * 0.78;   // neck length + head offset
  return {
    hipY, waistY, chestY, shoulderY, headR, headC,
    kneeY: 0.075 + 0.52 * P.legLength,
    ankleY: 0.09,
    hipR: 0.148 * P.hipWidth,
    waistR: 0.085 * P.waistScale,
    shoulderX: 0.148 * P.shoulderWidth,
    armLen: P.armLength,
  };
}

// Body silhouette radius at height y (shared by skin + garments so clothes
// follow the figure with a uniform offset instead of being painted on).
function bodyProfile(M) {
  return [
    [0.085, M.hipY - 0.085],          // under-hip tuck (thighs nest here)
    [M.hipR * 0.985, M.hipY + 0.005],
    [M.hipR, M.hipY + 0.07],          // widest hip point
    [0.117, M.waistY - 0.06],
    [M.waistR, M.waistY],             // waist
    [0.104, M.waistY + 0.085],        // ribcage ease
    [0.121, M.chestY],                // bust line
    [0.101, M.chestY + 0.07],
    [0.058, M.shoulderY + 0.005],     // rounded off at the shoulders
  ];
}
function profileRadiusAt(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0));
  }
  return y < pts[0][1] ? pts[0][0] : pts[pts.length - 1][0];
}
// A garment band: the body profile between two heights, pushed out by
// `offset` (cloth thickness) with a hem ring at the bottom edge.
function garmentBand(g, M, yBottom, yTop, offset, material, hem = true) {
  const pts = bodyProfile(M)
    .filter(([, y]) => y > yBottom && y < yTop)
    .map(([r, y]) => [r + offset, y]);
  pts.unshift([profileRadiusAt(bodyProfile(M), yBottom) + offset, yBottom]);
  pts.push([profileRadiusAt(bodyProfile(M), yTop) + offset, yTop]);
  lathe(g, pts, material);
  if (hem) hemRing(g, yBottom, pts[0][0] * 0.97, 0.013, material);
  return pts;
}

// ---------------------------------------------------------------------------
// Character builder
// ---------------------------------------------------------------------------
function buildCharacter() {
  // Clear previous build (geometries AND materials — no leaks on re-style).
  while (charGroup.children.length) {
    const c = charGroup.children.pop();
    c.traverse?.((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
  }
  swayers = [];
  faceRig = null;

  const look = CCS.sim.avatar.resolved();
  const P = CCS.sim.avatar.proportions();
  const M = layout(P);

  const skin = () => mat(look.skin, { roughness: 0.5 });
  const hairM = () => mat(look.hairColor, { roughness: 0.82 });
  const o = look.outfit;
  const topM = () => mat(o.top.color, { roughness: o.bottom?.sheen ? 0.35 : 0.78 });
  const botM = () => mat(o.bottom.color, {
    roughness: o.bottom.sheen ? 0.32 : 0.8,
    emissive: o.bottom.sparkle ? o.bottom.color : 0x000000,
    emissiveIntensity: o.bottom.sparkle ? 0.18 : 1,
  });
  const gold = () => mat(0xd4af37, { metalness: 0.85, roughness: 0.25 });

  const g = charGroup;
  const dress = o.bottom.style === 'dress';
  const skirt = o.bottom.style === 'skirt' || dress;

  // --- Posture: subtle contrapposto ---------------------------------------
  // Weight on her right leg (x<0): right leg straight under a slightly
  // shifted pelvis, left leg relaxed with a soft knee and turned-out foot.
  const wShift = -0.018;                       // pelvis drifts over the weight leg
  const R = { hip: [-0.082 + wShift, M.hipY, 0], knee: [-0.088, M.kneeY, 0.008], ankle: [-0.094, M.ankleY, 0] };
  const L = { hip: [0.086 + wShift, M.hipY + 0.012, 0], knee: [0.112, M.kneeY + 0.01, 0.035], ankle: [0.128, M.ankleY, 0.05] };

  // --- Legs & bottoms -------------------------------------------------------
  const pantLeg = ['joggers', 'cargo'].includes(o.bottom.style);
  const cuffY = 0.185;
  for (const [side, J] of [[-1, R], [1, L]]) {
    if (skirt) {
      // bare tapered legs under the skirt/dress
      limbT(g, J.hip, J.knee, 0.066, 0.046, skin());
      limbT(g, J.knee, J.ankle, 0.046, 0.024, skin());
    } else if (o.bottom.style === 'flare') {
      limbT(g, J.hip, J.knee, 0.078, 0.056, botM());
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.135, M.kneeY - 0.075, 18), botM());
      bell.position.set(J.ankle[0] * 0.9, (M.kneeY + 0.075) / 2, J.ankle[2] * 0.6);
      g.add(bell);
      const bellHem = hemRing(g, 0.085, 0.132, 0.012, botM(), 1);
      bellHem.position.x = J.ankle[0] * 0.9; bellHem.position.z = J.ankle[2] * 0.6;
    } else if (pantLeg) {
      const rT = o.bottom.style === 'cargo' ? 0.088 : 0.084;
      limbT(g, J.hip, J.knee, rT, 0.06, botM());
      limbT(g, J.knee, [J.ankle[0], cuffY, J.ankle[2]], 0.06, 0.048, botM());
      const cuff = hemRing(g, cuffY, 0.05, 0.014, botM(), 1);
      cuff.position.x = J.ankle[0]; cuff.position.z = J.ankle[2];
      limbT(g, [J.ankle[0], cuffY - 0.01, J.ankle[2]], J.ankle, 0.026, 0.022, skin()); // ankle
      if (o.bottom.style === 'cargo') {
        ball(g, [side * 0.135, 0.72, 0.03], 0.036, botM(), [0.7, 1.3, 1.1]); // soft pocket
      }
    } else {
      limbT(g, J.hip, J.knee, 0.066, 0.046, skin());
      limbT(g, J.knee, J.ankle, 0.046, 0.024, skin());
    }
    // star print on the thigh (the "Pretty Girl" star vibe)
    if (o.bottom.stars && !skirt) {
      star(g, [J.hip[0] + side * 0.01, 0.78, 0.098], 0.042, o.bottom.stars);
      star(g, [J.hip[0], 0.5, 0.082], 0.026, o.bottom.stars);
    }
    buildFoot(g, J.ankle, side, o.shoes, skin);
  }

  // --- Torso: one smooth lathe from hips to shoulders ----------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.x = wShift;
  torsoGroup.rotation.z = 0.022;               // gentle counter-tilt
  g.add(torsoGroup);

  lathe(torsoGroup, bodyProfile(M), skin());   // the figure itself

  // Garments as offset bands over the same profile.
  const crop = o.top.crop !== false && !dress;
  const bodyR = (y) => profileRadiusAt(bodyProfile(M), y);
  if (dress) {
    // dress: fitted bodice (body profile + cloth offset) flowing into a flare
    const pts = [
      [0.30, 0.64], [0.24, 0.80],
      [bodyR(M.hipY + 0.02) + 0.02, M.hipY + 0.02],
      [bodyR(M.waistY) + 0.02, M.waistY],
      [bodyR(M.chestY) + 0.016, M.chestY],
      [bodyR(M.chestY + 0.055) + 0.016, M.chestY + 0.055],
    ];
    lathe(torsoGroup, pts, botM());
    hemRing(torsoGroup, 0.64, 0.295, 0.014, botM());
  } else if (skirt) {
    lathe(torsoGroup, [[0.245, 0.86], [0.20, 0.95], [bodyR(M.hipY + 0.03) + 0.018, M.hipY + 0.03], [bodyR(M.waistY - 0.02) + 0.018, M.waistY - 0.02]], botM());
    hemRing(torsoGroup, 0.86, 0.24, 0.013, botM());
    hemRing(torsoGroup, M.waistY - 0.02, M.waistR + 0.03, 0.016, botM()); // waistband
    garmentBand(torsoGroup, M, crop ? M.waistY + 0.05 : M.hipY + 0.02, M.shoulderY, 0.015, topM());
  } else {
    // pants cover the pelvis: a high-waisted band over the hips up to the
    // waist, finished with a real waistband — no bare hips, no floating ring
    garmentBand(torsoGroup, M, M.hipY - 0.088, M.waistY + 0.005, 0.013, botM(), false);
    hemRing(torsoGroup, M.waistY + 0.005, bodyR(M.waistY) + 0.024, 0.014, botM());
    // top: band from just above the waistband (crop) or full length
    garmentBand(torsoGroup, M, crop ? M.waistY + 0.055 : M.hipY + 0.02, M.shoulderY, 0.016, topM());
  }

  // hoodie details
  if (o.top.hoodie) {
    ball(torsoGroup, [0, M.shoulderY - 0.005, -0.115], 0.082, topM(), [1.35, 0.72, 0.85]); // hood
    hemRing(torsoGroup, M.shoulderY - 0.02, 0.083, 0.018, topM());                          // collar
    for (const side of [-1, 1]) {
      const str = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.11, 3, 6), mat(0xffffff, { roughness: 0.6 }));
      str.position.set(side * 0.038, M.chestY + 0.03, 0.128);
      str.rotation.x = 0.08;
      torsoGroup.add(str);
    }
  }
  if (o.top.zipper && !dress) {
    const zip = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, (M.shoulderY - M.waistY) * 0.8, 3, 6),
      mat(0xdddddd, { metalness: 0.7, roughness: 0.3 }));
    zip.position.set(0, (M.shoulderY + M.waistY) / 2, 0.121);
    torsoGroup.add(zip);
  }
  if (o.top.fur) { // fluffy coat bumps hugging the garment
    const fur = mat(o.top.color, { roughness: 0.95, flat: true });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const y = M.hipY + 0.05 + (i % 5) * 0.085;
      const r = profileRadiusAt(bodyProfile(M), y) + 0.02;
      ball(torsoGroup, [Math.cos(a) * r, y, Math.sin(a) * r * 0.88], 0.038 + (i % 3) * 0.011, fur);
    }
  }
  if (o.top.style === 'strap') {
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.1, 4, 8), dress ? botM() : topM());
      strap.position.set(side * 0.075, M.chestY + 0.105, 0.045);
      strap.rotation.x = -0.42;
      strap.rotation.z = side * 0.12;
      torsoGroup.add(strap);
    }
  }

  // --- Arms: slim, tapered, elbows softly bent -----------------------------
  const bare = o.top.style === 'strap' || dress;
  const sleeveM = bare ? skin : topM;
  const AL = M.armLen;
  const shY = M.shoulderY - 0.018;
  // rounded deltoids
  ball(torsoGroup, [-M.shoulderX, shY, 0], 0.047, sleeveM());
  ball(torsoGroup, [M.shoulderX, shY, 0], 0.047, sleeveM());
  // right arm: relaxed at her side, gentle elbow bend, hand near thigh
  const rSh = [-M.shoulderX + wShift, shY, 0];
  const rEl = [-M.shoulderX - 0.045, shY - 0.26 * AL, 0.015];
  const rWr = [-M.shoulderX - 0.02, shY - 0.5 * AL, 0.075];
  limbT(g, rSh, rEl, 0.038, 0.03, sleeveM());
  limbT(g, rEl, rWr, 0.028, 0.02, skin());
  hand(g, rWr, -1, skin(), true);
  // left arm: raised selfie pose
  const lSh = [M.shoulderX + wShift, shY, 0];
  const lEl = [M.shoulderX + 0.06, shY - 0.21 * AL, 0.10];
  const lWr = [M.shoulderX - 0.035, shY + 0.055 * AL, 0.225];
  limbT(g, lSh, lEl, 0.038, 0.03, sleeveM());
  limbT(g, lEl, lWr, 0.028, 0.02, skin());
  hand(g, lWr, 1, skin(), false);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.014),
    mat(0xf27ab8, { roughness: 0.35, metalness: 0.2 }));
  phone.position.set(lWr[0] - 0.005, lWr[1] + 0.065, lWr[2] + 0.012);
  phone.rotation.set(-0.25, 0.32, 0.1);
  g.add(phone);

  // --- Neck (long, slender) + jewelry ---------------------------------------
  limbT(g, [wShift, M.shoulderY - 0.03, 0.004], [wShift * 0.5, M.shoulderY + 0.118, 0.006], 0.034, 0.028, skin());
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.005, 8, 22), gold());
  chain.position.set(wShift, M.shoulderY + 0.015, 0.04);
  chain.rotation.x = Math.PI / 2 - 0.52;
  g.add(chain);

  // --- Head group (face + hair attach in local space; headScale-friendly) --
  const head = new THREE.Group();
  head.position.set(wShift * 0.4, M.headC, 0.004);
  head.rotation.z = 0.028;                     // soft tilt (animated around this base)
  head.rotation.y = -0.06;                     // slight glance
  lastHeadC = M.headC;
  g.add(head);
  buildFace(head, M, look, skin, hairM, gold);
  buildHair(head, look.hairStyle, hairM, M);
}

// --- Feet & shoes ------------------------------------------------------------
function buildFoot(g, ankle, side, shoes, skin) {
  const f = new THREE.Group();
  f.position.set(ankle[0], 0, ankle[2]);
  f.rotation.y = side < 0 ? -0.1 : 0.2;        // natural turnout
  f.scale.setScalar(1.22);                     // shoes read at fashion scale
  g.add(f);

  const main = mat(shoes.main, { roughness: shoes.style === 'heel' ? 0.3 : 0.45 });
  const accent = mat(shoes.accent, { metalness: shoes.style === 'heel' ? 0.6 : 0.1, roughness: 0.35 });

  if (shoes.style === 'heel') {
    // arched foot: ankle → instep → toe, tilted on a stiletto pin
    limbT(f, [0, 0.115, -0.01], [0, 0.07, 0.055], 0.024, 0.02, main);
    limbT(f, [0, 0.07, 0.055], [0, 0.028, 0.125], 0.02, 0.017, main);
    ball(f, [0, 0.024, 0.145], 0.022, main, [1, 0.65, 1.5]);        // toe box
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.105, 8), accent);
    pin.position.set(0, 0.052, -0.038);
    f.add(pin);
    hemRing(f, 0.13, 0.026, 0.006, main, 1);                        // ankle strap
  } else {
    // sneaker: rounded sole slab + soft upper + toe cap + collar
    const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.13, 6, 12), accent);
    sole.rotation.x = Math.PI / 2;
    sole.position.set(0, 0.028, 0.05);
    sole.scale.y = 0.42;
    f.add(sole);
    limbT(f, [0, 0.075, -0.02], [0, 0.062, 0.11], 0.043, 0.035, main);
    ball(f, [0, 0.058, 0.125], 0.034, main, [1, 0.8, 1.2]);         // toe cap
    hemRing(f, 0.105, 0.03, 0.011, main, 1);                        // padded collar
  }
}

// --- Face ---------------------------------------------------------------------
// Local space: head center = origin, radius M.headR (default 0.115).
// Builds the glam face AND registers every animatable part on `faceRig`.
function buildFace(h, M, look, skin, hairM, gold) {
  const r = M.headR;

  // Softer facial skin: physical material with a warm sheen (SSS-ish glow).
  const skinC = new THREE.Color(look.skin);
  const faceSkin = () => new THREE.MeshPhysicalMaterial({
    color: look.skin, roughness: 0.5, metalness: 0.02,
    sheen: 0.45, sheenColor: skinC.clone().lerp(new THREE.Color(0xfff1e6), 0.3), sheenRoughness: 0.65,
  });
  // Skin-derived glam colors — adapt to every skin tone.
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

    // mobile iris group (gaze): iris + pupil + catchlight
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

    // upper lid group: skin lid + liner-lash line + corner flicks. The lid
    // rests high (eyes open wide); blinking/half-lids slide the group down.
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
    for (let i = 0; i < 2; i++) {                     // outer-corner lash flicks
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.0012, 0.0085 - i * 0.002, 3, 5), mat(linerC, { roughness: 0.5 }));
      lash.position.set(side * (0.027 + i * 0.0035), 0.0015 + i * 0.0035, 0.007);
      lash.rotation.z = side * -(0.95 + i * 0.25);
      lidUp.add(lash);
    }

    // lower lid (subtle)
    const lidLo = new THREE.Mesh(new THREE.SphereGeometry(0.023, 16, 12), faceSkin());
    lidLo.scale.set(1.12, 0.42, 0.55);
    lidLo.position.set(0, -0.0205, 0.002);
    eg.add(lidLo);

    faceRig.eyes.push({
      group: eg, white, whiteBaseY: 1.0, irisGroup: ig,
      lidUp, lidUpBaseY: lidUp.position.y, lidLo, lidLoBaseY: lidLo.position.y,
    });
  }

  // ---- brows: arched, two tapered segments meeting at a peak ----
  for (const side of [-1, 1]) {
    const bg = new THREE.Group();
    bg.position.set(side * 0.049, 0.05, 0.086);
    h.add(bg);
    const bm = hairM();
    limbT(bg, [side * -0.021, -0.003, 0], [side * 0.004, 0.0065, 0.003], 0.0048, 0.0038, bm); // inner rise
    limbT(bg, [side * 0.004, 0.0065, 0.003], [side * 0.027, -0.0015, -0.002], 0.0038, 0.0022, bm); // outer taper
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
  ball(mouth, [-0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, 0.6, 0.6]);   // upper L lobe
  ball(mouth, [0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, 0.6, 0.6]);    // upper R lobe
  const lower = ball(mouth, [0, -0.0075, 0.001], 0.0152, lipMat(), [1.28, 0.72, 0.66]); // lower lip
  const cornerL = ball(mouth, [-0.0245, -0.001, -0.005], 0.0062, lipMat());
  const cornerR = ball(mouth, [0.0245, -0.001, -0.005], 0.0062, lipMat());
  ball(mouth, [0, -0.0095, 0.0105], 0.0048, mat(0xffd9e2, { roughness: 0.2, emissive: 0xffb9cc, emissiveIntensity: 0.35 }), [1.5, 0.45, 0.5]); // gloss
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
      ball(h, [0, 0.148, -0.02], 0.072, hair);                             // topknot
      ball(h, [0, 0.125, -0.02], 0.043, mat(0xd4af37, { metalness: 0.8, roughness: 0.3 }), [1, 0.38, 1]); // tie
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
      ball(h, [0, -0.05, -0.09], 0.098, hair, [1.15, 1.2, 0.8]);           // nape volume
      break;
    }
    case 'braids':
      chainDown(-0.075, 0.01);
      chainDown(0.075, 0.01);
      for (const side of [-1, 1]) { // front braid over the shoulder
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
        ball(h, [side * 0.09, 0.145, -0.012], 0.035, mat(0xf27ab8, { roughness: 0.6 }), [1, 0.35, 1]); // tie
      }
      break;
    case 'short':
      ball(h, [0, 0.05, -0.02], r * 1.12, hair, [1.02, 0.88, 1.0]);
      break;
  }
}

// ---------------------------------------------------------------------------
// Facial animation — blends expression states (data-avatar.js) mapped from
// the live mood, plus blinking, gaze saccades, smile drift, brow micro-raises
// and breathing-linked head motion. Mood math itself is never touched.
// ---------------------------------------------------------------------------
function animateFace(t, dt) {
  if (!faceRig) return;

  // 1) Blend toward the mood's expression state.
  const targetId = CCS.sim?.avatar?.expression?.() || 'neutral';
  anim.exprId = targetId;
  const target = (CCS.data.expressions || {})[targetId] || {};
  const e = anim.expr;
  const k = Math.min(1, dt * 3.2);              // ~0.6s ease between expressions
  for (const key of ['smile', 'browLift', 'browTilt', 'browAsym', 'lid', 'eyeOpen',
                     'gazeX', 'gazeY', 'wander', 'headTilt', 'headPitch', 'blush']) {
    const tv = target[key] ?? (key === 'eyeOpen' || key === 'wander' ? 1 : 0);
    e[key] = (e[key] ?? tv) + (tv - (e[key] ?? tv)) * k;
  }

  // 2) Blinking at irregular intervals (with occasional double-blinks).
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

  // 3) Gaze saccades: pick a new target every couple of seconds, ease fast.
  if (t >= anim.gaze.next) {
    const w = e.wander ?? 1;
    anim.gaze.tx = (e.gazeX ?? 0) * 0.5 + (Math.random() - 0.5) * 0.9 * w;
    anim.gaze.ty = (e.gazeY ?? 0) * 0.5 + (Math.random() - 0.5) * 0.5 * w;
    anim.gaze.next = t + 1.4 + Math.random() * 2.4;
  }
  anim.gaze.x += (anim.gaze.tx - anim.gaze.x) * Math.min(1, dt * 9);
  anim.gaze.y += (anim.gaze.ty - anim.gaze.y) * Math.min(1, dt * 9);

  // 4) Occasional brow micro-raise.
  if (t >= anim.browPulse.next) {
    anim.browPulse.until = t + 0.55;
    anim.browPulse.next = t + 4.5 + Math.random() * 5;
  }
  const pulse = anim.browPulse.until > t ? Math.sin(((anim.browPulse.until - t) / 0.55) * Math.PI) * 0.5 : 0;

  // 5) Living drift: tiny smile/head wobble so nothing is frozen.
  const smile = (e.smile ?? 0.18) + Math.sin(t * 0.31 + 1.7) * 0.05 + Math.sin(t * 0.53) * 0.03;
  const breath = Math.sin(t * 1.6);             // matches the body's idle bob

  // ---- apply to the rig ----
  const H = faceRig.head;
  H.rotation.z = faceRig.headBase.tilt + (e.headTilt ?? 0) + Math.sin(t * 0.23) * 0.012;
  H.rotation.x = (e.headPitch ?? 0) + breath * 0.007;
  H.rotation.y = faceRig.headBase.yaw + Math.sin(t * 0.17) * 0.015 + anim.gaze.x * 0.06;

  for (const eye of faceRig.eyes) {
    const closed = Math.min(1, blinkAmt + (e.lid ?? 0) * 0.55);
    eye.lidUp.position.y = eye.lidUpBaseY - 0.008 * (e.lid ?? 0) - 0.024 * blinkAmt;
    eye.lidLo.position.y = eye.lidLoBaseY + 0.006 * blinkAmt;
    eye.white.scale.y = Math.max(0.08, (e.eyeOpen ?? 1) * (1 - 0.85 * blinkAmt));
    eye.irisGroup.position.x = anim.gaze.x * 0.006;
    eye.irisGroup.position.y = anim.gaze.y * 0.005 - closed * 0.002;
  }

  faceRig.brows.forEach((b, i) => {
    const asym = (e.browAsym ?? 0) * (i === 1 ? 1 : 0.1);   // flirty: her left brow
    b.g.position.y = b.baseY + ((e.browLift ?? 0) * 0.45 + pulse + asym) * 0.009;
    b.g.rotation.z = b.side * -(e.browTilt ?? 0) * 0.22;    // + = worried inner-up
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
  if (!dragging) spinTarget += 0.0028;                    // slow show-off spin
  spin += (spinTarget - spin) * 0.1;
  charGroup.rotation.y = spin;
  charGroup.position.y = Math.sin(t * 1.6) * 0.012;       // idle bob

  for (const s of swayers) {
    s.m.position.x = s.baseX + Math.sin(t * 1.8 + s.phase) * s.amp;
  }

  animateFace(t, dt);

  // keep canvas sized to host
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
    if (!charGroup.children.length) buildCharacter();
    if (!rafId) tick();
    return true;
  },

  refresh() { if (renderer) buildCharacter(); },

  // Camera focus: 'full' (default) frames the whole look; 'face' moves in
  // close for the Style Studio face view / makeup shots.
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

  // Introspection for tests/tools (not gameplay).
  get _debug() {
    return { blinks: anim.blink.count, expression: anim.exprId || 'neutral', focus: camFocus };
  },

  unmount() { host = null; },

  dispose() {
    cancelAnimationFrame(rafId); rafId = 0;
    renderer?.dispose(); renderer = null; host = null;
  },
};

// Rebuild the model whenever the look changes.
CCS.events?.on('avatar-changed', () => CCS.avatar3d.refresh());

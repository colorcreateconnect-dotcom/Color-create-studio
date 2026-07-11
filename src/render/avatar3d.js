// ============================================================================
// avatar3d.js — the real-time 3D character renderer (Three.js).
//
// Draws the player's Sim as a stylized parametric 3D character — skin tone,
// hair style/color and outfit presets all come from data-avatar.js — standing
// on a neon-glam stage (pink/blue rim light, glowing heart sign, spotlight).
//
// One renderer instance exists; mount(el) moves the canvas between hosts
// (Sim tab viewport, Style Studio modal). Look changes call refresh().
// Drag horizontally to spin her; she idles with a soft bob + ponytail sway.
// ============================================================================

import * as THREE from '../../vendor/three.module.js';

const CCS = window.CCS;

let renderer = null, scene, camera, stage, charGroup;
let host = null, rafId = 0, clock = null;
let swayers = [];            // meshes that sway: { m, phase, amp }
let spinTarget = 0.5, spin = 0.5, dragging = false, lastX = 0;
let available = true;

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
  camera.position.set(0, 1.35, 4.6);
  camera.lookAt(0, 1.0, 0);

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
// Parametric character builder
// ---------------------------------------------------------------------------

// Capsule between two points (the workhorse for limbs).
function limb(group, a, b, r, material) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material);
  m.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  group.add(m);
  return m;
}
function ball(group, pos, r, material, scale = null) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 18), material);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
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
    mat(colorHex, { emissive: colorHex, emissiveIntensity: 0.25, roughness: 0.6 }));
  m.position.set(...pos);
  m.rotation.y = rotY;
  group.add(m);
  return m;
}

function buildCharacter() {
  // Clear previous build.
  while (charGroup.children.length) {
    const c = charGroup.children.pop();
    c.traverse?.((n) => { n.geometry?.dispose(); });
  }
  swayers = [];

  const look = CCS.sim.avatar.resolved();
  const skin = mat(look.skin, { roughness: 0.5 });
  const hair = mat(look.hairColor, { roughness: 0.82 });
  const o = look.outfit;
  const topMat = mat(o.top.color, { roughness: o.bottom?.sheen ? 0.35 : 0.78 });
  const botMat = mat(o.bottom.color, {
    roughness: o.bottom.sheen ? 0.32 : 0.8,
    emissive: o.bottom.sparkle ? o.bottom.color : 0x000000,
    emissiveIntensity: o.bottom.sparkle ? 0.18 : 1,
  });
  const g = charGroup;
  const dress = o.bottom.style === 'dress';
  const skirt = o.bottom.style === 'skirt' || dress;

  // ---- legs & bottoms ----
  const legMatL = skirt ? skin : botMat;
  const legR = { joggers: 0.1, cargo: 0.105, flare: 0.09 }[o.bottom.style] || 0.062;
  for (const side of [-1, 1]) {
    const hipX = side * 0.093;
    if (o.bottom.style === 'flare') {
      limb(g, [hipX, 0.98, 0], [hipX, 0.5, 0.01], 0.095, botMat);
      // flare bell
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.185, 0.42, 16), botMat);
      bell.position.set(hipX, 0.3, 0.01);
      g.add(bell);
    } else {
      limb(g, [hipX, 0.98, 0], [hipX * 1.06, 0.55, 0.015], legR, legMatL);
      limb(g, [hipX * 1.06, 0.55, 0.015], [hipX * 1.06, 0.13, 0.01], skirt ? 0.055 : legR * 0.88, legMatL);
      if (!skirt && (o.bottom.style === 'joggers' || o.bottom.style === 'cargo')) {
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(legR * 0.86, 0.02, 8, 18), botMat);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(hipX * 1.06, 0.16, 0.01);
        g.add(cuff);
      }
      if (o.bottom.style === 'cargo') {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.09), botMat);
        pocket.position.set(side * 0.16, 0.62, 0.02);
        g.add(pocket);
      }
    }
    // star print on the thigh (the "Pretty Girl" star vibe)
    if (o.bottom.stars && !skirt) {
      star(g, [hipX + side * 0.02, 0.72, 0.115], 0.05, o.bottom.stars);
      star(g, [hipX, 0.45, 0.105], 0.03, o.bottom.stars);
    }
  }

  // hips
  ball(g, [0, 1.0, 0], 0.142, botMat, [1.04, 0.68, 0.85]);

  // skirt / dress cone
  if (skirt) {
    const topY = dress ? 1.32 : 1.06, botY = dress ? 0.62 : 0.82;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(dress ? 0.17 : 0.165, dress ? 0.30 : 0.26, topY - botY, 20), botMat);
    cone.position.y = (topY + botY) / 2;
    g.add(cone);
  }

  // ---- torso ----
  const crop = o.top.crop !== false && !dress;
  const waistY = crop ? 1.2 : 1.05;
  if (crop && !skirt) ball(g, [0, 1.12, 0], 0.125, skin, [1.02, 0.85, 0.82]); // midriff
  if (!dress) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.132, 1.44 - waistY, 18), topMat);
    torso.position.y = (1.44 + waistY) / 2;
    g.add(torso);
  } else {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.24, 18), botMat);
    torso.position.y = 1.34;
    g.add(torso);
  }
  ball(g, [0, 1.42, 0], 0.15, dress ? botMat : topMat, [1.12, 0.62, 0.88]); // chest/shoulders

  // hoodie details
  if (o.top.hoodie) {
    ball(g, [0, 1.44, -0.13], 0.1, topMat, [1.25, 0.75, 0.85]);          // hood bump
    for (const side of [-1, 1]) {                                          // drawstrings
      const str = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.12, 3, 6), mat(0xffffff, { roughness: 0.6 }));
      str.position.set(side * 0.05, 1.32, 0.145);
      g.add(str);
    }
  }
  if (o.top.zipper && !dress) {
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.44 - waistY - 0.02, 0.01),
      mat(0xdddddd, { metalness: 0.7, roughness: 0.3 }));
    zip.position.set(0, (1.44 + waistY) / 2, 0.148);
    g.add(zip);
  }
  if (o.top.fur) { // fluffy coat bumps
    const fur = mat(o.top.color, { roughness: 0.95, flat: true });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const y = 1.06 + (i % 4) * 0.11;
      ball(g, [Math.cos(a) * 0.16, y, Math.sin(a) * 0.15], 0.045 + (i % 3) * 0.012, fur);
    }
  }

  // ---- arms (left arm up in the selfie pose, phone in hand) ----
  const sleeveMat = (o.top.style === 'strap' || dress) ? skin : topMat;
  // right arm relaxed
  limb(g, [-0.2, 1.4, 0], [-0.26, 1.12, 0.03], 0.048, sleeveMat);
  limb(g, [-0.26, 1.12, 0.03], [-0.235, 0.88, 0.075], 0.042, skin);
  ball(g, [-0.235, 0.86, 0.08], 0.05, skin);
  // left arm raised with phone
  limb(g, [0.2, 1.4, 0], [0.31, 1.22, 0.1], 0.048, sleeveMat);
  limb(g, [0.31, 1.22, 0.1], [0.23, 1.5, 0.21], 0.042, skin);
  ball(g, [0.225, 1.52, 0.215], 0.05, skin);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.17, 0.015),
    mat(0xf27ab8, { roughness: 0.35, metalness: 0.2 }));
  phone.position.set(0.22, 1.6, 0.22);
  phone.rotation.set(-0.25, 0.35, 0.12);
  g.add(phone);
  if (o.top.style === 'strap') { // shoulder straps
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.12, 0.02), dress ? botMat : topMat);
      strap.position.set(side * 0.1, 1.5, 0.06);
      strap.rotation.x = -0.35;
      g.add(strap);
    }
  }

  // ---- shoes ----
  for (const side of [-1, 1]) {
    const x = side * 0.099;
    if (o.shoes.style === 'heel') {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.2), mat(o.shoes.main, { roughness: 0.3 }));
      foot.position.set(x, 0.06, 0.05);
      foot.rotation.x = -0.18;
      g.add(foot);
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8),
        mat(o.shoes.accent, { metalness: 0.6, roughness: 0.3 }));
      heel.position.set(x, 0.045, -0.035);
      g.add(heel);
    } else {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.085, 0.24), mat(o.shoes.main, { roughness: 0.45 }));
      shoe.position.set(x, 0.055, 0.045);
      g.add(shoe);
      ball(g, [x, 0.06, 0.16], 0.05, mat(o.shoes.main, { roughness: 0.45 }), [1, 0.85, 1]);
      const swoosh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.14), mat(o.shoes.accent, { roughness: 0.5 }));
      swoosh.position.set(x, 0.075, 0.02);
      g.add(swoosh);
    }
  }

  // ---- head & face ----
  ball(g, [0, 1.63, 0], 0.148, skin, [1, 1.06, 1]);
  limb(g, [0, 1.46, 0], [0, 1.54, 0], 0.045, skin);                 // neck
  for (const side of [-1, 1]) {
    ball(g, [side * 0.052, 1.655, 0.128], 0.026, mat(0xffffff, { roughness: 0.25 }), [1, 1.15, 0.6]); // eye
    ball(g, [side * 0.052, 1.655, 0.147], 0.0135, mat(0x2a1a14, { roughness: 0.2 }));                 // iris
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.045, 3, 6), hair);
    brow.position.set(side * 0.055, 1.702, 0.135);
    brow.rotation.z = Math.PI / 2 + side * -0.18;
    g.add(brow);
    // hoop earrings
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.005, 8, 20),
      mat(0xd4af37, { metalness: 0.85, roughness: 0.25 }));
    hoop.position.set(side * 0.148, 1.585, 0.005);
    hoop.rotation.y = Math.PI / 2;
    g.add(hoop);
  }
  ball(g, [0, 1.615, 0.148], 0.016, mat(look.skin, { roughness: 0.45 }), [1, 0.8, 0.7]);   // nose
  ball(g, [0, 1.567, 0.135], 0.028, mat(0xb95a6b, { roughness: 0.4 }), [1.25, 0.6, 0.6]);  // lips
  // necklace
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 8, 22),
    mat(0xd4af37, { metalness: 0.85, roughness: 0.25 }));
  chain.position.set(0, 1.47, 0.03);
  chain.rotation.x = Math.PI / 2 - 0.5;
  g.add(chain);

  // ---- hair ----
  buildHair(g, look.hairStyle, hair);
}

function buildHair(g, style, hair) {
  // scalp cap
  ball(g, [0, 1.665, -0.022], 0.152, hair, [1.04, 1.02, 1.02]);
  ball(g, [0, 1.7, 0.075], 0.09, hair, [1.35, 0.6, 0.9]);   // front swoop

  const chainDown = (startX, curlAmp) => {
    let y = 1.78, z = -0.12, r = 0.075;
    for (let i = 0; i < 12; i++) {
      const x = startX + Math.sin(i * 1.25) * curlAmp;
      const m = ball(g, [x, y, z], r, hair);
      swayers.push({ m, phase: i * 0.45, amp: 0.006 + i * 0.0035, baseX: x });
      y -= 0.078 + r * 0.16;
      z -= i < 4 ? 0.02 : 0.004;
      r *= 0.94;
    }
  };

  switch (style) {
    case 'ponytail':
      ball(g, [0, 1.83, -0.03], 0.095, hair);                         // topknot
      ball(g, [0, 1.8, -0.03], 0.055, mat(0xd4af37, { metalness: 0.8, roughness: 0.3 }), [1, 0.4, 1]); // gold tie
      chainDown(0, 0.035);
      break;
    case 'curls': {
      // Big rounded curls kept behind the hairline so the face stays clear.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = 0.11 + (i % 3) * 0.022;
        const z = -0.07 + Math.sin(a) * 0.075;               // biased backward
        const m = ball(g, [Math.cos(a) * 0.115, 1.71 + Math.sin(i * 2.3) * 0.05, z], rr * 0.62, hair);
        swayers.push({ m, phase: i, amp: 0.004, baseX: m.position.x });
      }
      ball(g, [0, 1.62, -0.12], 0.12, hair, [1.15, 1.2, 0.8]); // nape volume
      break;
    }
    case 'braids':
      chainDown(-0.1, 0.012);
      chainDown(0.1, 0.012);
      for (const side of [-1, 1]) { // front braid over shoulder
        let y = 1.62, r = 0.045;
        for (let i = 0; i < 8; i++) {
          const m = ball(g, [side * 0.13, y, 0.06 + i * 0.005], r, hair);
          swayers.push({ m, phase: i * 0.5 + side, amp: 0.005, baseX: m.position.x });
          y -= 0.075;
          r *= 0.96;
        }
      }
      break;
    case 'bob':
      for (const side of [-1, 1]) {
        ball(g, [side * 0.115, 1.6, -0.02], 0.095, hair, [0.8, 1.35, 1]);
        ball(g, [side * 0.1, 1.48, 0.01], 0.07, hair, [0.85, 1.1, 1]);
      }
      ball(g, [0, 1.62, -0.09], 0.13, hair, [1.05, 1.15, 0.9]);
      break;
    case 'buns':
      for (const side of [-1, 1]) {
        ball(g, [side * 0.115, 1.82, -0.02], 0.07, hair);
        ball(g, [side * 0.115, 1.82, -0.02], 0.045, mat(0xf27ab8, { roughness: 0.6 }), [1, 0.35, 1]); // pink tie
      }
      break;
    case 'short':
      ball(g, [0, 1.7, -0.03], 0.145, hair, [1.05, 0.9, 1.02]);
      break;
  }
}

// ---------------------------------------------------------------------------
// Loop + public API
// ---------------------------------------------------------------------------
function tick() {
  rafId = requestAnimationFrame(tick);
  if (!host || !host.isConnected || !renderer) return;

  const t = clock.getElapsedTime();
  if (!dragging) spinTarget += 0.0028;                    // slow show-off spin
  spin += (spinTarget - spin) * 0.1;
  charGroup.rotation.y = spin;
  charGroup.position.y = Math.sin(t * 1.6) * 0.012;       // idle bob

  for (const s of swayers) {
    s.m.position.x = s.baseX + Math.sin(t * 1.8 + s.phase) * s.amp;
  }

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

  unmount() { host = null; },

  dispose() {
    cancelAnimationFrame(rafId); rafId = 0;
    renderer?.dispose(); renderer = null; host = null;
  },
};

// Rebuild the model whenever the look changes.
CCS.events?.on('avatar-changed', () => CCS.avatar3d.refresh());

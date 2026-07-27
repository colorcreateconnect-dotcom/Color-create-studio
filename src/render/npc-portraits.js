// ============================================================================
// npc-portraits.js — renders every NPC as a real rigged 3D character.
//
// NPCs share the exact same pipeline as the player: a skinned GLB base body
// (female or male), wardrobe slots, and the shared face-hair module — so the
// whole cast sits at one visual quality bar. Each NPC's `look` (data-npcs.js)
// is assembled on a rig and rendered once to a portrait (data URL) that the
// Social tab and interaction sheets display instead of emoji.
//
// Portraits render sequentially in an offscreen canvas and are cached for
// the session. CCS.portraits.get(npcId) → dataURL | null (kicks a render).
// ============================================================================

import * as THREE from 'three';
import { CharacterRig } from './character-rig.js';
import { createHeadModule } from './face-hair.js';

const CCS = window.CCS;

const SIZE = 220;
let renderer = null, scene, camera;
const cache = new Map();          // npcId -> dataURL
const pending = new Set();
let queue = Promise.resolve();

function ensureRenderer() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
  } catch {
    return false;
  }
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  // Soft studio lighting — gentle enough to keep true skin tones.
  scene.add(new THREE.AmbientLight(0xbfb0d8, 0.55));
  const key = new THREE.PointLight(0xfff0e6, 6.5, 20, 1.6);
  key.position.set(0.7, 2.3, 1.4);
  scene.add(key);
  const rim = new THREE.PointLight(0xff4fa0, 3.5, 15, 1.7);
  rim.position.set(-1.4, 1.9, -0.9);
  scene.add(rim);
  const fill = new THREE.PointLight(0x5f8fff, 2, 15, 1.8);
  fill.position.set(1.4, 1.4, -0.7);
  scene.add(fill);
  return true;
}

// Vibe-based portrait backdrop tints, so cards feel individual.
const BG = {
  warm: 0x2c1b30, cool: 0x1b2233, night: 0x191024, fresh: 0x1c2b26, default: 0x221831,
};

async function renderPortrait(npcId) {
  const def = CCS.data.npcById?.[npcId];
  if (!def || !ensureRenderer()) return null;
  const look = def.look || {};
  const bodyType = look.bodyType || 'female';

  let rig;
  try {
    rig = await CharacterRig.create({ bodyType });
  } catch {
    return null;
  }

  // Dress the rig: female NPCs wear outfit presets, male NPCs the base set.
  const skinHex = look.skin ?? 0x9c6644;
  rig.tintSkin(skinHex);
  if (bodyType === 'female') {
    const outfit = CCS.data.avatarOutfitById?.[look.outfit] || CCS.data.avatarOutfits?.[0];
    if (outfit) {
      rig.equip(outfit.slots || {});
      const s = outfit.slots || {};
      if (s.top) rig.tintMesh(s.top, { color: look.topColor ?? outfit.top.color });
      if (s.bottom) rig.tintMesh(s.bottom, { color: outfit.bottom.color });
      if (s.dress) rig.tintMesh(s.dress, { color: outfit.bottom.color, roughness: 0.35 });
      if (s.shoe) rig.tintMesh(s.shoe, { color: outfit.shoes.main });
    }
  } else {
    rig.tintMesh('top_tee', { color: look.topColor ?? 0x8899aa });
    rig.tintMesh('bottom_shorts', { color: 0x3a4150 });
  }

  // Shared face/hair module on the Head bone.
  const head = createHeadModule(
    { skin: skinHex, hairColor: look.hairColor ?? 0x18121a, hairStyle: look.hairStyle ?? 'short' },
    { masc: !!look.masc, facialHair: look.facialHair || 'none',
      eyeColor: look.eyeColor ?? 0x4a2a18, earrings: look.earrings ?? (look.masc ? 'studs' : 'hoops') },
  );
  head.group.position.set(0, 0.085, 0.004);
  head.group.rotation.y = -0.09;
  rig.attachTo('Head', head.group);

  // Watch accessory (the little luxury detail).
  if (look.watch) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0xc9c9d4, metalness: 0.85, roughness: 0.3 }));
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.01, 0);
    rig.attachTo('R_Hand', band);
  }

  // Relaxed portrait pose + slight body turn.
  rig.pose({
    Chest: [0, -0.12, -0.01],
    L_UpperArm: [0.08, 0, 0.14], L_LowerArm: [-0.3, 0, 0],
    R_UpperArm: [0.08, 0, -0.14], R_LowerArm: [-0.3, 0, 0],
  });
  rig.update(0);

  const headY = bodyType === 'male' ? 1.76 : 1.72;
  camera.position.set(0.04, headY + 0.03, 0.74);   // eye level, head + shoulders
  camera.lookAt(0, headY - 0.025, 0);
  scene.background = new THREE.Color(BG[def.look?.bg] ?? BG.default);

  scene.add(rig.root);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(rig.root);
  rig.dispose();
  head.group.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
  return url;
}

CCS.portraits = {
  // Returns the cached portrait, or null (and starts rendering it).
  get(npcId) {
    if (cache.has(npcId)) return cache.get(npcId);
    this.ensure(npcId);
    return null;
  },

  ensure(npcId) {
    if (cache.has(npcId) || pending.has(npcId)) return;
    pending.add(npcId);
    queue = queue.then(async () => {
      try {
        const url = await renderPortrait(npcId);
        if (url) cache.set(npcId, url);
      } catch (e) {
        console.warn('[portraits] failed for', npcId, e);
      } finally {
        pending.delete(npcId);
        CCS.events?.emit('portraits-changed');
      }
    });
    return queue;
  },

  ensureAll() {
    for (const n of CCS.data.npcs || []) this.ensure(n.id);
    return queue;
  },

  get count() { return cache.size; },
};

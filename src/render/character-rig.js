// ============================================================================
// character-rig.js — the rigged character runtime (the "CharacterKit").
//
// Loads the GLB character assets (assets/characters/base_*.glb), clones them
// per character instance, and exposes the pipeline a life-sim needs:
//
//   Human body (skinned GLB, humanoid skeleton)
//     → body customization (bone-scale hooks; slider-ready)
//     → face customization (modules attached to the Head bone)
//     → hair (modular, Head bone)
//     → skin / materials (tint slots, physical materials)
//     → clothing / shoes (named SkinnedMesh slots, show-hide + tint)
//     → accessories (attach to any bone)
//     → animation (AnimationMixer: base pose clips + additive layers)
//
// Customization SWAPS meshes and materials — nothing is rebuilt from
// primitives at runtime. The contract with the assets is only:
//   • bone names:  Hips Spine Chest Neck Head, L/R_Shoulder|UpperArm|
//                  LowerArm|Hand, L/R_UpperLeg|LowerLeg|Foot
//   • mesh names:  Body + slot meshes (top_*, bottom_*, dress_*, shoe_*)
// so studio-authored GLBs can replace the generated ones with no code change.
// ============================================================================

import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import * as SkeletonUtils from '../../vendor/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();          // bodyType -> Promise<gltf>

function loadBase(bodyType) {
  if (!cache.has(bodyType)) {
    cache.set(bodyType, loader.loadAsync(`assets/characters/base_${bodyType}.glb`));
  }
  return cache.get(bodyType);
}

// Procedural micro-surface noise (tiling bump map): breaks up the perfectly
// uniform "injection-molded" specular so skin and fabric read as materials.
let _microBump = null;
function microBump() {
  if (_microBump || typeof document === 'undefined') return _microBump;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 20;      // gentle noise around mid-gray
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  _microBump = new THREE.CanvasTexture(cv);
  _microBump.wrapS = _microBump.wrapT = THREE.RepeatWrapping;
  _microBump.repeat.set(8, 8);
  return _microBump;
}

// Bone-name canonicalization: external rigs (Mixamo auto-rig, Meshy, Tripo,
// most AI 3D generators) use Mixamo-style names. Map them onto our canonical
// skeleton so third-party character files work without re-rigging.
const MIXAMO_MAP = {
  Hips: 'Hips', Spine: 'Spine', Spine2: 'Chest', Spine3: 'Chest',
  Neck: 'Neck', Head: 'Head',
  LeftShoulder: 'L_Shoulder', LeftArm: 'L_UpperArm', LeftForeArm: 'L_LowerArm', LeftHand: 'L_Hand',
  RightShoulder: 'R_Shoulder', RightArm: 'R_UpperArm', RightForeArm: 'R_LowerArm', RightHand: 'R_Hand',
  LeftUpLeg: 'L_UpperLeg', LeftLeg: 'L_LowerLeg', LeftFoot: 'L_Foot',
  RightUpLeg: 'R_UpperLeg', RightLeg: 'R_LowerLeg', RightFoot: 'R_Foot',
};
export function canonicalBoneName(raw) {
  if (!raw) return null;
  const bare = raw.replace(/^mixamorig\d*[:_]?/i, '');
  return MIXAMO_MAP[bare] || bare;
}

export class CharacterRig {
  // `url` loads any character GLB (artist delivery, AI-generated export)
  // instead of the built-in bases — for previewing and integration.
  static async create({ bodyType = 'female', url = null } = {}) {
    const gltf = url ? await loader.loadAsync(url) : await loadBase(bodyType);
    const root = SkeletonUtils.clone(gltf.scene);
    return new CharacterRig(root, gltf.animations, bodyType);
  }

  constructor(root, clips, bodyType) {
    this.root = root;
    this.bodyType = bodyType;
    this.clips = clips;
    this.bones = {};
    this.meshes = {};
    root.traverse((o) => {
      if (o.isBone) {
        const canon = canonicalBoneName(o.name);
        if (canon && !this.bones[canon]) this.bones[canon] = o;
        if (!this.bones[o.name]) this.bones[o.name] = o;
      }
      if (o.isSkinnedMesh) { o.frustumCulled = false; this.meshes[o.name] = o; }
    });
    // Auto-normalize scale: external exports are often in centimeters.
    const bbox = new THREE.Box3().setFromObject(root);
    const height = bbox.max.y - bbox.min.y;
    if (height > 3 && isFinite(height)) {
      root.scale.setScalar(1.72 / height);
      root.updateMatrixWorld(true);
    }
    this.mixer = new THREE.AnimationMixer(root);
    this._actions = {};
    this._attachments = [];
  }

  // ---- wardrobe slots -------------------------------------------------------
  slotNames() { return Object.keys(this.meshes).filter((n) => n !== 'Body'); }

  // Show exactly the meshes named in `slots` (an object of slot -> meshName).
  equip(slots = {}) {
    for (const [name, mesh] of Object.entries(this.meshes)) {
      if (name !== 'Body') mesh.visible = false;
    }
    for (const meshName of Object.values(slots)) {
      if (this.meshes[meshName]) this.meshes[meshName].visible = true;
      else if (meshName) console.warn('[rig] no such slot mesh:', meshName);
    }
  }

  // ---- materials -------------------------------------------------------------
  tintSkin(hex) {
    const skinC = new THREE.Color(hex);
    const m = new THREE.MeshPhysicalMaterial({
      color: hex, roughness: 0.48, metalness: 0.02,
      sheen: 0.4, sheenColor: skinC.clone().lerp(new THREE.Color(0xfff1e6), 0.3), sheenRoughness: 0.65,
      bumpMap: microBump(), bumpScale: 0.25,
    });
    const old = this.meshes.Body.material;
    this.meshes.Body.material = m;
    old?.dispose?.();
  }

  tintMesh(meshName, { color, roughness, emissive, emissiveIntensity } = {}) {
    const mesh = this.meshes[meshName];
    if (!mesh) return;
    // Physical fabric: soft sheen + woven micro-bump so cloth reads as cloth.
    const m = new THREE.MeshPhysicalMaterial({
      color: color ?? 0xffffff,
      roughness: roughness ?? 0.75,
      emissive: emissive ?? 0x000000,
      emissiveIntensity: emissiveIntensity ?? 1,
      sheen: 0.25, sheenColor: new THREE.Color(color ?? 0xffffff).lerp(new THREE.Color(0xffffff), 0.4),
      sheenRoughness: 0.8,
      bumpMap: microBump(), bumpScale: 0.6,
    });
    const old = mesh.material;
    mesh.material = m;
    old?.dispose?.();
  }

  // ---- accessories / modules ---------------------------------------------------
  attachTo(boneName, object3d) {
    const bone = this.bones[boneName];
    if (!bone) { console.warn('[rig] no bone', boneName); return null; }
    bone.add(object3d);
    this._attachments.push(object3d);
    return object3d;
  }

  // ---- posing + animation --------------------------------------------------------
  // Set bone rotations (Euler radians), then bake them into a static base
  // pose clip so additive animation layers play on top without clobbering it.
  pose(rotations) {
    const posed = [];
    for (const [name, [x, y, z]] of Object.entries(rotations)) {
      const b = this.bones[name];
      if (!b) continue;
      b.rotation.set(x, y, z);
      posed.push(name);
    }
    const tracks = posed.map((n) => new THREE.QuaternionKeyframeTrack(
      `${n}.quaternion`, [0], [...this.bones[n].quaternion.toArray()]));
    const clip = new THREE.AnimationClip('pose', -1, tracks);
    this._basePose?.stop();
    this._basePose = this.mixer.clipAction(clip);
    this._basePose.play();
    this._activeBase = this._basePose;
    this._baseName = 'pose';
  }

  // Full-body motions from the asset's baked clips ('walk', 'dance', 'wave'),
  // crossfaded as BASE layers — 'pose' returns to the signature stance.
  motions() {
    return ['pose', ...this.clips.filter((c) => c.name !== 'idle').map((c) => c.name)];
  }

  setMotion(name = 'pose', fade = 0.45) {
    if (name === this._baseName) return this._activeBase;
    let target;
    if (name === 'pose') {
      target = this._basePose;
    } else {
      this._baseActions = this._baseActions || {};
      if (!this._baseActions[name]) {
        const src = this.clips.find((c) => c.name === name);
        if (!src) { console.warn('[rig] no motion clip', name); return null; }
        this._baseActions[name] = this.mixer.clipAction(src);
      }
      target = this._baseActions[name];
    }
    if (!target) return null;
    target.enabled = true;
    target.reset();
    target.play();
    if (this._activeBase && this._activeBase !== target) {
      this._activeBase.crossFadeTo(target, fade, false);
    }
    this._activeBase = target;
    this._baseName = name;
    return target;
  }

  // Additive layer from a baked asset clip ('idle', 'groove', …).
  playAdditive(name, weight = 1, fade = 0.4) {
    let action = this._actions[name];
    if (!action) {
      const src = this.clips.find((c) => c.name === name);
      if (!src) { console.warn('[rig] no clip', name); return null; }
      const additive = THREE.AnimationUtils.makeClipAdditive(src.clone());
      action = this.mixer.clipAction(additive);
      action.blendMode = THREE.AdditiveAnimationBlendMode;
      this._actions[name] = action;
    }
    action.enabled = true;
    action.setEffectiveWeight(weight);
    if (!action.isRunning()) action.play();
    action.fadeIn(fade);
    return action;
  }

  fadeOut(name, fade = 0.4) {
    this._actions[name]?.fadeOut(fade);
  }

  // Crossfade between additive layers (animation blending).
  blendTo(name, fade = 0.5) {
    for (const [n, a] of Object.entries(this._actions)) {
      if (n !== name && a.isRunning()) a.fadeOut(fade);
    }
    return this.playAdditive(name, 1, fade);
  }

  update(dt) { this.mixer.update(dt); }

  dispose() {
    this.mixer.stopAllAction();
    this.root.traverse((n) => { n.geometry?.dispose(); n.material?.dispose?.(); });
    this.root.removeFromParent();
  }
}

// Expose for tests/tools and non-module callers.
window.CCS = window.CCS || {};
window.CCS.characterKit = { CharacterRig, loadBase };

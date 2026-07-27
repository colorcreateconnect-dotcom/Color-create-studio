// ============================================================================
// validate-character.mjs — acceptance check for character GLB assets.
//
//   node tools/validate-character.mjs assets/characters/base_female.glb
//
// Validates an artist-delivered (or generated) character asset against the
// contract in docs/CHARACTER-ASSET-SPEC.md, by parsing the glTF JSON chunk
// directly (no rendering, no DOM — works on any GLB including textured ones).
//
//   FAIL  → the runtime cannot use this file (missing skeleton/body/scale)
//   WARN  → it will load, but content is missing (slots, clips, materials)
//   PASS  → drop it in assets/characters/ and play
// ============================================================================

import fs from 'node:fs';

const REQUIRED_BONES = [
  'Hips', 'Spine', 'Chest', 'Neck', 'Head',
  'L_Shoulder', 'L_UpperArm', 'L_LowerArm', 'L_Hand',
  'R_Shoulder', 'R_UpperArm', 'R_LowerArm', 'R_Hand',
  'L_UpperLeg', 'L_LowerLeg', 'L_Foot',
  'R_UpperLeg', 'R_LowerLeg', 'R_Foot',
];
const FEMALE_SLOTS = [
  'top_cropHoodie', 'top_cropZip', 'top_strap', 'top_fur',
  'bottom_joggers', 'bottom_cargo', 'bottom_flare', 'bottom_skirt',
  'dress_slip', 'shoe_sneaker', 'shoe_heel',
];
const CLIPS = ['idle', 'walk', 'dance', 'wave'];

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/validate-character.mjs <file.glb>');
  process.exit(2);
}

const fails = [], warns = [], infos = [];

let json;
try {
  const buf = fs.readFileSync(file);
  if (buf.length < 20 || buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB (bad magic)');
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`glTF version ${version} (need 2)`);
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.toString('ascii', 16, 20);
  if (jsonType !== 'JSON') throw new Error('first chunk is not JSON');
  json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  infos.push(`file: ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
} catch (e) {
  console.error(`FAIL  ${e.message}`);
  process.exit(1);
}

const nodes = json.nodes || [];
const nodeNames = new Set(nodes.map((n) => n.name).filter(Boolean));

// --- skeleton ---------------------------------------------------------------
// External auto-rigs (Mixamo/Meshy/Tripo) are accepted via name mapping —
// the runtime canonicalizes these at load (see character-rig.js).
const MIXAMO_MAP = {
  Hips: 'Hips', Spine: 'Spine', Spine2: 'Chest', Spine3: 'Chest', Neck: 'Neck', Head: 'Head',
  LeftShoulder: 'L_Shoulder', LeftArm: 'L_UpperArm', LeftForeArm: 'L_LowerArm', LeftHand: 'L_Hand',
  RightShoulder: 'R_Shoulder', RightArm: 'R_UpperArm', RightForeArm: 'R_LowerArm', RightHand: 'R_Hand',
  LeftUpLeg: 'L_UpperLeg', LeftLeg: 'L_LowerLeg', LeftFoot: 'L_Foot',
  RightUpLeg: 'R_UpperLeg', RightLeg: 'R_LowerLeg', RightFoot: 'R_Foot',
};
const canon = (raw) => {
  if (!raw) return null;
  const bare = raw.replace(/^mixamorig\d*[:_]?/i, '');
  return MIXAMO_MAP[bare] || bare;
};

const skins = json.skins || [];
if (!skins.length) fails.push('no skin (skeleton) in file');
else {
  const rawNames = skins.flatMap((s) => s.joints.map((j) => nodes[j]?.name));
  const jointNames = new Set(rawNames.map(canon));
  const missing = REQUIRED_BONES.filter((b) => !jointNames.has(b));
  const mixamo = rawNames.some((n) => /^mixamorig/i.test(n || '') || MIXAMO_MAP[n]);
  if (missing.length) fails.push(`missing required bones (after alias mapping): ${missing.join(', ')}`);
  else infos.push(`skeleton: all ${REQUIRED_BONES.length} required bones present${mixamo ? ' (Mixamo-style names, auto-mapped)' : ''} (${skins[0].joints.length} joints total)`);
}

// --- Body mesh ----------------------------------------------------------------
const meshNodes = nodes.filter((n) => n.mesh != null && n.name);
const bodyNode = meshNodes.find((n) => n.name === 'Body');
if (!bodyNode) fails.push("no mesh node named 'Body'");
else if (bodyNode.skin == null) fails.push("'Body' is not skinned (no skin reference)");
else infos.push("body: skinned mesh 'Body' present");

// --- scale / height sanity ----------------------------------------------------
if (bodyNode && json.meshes?.[bodyNode.mesh]) {
  let minY = Infinity, maxY = -Infinity;
  for (const prim of json.meshes[bodyNode.mesh].primitives || []) {
    const acc = json.accessors?.[prim.attributes?.POSITION];
    if (acc?.min && acc?.max) { minY = Math.min(minY, acc.min[1]); maxY = Math.max(maxY, acc.max[1]); }
  }
  if (isFinite(minY)) {
    const h = maxY - minY;
    if (h >= 1.3 && h <= 2.3) infos.push(`scale: body height ${h.toFixed(2)}m ✓`);
    else if (h >= 100 && h <= 260) warns.push(`body height ${h.toFixed(0)} — looks like centimeter scale; the runtime auto-rescales, but meter scale is preferred`);
    else fails.push(`body height ${h.toFixed(2)} out of range (1 unit = 1 meter, Y-up, height 1.3–2.3)`);
  }
}

// --- wardrobe slots -----------------------------------------------------------
const foundSlots = FEMALE_SLOTS.filter((s) => nodeNames.has(s));
const otherSlots = meshNodes.map((n) => n.name)
  .filter((n) => /^(top_|bottom_|dress_|shoe_|hair_)/.test(n) && !FEMALE_SLOTS.includes(n));
if (foundSlots.length) infos.push(`wardrobe: ${foundSlots.length}/${FEMALE_SLOTS.length} standard slots (${foundSlots.slice(0, 4).join(', ')}…)`);
else warns.push('no standard wardrobe slot meshes found (outfits will not switch)');
if (otherSlots.length) infos.push(`extra slots: ${otherSlots.join(', ')}`);

// --- materials ------------------------------------------------------------------
const matNames = new Set((json.materials || []).map((m) => m.name).filter(Boolean));
if (!matNames.has('MAT_skin')) warns.push("no material named 'MAT_skin' (skin tinting will replace the first Body material)");
else infos.push('materials: MAT_skin present');
const textured = (json.materials || []).some((m) =>
  m.pbrMetallicRoughness?.baseColorTexture || m.normalTexture);
infos.push(textured ? 'textures: PBR texture maps present ✨' : 'textures: none (flat-color materials)');

// --- animation clips -------------------------------------------------------------
const clipNames = new Set((json.animations || []).map((a) => a.name).filter(Boolean));
const missingClips = CLIPS.filter((c) => !clipNames.has(c));
if (clipNames.size === 0) warns.push('no animation clips (character will hold the runtime pose only)');
else if (missingClips.length) warns.push(`missing standard clips: ${missingClips.join(', ')}`);
else infos.push(`animations: ${[...clipNames].join(', ')} ✓`);
const extraClips = [...clipNames].filter((c) => !CLIPS.includes(c));
if (extraClips.length) infos.push(`bonus clips: ${extraClips.join(', ')}`);

// --- morph targets (future facial rig) -------------------------------------------
const morphCount = (json.meshes || []).reduce((a, m) =>
  a + (m.primitives?.[0]?.targets?.length || 0), 0);
infos.push(morphCount
  ? `morph targets: ${morphCount} found (facial rig upgrade available) ✨`
  : 'morph targets: none (procedural face module will be used)');

// --- report -----------------------------------------------------------------------
for (const i of infos) console.log(`  info  ${i}`);
for (const w of warns) console.log(`  WARN  ${w}`);
for (const f of fails) console.log(`  FAIL  ${f}`);
if (fails.length) {
  console.log(`\n✗ ${file}: ${fails.length} blocking issue(s) — the runtime cannot use this asset.`);
  process.exit(1);
}
console.log(`\n✓ ${file}: usable${warns.length ? ` (${warns.length} warning(s))` : ' — fully conformant'}.`);

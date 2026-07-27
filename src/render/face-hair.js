// ============================================================================
// face-hair.js — the shared face + hair module builder.
//
// Builds the head module (face, hair, jewelry) that rides a character's Head
// bone. Used by BOTH the player viewer (avatar3d.js) and the NPC portrait
// renderer (npc-portraits.js), so every character in the game shares one
// facial quality bar.
//
// createHeadModule(look, opts) → { group, faceRig, swayers }
//   look: { skin, hairColor, hairStyle }         (hex colors + style id)
//   opts: {
//     masc: false,          // masculine variant: heavier brows/jaw, no glam
//     facialHair: 'none',   // none | mustache | beard | goatee | stubble
//     eyeColor: 0x4a2a18,   // iris color
//     earrings: 'hoops',    // hoops | studs | none
//     headR: 0.115,
//   }
// ============================================================================

import * as THREE from 'three';

export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.roughness ?? 0.72, metalness: o.metalness ?? 0.05,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
    ...(o.flat ? { flatShading: true } : {}),
  });
}

export function ball(group, pos, r, material, scale = null) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 18), material);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  group.add(m);
  return m;
}

// Tapered capsule between two points.
export function limbT(group, a, b, rA, rB, material) {
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

export function createHeadModule(look, opts = {}) {
  const {
    masc = false, facialHair = 'none', eyeColor = 0x4a2a18,
    earrings = masc ? 'studs' : 'hoops', headR = 0.115,
  } = opts;

  const h = new THREE.Group();
  const swayers = [];
  const r = headR;

  const skinC = new THREE.Color(look.skin);
  const faceSkin = () => new THREE.MeshPhysicalMaterial({
    color: look.skin, roughness: masc ? 0.56 : 0.5, metalness: 0.02,
    sheen: masc ? 0.3 : 0.45,
    sheenColor: skinC.clone().lerp(new THREE.Color(0xfff1e6), 0.3), sheenRoughness: 0.65,
  });
  const hairM = () => mat(look.hairColor, { roughness: 0.82 });
  const gold = () => mat(0xd4af37, { metalness: 0.85, roughness: 0.25 });
  const lipC = skinC.clone().lerp(new THREE.Color(0xb84a66), masc ? 0.22 : 0.62);
  const blushC = skinC.clone().lerp(new THREE.Color(0xff5f7e), 0.42);
  const linerC = 0x1c1116;
  const facialC = new THREE.Color(look.hairColor).lerp(new THREE.Color(0x120c0e), 0.35);

  // ---- head structure ----
  ball(h, [0, 0, 0], r, faceSkin(), [masc ? 0.99 : 0.96, masc ? 1.06 : 1.08, 0.98]);
  ball(h, [0, -0.05, 0.018], masc ? 0.088 : 0.08, faceSkin(), [masc ? 0.95 : 0.88, 0.8, 0.92]); // jaw
  ball(h, [0, -0.1, 0.038], masc ? 0.028 : 0.024, faceSkin(), [masc ? 1.2 : 1.05, 0.78, 0.9]);  // chin
  for (const side of [-1, 1]) {
    ball(h, [side * 0.056, -0.02, 0.05], 0.026, faceSkin(), [0.9, 0.7, 0.55]); // cheekbones
  }

  const faceRig = {
    head: h, eyes: [], brows: [], blushMats: [], skinC, blushC,
    headBase: { tilt: h.rotation.z, yaw: h.rotation.y },
  };

  // ---- blush layer (subtle for masc) ----
  for (const side of [-1, 1]) {
    const bm = new THREE.MeshStandardMaterial({ color: skinC.clone(), roughness: 0.55 });
    ball(h, [side * 0.055, -0.028, 0.066], masc ? 0.016 : 0.021, bm, [1.05, 0.62, 0.42]);
    faceRig.blushMats.push(bm);
  }

  // ---- eyes ----
  for (const side of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(side * 0.047, 0.014, 0.082);
    h.add(eg);

    const white = new THREE.Mesh(new THREE.SphereGeometry(0.0255, 20, 16),
      mat(0xfefefe, { roughness: 0.22 }));
    white.scale.set(1.18, masc ? 0.95 : 1.05, 0.55);
    eg.add(white);

    const ig = new THREE.Group();
    ig.position.set(0, 0, 0.009);
    eg.add(ig);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 16, 12), mat(eyeColor, { roughness: 0.25 }));
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
    if (!masc) {
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
    }

    const lidLo = new THREE.Mesh(new THREE.SphereGeometry(0.023, 16, 12), faceSkin());
    lidLo.scale.set(1.12, 0.42, 0.55);
    lidLo.position.set(0, -0.0205, 0.002);
    eg.add(lidLo);

    faceRig.eyes.push({
      group: eg, white, whiteBaseY: masc ? 0.95 : 1.05, irisGroup: ig,
      lidUp, lidUpBaseY: lidUp.position.y, lidLo, lidLoBaseY: lidLo.position.y,
    });
  }

  // ---- brows (heavier + straighter for masc) ----
  const browR = masc ? 0.0072 : 0.0048;
  for (const side of [-1, 1]) {
    const bg = new THREE.Group();
    bg.position.set(side * 0.049, masc ? 0.046 : 0.05, 0.086);
    h.add(bg);
    const bm = hairM();
    limbT(bg, [side * -0.021, -0.003, 0], [side * 0.004, masc ? 0.004 : 0.0065, 0.003], browR, browR * 0.8, bm);
    limbT(bg, [side * 0.004, masc ? 0.004 : 0.0065, 0.003], [side * 0.027, -0.0015, -0.002], browR * 0.8, browR * 0.45, bm);
    faceRig.brows.push({ g: bg, baseY: bg.position.y, side });
  }

  // ---- nose ----
  limbT(h, [0, 0.026, 0.104], [0, -0.004, 0.114], masc ? 0.0075 : 0.006, masc ? 0.0095 : 0.0078, faceSkin());
  ball(h, [0, -0.009, 0.115], masc ? 0.0115 : 0.0095, faceSkin(), [1.08, 0.8, 0.8]);

  // ---- lips ----
  const lipMat = () => new THREE.MeshPhysicalMaterial({
    color: lipC, roughness: masc ? 0.5 : 0.3,
    clearcoat: masc ? 0.1 : 0.55, clearcoatRoughness: 0.35,
  });
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.056, 0.096);
  h.add(mouth);
  ball(mouth, [-0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, masc ? 0.5 : 0.6, 0.6]);
  ball(mouth, [0.0085, 0.004, 0], 0.0122, lipMat(), [1.12, masc ? 0.5 : 0.6, 0.6]);
  const lower = ball(mouth, [0, -0.0075, 0.001], 0.0152, lipMat(), [1.28, masc ? 0.6 : 0.72, 0.66]);
  const cornerL = ball(mouth, [-0.0245, -0.001, -0.005], 0.0062, lipMat());
  const cornerR = ball(mouth, [0.0245, -0.001, -0.005], 0.0062, lipMat());
  if (!masc) {
    ball(mouth, [0, -0.0095, 0.0105], 0.0048,
      mat(0xffd9e2, { roughness: 0.2, emissive: 0xffb9cc, emissiveIntensity: 0.35 }), [1.5, 0.45, 0.5]);
  }
  faceRig.mouth = {
    group: mouth, lower, lowerBaseSX: lower.scale.x,
    corners: [cornerL, cornerR],
    cornerBase: [cornerL.position.clone(), cornerR.position.clone()],
  };

  // ---- facial hair (the reference-photo detail) ----
  if (facialHair !== 'none') {
    const fh = mat(facialC.getHex(), { roughness: 0.88 });
    if (facialHair === 'mustache' || facialHair === 'beard' || facialHair === 'goatee') {
      for (const side of [-1, 1]) {  // mustache wings
        const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.02, 4, 8), fh);
        w.position.set(side * 0.014, -0.0455, 0.1);
        w.rotation.z = Math.PI / 2 + side * 0.28;
        h.add(w);
      }
    }
    if (facialHair === 'beard' || facialHair === 'goatee') {
      ball(h, [0, -0.102, 0.052], 0.023, fh, [1.25, 0.9, 0.85]);           // chin patch
      ball(h, [0, -0.079, 0.078], 0.009, fh, [1.1, 1.6, 0.6]);            // soul patch
    }
    if (facialHair === 'beard') {
      for (const side of [-1, 1]) {   // jawline band up to the sideburns
        for (let i = 0; i < 4; i++) {
          const t = i / 3;
          ball(h, [side * (0.03 + t * 0.055), -0.098 + t * 0.052, 0.052 - t * 0.028],
            0.014 - t * 0.002, fh, [1.2, 0.9, 0.9]);
        }
        ball(h, [side * 0.092, -0.028, 0.028], 0.011, fh, [0.8, 1.8, 0.7]); // sideburn
      }
    }
    if (facialHair === 'stubble') {
      const st = new THREE.MeshStandardMaterial({
        color: facialC.clone().lerp(skinC, 0.55), roughness: 0.9,
      });
      ball(h, [0, -0.075, 0.045], 0.062, st, [1.18, 0.85, 0.95]);          // shadowed jaw
    }
  }

  // ---- ears + earrings ----
  for (const side of [-1, 1]) {
    ball(h, [side * 0.099, -0.008, 0.002], 0.017, faceSkin(), [0.45, 0.92, 0.7]);
    if (earrings === 'hoops') {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0045, 8, 20), gold());
      hoop.position.set(side * 0.102, -0.052, 0.004);
      hoop.rotation.y = Math.PI / 2;
      h.add(hoop);
    } else if (earrings === 'studs') {
      ball(h, [side * 0.104, -0.02, 0.006], 0.0045,
        mat(0xe8e8f0, { metalness: 0.9, roughness: 0.15, emissive: 0xaaaacc, emissiveIntensity: 0.2 }));
    }
  }

  // ---- hair ----
  buildHair(h, look.hairStyle, hairM, { headR: r, masc }, swayers);

  return { group: h, faceRig, swayers };
}

// --- Hair styles (local space: head center = origin) -------------------------
function buildHair(h, style, hairM, M, swayers) {
  const r = M.headR;
  const hair = hairM();

  if (style === 'fade') {
    // short waves with faded sides (the reference cut)
    ball(h, [0, 0.035, -0.01], r * 1.03, hair, [0.99, 0.82, 0.99]);        // top
    const fadeM = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hair.color).lerp(new THREE.Color(0x000000), 0.35), roughness: 0.9,
    });
    ball(h, [0, -0.01, -0.02], r * 1.035, fadeM, [1.0, 0.72, 1.0]);        // faded sides band
    for (let i = 0; i < 8; i++) {                                           // wave texture rows
      const a = (i / 8) * Math.PI - Math.PI / 2;
      const w = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, 0.004, 6, 24, Math.PI), hair);
      w.position.set(0, 0.055 + Math.sin(a) * 0.01, -0.012);
      w.rotation.x = -0.45 - i * 0.12;
      h.add(w);
    }
    return;
  }

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
    default:
      ball(h, [0, 0.05, -0.02], r * 1.12, hair, [1.02, 0.88, 1.0]);
      break;
  }
}

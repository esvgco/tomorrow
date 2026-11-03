// The rabbit rig — one skeleton shared by every version of the rabbit.
//
// Space: x forward (the rabbit faces +x), y up, z toward the viewer.
// The "near" side of the body is +z, the "far" side −z.
//
// A pose is a flat set of channels. Body and limb angles are *world* angles in
// the sagittal (x–y) plane, in degrees: 0 points forward, 90 up, −90 down,
// 180 back. World angles read straight off reference footage ("the shin points
// down and back"), which is how the gallop below was keyed from ref 05.
// Forward kinematics turns a pose into joint positions; `shapes()` dresses the
// joints with primitives (round cones) that every renderer draws its own way:
// the ray-marched versions blend them into one smooth body, the PS1 version
// draws each as a rigid low-poly segment.

export const DIM = {
  lumbar: 0.17, thoracic: 0.165, neck: 0.075, head: 0.18,
  ear1: 0.13, ear2: 0.13,
  upperArm: 0.12, forearm: 0.12, paw: 0.065,
  thigh: 0.16, shin: 0.16, foot: 0.15,
  tail: 0.03,
  hipZ: 0.075, shoulderZ: 0.06, earZ: 0.032, eyeZ: 0.06,
};

export const CHANNELS = [
  'x', 'y', 'stretch', 'lumbar', 'thoracic', 'neck', 'head',
  'ear1', 'ear2', 'earSplay', 'tail',
  'f1', 'f2', 'f3', 'h1', 'h2', 'h3',
];

const D2R = Math.PI / 180;
const dir = (a) => [Math.cos(a * D2R), Math.sin(a * D2R)];
const add = (p, d, k, z = 0) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + z];

/** Sitting, looking down into the hole in front of it (the client's mark).
 * Limb angles live in the same ranges as the gallop (hind thigh ~190–345,
 * forearm ~200–335), so a blend between the two never wraps round. */
export const SIT = {
  x: 0, y: 0.165, stretch: 1, lumbar: 22, thoracic: 46, neck: 62, head: -4,
  ear1: 104, ear2: 114, earSplay: 0.16, tail: 160,
  f1: 270, f2: 270, f3: 360,
  h1: 345, h2: 205, h3: 360,
};

/** The curious pose keeps the chest lifted; only the neck and head reach
 * toward the hole. Angles stay in the same ranges for continuous blending. */
export const LOOK_DOWN = {
  ...SIT, neck: 5, head: -38,
  ear1: 94, ear2: 108, f1: 264, f2: 272,
};

/** A bound: drive → long flight → fore catch → brief gather → hind drive.
 * Stretch is subtle (−4…+12%); the silhouette and timing do most of the work. */
export const GALLOP = {
  duration: 0.56,
  stride: 0.95,
  far: { fore: -0.035, hind: -0.018 },
  keys: [
    { t: 0, contact: 'hind', stretch: 1.04, lumbar: 8, thoracic: 10, neck: 32, head: 0,
      ear1: 132, ear2: 146, earSplay: 0.16, tail: 150,
      f1: 325, f2: 220, f3: 285, h1: 238, h2: 226, h3: 236 },
    { t: 0.24, lift: 0.08, stretch: 1.12, lumbar: 3, thoracic: 5, neck: 28, head: 3,
      ear1: 140, ear2: 151, earSplay: 0.16, tail: 164,
      f1: 350, f2: 355, f3: 350, h1: 196, h2: 188, h3: 182 },
    { t: 0.48, contact: 'fore', stretch: 1.06, lumbar: 0, thoracic: -6, neck: 30, head: -5,
      ear1: 130, ear2: 144, earSplay: 0.18, tail: 154,
      f1: 280, f2: 273, f3: 355, h1: 212, h2: 192, h3: 200 },
    { t: 0.62, contact: 'fore', stretch: 1, lumbar: 10, thoracic: 0, neck: 35, head: -3,
      ear1: 120, ear2: 135, earSplay: 0.18, tail: 144,
      f1: 250, f2: 246, f3: 310, h1: 270, h2: 220, h3: 290 },
    { t: 0.78, lift: 0.025, stretch: 0.96, lumbar: 22, thoracic: 5, neck: 34, head: 0,
      ear1: 117, ear2: 132, earSplay: 0.18, tail: 135,
      f1: 238, f2: 222, f3: 260, h1: 316, h2: 252, h3: 338 },
    { t: 0.9, contact: 'hind', stretch: 0.98, lumbar: 16, thoracic: 8, neck: 34, head: 0,
      ear1: 123, ear2: 138, earSplay: 0.17, tail: 143,
      f1: 282, f2: 210, f3: 255, h1: 304, h2: 252, h3: 344 },
  ],
};
/** Cyclic Catmull-Rom through the keys of a track, at phase t ∈ [0,1). */
export function sampleCycle(track, t) {
  const keys = track.keys;
  const n = keys.length;
  t = ((t % 1) + 1) % 1;
  let i = n - 1;
  for (let k = 0; k < n; k++) if (keys[k].t <= t) i = k;
  const k1 = keys[i];
  const k2 = keys[(i + 1) % n];
  const k0 = keys[(i - 1 + n) % n];
  const k3 = keys[(i + 2) % n];
  const t1 = k1.t;
  let t2 = k2.t; if (t2 <= t1) t2 += 1;
  let tt = t; if (tt < t1) tt += 1;
  const span = t2 - t1;
  const u = (tt - t1) / span;
  let t0 = k0.t; while (t0 >= t1) t0 -= 1;
  let t3 = k3.t; while (t3 <= t2) t3 += 1;
  const out = {};
  for (const c of CHANNELS) {
    const p0 = k0[c], p1 = k1[c], p2 = k2[c], p3 = k3[c];
    // Derivatives use actual key times: unequal intervals must not cause a
    // velocity jump at every key (uniform Catmull-Rom did).
    const m1 = (p2 - p0) / (t2 - t0) * span;
    const m2 = (p3 - p1) / (t3 - t1) * span;
    out[c] = (2*u**3 - 3*u*u + 1)*p1 + (u**3 - 2*u*u + u)*m1
      + (-2*u**3 + 3*u*u)*p2 + (u**3 - u*u)*m2;
  }
  return out;
}

/** A full pose for both sides: body channels, and near/far limb channels. */
export function gallopPose(phase) {
  const p = sampleCycle(GALLOP, phase);
  const ff = sampleCycle(GALLOP, phase + GALLOP.far.fore);
  const hf = sampleCycle(GALLOP, phase + GALLOP.far.hind);
  return {
    ...p,
    far: { f1: ff.f1, f2: ff.f2, f3: ff.f3, h1: hf.h1, h2: hf.h2, h3: hf.h3, ear1: p.ear1 + 6, ear2: p.ear2 + 6 },
  };
}

/** An alert sit and a deliberate inspection, with an eased hold on each.
 * mode: auto | sit | look. The automatic cycle takes twelve seconds. */
export function idlePose(time, mode = 'auto') {
  const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const t = ((time % 12) + 12) % 12;
  const look = mode === 'look' ? 1 : mode === 'sit' ? 0
    : smooth((t - 3) / 1.6) * (1 - smooth((t - 8) / 1.8));
  const p = {};
  for (const c of CHANNELS) p[c] = SIT[c] + (LOOK_DOWN[c] - SIT[c]) * look;
  const b = Math.sin(time * 2.4);
  p.y += b * 0.002;
  p.thoracic += b * 0.5;
  p.head += Math.sin(time * 0.7) * (1 - look) * 2;
  p.ear1 += Math.max(0, Math.sin(time * 0.55 + 1)) ** 30 * 8;
  p.far = { ...pick(p), ear1: p.ear1 - 8, ear2: p.ear2 - 4 };
  return p;
}

function pick(p) {
  return { f1: p.f1, f2: p.f2, f3: p.f3, h1: p.h1, h2: p.h2, h3: p.h3, ear1: p.ear1, ear2: p.ear2 };
}

/** Forward kinematics: joint positions for a pose. */
export function solve(pose, profile = 'classic', ground = true) {
  const soft = profile === 'soft';
  const dim = soft ? { ...DIM, lumbar: 0.145, thoracic: 0.14, head: 0.065, neck: 0.09,
    upperArm: 0.105, forearm: 0.105, paw: 0.075,
    thigh: 0.15, shin: 0.145, foot: 0.16, eyeZ: 0.125,
    ear1: 0.16, ear2: 0.16, earZ: 0.047 } : DIM;
  const far = pose.far || pick(pose);
  const z0 = 0;
  const pelvis = [pose.x, pose.y, z0];
  const mid = add(pelvis, dir(pose.lumbar), dim.lumbar * (pose.stretch ?? 1));
  const chest = add(mid, dir(pose.thoracic), dim.thoracic * (pose.stretch ?? 1));
  const headBase = add(chest, dir(pose.neck), dim.neck);
  const hf = dir(pose.head);
  const hu = dir(pose.head + 90);
  const snout = add(headBase, hf, dim.head);
  const at = (o, f, u, a, b, z) => [o[0] + f[0] * a + u[0] * b, o[1] + f[1] * a + u[1] * b, o[2] + z];

  const J = { pelvis, mid, chest, headBase, snout };
  J.headBack = at(headBase, hf, hu, -0.015, 0.012, 0);
  J.nose = at(headBase, hf, hu, dim.head + (soft ? 0.115 : 0.038), -0.012, 0);
  J.eyeN = at(headBase, hf, hu, (soft ? 0.045 : 0.09), 0.035, dim.eyeZ);
  J.eyeF = at(headBase, hf, hu, (soft ? 0.045 : 0.09), 0.035, -dim.eyeZ);

  const ear = (side, a1, a2) => {
    const base = at(headBase, hf, hu, soft ? -0.005 : 0.02, soft ? 0.10 : 0.07, side * dim.earZ);
    // Fan the ears in silhouette as well as in depth; they must remain two ears
    // from the side. Soft ears curve back, with broad, round ends.
    if (soft) { a1 = Math.max(100, a1 + side * 18); a2 += 30 + side * 16; }
    const m = add(base, dir(a1), dim.ear1, side * pose.earSplay * dim.ear1);
    const tip = add(m, dir(a2), dim.ear2, side * pose.earSplay * dim.ear2 * 1.3);
    return [base, m, tip];
  };
  [J.earN0, J.earN1, J.earN2] = ear(1, pose.ear1, pose.ear2);
  [J.earF0, J.earF1, J.earF2] = ear(-1, far.ear1, far.ear2);

  const bf = dir(pose.thoracic);
  const bu = dir(pose.thoracic + 90);
  const fore = (side, a1, a2, a3) => {
    const s = at(chest, bf, bu, -0.035, -0.06, side * dim.shoulderZ);
    const e = add(s, dir(a1), dim.upperArm);
    const w = add(e, dir(a2), dim.forearm);
    const t = add(w, dir(a3), dim.paw);
    return [s, e, w, t];
  };
  [J.shN, J.elN, J.wrN, J.pawN] = fore(1, pose.f1, pose.f2, pose.f3);
  [J.shF, J.elF, J.wrF, J.pawF] = fore(-1, far.f1, far.f2, far.f3);

  const lf = dir(pose.lumbar);
  const lu = dir(pose.lumbar + 90);
  const hind = (side, a1, a2, a3) => {
    const h = at(pelvis, lf, lu, 0.005, -0.03, side * dim.hipZ);
    const k = add(h, dir(a1), dim.thigh);
    const a = add(k, dir(a2), dim.shin);
    const t = add(a, dir(a3), dim.foot);
    return [h, k, a, t];
  };
  [J.hipN, J.knN, J.hoN, J.toeN] = hind(1, pose.h1, pose.h2, pose.h3);
  [J.hipF, J.knF, J.hoF, J.toeF] = hind(-1, far.h1, far.h2, far.h3);

  J.tail0 = at(pelvis, lf, lu, -0.14, 0.035, 0);
  J.tail1 = add(J.tail0, dir(pose.tail), dim.tail);
  if (soft) {
    for (const side of ['N', 'F']) {
      const a = J[`ear${side}0`], m = J[`ear${side}1`], b = J[`ear${side}2`];
      // Quadratic through the mid joint, sampled into round-cone segments.
      const c = m.map((v, i) => 2 * v - (a[i] + b[i]) / 2);
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        J[`softEar${side}${i}`] = a.map((v, k) => (1-t)**2*v + 2*(1-t)*t*c[k] + t*t*b[k]);
      }
    }
  }
  if (ground) {
    // Check both sides at every sampled frame, not just a near-side contact key.
    // Larger soft feet need their own clearance. Translation preserves bones.
    const radii = soft ? { wr: .043, paw: .043, ho: .047, toe: .044 }
      : { wr: .025, paw: .022, ho: .028, toe: .024 };
    let lift = 0;
    for (const side of ['N', 'F']) for (const [joint, r] of Object.entries(radii)) {
      lift = Math.max(lift, r - J[joint + side][1]);
    }
    if (lift > 0) for (const p of Object.values(J)) p[1] += lift;
  }
  return J;
}

/** Bones, for drawing the rig: pairs of joint names. */
export const BONES = [
  ['pelvis', 'mid'], ['mid', 'chest'], ['chest', 'headBase'], ['headBase', 'snout'],
  ['headBase', 'earN0'], ['earN0', 'earN1'], ['earN1', 'earN2'],
  ['headBase', 'earF0'], ['earF0', 'earF1'], ['earF1', 'earF2'],
  ['chest', 'shN'], ['shN', 'elN'], ['elN', 'wrN'], ['wrN', 'pawN'],
  ['chest', 'shF'], ['shF', 'elF'], ['elF', 'wrF'], ['wrF', 'pawF'],
  ['pelvis', 'hipN'], ['hipN', 'knN'], ['knN', 'hoN'], ['hoN', 'toeN'],
  ['pelvis', 'hipF'], ['hipF', 'knF'], ['knF', 'hoF'], ['hoF', 'toeF'],
  ['pelvis', 'tail0'], ['tail0', 'tail1'],
];

// Groups: which parts melt together, and what draws contours between them.
export const G = { BODY: 0, HEAD: 1, EAR_N: 2, EAR_F: 3, FORE_N: 4, FORE_F: 5, HIND_N: 6, HIND_F: 7 };

/** The primitives on the skeleton. Each: a round cone from a (radius ra) to b
 * (radius rb), in group g, flattened across z by `flat` (ears). */
export const SHAPES = [
  { a: 'pelvis', b: 'mid', ra: 0.158, rb: 0.14, g: G.BODY },
  { a: 'mid', b: 'chest', ra: 0.14, rb: 0.118, g: G.BODY },
  { a: 'tail0', b: 'tail1', ra: 0.045, rb: 0.042, g: G.BODY },
  { a: 'chest', b: 'headBase', ra: 0.09, rb: 0.075, g: G.HEAD },
  { a: 'headBack', b: 'snout', ra: 0.094, rb: 0.05, g: G.HEAD },
  { a: 'earN0', b: 'earN1', ra: 0.03, rb: 0.042, g: G.EAR_N, flat: 2.0 },
  { a: 'earN1', b: 'earN2', ra: 0.042, rb: 0.016, g: G.EAR_N, flat: 2.0 },
  { a: 'earF0', b: 'earF1', ra: 0.03, rb: 0.042, g: G.EAR_F, flat: 2.0 },
  { a: 'earF1', b: 'earF2', ra: 0.042, rb: 0.016, g: G.EAR_F, flat: 2.0 },
  { a: 'shN', b: 'elN', ra: 0.05, rb: 0.034, g: G.FORE_N },
  { a: 'elN', b: 'wrN', ra: 0.03, rb: 0.024, g: G.FORE_N },
  { a: 'wrN', b: 'pawN', ra: 0.025, rb: 0.022, g: G.FORE_N },
  { a: 'shF', b: 'elF', ra: 0.05, rb: 0.034, g: G.FORE_F },
  { a: 'elF', b: 'wrF', ra: 0.03, rb: 0.024, g: G.FORE_F },
  { a: 'wrF', b: 'pawF', ra: 0.025, rb: 0.022, g: G.FORE_F },
  { a: 'hipN', b: 'knN', ra: 0.1, rb: 0.055, g: G.HIND_N },
  { a: 'knN', b: 'hoN', ra: 0.045, rb: 0.026, g: G.HIND_N },
  { a: 'hoN', b: 'toeN', ra: 0.028, rb: 0.024, g: G.HIND_N },
  { a: 'hipF', b: 'knF', ra: 0.1, rb: 0.055, g: G.HIND_F },
  { a: 'knF', b: 'hoF', ra: 0.045, rb: 0.026, g: G.HIND_F },
  { a: 'hoF', b: 'toeF', ra: 0.028, rb: 0.024, g: G.HIND_F },
];

// Put the feet down: a contact key's height is whatever sets those feet on
// the ground; a flight key floats `lift` above its neighbours' average.
(function settle(track) {
  const feet = { hind: [['toeN', 0.024], ['hoN', 0.028]], fore: [['pawN', 0.022], ['wrN', 0.025]] };
  for (const k of track.keys) {
    k.x = 0;
    if (!k.contact) continue;
    const J = solve({ ...k, y: 0 }, 'classic', false);
    k.y = Math.max(...feet[k.contact].map(([j, r]) => r - J[j][1]));
  }
  const n = track.keys.length;
  track.keys.forEach((k, i) => {
    if (k.contact) return;
    const a = track.keys[(i - 1 + n) % n], b = track.keys[(i + 1) % n];
    k.y = (a.y + b.y) / 2 + (k.lift || 0);
  });
})(GALLOP);

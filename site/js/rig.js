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
  'x', 'y', 'lumbar', 'thoracic', 'neck', 'head',
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
  x: 0, y: 0.165, lumbar: 22, thoracic: 46, neck: 44, head: -32,
  ear1: 96, ear2: 102, earSplay: 0.16, tail: 160,
  f1: 265, f2: 268, f3: 360,
  h1: 345, h2: 205, h3: 360,
};

/** Gallop keyed from ref 05 (green hare, 16 frames ≈ 0.53 s). See docs/references.md.
 * Keys marked `contact` get their height solved so those feet sit on the ground. */
export const GALLOP = {
  duration: 0.56,
  stride: 0.95, // ground covered per cycle, so the feet don't skate when it travels
  far: { fore: -0.07, hind: -0.025 }, // far legs lag the near ones by this much phase
  keys: [
    // push-off (ref fr 1–3): hind legs a straight line down-back to the toes, forelegs tucked forward
    { t: 0.0, contact: 'hind', lumbar: 6, thoracic: 2, neck: 26, head: -14, ear1: 152, ear2: 164, earSplay: 0.12, tail: 150,
      f1: 318, f2: 212, f3: 252, h1: 238, h2: 226, h3: 236 },
    // extension (fr 5–6): longest silhouette, highest point
    { t: 0.25, lift: 0.07, lumbar: 3, thoracic: -3, neck: 18, head: -16, ear1: 165, ear2: 175, earSplay: 0.1, tail: 165,
      f1: 336, f2: 326, f3: 316, h1: 196, h2: 188, h3: 182 },
    // fore landing (fr 8–9): forelegs reach down, hinds still trailing
    { t: 0.45, contact: 'fore', lumbar: -3, thoracic: -15, neck: 18, head: -20, ear1: 152, ear2: 162, earSplay: 0.14, tail: 150,
      f1: 276, f2: 268, f3: 352, h1: 212, h2: 192, h3: 200 },
    // fore stance (fr 10–11): forelegs push back, hinds swing under the belly, back rounds
    { t: 0.6, contact: 'fore', lumbar: 16, thoracic: -12, neck: 22, head: -18, ear1: 145, ear2: 155, earSplay: 0.16, tail: 138,
      f1: 246, f2: 240, f3: 302, h1: 266, h2: 216, h3: 282 },
    // gather (fr 12–13): back fully rounded, hind feet reach past the forefeet
    { t: 0.75, lift: 0.015, lumbar: 36, thoracic: -8, neck: 24, head: -17, ear1: 146, ear2: 156, earSplay: 0.16, tail: 128,
      f1: 226, f2: 220, f3: 238, h1: 300, h2: 246, h3: 316 },
    // hind landing (fr 14–15): hind feet plant far forward, forelegs fold and lift
    { t: 0.88, contact: 'hind', lumbar: 24, thoracic: -2, neck: 26, head: -15, ear1: 148, ear2: 160, earSplay: 0.14, tail: 140,
      f1: 262, f2: 206, f3: 232, h1: 294, h2: 250, h3: 330 },
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
  const u = (tt - t1) / (t2 - t1);
  const out = {};
  for (const c of CHANNELS) {
    const p0 = k0[c], p1 = k1[c], p2 = k2[c], p3 = k3[c];
    out[c] = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
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

/** Sitting, alive: breathing, a sniff now and then, an ear that turns. */
export function idlePose(time) {
  const b = Math.sin(time * 2.4);
  const sniff = Math.max(0, Math.sin(time * 0.9)) ** 12 * Math.sin(time * 38);
  const twitch = Math.max(0, Math.sin(time * 0.55 + 1)) ** 30;
  return {
    ...SIT,
    y: SIT.y + b * 0.003,
    lumbar: SIT.lumbar + b * 0.8,
    thoracic: SIT.thoracic + b * 1.2,
    head: SIT.head + sniff * 1.6 + Math.sin(time * 0.7) * 2,
    ear1: SIT.ear1 + twitch * 14,
    ear2: SIT.ear2 + twitch * 18,
    far: { ...pick(SIT), ear1: SIT.ear1 + 4 + Math.sin(time * 0.8) * 2, ear2: SIT.ear2 + 6 },
  };
}

function pick(p) {
  return { f1: p.f1, f2: p.f2, f3: p.f3, h1: p.h1, h2: p.h2, h3: p.h3, ear1: p.ear1, ear2: p.ear2 };
}

/** Forward kinematics: joint positions for a pose. */
export function solve(pose) {
  const far = pose.far || pick(pose);
  const z0 = 0;
  const pelvis = [pose.x, pose.y, z0];
  const mid = add(pelvis, dir(pose.lumbar), DIM.lumbar);
  const chest = add(mid, dir(pose.thoracic), DIM.thoracic);
  const headBase = add(chest, dir(pose.neck), DIM.neck);
  const hf = dir(pose.head);
  const hu = dir(pose.head + 90);
  const snout = add(headBase, hf, DIM.head);
  const at = (o, f, u, a, b, z) => [o[0] + f[0] * a + u[0] * b, o[1] + f[1] * a + u[1] * b, o[2] + z];

  const J = { pelvis, mid, chest, headBase, snout };
  J.headBack = at(headBase, hf, hu, -0.015, 0.012, 0);
  J.nose = at(headBase, hf, hu, DIM.head + 0.038, -0.012, 0);
  J.eyeN = at(headBase, hf, hu, 0.09, 0.03, DIM.eyeZ);
  J.eyeF = at(headBase, hf, hu, 0.09, 0.03, -DIM.eyeZ);

  const ear = (side, a1, a2) => {
    const base = at(headBase, hf, hu, 0.02, 0.07, side * DIM.earZ);
    const m = add(base, dir(a1), DIM.ear1, side * pose.earSplay * DIM.ear1);
    const tip = add(m, dir(a2), DIM.ear2, side * pose.earSplay * DIM.ear2 * 1.3);
    return [base, m, tip];
  };
  [J.earN0, J.earN1, J.earN2] = ear(1, pose.ear1, pose.ear2);
  [J.earF0, J.earF1, J.earF2] = ear(-1, far.ear1, far.ear2);

  const bf = dir(pose.thoracic);
  const bu = dir(pose.thoracic + 90);
  const fore = (side, a1, a2, a3) => {
    const s = at(chest, bf, bu, -0.035, -0.06, side * DIM.shoulderZ);
    const e = add(s, dir(a1), DIM.upperArm);
    const w = add(e, dir(a2), DIM.forearm);
    const t = add(w, dir(a3), DIM.paw);
    return [s, e, w, t];
  };
  [J.shN, J.elN, J.wrN, J.pawN] = fore(1, pose.f1, pose.f2, pose.f3);
  [J.shF, J.elF, J.wrF, J.pawF] = fore(-1, far.f1, far.f2, far.f3);

  const lf = dir(pose.lumbar);
  const lu = dir(pose.lumbar + 90);
  const hind = (side, a1, a2, a3) => {
    const h = at(pelvis, lf, lu, 0.005, -0.03, side * DIM.hipZ);
    const k = add(h, dir(a1), DIM.thigh);
    const a = add(k, dir(a2), DIM.shin);
    const t = add(a, dir(a3), DIM.foot);
    return [h, k, a, t];
  };
  [J.hipN, J.knN, J.hoN, J.toeN] = hind(1, pose.h1, pose.h2, pose.h3);
  [J.hipF, J.knF, J.hoF, J.toeF] = hind(-1, far.h1, far.h2, far.h3);

  J.tail0 = at(pelvis, lf, lu, -0.14, 0.035, 0);
  J.tail1 = add(J.tail0, dir(pose.tail), DIM.tail);
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
    const J = solve({ ...k, y: 0 });
    k.y = Math.max(...feet[k.contact].map(([j, r]) => r - J[j][1]));
  }
  const n = track.keys.length;
  track.keys.forEach((k, i) => {
    if (k.contact) return;
    const a = track.keys[(i - 1 + n) % n], b = track.keys[(i + 1) % n];
    k.y = (a.y + b.y) / 2 + (k.lift || 0);
  });
})(GALLOP);

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
  upperArm: 0.12, forearm: 0.12, paw: 0.05,
  thigh: 0.16, shin: 0.16, foot: 0.15,
  tail: 0.03,
  hipZ: 0.082, shoulderZ: 0.06, earZ: 0.032, eyeZ: 0.06,
};

export const CHANNELS = [
  'x', 'y', 'lumbar', 'thoracic', 'neck', 'head', 'headYaw', 'stretch',
  'ear1', 'ear2', 'earSplay', 'tail',
  'f1', 'f2', 'f3', 'h1', 'h2', 'h3',
];
/** Channels a key may leave out, and what they are then. `headYaw` turns the
 * head toward the viewer (degrees); `stretch` lengthens the torso (1 = rest)
 * and thins it by the same amount, the squash-and-stretch of the body. */
const DEFAULTS = { headYaw: 0, stretch: 1 };

const D2R = Math.PI / 180;
const dir = (a) => [Math.cos(a * D2R), Math.sin(a * D2R)];
const add = (p, d, k, z = 0) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + z];

/** Sitting, nose down to the hole in front of it (the client's mark).
 * One smooth arc from the rump to the back of the head: the rump rises steeply
 * over the hips, the back runs almost level, the neck continues the arc down
 * and the face tilts to the hole — no bump at the shoulders. Forelegs: elbow
 * tucked back, forearm nearly vertical, a short toe angled forward (no "boot").
 * Limb angles live in the same ranges as the gallop (hind thigh ~190–345,
 * forearm ~200–335), so a blend between the two never wraps round. */
export const SIT = {
  x: 0, y: 0.175, lumbar: 52, thoracic: 8, neck: -6, head: -22,
  ear1: 96, ear2: 102, earSplay: 0.16, tail: 150,
  f1: 230, f2: 282, f3: 318,
  h1: 345, h2: 215, h3: 360,
};

/** Sitting up, head raised, looking around: the resting pose between sniffs.
 * Same rump, the back rises more and the neck carries the head level. */
export const UP = {
  x: 0, y: 0.175, lumbar: 44, thoracic: 26, neck: 50, head: 4,
  ear1: 92, ear2: 98, earSplay: 0.14, tail: 150,
  f1: 268, f2: 272, f3: 318,
  h1: 345, h2: 215, h3: 360,
};

/** The half-bound: hind feet push as a pair, forefeet land one just after the
 * other. Timing from ref 05 (green hare, 16 frames ≈ 0.53 s); the poses from
 * real rabbits rather than the hare (see docs/references.md, "Animation breakdown").
 *
 * The cycle in one line: hind feet plant far forward under a rounded back,
 * forelegs folded to the chest → the back opens as the hinds push, body and
 * legs one line, forelegs still tucked → flight, longest silhouette, forelegs
 * shoot forward → they reach down and plant → they push back while the hind
 * legs, folded like a spring, roll forward along the belly → head forward,
 * forelegs back, hind feet reaching ahead → forelegs fold up, hind feet plant.
 *
 * Limb channels are world angles (0 forward, 90 up, 180 back, 270 down).
 * Keys marked `contact` get their height solved so those feet sit on the ground. */
export const GALLOP = {
  duration: 0.56,
  stride: 1.9, // ground covered per cycle, so the feet don't skate when it travels
  far: { fore: -0.07, hind: -0.02 }, // far legs lag the near ones by this much phase
  keys: [
    // hind plant: back at its roundest, head forward; hind feet reach ahead of the body
    // (thigh forward, shin folded back under it, foot out to the toes); forelegs folded
    // up under the chest
    { t: 0.0, contact: 'hind', stretch: 0.9, lumbar: 56, thoracic: -12, neck: 2, head: -10, ear1: 140, ear2: 152, earSplay: 0.16, tail: 120,
      f1: 292, f2: 198, f3: 245, h1: 332, h2: 238, h3: 322 },
    // hind stance: the body passes over the feet and sinks on them, the back opens;
    // forelegs stay pressed to the chest (elbows bent, paws hanging)
    { t: 0.09, contact: 'hind', stretch: 0.94, lumbar: 36, thoracic: 0, neck: 8, head: -8, ear1: 148, ear2: 160, earSplay: 0.14, tail: 136,
      f1: 300, f2: 205, f3: 250, h1: 288, h2: 214, h3: 346 },
    // launch: the legs straighten under the body, hocks and toes flat on the ground
    { t: 0.18, contact: 'hind', stretch: 1.02, lumbar: 16, thoracic: 8, neck: 14, head: -6, ear1: 154, ear2: 166, earSplay: 0.13, tail: 148,
      f1: 305, f2: 212, f3: 255, h1: 262, h2: 232, h3: 338 },
    // toe-off: hind legs a straight line down-back to the toes, spine and legs almost one
    // line, nose up; forelegs still tucked, just starting to open
    { t: 0.27, contact: 'hind', stretch: 1.09, lumbar: 0, thoracic: 8, neck: 18, head: -4, ear1: 160, ear2: 172, earSplay: 0.12, tail: 158,
      f1: 310, f2: 225, f3: 262, h1: 236, h2: 228, h3: 246 },
    // flight: longest silhouette, back slightly hollow, ears flat, highest point
    { t: 0.42, lift: 0.06, stretch: 1.14, lumbar: -14, thoracic: 4, neck: 20, head: -8, ear1: 166, ear2: 178, earSplay: 0.10, tail: 166,
      f1: 338, f2: 332, f3: 318, h1: 200, h2: 188, h3: 184 },
    // fore reach: forelegs reach down ahead to land; hind legs begin to fold at the knee,
    // hocks dropping, feet tucking under
    { t: 0.54, lift: 0.03, stretch: 1.1, lumbar: -8, thoracic: 0, neck: 14, head: -14, ear1: 160, ear2: 172, earSplay: 0.12, tail: 160,
      f1: 320, f2: 300, f3: 330, h1: 250, h2: 180, h3: 300 },
    // fore plant: forelegs down under the chest, toes angled; hind legs folded
    // into a Z, feet tucked up under the belly, rolling forward
    { t: 0.64, contact: 'fore', stretch: 1.02, lumbar: 2, thoracic: -6, neck: 10, head: -16, ear1: 152, ear2: 164, earSplay: 0.14, tail: 150,
      f1: 295, f2: 282, f3: 325, h1: 272, h2: 192, h3: 370 },
    // fore stance (brief: the body vaults over the forelegs, the weight is on the hinds):
    // forelegs push back, back rounds; hind legs still folded, feet skimming forward
    { t: 0.76, contact: 'fore', stretch: 0.95, lumbar: 26, thoracic: -14, neck: 4, head: -14, ear1: 146, ear2: 158, earSplay: 0.16, tail: 136,
      f1: 262, f2: 250, f3: 300, h1: 292, h2: 200, h3: 358 },
    // gather (all feet off the ground): head forward, forelegs back, hind legs
    // forward and unfolding toward the ground
    { t: 0.88, lift: 0.015, stretch: 0.9, lumbar: 48, thoracic: -14, neck: 0, head: -12, ear1: 140, ear2: 152, earSplay: 0.16, tail: 124,
      f1: 240, f2: 222, f3: 238, h1: 322, h2: 220, h3: 342 },
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
    const d = DEFAULTS[c];
    const p0 = k0[c] ?? d, p1 = k1[c] ?? d, p2 = k2[c] ?? d, p3 = k3[c] ?? d;
    out[c] = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  }
  return out;
}

/** Which feet are on the ground at phase t: the contact two neighbouring keys share. */
function contactAt(track, t) {
  const keys = track.keys, n = keys.length;
  t = ((t % 1) + 1) % 1;
  let i = n - 1;
  for (let k = 0; k < n; k++) if (keys[k].t <= t) i = k;
  const a = keys[i], b = keys[(i + 1) % n];
  return a.contact && a.contact === b.contact ? a.contact : null;
}

/** The joints (and their radii) that touch the ground in each contact. */
const FEET = {
  hind: [['toeN', 0.024], ['hoN', 0.028], ['toeF', 0.024], ['hoF', 0.028]],
  fore: [['pawN', 0.022], ['wrN', 0.025], ['pawF', 0.022], ['wrF', 0.025]],
};

/** The height that sets a pose's `contact` feet on the ground. */
function groundHeight(pose, contact) {
  const J = solve({ ...pose, y: 0 });
  return Math.max(...FEET[contact].map(([j, r]) => r - J[j][1]));
}

/** A full pose for both sides: body channels, and near/far limb channels.
 * While feet are planted the body rides on them: its height is solved every
 * frame so the planted feet stay on the ground between keys. */
export function gallopPose(phase) {
  const p = sampleCycle(GALLOP, phase);
  const ff = sampleCycle(GALLOP, phase + GALLOP.far.fore);
  const hf = sampleCycle(GALLOP, phase + GALLOP.far.hind);
  const pose = {
    ...p,
    far: { f1: ff.f1, f2: ff.f2, f3: ff.f3, h1: hf.h1, h2: hf.h2, h3: hf.h3, ear1: p.ear1 + 6, ear2: p.ear2 + 6 },
  };
  const c = contactAt(GALLOP, phase);
  if (c) pose.y = groundHeight(pose, c);
  return pose;
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ramp = (x, a, b) => smooth((x - a) / (b - a));

/** Sitting, alive. A loop of IDLE.period seconds: sitting up and looking
 * around (head turning left and right), then settling down to the hole to
 * sniff, then up again. Breathing, a sniff now and then, an ear that turns. */
export const IDLE = { period: 11, down: [3.8, 4.7], up: [9.0, 9.9] };
export function idlePose(time) {
  const t = ((time % IDLE.period) + IDLE.period) % IDLE.period;
  const k = ramp(t, ...IDLE.down) * (1 - ramp(t, ...IDLE.up)); // 0 = up, 1 = sniffing
  const b = Math.sin(time * 2.4);
  const sniff = Math.max(0, Math.sin(time * 0.9)) ** 12 * Math.sin(time * 38);
  const twitch = Math.max(0, Math.sin(time * 0.55 + 1)) ** 30;
  const look = 24 * Math.sin(time * 0.62 + 3.3) + 10 * Math.sin(time * 1.7 + 1); // where it looks when up
  const pose = {};
  for (const c of CHANNELS) {
    const a = UP[c] ?? DEFAULTS[c], z = SIT[c] ?? DEFAULTS[c];
    pose[c] = a + (z - a) * k;
  }
  pose.y += b * 0.003;
  pose.lumbar += b * 0.8;
  pose.thoracic += b * 1.2;
  pose.head += sniff * 1.6 * k + Math.sin(time * 0.7) * 2 + (1 - k) * 3 * Math.sin(time * 1.1 + 2);
  pose.headYaw = look * (1 - k) + 5 * Math.sin(time * 1.3) * k;
  pose.ear1 += twitch * 14;
  pose.ear2 += twitch * 18;
  pose.far = { ...pick(pose), ear1: pose.ear1 - twitch * 14 + 4 + Math.sin(time * 0.8) * 2, ear2: pose.ear2 - twitch * 18 + 6 };
  return pose;
}

function pick(p) {
  return { f1: p.f1, f2: p.f2, f3: p.f3, h1: p.h1, h2: p.h2, h3: p.h3, ear1: p.ear1, ear2: p.ear2 };
}

/** Forward kinematics: joint positions for a pose. */
export function solve(pose) {
  const far = pose.far || pick(pose);
  const st = pose.stretch ?? 1;
  const z0 = 0;
  const pelvis = [pose.x, pose.y, z0];
  const mid = add(pelvis, dir(pose.lumbar), DIM.lumbar * st);
  const chest = add(mid, dir(pose.thoracic), DIM.thoracic * st);
  const headBase = add(chest, dir(pose.neck), DIM.neck * (1 + (st - 1) * 0.5));
  const at = (o, f, u, a, b, z) => [o[0] + f[0] * a + u[0] * b, o[1] + f[1] * a + u[1] * b, o[2] + z];

  // the head's frame: pitched by `head` in the sagittal plane, then turned by
  // `headYaw` toward the viewer (+z). F forward, U up, S toward the near side.
  const hp = pose.head * D2R, yw = (pose.headYaw ?? 0) * D2R;
  const ch = Math.cos(hp), sh = Math.sin(hp), cy = Math.cos(yw), sy = Math.sin(yw);
  const F = [ch * cy, sh, ch * sy], U = [-sh * cy, ch, -sh * sy], S = [-sy, 0, cy];
  const at3 = (o, a, b, c) => [
    o[0] + F[0] * a + U[0] * b + S[0] * c, o[1] + F[1] * a + U[1] * b + S[1] * c, o[2] + F[2] * a + U[2] * b + S[2] * c];
  const snout = at3(headBase, DIM.head, 0, 0);

  const J = { pelvis, mid, chest, headBase, snout };
  J.bodyScale = 1 / Math.sqrt(st); // what the torso's radii shrink by as it stretches
  J.headBack = at3(headBase, -0.015, 0.012, 0);
  J.nose = at3(headBase, DIM.head + 0.038, -0.012, 0);
  J.eyeN = at3(headBase, 0.09, 0.03, DIM.eyeZ);
  J.eyeF = at3(headBase, 0.09, 0.03, -DIM.eyeZ);

  // ear angles are world angles in the sagittal plane; they turn with the head
  const earDir = (a) => { const r = a * D2R - hp; return [Math.cos(r), Math.sin(r)]; };
  const ear = (side, a1, a2) => {
    const base = at3(headBase, 0.02, 0.07, side * DIM.earZ);
    const d1 = earDir(a1), d2 = earDir(a2);
    const m = at3(base, d1[0] * DIM.ear1, d1[1] * DIM.ear1, side * pose.earSplay * DIM.ear1);
    const tip = at3(m, d2[0] * DIM.ear2, d2[1] * DIM.ear2, side * pose.earSplay * DIM.ear2 * 1.3);
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
  { a: 'pelvis', b: 'mid', ra: 0.172, rb: 0.142, g: G.BODY },
  { a: 'mid', b: 'chest', ra: 0.142, rb: 0.118, g: G.BODY },
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
  { a: 'hipN', b: 'knN', ra: 0.115, rb: 0.058, g: G.HIND_N },
  { a: 'knN', b: 'hoN', ra: 0.045, rb: 0.026, g: G.HIND_N },
  { a: 'hoN', b: 'toeN', ra: 0.028, rb: 0.024, g: G.HIND_N },
  { a: 'hipF', b: 'knF', ra: 0.115, rb: 0.058, g: G.HIND_F },
  { a: 'knF', b: 'hoF', ra: 0.045, rb: 0.026, g: G.HIND_F },
  { a: 'hoF', b: 'toeF', ra: 0.028, rb: 0.024, g: G.HIND_F },
];

/** The same skeleton dressed for the soft geometric look (ref 01): fewer ideas,
 * fatter forms. Ears are two plain sausages, the face is one sausage from the
 * back of the head to the nose, legs are thick sausages, the rump a ball. */
export const SHAPES_SOFT = [
  { a: 'pelvis', b: 'mid', ra: 0.19, rb: 0.16, g: G.BODY },
  { a: 'mid', b: 'chest', ra: 0.16, rb: 0.13, g: G.BODY },
  { a: 'tail0', b: 'tail1', ra: 0.06, rb: 0.055, g: G.BODY },
  { a: 'chest', b: 'headBase', ra: 0.1, rb: 0.085, g: G.HEAD },
  { a: 'headBack', b: 'snout', ra: 0.082, rb: 0.064, g: G.HEAD },
  { a: 'earN0', b: 'earN1', ra: 0.042, rb: 0.042, g: G.EAR_N },
  { a: 'earN1', b: 'earN2', ra: 0.042, rb: 0.034, g: G.EAR_N },
  { a: 'earF0', b: 'earF1', ra: 0.042, rb: 0.042, g: G.EAR_F },
  { a: 'earF1', b: 'earF2', ra: 0.042, rb: 0.034, g: G.EAR_F },
  { a: 'shN', b: 'elN', ra: 0.055, rb: 0.042, g: G.FORE_N },
  { a: 'elN', b: 'wrN', ra: 0.042, rb: 0.036, g: G.FORE_N },
  { a: 'wrN', b: 'pawN', ra: 0.036, rb: 0.03, g: G.FORE_N },
  { a: 'shF', b: 'elF', ra: 0.055, rb: 0.042, g: G.FORE_F },
  { a: 'elF', b: 'wrF', ra: 0.042, rb: 0.036, g: G.FORE_F },
  { a: 'wrF', b: 'pawF', ra: 0.036, rb: 0.03, g: G.FORE_F },
  { a: 'hipN', b: 'knN', ra: 0.125, rb: 0.065, g: G.HIND_N },
  { a: 'knN', b: 'hoN', ra: 0.05, rb: 0.038, g: G.HIND_N },
  { a: 'hoN', b: 'toeN', ra: 0.038, rb: 0.032, g: G.HIND_N },
  { a: 'hipF', b: 'knF', ra: 0.125, rb: 0.065, g: G.HIND_F },
  { a: 'knF', b: 'hoF', ra: 0.05, rb: 0.038, g: G.HIND_F },
  { a: 'hoF', b: 'toeF', ra: 0.038, rb: 0.032, g: G.HIND_F },
];

// Put the feet down: a contact key's height is whatever sets those feet on
// the ground; a flight key floats `lift` above the line between the contact
// keys either side of it.
(function settle(track) {
  const keys = track.keys;
  const n = keys.length;
  for (const k of keys) {
    k.x = 0;
    if (k.contact) k.y = groundHeight(k, k.contact);
  }
  keys.forEach((k, i) => {
    if (k.contact) return;
    let a = i, b = i;
    while (!keys[(a - 1 + n) % n].contact) a--;
    while (!keys[(b + 1) % n].contact) b++;
    const ka = keys[(a - 1 + n) % n], kb = keys[(b + 1) % n];
    const ta = ka.t, tb = kb.t > ta ? kb.t : kb.t + 1, t = k.t >= ta ? k.t : k.t + 1;
    k.y = ka.y + (kb.y - ka.y) * ((t - ta) / (tb - ta)) + (k.lift || 0);
  });
})(GALLOP);

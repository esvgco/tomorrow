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
    { t: 0.0, contact: 'hind', stretch: 0.9, lumbar: 38, thoracic: 0, neck: 24, head: -2, ear1: 140, ear2: 152, earSplay: 0.16, tail: 120,
      f1: 292, f2: 198, f3: 245, h1: 332, h2: 238, h3: 322 },
    // hind stance: the body passes over the feet and sinks on them, the back opens;
    // forelegs stay pressed to the chest (elbows bent, paws hanging)
    { t: 0.09, contact: 'hind', stretch: 0.94, lumbar: 28, thoracic: 5, neck: 26, head: 0, ear1: 148, ear2: 160, earSplay: 0.14, tail: 136,
      f1: 300, f2: 205, f3: 250, h1: 288, h2: 214, h3: 346 },
    // launch: the legs straighten under the body, hocks and toes flat on the ground
    { t: 0.18, contact: 'hind', stretch: 1.02, lumbar: 14, thoracic: 8, neck: 26, head: 1, ear1: 154, ear2: 166, earSplay: 0.13, tail: 148,
      f1: 305, f2: 212, f3: 255, h1: 262, h2: 232, h3: 338 },
    // toe-off: hind legs a straight line down-back to the toes, spine and legs almost one
    // line, nose up; forelegs still tucked, just starting to open
    { t: 0.27, contact: 'hind', stretch: 1.09, lumbar: 0, thoracic: 8, neck: 28, head: 2, ear1: 160, ear2: 172, earSplay: 0.12, tail: 158,
      f1: 310, f2: 225, f3: 262, h1: 236, h2: 228, h3: 246 },
    // flight: longest silhouette, back slightly hollow, ears flat, highest point
    { t: 0.42, lift: 0.06, stretch: 1.14, lumbar: -10, thoracic: 4, neck: 28, head: 0, ear1: 166, ear2: 178, earSplay: 0.10, tail: 166,
      f1: 338, f2: 332, f3: 318, h1: 200, h2: 188, h3: 184 },
    // fore reach: forelegs reach down ahead to land; hind legs begin to fold at the knee,
    // hocks dropping, feet tucking under
    { t: 0.54, lift: 0.03, stretch: 1.1, lumbar: -6, thoracic: 2, neck: 24, head: -4, ear1: 160, ear2: 172, earSplay: 0.12, tail: 160,
      f1: 320, f2: 300, f3: 330, h1: 250, h2: 180, h3: 300 },
    // fore plant: forelegs down under the chest, toes angled; hind legs folded
    // into a Z, feet tucked up under the belly, rolling forward
    { t: 0.64, contact: 'fore', stretch: 1.02, lumbar: 2, thoracic: -2, neck: 22, head: -6, ear1: 152, ear2: 164, earSplay: 0.14, tail: 150,
      f1: 295, f2: 282, f3: 325, h1: 272, h2: 192, h3: 370 },
    // fore stance (brief: the body vaults over the forelegs, the weight is on the hinds):
    // forelegs push back, back rounds; hind legs still folded, feet skimming forward
    { t: 0.76, contact: 'fore', stretch: 0.95, lumbar: 22, thoracic: -4, neck: 22, head: -5, ear1: 146, ear2: 158, earSplay: 0.16, tail: 136,
      f1: 262, f2: 250, f3: 300, h1: 292, h2: 200, h3: 358 },
    // gather (all feet off the ground): head forward, forelegs back, hind legs
    // forward and unfolding toward the ground
    { t: 0.88, lift: 0.015, stretch: 0.9, lumbar: 34, thoracic: -2, neck: 22, head: -3, ear1: 140, ear2: 152, earSplay: 0.16, tail: 124,
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
    const d = c === 'stretch' ? 1 : 0;
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
  const J = solve({ ...pose, y: 0, motion: 'gallop' }, 'classic', false);
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
    ...p, motion: 'gallop',
    far: { f1: ff.f1, f2: ff.f2, f3: ff.f3, h1: hf.h1, h2: hf.h2, h3: hf.h3, ear1: p.ear1 + 6, ear2: p.ear2 + 6 },
  };
  const c = contactAt(GALLOP, phase);
  pose.contact = c;
  if (c) pose.y = groundHeight(pose, c);
  return pose;
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
    ear1: 0.16, ear2: 0.16, earZ: 0.047 }
    : pose.motion === 'gallop' ? { ...DIM, paw: 0.05, hipZ: 0.082 } : DIM;
  const far = pose.far || pick(pose);
  const z0 = 0;
  const pelvis = [pose.x, pose.y, z0];
  const mid = add(pelvis, dir(pose.lumbar), dim.lumbar * (pose.stretch ?? 1));
  const chest = add(mid, dir(pose.thoracic), dim.thoracic * (pose.stretch ?? 1));
  const headBase = add(chest, dir(pose.neck), dim.neck *
    (pose.motion === 'gallop' ? 1 + ((pose.stretch ?? 1) - 1) * 0.5 : 1));
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
    // Two independent broad arches, designed in silhouette rather than derived
    // from the anatomical two-bone ear. Their roots merge into the head, while
    // the outer halves keep a generous gap, including during full extension.
    for (const side of ['N', 'F']) {
      const upper = side === 'F';
      const angle = ((pose.ear1 - 166) * 0.25) * D2R;
      const cs = Math.cos(angle), sn = Math.sin(angle);
      const points = upper
        ? [[0.015, 0.125], [-0.16, 0.59], [-0.49, 0.42]]
        : [[-0.055, 0.065], [-0.25, 0.37], [-0.48, 0.20]];
      const curve = (t) => {
        const x = (1-t)**2*points[0][0] + 2*(1-t)*t*points[1][0] + t*t*points[2][0];
        const y = (1-t)**2*points[0][1] + 2*(1-t)*t*points[1][1] + t*t*points[2][1];
        return [headBase[0] + x*cs-y*sn, headBase[1] + x*sn+y*cs,
          (upper ? -1 : 1) * (0.055 + t*0.055)];
      };
      for (let i = 0; i <= 8; i++) J[`softEar${side}${i}`] = curve(i/8);
      // Keep the rig overlay attached to the actual visible ear.
      J[`ear${side}0`] = curve(0);
      J[`ear${side}1`] = curve(.5);
      J[`ear${side}2`] = curve(1);
    }
  }
  if (ground && pose.motion === 'gallop' && pose.contact) {
    // Preserve the authored support phase. Swing legs must not lift the body.
    // Refit the contact height to the soft model's own proportions.
    const radii = soft ? { wr: .043, paw: .043, ho: .047, toe: .044 }
      : { wr: .025, paw: .022, ho: .028, toe: .024 };
    const names = pose.contact === 'hind' ? ['ho', 'toe'] : ['wr', 'paw'];
    let shift = -Infinity;
    for (const side of ['N', 'F']) for (const name of names)
      shift = Math.max(shift, radii[name] - J[name + side][1]);
    for (const p of Object.values(J)) p[1] += shift;
  }
  if (ground && pose.motion !== 'gallop') {
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

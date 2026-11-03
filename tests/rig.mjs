// Run: node tests/rig.mjs. These check motion invariants, not keyframe values.
import assert from 'node:assert/strict';
import { solve, gallopPose, idlePose, SIT, LOOK_DOWN, GALLOP, CHANNELS, sampleCycle } from '../site/js/rig.js';
import { SOFT_SHAPES } from '../site/js/soft.js';
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
for (const profile of ['classic', 'soft']) {
  const radii = profile === 'soft' ? {wr:.043, paw:.043, ho:.047, toe:.044} : {wr:.025, paw:.022, ho:.028, toe:.024};
  for (let i = 0; i <= 1000; i++) {
    const J = solve(gallopPose(i / 1000), profile);
    assert(Object.values(J).flat().every(Number.isFinite), 'All joints must be finite');
    for (const side of ['N', 'F']) for (const [k, r] of Object.entries(radii)) assert(J[k+side][1] >= r - 1e-9, `${profile}: foot through floor`);
    if (profile === 'soft') for (const s of SOFT_SHAPES) {
      assert(J[s.a] && J[s.b], 'Every primitive must have joints');
      assert(distance(J[s.a], J[s.b]) > Math.abs(s.ra-s.rb), 'Round cone must have a real tangent');
    }
  }
  const a = solve(gallopPose(0), profile), b = solve(gallopPose(1), profile);
  for (const k of Object.keys(a)) assert(distance(a[k], b[k]) < 1e-9, 'Cycle must close');
  for (const mode of ['auto','sit','look']) for(let t=0;t<=12;t+=.1) assert(Object.values(solve(idlePose(t,mode),profile)).flat().every(Number.isFinite));
}
// Unevenly timed spline keys must still have matching incoming/outgoing velocity.
for (const k of GALLOP.keys) for (const c of CHANNELS) {
  const e = 1e-6, p = sampleCycle(GALLOP,k.t)[c];
  const left = (p-sampleCycle(GALLOP,k.t-e)[c])/e;
  const right = (sampleCycle(GALLOP,k.t+e)[c]-p)/e;
  assert(Math.abs(left-right)<.1, `${c}: discontinuous velocity`);
}
assert.equal(SIT.lumbar, LOOK_DOWN.lumbar, 'Inspection keeps torso posture');
assert.equal(SIT.thoracic, LOOK_DOWN.thoracic, 'Inspection keeps chest posture');
console.log('Passed: finite joints, both profiles, floor clearance, valid SDF cones, cyclic seam, velocity continuity, idle states.');

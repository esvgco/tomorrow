// Run: node tests/rig.mjs. These check motion invariants, not keyframe values.
import assert from 'node:assert/strict';
import { solve, gallopPose, idlePose, SIT, LOOK_DOWN, GALLOP, CHANNELS, sampleCycle } from '../site/js/rig.js';
import { SOFT_SHAPES } from '../site/js/soft.js';
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
for (const profile of ['classic', 'soft']) {
  const radii = profile === 'soft' ? {wr:.043, paw:.043, ho:.047, toe:.044} : {wr:.025, paw:.022, ho:.028, toe:.024};
  for (let i = 0; i <= 1000; i++) {
    const pose = gallopPose(i / 1000);
    const J = solve(pose, profile);
    assert(Object.values(J).flat().every(Number.isFinite), 'All joints must be finite');
    if (pose.contact) {
      const feet = pose.contact === 'hind' ? ['ho', 'toe'] : ['wr', 'paw'];
      const clearances = feet.flatMap(k => ['N', 'F'].map(side => J[k+side][1] - radii[k]));
      assert(Math.min(...clearances) >= -1e-9, `${profile}: support foot through floor`);
      assert(Math.abs(Math.min(...clearances)) < 1e-9, `${profile}: support lost contact`);
    }
    if (profile === 'soft') for (const name of ['earN0', 'earN1', 'earN2', 'softEarNControl']) {
      const a = J[name], b = J[name.replace('N', 'F')];
      assert(Math.abs(a[0]-b[0]) < 1e-12 && Math.abs(a[1]-b[1]) < 1e-12
        && Math.abs(a[2]+b[2]) < 1e-12, 'Soft ears must be a mirrored equal pair');
    }
    if (profile === 'soft') for (const s of SOFT_SHAPES) {
      assert(J[s.a] && J[s.b], 'Every primitive must have joints');
      assert(distance(J[s.a], J[s.b]) > Math.abs(s.ra-s.rb), 'Round cone must have a real tangent');
    }
  }
  const a = solve(gallopPose(0), profile), b = solve(gallopPose(1), profile);
  for (const k of Object.keys(a)) assert(distance(a[k], b[k]) < 1e-9, 'Cycle must close');
  for (const mode of ['auto','sit','look']) for(let t=0;t<=12;t+=.1) assert(Object.values(solve(idlePose(t,mode),profile)).flat().every(Number.isFinite));
}
// Restored uniform Catmull-Rom preserves the old timing. Positions must be
// continuous; unequal key intervals do not promise continuous velocity.
for (const k of GALLOP.keys) for (const c of CHANNELS) {
  const e = 1e-8, p = sampleCycle(GALLOP,k.t)[c];
  assert(Math.abs(p-sampleCycle(GALLOP,k.t-e)[c])<1e-4, `${c}: discontinuous pose`);
  assert(Math.abs(sampleCycle(GALLOP,k.t+e)[c]-p)<1e-4, `${c}: discontinuous pose`);
}
assert.equal(SIT.lumbar, LOOK_DOWN.lumbar, 'Inspection keeps torso posture');
assert.equal(SIT.thoracic, LOOK_DOWN.thoracic, 'Inspection keeps chest posture');
console.log('Passed: finite joints, both profiles, authored support contacts, valid SDF cones, cyclic seam, pose continuity, idle states.');

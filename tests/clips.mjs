import assert from 'node:assert/strict';
import { clipFrame, CLIPS } from '../site/js/clips.js';
import { SHAPES } from '../site/js/rig.js';
import { SOFT_SHAPES } from '../site/js/soft.js';
for(const profile of ['classic','soft']) {
  const shapes=profile==='soft'?SOFT_SHAPES:SHAPES;
  for(const mode of Object.keys(CLIPS)) {
    for(let i=0;i<=1000;i++) {
      const {J}=clipFrame(mode,i/1000*CLIPS[mode].duration,profile);
      assert(Object.values(J).flat().every(Number.isFinite));
    }
    // At the hidden hold even the rounded tips must be below the ground.
    const {J}=clipFrame(mode,mode==='dive'?2.5:7,profile);
    for(const s of shapes)for(const name of [s.a,s.b,...(s.control?[s.control]:[])])
      assert(J[name][1]+Math.max(s.ra,s.rb)<0, `${mode}: visible part during hidden hold`);
  }
  const raised=clipFrame('peek',2,profile).J;
  assert(raised.pelvis[1]<0 && raised.chest[1]>0 && raised.headBase[1]>0, 'Waist below rim, chest/head above');
  // The head enters the actual opening, rather than the ground beside it.
  let previous=clipFrame('dive',.85,profile).J.nose;
  for(let t=.851;t<1.8;t+=.001){
    const {J,hole}=clipFrame('dive',t,profile),p=J.nose;
    if(previous[1]>=0 && p[1]<0)assert(Math.hypot(p[0]-hole[0],p[2]-hole[1])<hole[2]-.08);
    previous=p;
  }
  // No pose jump at takeoff.
  const a=clipFrame('dive',.85-1e-7,profile).J,b=clipFrame('dive',.85,profile).J;
  for(const k of Object.keys(a))assert(Math.hypot(...a[k].map((v,i)=>v-b[k][i]))<1e-4);
}
console.log('Passed: both clips/profiles finite, hidden holds, waist reveal, entry inside hole, continuous takeoff.');

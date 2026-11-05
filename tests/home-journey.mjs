import assert from 'node:assert/strict';
import {ProjectJourney} from '../site/js/home-journey.js';
const a={id:0,x:-3,z:-2,scale:1.45},b={id:1,x:3,z:2,scale:.7};
const j=new ProjectJourney(-5,3),seen=new Set();
const step=()=>{const prior={x:j.x,z:j.z,state:j.state};j.update(1/60);seen.add(j.state);assert(Object.values(j.pose()).flat().every(Number.isFinite));if(prior.state==='run'&&j.state==='run')assert(Math.hypot(j.x-prior.x,j.z-prior.z)<.1,'Continuous travel');};
j.select(a);for(let i=0;i<1000&&j.state!=='peek';i++)step();
assert.equal(j.state,'peek');assert.equal(j.hole.id,0);assert.equal(j.scale,1.45);
j.select(b);for(let i=0;i<1500&&!(j.state==='peek'&&j.hole.id===1);i++)step();
assert.equal(j.hole.id,1);assert.equal(j.state,'peek');assert.equal(j.scale,.7);
assert(['run','dive','peek','exit'].every(s=>seen.has(s)));
// A new hover during travel changes the destination, not the current position.
j.select(a);for(let i=0;i<120;i++)step();const pos=[j.x,j.z];j.select(b);assert.deepEqual([j.x,j.z],pos);
console.log('Passed: continuous travel, dive/reveal/exit, latest destination and reverse scale.');

import {solve,idlePose,gallopPose,GALLOP} from '../rig.js';
import {clipFrame} from '../clips.js';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function blend(a,b,t){const out={};for(const k of Object.keys(b))out[k]=b[k].map((v,i)=>(a[k]?.[i]??v)*(1-t)+v*t);return out;}
export function place(J,x,z,yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return Object.fromEntries(Object.entries(J).map(([k,p])=>[k,[x+p[0]*c-p[2]*s,p[1],z+p[0]*s+p[2]*c]]));}
export function gamePose(g,profile='soft'){
  if(g.state==='free'){
    const idle=solve(idlePose(g.time,'auto'),profile);
    const run=solve(gallopPose(g.distance/GALLOP.stride),profile);
    return place(blend(idle,run,ease(g.speed/1.5)),g.x,g.z,g.yaw);
  }
  if(g.state==='dive'){
    const {J}=clipFrame('dive',Math.min(2,.85+g.time),profile);
    for(const p of Object.values(J))p[0]-=.55;
    return place(J,g.hole.x,g.hole.z,g.yaw);
  }
  const peekTime=g.time<1.5?g.time:2+((g.time-1.5)%3.5);
  const peek=clipFrame('peek',g.state==='exit'?1.8:peekTime,profile).J;
  // Face the follow camera while resting in a burrow.
  const resting=place(peek,g.hole.x,g.hole.z,Math.atan2(5,3)-75*Math.PI/180);
  if(g.state==='peek')return resting;
  const u=Math.min(1,g.time),e=ease(u);
  const yaw=Math.atan2(g.exitDirection.z,g.exitDirection.x);
  const p=gallopPose(.27+.5*u);p.x=0;
  const flight=place(solve(p,profile),g.hole.x+g.exitDirection.x*1.8*e,g.hole.z+g.exitDirection.z*1.8*e,yaw);
  const landing=place(solve(idlePose(0,'sit'),profile),g.hole.x+g.exitDirection.x*1.8,g.hole.z+g.exitDirection.z*1.8,yaw);
  const out=blend(resting,flight,ease(u/.3));
  for(const pt of Object.values(out))pt[1]+=.5*Math.sin(Math.PI*u);
  return blend(out,landing,ease((u-.7)/.3));
}

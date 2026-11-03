// Story clips operate on solved joints; the approved anatomy and gait stay intact.
import { solve, gallopPose, idlePose, GALLOP } from './rig.js';
export const CLIPS = { dive: { duration: 3.6, hole: [.55, 0, .36] }, peek: { duration: 7.6, hole: [0, 0, .30] } };
const ease = x => { x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const mix = (a,b,t) => a+(b-a)*t;
const radians = a => a*Math.PI/180;
function transform(J, pivot, pitch, yaw, position, keys=Object.keys(J)) {
  const c=Math.cos(radians(pitch)),s=Math.sin(radians(pitch));
  const cy=Math.cos(radians(yaw)),sy=Math.sin(radians(yaw));
  for(const k of keys){
    const p=J[k],x=p[0]-pivot[0],y=p[1]-pivot[1],z=p[2]-pivot[2];
    const xx=x*c-y*s, yy=x*s+y*c;
    J[k]=[position[0]+xx*cy-z*sy,position[1]+yy,position[2]+xx*sy+z*cy];
  }
}
export function clipFrame(mode, time, profile='classic') {
  const clip=CLIPS[mode];
  const t=((time%clip.duration)+clip.duration)%clip.duration;
  let J;
  if(mode==='dive'){
    const launch=.85, flight=.95;
    if(t<launch){
      const p=gallopPose(.27+(t-launch)/GALLOP.duration);
      p.x=-.65+(t-launch)*GALLOP.stride/GALLOP.duration;
      J=solve(p,profile);
    }else{
      const u=Math.min(1,(t-launch)/flight);
      // Reach forward, then tuck for a head-first descent; no new leg cycle.
      const p=gallopPose(mix(.27,.76,ease(u)));
      J=solve(p,profile,false);
      const start=solve(gallopPose(.27-1e-8),profile).pelvis[1];
      const x=mix(-.65,.55,1-(1-u)**2);
      const y=mix(start,-1.35,u)+.88*Math.sin(Math.PI*u);
      transform(J,[...J.pelvis],-105*ease((u-.22)/.62),0,[x,y,0]);
    }
  }else{
    J=solve(idlePose(0,'sit'),profile,false);
    // Rise only to the waist, pause, inspect both sides, then retreat.
    const rise=ease((t-.5)/1.0)*(1-ease((t-5.8)/.85));
    const look=38*ease((t-2)/.55)-76*ease((t-3.5)/.7)+38*ease((t-5)/.55);
    const headKeys=Object.keys(J).filter(k=>/^(headBack|snout|nose|eye|ear|softEar)/.test(k));
    transform(J,[...J.headBase],0,look,[...J.headBase],headKeys);
    transform(J,[...J.pelvis],30,75,[-.04,mix(-1.15,-.13,rise),-.06]);
  }
  return { J, hole: clip.hole, clipGround: true };
}

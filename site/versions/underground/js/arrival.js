import {ProjectView} from './project-view.js?v=20261103-2';
import {solve,gallopPose,GALLOP} from './rig.js';
import {clipFrame} from './clips.js';
const overlay=document.querySelector('#arrival'),canvas=document.querySelector('#arrival-view');
let view,finished=false,elapsed=0,last=performance.now();
function finish(){if(finished)return;finished=true;overlay.remove();document.body.classList.remove('intro-running');view?.dispose();}
document.querySelector('#arrival-skip').onclick=finish;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)finish();
else try{
 view=new ProjectView(canvas);
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function frame(now){
  if(finished)return;
  const dt=document.hidden?0:Math.min((now-last)/1000,.05);last=now;elapsed+=dt;
  const t=elapsed;overlay.dataset.phase=t<4?'approach':t<5.3?'dive':t<7?'enter':t<7.5?'black':t<8.1?'blue':t<8.7?'orange':'reveal';
  if(t>=9.2){finish();return;}
  if(t>=7){canvas.style.visibility='hidden';overlay.style.background=t<7.5?'#000':t<8.1?'#00a5e5':t<8.7?'#ff6b25':'#fff';}
  else{
   view.resize();let J;
   // The distant diagonal gradually straightens into the approved dive.
   if(t<4){
    const u=t/4,k=smooth(u),scale=.25+.75*k;
    const p=gallopPose(.27+(t-4)/GALLOP.duration);p.x=0;J=solve(p);
    const width=view.camera.right;
    const x=(-width-2)*(1-k)-1.2*k,z=-5*(1-k);
    const angle=.45*(1-k),c=Math.cos(angle),s=Math.sin(angle);
    for(const a of Object.values(J)){const ax=a[0]*scale,az=a[2]*scale;a[0]=x+ax*c-az*s;a[1]*=scale;a[2]=z+ax*s+az*c;}
   }else{J=clipFrame('dive',Math.min(2.5,.85+t-4),'classic').J;for(const a of Object.values(J))a[0]-=.55;}
   view.update(J,[0,0,.48],true);view.render();
   if(t>5.3){const u=smooth((t-5.3)/1.7);canvas.style.transform=`scale(${Math.exp(u*5)})`;}
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(error){console.error('Arrival intro unavailable',error);finish();}

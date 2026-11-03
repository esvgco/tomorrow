// One continuous visitor, with a latest-hover destination queue.
import {solve,idlePose,gallopPose,GALLOP} from './rig.js';
import {clipFrame} from './clips.js';
import {place,gamePose} from './play/motion.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class ProjectJourney {
  constructor(x=0,z=0){Object.assign(this,{x,z,scale:.8,yaw:0,state:'idle',time:0,distance:0,goal:null,hole:null,exitDirection:null});}
  select(goal){this.goal=goal;if(this.state==='idle')this.enter('run');}
  enter(state){this.state=state;this.time=0;}
  update(dt){
    this.time+=dt;
    if(this.state==='dive'){if(this.time>=1.2)this.enter('peek');return;}
    if(this.state==='peek'){
      if(this.goal && this.goal.id!==this.hole.id && this.time>.7){
        const dx=this.goal.x-this.hole.x,dz=this.goal.z-this.hole.z,d=Math.hypot(dx,dz);
        this.exitDirection={x:dx/d,z:dz/d};this.enter('exit');
      }return;
    }
    if(this.state==='exit'){
      if(this.time>=1){this.x=this.hole.x+this.exitDirection.x*1.8*this.scale;this.z=this.hole.z+this.exitDirection.z*1.8*this.scale;this.yaw=Math.atan2(this.exitDirection.z,this.exitDirection.x);this.enter('run');}return;
    }
    if(this.state!=='run'||!this.goal)return;
    const dx=this.goal.x-this.x,dz=this.goal.z-this.z,d=Math.hypot(dx,dz),stop=1.2*this.goal.scale;
    const step=Math.min(Math.max(0,d-stop),2.5*this.scale*dt);
    if(d>0){this.x+=dx/d*step;this.z+=dz/d*step;this.yaw+=wrap(Math.atan2(dz,dx)-this.yaw)*(1-Math.exp(-dt*12));}
    this.distance+=step/this.scale;
    this.scale+=(this.goal.scale-this.scale)*Math.min(1,step/Math.max(.001,d-stop));
    if(d-stop<=step+.001){
      this.hole={...this.goal};this.scale=this.goal.scale;this.yaw=Math.atan2(dz,dx);
      this.x=this.hole.x-Math.cos(this.yaw)*stop;this.z=this.hole.z-Math.sin(this.yaw)*stop;this.enter('dive');
    }
  }
  pose(){
    let J,x=this.x,z=this.z,yaw=this.yaw;
    if(this.state==='dive'){
      J=clipFrame('dive',.85+Math.min(this.time,1.15),'classic').J;
      for(const p of Object.values(J))p[0]-=.55;
      x=this.hole.x;z=this.hole.z;
    }else if(this.state==='peek'){
      J=clipFrame('peek',this.time<1.5?this.time:2+(this.time-1.5)%3.5,'classic').J;
      x=this.hole.x;z=this.hole.z;yaw=Math.PI/12;
    }else if(this.state==='exit'){
      J=gamePose({state:'exit',time:this.time,hole:{x:0,z:0},exitDirection:this.exitDirection},'classic');
      x=this.hole.x;z=this.hole.z;yaw=0;
    }else J=solve(this.state==='run'?gallopPose(this.distance/GALLOP.stride):idlePose(this.time,'sit'));
    for(const p of Object.values(J))for(let i=0;i<3;i++)p[i]*=this.scale;
    return place(J,x,z,yaw);
  }
  renderedHole(){const h=this.state==='run'?this.goal:this.hole;return h?[h.x,h.z,.3*h.scale]:null;}
}

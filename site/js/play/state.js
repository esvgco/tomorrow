export const HOLES = [
  {x:3,z:0}, {x:-4,z:-4}, {x:6,z:-6}, {x:-6,z:5}, {x:5,z:6},
];
export const SPEED = 2.65;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class Game {
  constructor(){this.reset();}
  reset(){Object.assign(this,{x:0,z:4,yaw:-Math.PI/2,speed:0,distance:0,state:'free',time:0,score:0,target:null,hole:null,ignored:null,exitDirection:null});}
  setTarget(x,z){this.target={x:Math.max(-10,Math.min(10,x)),z:Math.max(-10,Math.min(10,z))};}
  enter(state){this.state=state;this.time=0;}
  update(dt,input={x:0,z:0}){
    dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
    let dx=input.x,dz=input.z,mag=Math.hypot(dx,dz);
    if(mag>.01)this.target=null;
    else if(this.target){dx=this.target.x-this.x;dz=this.target.z-this.z;mag=Math.hypot(dx,dz);if(mag<.16){this.target=null;mag=0;}}
    if(mag>.01){dx/=mag;dz/=mag;}
    if(this.state==='dive'){
      if(this.time>=1.25){this.score++;this.x=this.hole.x;this.z=this.hole.z;this.enter('peek');}
      return;
    }
    if(this.state==='peek'){
      if(this.time>1.25 && mag>.01){this.exitDirection={x:dx,z:dz};this.enter('exit');}
      return;
    }
    if(this.state==='exit'){
      if(this.time>=1){this.x=this.hole.x+this.exitDirection.x*1.8;this.z=this.hole.z+this.exitDirection.z*1.8;this.yaw=Math.atan2(this.exitDirection.z,this.exitDirection.x);this.ignored=this.hole;this.speed=0;this.enter('free');}
      return;
    }
    const desired=mag>.01?SPEED:0;
    this.speed+=(desired-this.speed)*(1-Math.exp(-dt*12));
    if(this.speed<.015)this.speed=0;
    if(mag>.01)this.yaw+=wrap(Math.atan2(dz,dx)-this.yaw)*(1-Math.exp(-dt*14));
    const step=this.speed*dt;
    const oldX=this.x,oldZ=this.z;
    this.x=Math.max(-10,Math.min(10,this.x+Math.cos(this.yaw)*step));
    this.z=Math.max(-10,Math.min(10,this.z+Math.sin(this.yaw)*step));
    this.distance+=Math.hypot(this.x-oldX,this.z-oldZ);
    if(this.ignored && Math.hypot(this.x-this.ignored.x,this.z-this.ignored.z)>2.1)this.ignored=null;
    if(this.speed>.15) for(const hole of HOLES){
      if(hole===this.ignored)continue;
      const d=Math.hypot(this.x-hole.x,this.z-hole.z);
      if(d<1.2){this.hole=hole;this.yaw=Math.atan2(hole.z-this.z,hole.x-this.x);this.target=null;this.speed=0;this.enter('dive');break;}
    }
  }
}

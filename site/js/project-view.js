import * as THREE from 'three';
import {SdfView} from './sdf.js';
// Orthographic ground plus intentional scale reversal: distant holes and their
// rabbit are larger. Hit targets and visuals share this single projection.
export class ProjectView extends SdfView {
  constructor(canvas){
    super(canvas,{style:'contour',maxDpr:1.5});
    this.camera=new THREE.OrthographicCamera(-6,6,3,-3,.1,60);
    this.camera.position.set(0,7,10);this.camera.lookAt(0,0,0);
    let shader=this.marchMat.fragmentShader;
    const a=shader.indexOf('void ray('),b=shader.indexOf('// march;',a);
    shader=shader.slice(0,a)+`void ray(out vec3 ro,out vec3 rd) {
      vec4 nearPoint=uProjInv*vec4(vUv*2.0-1.0,-1.0,1.0);
      vec4 farPoint=uProjInv*vec4(vUv*2.0-1.0,1.0,1.0);
      ro=(uCamWorld*vec4(nearPoint.xyz/nearPoint.w,1.0)).xyz;
      vec3 target=(uCamWorld*vec4(farPoint.xyz/farPoint.w,1.0)).xyz;
      rd=normalize(target-ro);
    }\n`+shader.slice(b);
    this.marchMat.fragmentShader=shader;this.marchMat.needsUpdate=true;
  }
  resize(){
    super.resize();if(!this.camera.isOrthographicCamera)return;
    const aspect=this.cssW/this.cssH,halfWidth=this.cssW<760?3.8:6,half=halfWidth/aspect;
    this.camera.left=-halfWidth;this.camera.right=halfWidth;this.camera.top=half;this.camera.bottom=-half;
    this.camera.fov=2*Math.atan(half/12)*180/Math.PI;
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }
}

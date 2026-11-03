import * as THREE from 'three';
import {SdfView} from '../sdf.js';
// Isolated compositor: reuse the approved rabbit shader without changing the
// homepage/study renderer. The world and rabbit share one camera and depth.
export class PlayView extends SdfView {
  constructor(canvas){
    super(canvas,{style:'sky',bg:'#87adb0',maxDpr:1});
    this.world=new THREE.Scene();this.world.background=new THREE.Color('#dce7e8');
    this.world.fog=new THREE.Fog('#dce7e8',15,35);
    this.worldTarget=new THREE.WebGLRenderTarget(1,1);
    this.worldTarget.depthTexture=new THREE.DepthTexture(1,1);
    this.uniforms.uWorld={value:this.worldTarget.texture};
    this.uniforms.uWorldDepth={value:this.worldTarget.depthTexture};
    let frag=this.marchMat.fragmentShader;
    frag=frag.replace('uniform bool uClipGround;','uniform bool uClipGround;\nuniform sampler2D uWorld;\nuniform sampler2D uWorldDepth;');
    frag=frag.replace('  float th = holeHit(ro, rd);',`  float wd = texture(uWorldDepth,vUv).r;
  vec4 wv = uProjInv * vec4(vUv*2.0-1.0, wd*2.0-1.0, 1.0);
  float worldT = length(wv.xyz/wv.w);
  if (t > worldT) t = -1.0;
  float th = -1.0;`);
    frag=frag.replace('  vec3 bg = uBg;', '  vec3 bg = texture(uWorld,vUv).rgb;');
    frag=frag.replace('  if (cov > 0.0) {','  if (cov > 0.0 && minT < worldT) {');
    this.marchMat.fragmentShader=frag;this.marchMat.needsUpdate=true;
    this.camera.fov=43;this.camera.updateProjectionMatrix();
  }
  resize(){super.resize();if(this.worldTarget){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.worldTarget.setSize(size.x,size.y);}}
  render(){this.renderer.setRenderTarget(this.worldTarget);this.renderer.render(this.world,this.camera);this.renderer.setRenderTarget(null);super.render();}
}

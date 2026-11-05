import {clamp,ease,reduced} from './shared.js';
import {MARK_SVG} from '../mark.js';
// The hole: a disc fixed in the upper third with the rabbit's head half over its edge.
// Both turn like a record: slowly on their own, faster while you scroll down, and
// a little backwards while you scroll up. The one sentence at the foot of the first
// screen rises towards it and is taken in, two ways:
//   ring  — the whole paragraph bends round the hole, stretching along its edge until
//           it would close into a ring; it fades before the ring is complete (WebGL mesh).
//   orbit — letters come off one by one, circle the hole like a tornado seen from
//           above, and fall in (DOM letters).
const $=s=>document.querySelector(s),body=document.body,mode=body.dataset.mode||'ring';
const sentence=$('#hole-sentence'),spin=$('#hole-spin'),rabbitHost=$('#hole-rabbit');
let iw=innerWidth,ih=innerHeight,hx=0,hy=0,R=150,size=26,angle=0,omega=0,vel=0,lastY=scrollY,last=performance.now();

// Rabbit: the client's mark without its own hole, white, inverted by the disc.
rabbitHost.innerHTML=MARK_SVG;
const svg=rabbitHost.querySelector('svg'),bun=svg.querySelector('.mk-bun');bun.removeAttribute('clip-path');
const bb=bun.getBBox();svg.setAttribute('viewBox',`${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
const FACE=.8; // the height, as a fraction of the head, that sits on the disc's edge

function layout(){
  iw=innerWidth;ih=innerHeight;const mobile=iw<650;
  hx=iw/2;hy=ih*(mobile?.34:.33);R=Math.round(mobile?Math.min(iw*.21,ih*.12):Math.min(iw*.12,ih*.16));size=mobile?20:Math.round(clamp(iw/55,22,28));
  body.style.setProperty('--r',R+'px');body.style.setProperty('--sentence-size',size+'px');
  const h=R*1.35,w=h*bb.width/bb.height;Object.assign(rabbitHost.style,{width:w+'px',height:h+'px',left:-w/2+'px',top:(-R-FACE*h)+'px'});
  text?.layout();
}

// Where the sentence is, before it is taken: it scrolls up with the page from 82vh
// and stops a little outside the disc.
function textCentre(p){const start=ih*.82,stop=hy+R*1.6;return Math.max(stop,start-scrollY)}
const range=()=>ih*1.25; // scroll over which the sentence is taken in

// ---------- ring: the paragraph as a bent mesh ----------
function ringText(){
  const canvas=$('#hole-gl'),gl=canvas.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:true});
  if(!gl)return null;
  const vs=`attribute vec2 a;attribute vec2 t;uniform vec2 res;uniform float cx,ty,rho,s,th,rot;varying vec2 uv;
void main(){float phi=a.x*s/rho+rot;float r=a.y*th;float h=sin(phi*.5);
float x=cx+(rho+r)*sin(phi);float y=ty+r*cos(phi)-rho*2.*h*h;
uv=t;gl_Position=vec4(x/res.x*2.-1.,1.-y/res.y*2.,0.,1.);}`;
  const fs=`precision mediump float;uniform sampler2D tex;uniform float alpha;varying vec2 uv;void main(){float a=texture2D(tex,uv).a*alpha;gl_FragColor=vec4(0.,0.,0.,a);}`;
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS))return null;
  gl.useProgram(prog);const U=n=>gl.getUniformLocation(prog,n);
  const buf=gl.createBuffer(),ibuf=gl.createBuffer(),tex=gl.createTexture();let count=0,W=0,Hh=0,dpr=1;
  function layoutRing(){
    dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(iw*dpr);canvas.height=Math.round(ih*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    // Draw the sentence exactly as the DOM wraps it.
    const style=getComputedStyle(sentence),font=`400 ${size}px ${style.fontFamily}`,lh=size*1.25,maxW=sentence.clientWidth;
    const c=document.createElement('canvas'),g=c.getContext('2d');g.font=font;
    const words=sentence.textContent.trim().split(/\s+/),lines=[];let line='';
    for(const w of words){const next=line?line+' '+w:w;if(g.measureText(next).width>maxW&&line){lines.push(line);line=w}else line=next}lines.push(line);
    W=Math.ceil(Math.max(...lines.map(l=>g.measureText(l).width)))+8;Hh=Math.ceil(lines.length*lh)+8;
    const k=dpr*1.5;c.width=Math.ceil(W*k);c.height=Math.ceil(Hh*k);g.scale(k,k);g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#000';
    lines.forEach((l,i)=>g.fillText(l,W/2,4+lh*(i+.5)));
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    for(const [p,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
    // A fine grid, so the bend is smooth.
    const NX=240,NY=Math.max(4,lines.length*4),data=[],idx=[];
    for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const u=i/NX,v=j/NY;data.push((u-.5)*W,(v-.5)*Hh,u,v)}
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c2=a+NX+1,d=c2+1;idx.push(a,b,c2,b,d,c2)}
    count=idx.length;gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibuf);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    const A=gl.getAttribLocation(prog,'a'),T=gl.getAttribLocation(prog,'t');gl.enableVertexAttribArray(A);gl.enableVertexAttribArray(T);
    gl.vertexAttribPointer(A,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(T,2,gl.FLOAT,false,16,8);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  }
  function draw(){
    const p=clamp(scrollY/range()),ty=textCentre(p),D=Math.max(1,ty-hy);
    const bend=Math.max(.0008,ease(clamp((p-.12)/.6))),wrap=ease(clamp((p-.4)/.55));
    const rho=D/bend,full=2*Math.PI*D/W,s=1+(full-1)*wrap,alpha=1-ease(clamp((p-.62)/.3));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);if(alpha<=.001)return;
    gl.uniform2f(U('res'),iw,ih);gl.uniform1f(U('cx'),hx);gl.uniform1f(U('ty'),ty);gl.uniform1f(U('rho'),rho);gl.uniform1f(U('s'),s);
    gl.uniform1f(U('th'),1-.55*bend);gl.uniform1f(U('rot'),wrap*wrap*wrap*angle*Math.PI/180*.4);gl.uniform1f(U('alpha'),alpha);
    gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0);
  }
  return {layout:layoutRing,draw};
}

// ---------- orbit: letters taken one at a time ----------
function orbitText(){
  const layer=$('#hole-letters');let letters=[];
  function layoutOrbit(){
    layer.textContent='';letters=[];
    // Measure each character where the DOM puts it, relative to the sentence's centre.
    const probe=sentence.cloneNode(false);probe.removeAttribute('id');probe.style.cssText='opacity:0;pointer-events:none;top:0;transform:translate(-50%,0)';
    for(const ch of sentence.textContent){const s=document.createElement('span');s.textContent=ch;probe.append(s)}
    sentence.after(probe);const box=probe.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
    let n=0;const spans=[...probe.children];
    spans.forEach((s,i)=>{if(!s.textContent.trim())return;const r=s.getBoundingClientRect();const el=document.createElement('span');el.textContent=s.textContent;layer.append(el);
      // Release order: mostly the line nearest the hole first, with a little disorder.
      const rand=Math.abs(Math.sin(i*12.9898)*43758.5453)%1;
      letters.push({el,x:r.left+r.width/2-cx,y:r.top+r.height/2-cy,w:r.width,h:r.height,rand});n++});
    probe.remove();
    const ys=letters.map(l=>l.y),y0=Math.min(...ys),y1=Math.max(...ys);
    letters.forEach(l=>{const row=y1>y0?(l.y-y0)/(y1-y0):0;l.release=.12+row*.18+l.rand*.38;l.turns=1.1+l.rand*.9});
  }
  function draw(){
    const p=clamp(scrollY/range()),ty=textCentre(p);
    for(const l of letters){
      const fx=hx+l.x,fy=ty+l.y;const tau=clamp((p-l.release)/.42);
      if(tau<=0){l.el.style.transform=`translate(${fx-l.w/2}px,${fy-l.h/2}px)`;l.el.style.opacity=1;continue}
      // Spiral in: radius shrinks, angular speed grows as it gets closer (clockwise, like the disc).
      const dx=fx-hx,dy=fy-hy,r0=Math.hypot(dx,dy),a0=Math.atan2(dx,dy);
      const k=ease(tau),r=r0*(1-k)+R*.04*k;const a=a0-l.turns*2*Math.PI*Math.pow(tau,1.6)*(1+.6*k);
      const x=hx+r*Math.sin(a),y=hy+r*Math.cos(a);const sc=1-.7*k;const turn=(a0-a)*.9;
      l.el.style.transform=`translate(${x-l.w/2}px,${y-l.h/2}px) rotate(${turn}rad) scale(${sc})`;
      l.el.style.opacity=(1-ease(clamp((tau-.8)/.2))).toFixed(3);
    }
  }
  return {layout:layoutOrbit,draw};
}

let text=null;
await Promise.race([document.fonts.load(`400 26px "ABC Areal"`),new Promise(r=>setTimeout(r,2500))]);
layout();
if(!reduced){text=mode==='orbit'?orbitText():ringText();if(text){body.classList.add('js-text');text.layout()}}
addEventListener('resize',layout);
addEventListener('scroll',()=>{},{passive:true});
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  const dy=scrollY-lastY;lastY=scrollY;vel+=((dt?dy/dt:0)-vel)*(1-Math.exp(-dt*8));
  // Record: 14°/s on its own; scrolling down adds speed, scrolling up turns it back a little.
  const target=reduced?0:14+(vel>0?vel*.09:vel*.045);omega+=(target-omega)*(1-Math.exp(-dt*3));angle+=omega*dt;
  spin.style.transform=`rotate(${angle}deg)`;
  text?.draw();
  requestAnimationFrame(frame)}
requestAnimationFrame(frame);

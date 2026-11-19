// The white screen above the wall (04.15): instead of the word "possible", the rabbit's tail,
// a video. Under the pointer it plays; when the pointer leaves, it plays back to where it
// started (a reversed copy of the video, taken up at the mirrored moment, since browsers do
// not play backwards). On a touch screen it plays while the finger is down.
//
// The tail can be rubbed out. Under it is a door: a black frame and a handle on white. Once
// enough of the door is uncovered, the handle can be pressed: the leaf swings open on a black
// inside and we fly through, as in door-ink.js.
//
// One canvas shows it all, drawn again whenever the video moves or something is rubbed out:
// the door, and over it the video's frame, cut to the round of the tail and with the rubbed
// strokes taken out of it.
const SRC='assets/video/rabbit-tail-',D=4.04;
// The tail in the video's own frame: its centre and its diameter, as shares of the frame.
const TAIL={x:.494,y:.505,d:.77};
export function mountDoorTail(layer,{onEnter=()=>{},reduced=false}={}){
  const canvas=layer.querySelector('canvas'),ctx=canvas.getContext('2d');
  const rub=document.createElement('canvas'),rubCtx=rub.getContext('2d'),tail=document.createElement('canvas'),tailCtx=tail.getContext('2d');
  const video=rev=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.setAttribute('aria-hidden','true');v.className='above-tail-src';
    // Fetched whole and played from memory: the host does not answer range requests, and
    // without them a browser cannot jump to the mirrored moment. The page's own sources are
    // the fallback if fetching fails.
    const ext=v.canPlayType('video/webm; codecs="vp9"')?'webm':'mp4',url=`${SRC}${rev?'reverse':'forward'}.${ext}`;
    fetch(url).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>{v.src=URL.createObjectURL(b);v.load()}).catch(()=>{v.src=url});
    layer.append(v);return v};
  const fwd=video(false),back=video(true);
  let w=0,h=0,dpr=1,door=null,box=null,brush=34,drawing=null,ready=false,opening=false,over=false,active=fwd,dirty=true,running=false;

  function layout(){
    w=canvas.clientWidth||innerWidth;h=canvas.clientHeight||innerHeight;dpr=Math.min(2,devicePixelRatio||1);const mobile=innerWidth<650;
    for(const c of [canvas,rub,tail]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);rubCtx.setTransform(dpr,0,0,dpr,0,0);tailCtx.setTransform(dpr,0,0,dpr,0,0);
    // The tail sits in the middle of the window; the door is well inside its round.
    const S=Math.min(innerWidth*(mobile?1.1:.9),innerHeight*.8),cx=innerWidth/2,cy=Math.min(innerHeight/2,h-S*TAIL.d/2-8);
    box={x:cx-S*TAIL.x,y:cy-S*TAIL.y,s:S,cx,cy,r:S*TAIL.d/2};
    const dh=box.r*2*.6,dw=dh/2.15,t=Math.max(4,dw*.06);
    door={x:cx-dw/2,y:cy-dh/2,w:dw,h:dh,t,hx:cx+dw/2-t-dw*.16,hy:cy+dh*.04,hr:Math.max(5,dw*.05)};
    brush=mobile?30:38;ready=false;layer.classList.remove('door-ready');dirty=true;
  }
  function drawDoor(c){const d=door;c.fillStyle='#000';c.beginPath();c.rect(d.x,d.y,d.w,d.h);c.rect(d.x+d.t,d.y+d.t,d.w-2*d.t,d.h-d.t);c.fill('evenodd');c.beginPath();c.arc(d.hx,d.hy,d.hr,0,Math.PI*2);c.fill()}
  function render(){
    ctx.clearRect(0,0,w,h);drawDoor(ctx);
    if(opening){const d=door;ctx.fillStyle='#000';ctx.fillRect(d.x+d.t,d.y+d.t,d.w-2*d.t,d.h-d.t)}
    // The tail: the video's frame, cut to its round (its square background must not show),
    // less what has been rubbed out.
    const v=active.readyState>=2?active:fwd.readyState>=2?fwd:null;
    tailCtx.globalCompositeOperation='source-over';tailCtx.clearRect(0,0,w,h);
    if(v){tailCtx.drawImage(v,box.x,box.y,box.s,box.s);
      const g=tailCtx.createRadialGradient(box.cx,box.cy,box.r*.9,box.cx,box.cy,box.r*1.03);g.addColorStop(0,'#000');g.addColorStop(1,'rgba(0,0,0,0)');
      tailCtx.globalCompositeOperation='destination-in';tailCtx.fillStyle=g;tailCtx.fillRect(0,0,w,h);
      tailCtx.globalCompositeOperation='destination-out';tailCtx.setTransform(1,0,0,1,0,0);tailCtx.drawImage(rub,0,0);tailCtx.setTransform(dpr,0,0,dpr,0,0);
      tailCtx.globalCompositeOperation='source-over'}
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(tail,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
    dirty=false;
  }
  // Drawn only while the screen is there, and only when something moved.
  const shown=()=>layer.classList.contains('shown');
  function loop(){if(!shown()){running=false;fwd.pause();back.pause();return}
    if(dirty||!active.paused)render();requestAnimationFrame(loop)}
  const wake=()=>{if(!running&&shown()){running=true;dirty=true;requestAnimationFrame(loop)}};
  new MutationObserver(wake).observe(layer,{attributes:true,attributeFilter:['class']});
  for(const v of [fwd,back])v.addEventListener('loadeddata',()=>{dirty=true;wake()});

  // Forward and back. Each takes up from where the other is, mirrored.
  const now=()=>active===fwd?fwd.currentTime:D-back.currentTime;
  function play(dir){if(reduced)return;const t=Math.max(0,Math.min(D,now())),to=dir>0?fwd:back,from=dir>0?back:fwd;
    if(active===to&&!to.paused)return;from.pause();to.currentTime=dir>0?t:D-t;active=to;to.play().catch(()=>{});dirty=true}
  const inTail=p=>Math.hypot(p.x-box.cx,p.y-box.cy)<box.r;
  const setOver=on=>{if(on===over)return;over=on;play(on?1:-1)};

  // Rubbing out.
  function line(a,b){rubCtx.strokeStyle='#000';rubCtx.lineWidth=brush;rubCtx.lineCap='round';rubCtx.lineJoin='round';rubCtx.beginPath();rubCtx.moveTo(a.x,a.y);rubCtx.lineTo(b.x,b.y);rubCtx.stroke();dirty=true}
  // How much of the door (and a little round it) is uncovered, sampled coarsely.
  function coverage(){const d=door,m=d.w*.2,x0=Math.max(0,d.x-m),y0=Math.max(0,d.y-m),x1=Math.min(w,d.x+d.w+m),y1=Math.min(h,d.y+d.h+m);
    const img=rubCtx.getImageData(Math.floor(x0*dpr),Math.floor(y0*dpr),Math.ceil((x1-x0)*dpr),Math.ceil((y1-y0)*dpr));
    let on=0,all=0;const step=Math.max(2,Math.round(6*dpr));for(let y=0;y<img.height;y+=step)for(let x=0;x<img.width;x+=step){all++;if(img.data[(y*img.width+x)*4+3]>100)on++}
    return all?on/all:0}
  const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
  const onHandle=p=>Math.hypot(p.x-door.hx,p.y-door.hy)<door.hr+14;
  canvas.addEventListener('pointerdown',e=>{if(opening||!layer.classList.contains('drawable'))return;const p=point(e);
    if(ready&&onHandle(p)){open();return}
    if(e.pointerType!=='mouse')setOver(true);
    drawing=p;canvas.setPointerCapture(e.pointerId);line(p,{x:p.x+.01,y:p.y});wake()});
  canvas.addEventListener('pointermove',e=>{const p=point(e);canvas.style.cursor=ready&&onHandle(p)?'pointer':'crosshair';
    if(e.pointerType==='mouse'&&!opening)setOver(inTail(p));if(!drawing)return;line(drawing,p);drawing=p});
  canvas.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!drawing)setOver(false)});
  const end=e=>{if(!drawing)return;drawing=null;if(e.pointerType!=='mouse')setOver(false);if(!ready&&coverage()>.55){ready=true;layer.classList.add('door-ready')}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);

  function open(){
    opening=true;setOver(false);const d=door,ix=d.x+d.t,iy=d.y+d.t,iw=d.w-2*d.t,ih=d.h-d.t;
    // The leaf takes what was inside the frame with it; behind it, the inside is black.
    const leaf=document.createElement('canvas');leaf.className='door-leaf';leaf.width=Math.round(iw*dpr);leaf.height=Math.round(ih*dpr);
    leaf.getContext('2d').drawImage(canvas,ix*dpr,iy*dpr,iw*dpr,ih*dpr,0,0,iw*dpr,ih*dpr);
    Object.assign(leaf.style,{left:ix+'px',top:iy+'px',width:iw+'px',height:ih+'px'});
    render();layer.append(leaf);
    const swing=leaf.animate([{transform:'perspective(900px) rotateY(0deg)'},{transform:'perspective(900px) rotateY(-108deg)'}],{duration:reduced?1:900,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
    swing.finished.then(()=>{layer.style.transformOrigin=`${ix+iw/2}px ${iy+ih/2}px`;
      return layer.animate([{transform:'scale(1)'},{transform:'scale(30)'}],{duration:reduced?1:1000,easing:'cubic-bezier(.7,0,.9,.4)',fill:'forwards'}).finished})
    .then(()=>onEnter(()=>{leaf.remove();layer.getAnimations().forEach(a=>a.cancel());layer.style.transformOrigin='';clear();opening=false}));
  }
  function clear(){rubCtx.clearRect(0,0,w,h);ready=false;layer.classList.remove('door-ready');fwd.pause();back.pause();active=fwd;fwd.currentTime=0;over=false;dirty=true;wake()}
  layout();addEventListener('resize',()=>{if(!opening){layout();clear()}});wake();
  return {clear};
}

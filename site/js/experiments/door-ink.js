// A white screen you can draw on in black. In its middle, a door frame and a handle never
// take ink: hatch over the centre and the frame appears, white, out of what you drew.
// Once enough of the door and its surroundings is inked, the handle can be pressed: the
// inked leaf swings open on a black inside and we fly through.
export function mountDoor(layer,{onEnter=()=>{},reduced=false}={}){
  const canvas=layer.querySelector('canvas'),ctx=canvas.getContext('2d');
  let w=0,h=0,dpr=1,door=null,drawing=null,ready=false,opening=false,brush=18;
  function layout(){
    w=innerWidth;h=innerHeight;dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const dw=Math.min(w*.34,230),dh=Math.min(h*.56,dw*2.15),t=Math.max(10,dw*.065);
    door={x:w/2-dw/2,y:h/2-dh/2,w:dw,h:dh,t,hx:w/2+dw/2-t-dw*.16,hy:h/2+dh*.04,hr:Math.max(7,dw*.045)};
    brush=w<650?14:18;ready=false;layer.classList.remove('door-ready');
  }
  // The parts that never take ink: the frame (an outline) and the handle.
  function mask(c){const d=door;c.beginPath();c.rect(d.x,d.y,d.w,d.h);c.rect(d.x+d.t,d.y+d.t,d.w-2*d.t,d.h-d.t);c.fill('evenodd');c.beginPath();c.arc(d.hx,d.hy,d.hr,0,Math.PI*2);c.fill()}
  function punch(){ctx.save();ctx.globalCompositeOperation='destination-out';mask(ctx);ctx.restore()}
  function line(a,b){ctx.strokeStyle='#000';ctx.lineWidth=brush;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();punch()}
  // How much of the door's leaf and a margin round the frame is inked, sampled coarsely.
  function coverage(){
    const d=door,m=d.w*.35,x0=Math.max(0,d.x-m),y0=Math.max(0,d.y-m*.6),x1=Math.min(w,d.x+d.w+m),y1=Math.min(h,d.y+d.h+m*.6);
    const img=ctx.getImageData(Math.floor(x0*dpr),Math.floor(y0*dpr),Math.ceil((x1-x0)*dpr),Math.ceil((y1-y0)*dpr));
    let ink=0,all=0;const step=Math.max(2,Math.round(6*dpr)),W=img.width;
    for(let y=0;y<img.height;y+=step)for(let x=0;x<W;x+=step){const px=x0+x/dpr,py=y0+y/dpr;
      const onFrame=px>=d.x&&px<=d.x+d.w&&py>=d.y&&py<=d.y+d.h&&!(px>d.x+d.t&&px<d.x+d.w-d.t&&py>d.y+d.t);const onHandle=Math.hypot(px-d.hx,py-d.hy)<d.hr;
      if(onFrame||onHandle)continue;all++;if(img.data[(y*W+x)*4+3]>100)ink++}
    return all?ink/all:0;
  }
  const point=e=>({x:e.clientX,y:e.clientY});
  const onHandle=p=>Math.hypot(p.x-door.hx,p.y-door.hy)<door.hr+14;
  canvas.addEventListener('pointerdown',e=>{if(opening||!layer.classList.contains('drawable'))return;const p=point(e);
    if(ready&&onHandle(p)){open();return}
    drawing=p;canvas.setPointerCapture(e.pointerId);line(p,{x:p.x+.01,y:p.y})});
  canvas.addEventListener('pointermove',e=>{const p=point(e);canvas.style.cursor=ready&&onHandle(p)?'pointer':'crosshair';if(!drawing)return;line(drawing,p);drawing=p});
  const end=()=>{if(!drawing)return;drawing=null;if(!ready&&coverage()>.55){ready=true;layer.classList.add('door-ready')}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  function open(){
    opening=true;const d=door,ix=d.x+d.t,iy=d.y+d.t,iw=d.w-2*d.t,ih=d.h-d.t;
    // The leaf takes the ink that was inside the frame with it; behind it, the inside is black.
    const leaf=document.createElement('canvas');leaf.className='door-leaf';leaf.width=Math.round(iw*dpr);leaf.height=Math.round(ih*dpr);
    leaf.getContext('2d').drawImage(canvas,ix*dpr,iy*dpr,iw*dpr,ih*dpr,0,0,iw*dpr,ih*dpr);
    Object.assign(leaf.style,{left:ix+'px',top:iy+'px',width:iw+'px',height:ih+'px'});
    ctx.fillStyle='#000';ctx.fillRect(ix,iy,iw,ih);layer.append(leaf);
    const swing=leaf.animate([{transform:'perspective(900px) rotateY(0deg)'},{transform:'perspective(900px) rotateY(-108deg)'}],{duration:reduced?1:900,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
    swing.finished.then(()=>{layer.style.transformOrigin=`${ix+iw/2}px ${iy+ih/2}px`;
      return layer.animate([{transform:'scale(1)'},{transform:'scale(30)'}],{duration:reduced?1:1000,easing:'cubic-bezier(.7,0,.9,.4)',fill:'forwards'}).finished})
    .then(()=>onEnter(()=>{leaf.remove();layer.getAnimations().forEach(a=>a.cancel());layer.style.transformOrigin='';clear();opening=false}));
  }
  function clear(){ctx.clearRect(0,0,w,h);ready=false;layer.classList.remove('door-ready')}
  layout();addEventListener('resize',()=>{if(!opening){layout();clear()}});
  return {clear};
}

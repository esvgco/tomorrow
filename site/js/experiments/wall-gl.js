// The wall, drawn in WebGL (04.10, 04.11).
//
// The page itself stays what it is: the same chapters, laid out by the browser, moved by the
// same camera, clickable and readable. They are only made invisible, and a canvas shows a
// picture of them instead:
//
//   1. measure  Each chapter is read once: where every word, rule, picture and shape is,
//               in the chapter's own pixels, with the font and colour the browser gave it.
//   2. draw     That list is drawn into a 2D canvas and kept as a texture.
//   3. bend     Every frame each texture is put where the camera puts the chapter, and the
//               lens is applied per pixel: a row near the top or bottom of the window is
//               magnified about the centre line. It is exact arithmetic on a float, with
//               no 8-bit map in between, so the bend can be as deep as wanted and is smooth.
//
// A layer is one texture: a chapter, or a part of a chapter that moves by itself (a sprite),
// or a part whose content is handed over as a list instead of being read (a painted layer:
// the falling letters).
//
// What keeps it light on a phone:
//   - Every chapter is drawn once, while the page opens, at the size it is read at. Scrolling
//     then only moves textures; nothing is measured or drawn again on the way.
//   - A chapter is drawn larger only when the camera has come to rest on something bigger
//     than its texture, never in the middle of a scroll (unless it would be very soft).
//   - Nothing reads the page while scrolling. Whatever changes inside a chapter (an edit) is
//     seen by a MutationObserver and that one chapter is read again.
const VERT=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG=`precision highp float;
uniform sampler2D tex;uniform vec2 view,origin,size,flare;uniform vec4 funnel;uniform float dpr,k,opacity,band,power;
void main(){
  vec2 s=vec2(gl_FragCoord.x/dpr,view.y-gl_FragCoord.y/dpr);
  float top=max(0.,1.-s.y/band),foot=max(0.,1.-(view.y-s.y)/band);
  float m=1.+flare.x*pow(top,power)+flare.y*pow(foot,power);
  s.x=view.x*.5+(s.x-view.x*.5)/m;
  // The funnel: under a point, rows are squeezed toward it, the tighter the nearer.
  float d=(s.y-funnel.y)/funnel.z,c=mix(1.,mix(.16,1.,smoothstep(0.,1.,d)),funnel.w*step(0.,d));
  s.x=funnel.x+(s.x-funnel.x)/c;
  vec2 uv=(s-origin)/(k*size);
  gl_FragColor=texture2D(tex,uv)*opacity*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
}`;
const SKIP=new Set(['SCRIPT','STYLE','CANVAS']);
export function mountWallGL(viewport,panels,{band=.27,flare=.9,power=2.2}={}){
  const canvas=document.createElement('canvas');canvas.className='wall-canvas';canvas.setAttribute('aria-hidden','true');
  const opts={alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'high-performance'};
  let gl=canvas.getContext('webgl2',opts),two=!!gl;if(!gl)gl=canvas.getContext('webgl',opts);if(!gl)return null;
  viewport.prepend(canvas);
  const pen=document.createElement('canvas'),ctx=pen.getContext('2d'),spacing='letterSpacing' in ctx;
  const layers=panels.map((el,j)=>({el,panel:j,rest:1})),states=panels.map(()=>({tx:0,ty:0,k:1,far:true,opacity:1}));
  const base=panels.map(()=>({x:0,y:0,ox:0,oy:0}));
  let prog,loc={},dpr=1,W=0,H=0,R=1,amounts=[1,1],fun=[0,0,1,0],redraw=true,maxSize=4096,lost=false,moved=0,seenW=-1;
  function setup(){
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
    prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(prog);gl.useProgram(prog);
    for(const n of ['tex','view','origin','size','dpr','k','opacity','band','power','flare','funnel'])loc[n]=gl.getUniformLocation(prog,n);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.SCISSOR_TEST);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.clearColor(0,0,0,0);
    maxSize=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),innerWidth<650?2048:4096);
    for(const l of layers){l.tex=null;l.q=0}
  }
  setup();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;setup();redraw=true});

  // ---------- 1. measure ----------
  // Everything is read with the chapter's own transform taken off, so the numbers are the
  // chapter's own pixels whatever the camera is doing. A chapter that is hidden for being
  // far away is read all the same.
  function measure(layer){
    const root=layer.el,p=panels[layer.panel],held=[p,...layers.filter(l=>l.sprite&&l.panel===layer.panel).map(l=>l.el)].map(el=>[el,el.style.transform]);
    for(const [el] of held)el.style.transform='none';
    const far=p.hasAttribute('hidden-far');if(far)p.removeAttribute('hidden-far');
    const R0=root.getBoundingClientRect(),items=[];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    const grow=(l,t,r,b)=>{x0=Math.min(x0,l);y0=Math.min(y0,t);x1=Math.max(x1,r);y1=Math.max(y1,b)};
    const local=r=>({x:r.left-R0.left,y:r.top-R0.top,w:r.width,h:r.height});
    const P=p.getBoundingClientRect();
    if(!layer.sprite){const V=viewport.getBoundingClientRect(),o=getComputedStyle(p).transformOrigin.split(' ').map(parseFloat);
      Object.assign(base[layer.panel],{x:P.left-V.left,y:P.top-V.top,ox:o[0],oy:o[1]})}
    else{layer.bx=R0.left-P.left;layer.by=R0.top-P.top}
    const range=document.createRange();
    if(layer.painted){layer.box={w:R0.width,h:R0.height};const cs=getComputedStyle(root),size=parseFloat(cs.fontSize);
      layer.type={font:`${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`,color:cs.color,size,line:parseFloat(cs.lineHeight)||size*1.5};
      ctx.font=layer.type.font;const m=ctx.measureText('x');layer.type.asc=m.fontBoundingBoxAscent??size*.8;layer.type.desc=m.fontBoundingBoxDescent??size*.2}
    else (function walk(el,alpha,clip){
      const cs=getComputedStyle(el);if(cs.display==='none')return;
      if(el!==root){alpha*=parseFloat(cs.opacity);if(alpha<.004)return;if(layers.some(l=>l.sprite&&l.el===el))return}
      const vis=cs.visibility==='visible';
      if(vis){
        const r=local(el.getBoundingClientRect());
        if(r.w&&r.h){
          if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'&&cs.backgroundColor!=='transparent'){items.push({t:'box',...r,c:cs.backgroundColor,a:alpha});grow(r.x,r.y,r.x+r.w,r.y+r.h)}
          for(const [side,bx,by,bw,bh] of [['Top',0,0,1,0],['Bottom',0,1,1,0],['Left',0,0,0,1],['Right',1,0,0,1]]){
            const w=parseFloat(cs[`border${side}Width`]);if(!w||cs[`border${side}Style`]==='none'||cs[`border${side}Color`]==='rgba(0, 0, 0, 0)')continue;
            const b={t:'box',x:r.x+bx*(r.w-w),y:r.y+by*(r.h-w),w:bw?r.w:w,h:bh?r.h:w,c:cs[`border${side}Color`],a:alpha};items.push(b);grow(b.x,b.y,b.x+b.w,b.y+b.h)}
          if(el.tagName==='IMG'){items.push({t:'img',...r,img:el,a:alpha,grey:cs.filter.includes('grayscale'),clip});const c=clip||r;grow(c.x,c.y,c.x+c.w,c.y+c.h)}
          if(el.tagName==='svg'){const vb=el.viewBox.baseVal,d=[...el.querySelectorAll('use,path')].map(n=>(n.tagName==='use'?document.querySelector(n.getAttribute('href')):n)?.getAttribute('d')).filter(Boolean);
            items.push({t:'path',...r,vb:[vb.x,vb.y,vb.width,vb.height],d,c:cs.fill,a:alpha});grow(r.x-r.w*.3,r.y-r.h*.6,r.x+r.w*1.3,r.y+r.h*1.6);return}
        }
      }
      // Cut to nothing (text kept for screen readers only): not drawn.
      if(cs.overflow!=='visible'){clip=local(el.getBoundingClientRect());if(clip.w<=1||clip.h<=1)return}
      for(const n of el.childNodes){
        if(n.nodeType===1){if(!SKIP.has(n.tagName))walk(n,alpha,clip)}
        else if(n.nodeType===3&&vis&&n.data.trim()){
          const size=parseFloat(cs.fontSize),font=`${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`,ls=parseFloat(cs.letterSpacing)||0;
          ctx.font=font;const m=ctx.measureText('x'),asc=m.fontBoundingBoxAscent??size*.8,desc=m.fontBoundingBoxDescent??size*.2,up=cs.textTransform==='uppercase';
          const put=(a,b)=>{range.setStart(n,a);range.setEnd(n,b);const rs=range.getClientRects();if(rs.length!==1||(b-a>1&&ls&&!spacing)){if(b-a>1){for(let i=a;i<b;i++)put(i,i+1)}return}
            const r=local(rs[0]);if(!r.w)return;let s=n.data.slice(a,b);if(up)s=s.toUpperCase();
            items.push({t:'text',s,x:r.x,y:r.y+r.h*asc/(asc+desc),font,ls,c:cs.color,a:alpha});grow(r.x-size*.3,r.y-size*.25,r.x+r.w+size*.3,r.y+r.h+size*.25)};
          const re=/\S+/g;let w;while((w=re.exec(n.data)))put(w.index,w.index+w[0].length);
        }
      }
    })(root,1,null);
    if(far)p.setAttribute('hidden-far','');
    for(const [el,t] of held)el.style.transform=t;
    layer.dirty=false;layer.read=true;
    if(layer.painted){layer.bounds={x:-4,y:-4,w:Math.ceil(layer.box.w)+8,h:Math.ceil(layer.box.h)+layer.extra+8};layer.fill?.()}
    else{layer.items=items;layer.bounds=items.length?{x:Math.floor(x0)-2,y:Math.floor(y0)-2,w:Math.ceil(x1-x0)+4,h:Math.ceil(y1-y0)+4}:null}
    layer.stale=true;
  }

  // ---------- 2. draw into a texture, q texture pixels per chapter pixel ----------
  const most=layer=>maxSize/Math.max(layer.bounds.w,layer.bounds.h);
  function raster(layer,q){
    const b=layer.bounds;if(!b||!layer.items){drop(layer);return 0}
    q=Math.min(q,most(layer));
    const w=Math.max(1,Math.ceil(b.w*q)),h=Math.max(1,Math.ceil(b.h*q));pen.width=w;pen.height=h;
    ctx.setTransform(q,0,0,q,-b.x*q,-b.y*q);ctx.textBaseline='alphabetic';
    for(const it of layer.items){
      ctx.globalAlpha=it.a;
      if(it.t==='box'){ctx.fillStyle=it.c;ctx.fillRect(it.x,it.y,it.w,it.h)}
      else if(it.t==='text'){ctx.font=it.font;if(spacing)ctx.letterSpacing=it.ls+'px';ctx.fillStyle=it.c;ctx.fillText(it.s,it.x,it.y)}
      else if(it.t==='path'){ctx.save();ctx.translate(it.x,it.y);ctx.scale(it.w/it.vb[2],it.h/it.vb[3]);ctx.translate(-it.vb[0],-it.vb[1]);ctx.fillStyle=it.c;for(const d of it.d)ctx.fill(new Path2D(d));ctx.restore()}
      else if(it.t==='img'){const im=it.img;if(!im.complete||!im.naturalWidth){im.addEventListener('load',()=>{layer.dirty=true},{once:true});continue}
        // object-fit: cover, cut to the frame it sits in, and made grey by hand: a 2D canvas
        // has no filter in Safari.
        const c=it.clip||it,cw=Math.max(1,Math.round(c.w*q)),ch=Math.max(1,Math.round(c.h*q)),tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;const tc=tmp.getContext('2d');
        const s=Math.max(it.w/im.naturalWidth,it.h/im.naturalHeight),dw=im.naturalWidth*s,dh=im.naturalHeight*s;
        tc.drawImage(im,(it.x+(it.w-dw)/2-c.x)*q,(it.y+(it.h-dh)/2-c.y)*q,dw*q,dh*q);
        if(it.grey){const px=tc.getImageData(0,0,cw,ch),d=px.data;for(let i=0;i<d.length;i+=4){const g=Math.max(0,Math.min(255,((.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])-128)*1.5+128));d[i]=d[i+1]=d[i+2]=g}tc.putImageData(px,0,0)}
        ctx.drawImage(tmp,c.x,c.y,c.w,c.h)}
    }
    if(spacing)ctx.letterSpacing='0px';
    if(!layer.tex)layer.tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,layer.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,pen);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    if(two){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    layer.q=q;layer.stale=false;redraw=true;return w*h;
  }
  function drop(layer){if(layer.tex){gl.deleteTexture(layer.tex);layer.tex=null}layer.q=0}

  // A sprite moves and scales by itself inside its chapter. Its pose is handed over with
  // set(); a sprite that never was is read from its own style, translate(x,y) and opacity.
  const styled=el=>{const m=/translate(?:3d)?\(\s*(-?[\d.e+-]+)px\s*,\s*(-?[\d.e+-]+)px/.exec(el.style.transform);return {x:m?+m[1]:0,y:m?+m[2]:0,s:1,o:el.style.opacity===''?1:+el.style.opacity}};
  const pose=layer=>layer.sprite?layer.pose||styled(layer.el):null;
  function place(layer){
    const s=states[layer.panel],b=base[layer.panel],B=layer.bounds,p=pose(layer);let lx=B.x,ly=B.y,k=s.k,opacity=s.opacity;
    // A sprite fades by itself, not with its chapter.
    if(p){lx=layer.bx+p.x+B.x*p.s;ly=layer.by+p.y+B.y*p.s;k*=p.s;opacity=p.o}
    return {x:b.x+b.ox+s.tx+s.k*(lx-b.ox),y:b.y+b.oy+s.ty+s.k*(ly-b.oy),k,opacity};
  }

  // ---------- 3. every frame ----------
  function tick(){
    if(lost||!W)return;
    const now=performance.now(),idle=now-moved>170,still=viewport.style.transform===''&&!viewport.getAnimations().length;
    let budget=2.6e6,chosen=null,worst=0;
    for(const layer of layers){
      const s=states[layer.panel];
      if((layer.dirty||!layer.read)&&still&&(!s.far||idle||!layer.read)){if(budget<=0)continue;measure(layer);budget-=3e5}
      if(!layer.bounds||!layer.items)continue;
      const p=pose(layer),cap=most(layer),rest=Math.min(cap,R*layer.rest*dpr*1.15);
      if(s.far){
        // Far away: kept at reading size, ready for when the camera comes; anything larger is let go.
        if(!layer.tex||layer.stale){if(budget>0)budget-=raster(layer,rest)}else if(layer.q>rest*1.3&&idle)raster(layer,rest);
        continue}
      // Wanted: one texture pixel per screen pixel, counting how far the lens can stretch.
      const need=s.k*(p?p.s:1)*dpr*(1+flare*.4);
      // A painted layer that is changing right now is drawn every frame, so only as large
      // as it is seen; once it holds still it is a layer like any other.
      const live=layer.painted&&now-layer.fed<300;
      const want=Math.min(cap,live?Math.max(.15,need*1.25):Math.max(rest,layer.sharp||0,idle?need*1.1:need/3.6));
      if(!layer.tex||layer.stale){budget-=raster(layer,live?want:Math.max(want,layer.q))}
      else if(want>layer.q*1.12&&want/layer.q>worst){worst=want/layer.q;chosen=[layer,want]}
      else if(idle&&!layer.painted&&layer.q>want*2.4&&!chosen)chosen=[layer,want];
    }
    // Drawing a chapter again takes a few milliseconds; at most one per frame.
    if(chosen&&budget>0)raster(chosen[0],chosen[1]);
    if(!redraw)return;redraw=false;
    gl.viewport(0,0,canvas.width,canvas.height);gl.scissor(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1i(loc.tex,0);gl.uniform2f(loc.view,W,H);gl.uniform1f(loc.dpr,canvas.width/W);gl.uniform1f(loc.band,H*band);gl.uniform1f(loc.power,power);gl.uniform2f(loc.flare,flare*amounts[0],flare*amounts[1]);
    for(const layer of layers){
      if(states[layer.panel].far||!layer.tex||!layer.bounds)continue;
      const at=place(layer);if(at.opacity<.004||at.k<=0)continue;
      const top=Math.max(0,at.y),bottom=Math.min(H,at.y+at.k*layer.bounds.h);if(bottom<=top)continue;
      // Only the part of the window the layer can reach is filled: its rows, and its
      // columns pushed out from the centre line as far as the lens can push them.
      const squeezed=layer.funnel&&fun[3]>0,out=x=>[x,W/2+(x-W/2)*(1+flare)],xs=[...out(at.x),...out(at.x+at.k*layer.bounds.w)],left=squeezed?0:Math.max(0,Math.min(...xs)),right=squeezed?W:Math.min(W,Math.max(...xs));if(right<=left)continue;
      const r=canvas.height/H;gl.scissor(Math.floor(left*r),Math.floor((H-bottom)*r),Math.ceil((right-left)*r)+1,Math.ceil((bottom-top)*r)+1);
      gl.bindTexture(gl.TEXTURE_2D,layer.tex);gl.uniform2f(loc.origin,at.x,at.y);gl.uniform2f(loc.size,layer.bounds.w,layer.bounds.h);gl.uniform1f(loc.k,at.k);gl.uniform1f(loc.opacity,at.opacity);
      gl.uniform4f(loc.funnel,fun[0],fun[1],fun[2],squeezed?fun[3]:0);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
  }
  function layout(){
    dpr=Math.min(devicePixelRatio||1,2);W=viewport.clientWidth;H=viewport.clientHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);redraw=true;
    // The chapters are laid out by the width alone. A phone's toolbar changing the height
    // of the window is no reason to read them all again.
    if(W!==seenW){seenW=W;reread()}
  }
  function reread(){for(const l of layers){l.read=false;l.dirty=true}redraw=true}
  // What changed inside a chapter: read that chapter again. The camera's own writes (the
  // transform of a chapter or a sprite) are not changes to what is drawn.
  new MutationObserver(records=>{for(const r of records){
    let n=r.target.nodeType===1?r.target:r.target.parentElement;if(!n||n===canvas)continue;
    const own=layers.find(l=>l.el===n);if(own&&r.type==='attributes')continue;
    let layer=null;for(;n&&n!==viewport;n=n.parentElement){layer=layers.find(l=>l.el===n);if(layer)break}
    if(layer&&!layer.painted){layer.dirty=true;redraw=true}
  }}).observe(viewport,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class']});
  const change=()=>{redraw=true;moved=performance.now()};
  return {
    layout,tick,canvas,reread,
    // The scale a chapter is read at: what every texture is drawn for ahead of time.
    rest(k){if(k!==R){R=k;redraw=true}},
    // rest: the sprite's own scale when it is read, as a share of a chapter's.
    sprite(el,panel,{rest=1,funnel=false}={}){const layer={el,panel,sprite:true,rest,funnel,bx:0,by:0,dirty:true,tex:null,q:0};layers.push(layer);
      return {set(x,y,s=1,o=1){const p=layer.pose||(layer.pose={});if(p.x!==x||p.y!==y||p.s!==s||p.o!==o){p.x=x;p.y=y;p.s=s;p.o=o;change()}},
        // Draw it now for this scale, before the camera gets there.
        sharpen(k){layer.sharp=k*dpr*1.1}}},
    // A layer whose text is handed over: list of {x,y,ch,a} in the element's own pixels,
    // y being the top of the line. extra: how far below the element the text may go.
    paint(el,panel,extra=0){const layer={el,panel,sprite:true,painted:true,rest:1,extra,bx:0,by:0,dirty:true,tex:null,q:0,pose:{x:0,y:0,s:1,o:1},items:[]};layers.push(layer);let list=[];
      layer.fill=()=>{const t=layer.type;if(!t)return;const lead=(t.line-(t.asc+t.desc))/2+t.asc;layer.items=list.filter(g=>g.ch&&g.a>.004).map(g=>({t:'text',s:g.ch,x:g.x,y:g.y+lead,font:t.font,ls:0,c:t.color,a:g.a}));layer.stale=true;redraw=true};
      return {set(next){list=next;layer.fed=performance.now();layer.fill()}}},
    panel(j,tx,ty,k,far,opacity=1){const s=states[j];if(s.tx!==tx||s.ty!==ty||s.k!==k||s.far!==far||s.opacity!==opacity){s.tx=tx;s.ty=ty;s.k=k;s.far=far;s.opacity=opacity;change()}},
    lens(top,foot){if(amounts[0]!==top||amounts[1]!==foot){amounts=[top,foot];redraw=true}},
    funnel(x,y,r,a){if(fun[0]!==x||fun[1]!==y||fun[2]!==r||fun[3]!==a){fun=[x,y,Math.max(1,r),a];redraw=true}},
    touch(){redraw=true},
    get idle(){return performance.now()-moved>170},
  };
}

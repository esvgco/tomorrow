// Edge lens: whatever passes the top and bottom of the window flares out like a bell.
//
// It is a displacement map fixed to the screen, not to the content. For every pixel the map
// says "take your colour from so far to the side": every row is magnified about the centre
// line, more and more toward the edge. A straight column widens into a bell as it leaves.
// Nothing in the page is deformed; the content just moves through the lens.
//
// The lens is two empty strips lying over the page, one along each edge, and the map is their
// backdrop-filter: only what is behind a strip is redrawn. The middle of the window is never
// touched, so it costs nothing and stays exactly as sharp as it was. Each strip has its own
// strength. Where a backdrop-filter cannot take an SVG filter (outside Chromium, today)
// the strips do nothing and the page is simply flat.
const NS='http://www.w3.org/2000/svg';
let count=0;
export function mountLens(before,{band=.27,flare=.6,power=2.2,step=1}={}){
  const id='edge-lens-'+count++,svg=document.createElementNS(NS,'svg');svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  const one=n=>`<filter id="${id}-${n}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  svg.innerHTML=one(0)+one(1);document.body.append(svg);
  const filters=[...svg.children],strips=filters.map((f,n)=>{const s=document.createElement('div');s.className='lens-strip';s.style[n?'bottom':'top']=0;before.before(s);return s});
  let full=0,amounts=[1,1],applied='';
  function layout(){
    const iw=innerWidth,b=Math.round(innerHeight*band),W=256,H=Math.max(32,Math.round(b/2));
    // The offsets are stored in 8 bits, so they come in steps of scale/255. To keep a step
    // near one pixel the largest offset is capped: far from the centre line the
    // magnification levels off into a plain shift.
    const most=1-1/(1+flare),cap=127*step,r=Math.min(iw/2,cap/most*1.02),bent=x=>r*Math.tanh(x/r);full=2*Math.min(cap,bent(iw/2)*most);
    filters.forEach((filter,n)=>{
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H),d=img.data;
      for(let j=0;j<H;j++){
        const t=n?(j+.5)/H:1-(j+.5)/H,e=t**power;
        for(let i=0;i<W;i++){
          const x=(i+.5)/W*iw-iw/2,dx=bent(x)*(1/(1+flare*e)-1),o=(j*W+i)*4;
          d[o]=128+Math.round(255*dx/full);d[o+1]=128;d[o+2]=0;d[o+3]=255;
        }
      }
      ctx.putImageData(img,0,0);const image=filter.firstChild;image.setAttribute('href',canvas.toDataURL());
      for(const el of [filter,image]){el.setAttribute('x',0);el.setAttribute('y',0);el.setAttribute('width',iw);el.setAttribute('height',b)}
      strips[n].style.height=b+'px';
    });
    applied='';set(...amounts);
  }
  // Strength of the top and of the bottom edge: 0 is flat, 1 the full bend.
  function set(top,foot=top){amounts=[top,foot].map(a=>Math.round(Math.max(0,Math.min(1,a))*200)/200);
    const key=amounts.join();if(key===applied)return;applied=key;
    filters.forEach((f,n)=>{f.lastChild.setAttribute('scale',(full*amounts[n]).toFixed(2));strips[n].style.backdropFilter=amounts[n]?`url(#${id}-${n})`:''})}
  addEventListener('resize',layout);layout();
  return {set,layout,strips};
}

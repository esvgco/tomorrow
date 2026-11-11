// Edge lens: whatever passes the top and bottom of the window flares out like a bell.
//
// It is a displacement map fixed to the screen, not to the content. For every pixel the map
// says "take your colour from so far to the side": in the middle of the window that is
// zero; in a band along each edge every row is magnified about the centre line, more and
// more toward the edge. A straight column widens into a bell as it leaves. Nothing in the
// page is deformed; the content just moves through the lens.
//
// The elements are wrapped in one fixed box and the filter is put on that box, so everything
// inside bends as one picture. The two edges are separate passes, so each has its own
// strength.
const NS='http://www.w3.org/2000/svg';
let count=0;
export function mountLens(elements,{band=.27,flare=.6,power=2.2,step=1,soft=.5}={}){
  const id='edge-lens-'+count++,wrap=document.createElement('div');wrap.className='lens';
  elements[0].before(wrap);wrap.append(...elements);
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  // Red is the sideways offset. Blue marks where the lens is: outside it the untouched
  // picture is used, so the middle of the window is not resampled at all.
  svg.innerHTML=`<filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feImage preserveAspectRatio="none" result="top"/><feImage preserveAspectRatio="none" result="foot"/>
<feDisplacementMap in="SourceGraphic" in2="top" xChannelSelector="R" yChannelSelector="G" result="a"/>
<feDisplacementMap in="a" in2="foot" xChannelSelector="R" yChannelSelector="G" result="bent"/>
<feComposite in="top" in2="foot" operator="arithmetic" k2="1" k3="1" result="both"/>
<feColorMatrix in="both" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="where"/>
<feGaussianBlur in="bent" stdDeviation="${soft} 0" result="soft"/>
<feComposite in="soft" in2="where" operator="in" result="edges"/>
<feComposite in="SourceGraphic" in2="where" operator="out" result="middle"/>
<feMerge><feMergeNode in="edges"/><feMergeNode in="middle"/></feMerge></filter>`;
  document.body.append(svg);
  const filter=svg.firstChild,images=[...filter.querySelectorAll('feImage')],bends=[...filter.querySelectorAll('feDisplacementMap')];
  let full=0,amounts=[1,1],applied='';
  function layout(){
    const iw=innerWidth,ih=innerHeight,b=ih*band,W=256,H=Math.max(64,Math.round(ih/2));
    // The offsets are stored in 8 bits, so they come in steps of scale/255. To keep a step
    // near one pixel the largest offset is capped: far from the centre line the
    // magnification levels off into a plain shift.
    const most=1-1/(1+flare),cap=127*step,r=Math.min(iw/2,cap/most*1.02),bent=x=>r*Math.tanh(x/r);full=2*Math.min(cap,bent(iw/2)*most);
    images.forEach((image,n)=>{
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H),d=img.data;
      for(let j=0;j<H;j++){
        const y=(j+.5)/H*ih,t=Math.max(0,1-(n?ih-y:y)/b),e=t**power,inside=Math.min(1,t*12);
        for(let i=0;i<W;i++){
          const x=(i+.5)/W*iw-iw/2,dx=bent(x)*(1/(1+flare*e)-1),o=(j*W+i)*4;
          d[o]=128+Math.round(255*dx/full);d[o+1]=128;d[o+2]=Math.round(255*inside);d[o+3]=255;
        }
      }
      ctx.putImageData(img,0,0);image.setAttribute('href',canvas.toDataURL());
    });
    for(const el of [filter,...images]){el.setAttribute('x',0);el.setAttribute('y',0);el.setAttribute('width',iw);el.setAttribute('height',ih)}
    applied='';set(...amounts);
  }
  // Strength of the top and of the bottom edge: 0 is flat, 1 the full bend.
  function set(top,foot=top){amounts=[top,foot].map(a=>Math.round(Math.max(0,Math.min(1,a))*200)/200);
    const key=amounts.join();if(key===applied)return;applied=key;
    bends.forEach((b,n)=>b.setAttribute('scale',(full*amounts[n]).toFixed(2)));wrap.style.filter=amounts[0]||amounts[1]?`url(#${id})`:''}
  addEventListener('resize',layout);layout();
  return {set,layout,wrap};
}

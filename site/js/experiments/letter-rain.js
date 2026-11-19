// The letter rain (04.15): one paragraph falls apart into a few words and lands as another
// paragraph, and no letter ever changes into another letter.
//
//   A  "We bring together ideas, technology and expertise…"   stays where it is, with holes:
//      the letters that make the words below drop out of it, column by column.
//   W  technologies / companies / products / stories / original ip — one word to a line,
//      under A, made only of letters that came out of A. They hold, readable.
//   B  "New companies, meaningful products…", where the words were. Everything falls into it:
//      the words' letters and what was left of A.
//
// Every letter keeps its glyph the whole way. A letter of B is taken from the nearest falling
// letter that is the same character; A has 102 letters and so has B, but not the same ones:
// the few letters B needs that A does not have come in faintly as it settles, and the few A
// has left over fall on past it and fade.
//
// Why not straight down the columns, as in the Matrix titles: a word of ten letters would need
// the right ten letters in ten adjacent columns of A, which practically never happens. So the
// letters fall as columns do (each column at its own pace, from its own moment) and drift
// sideways on the way to their place. The words are chosen so that A has every letter they
// need (with "experiences" A runs one "c" short; "stories" keeps it whole).
import {clamp,ease,reduced} from './shared.js';
const WORDS=['technologies','companies','products','stories','original ip'];
// A column's own pace: a fixed number in [0,1) for each column.
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};

export function mountRain(host,{paint=null}={}){
  const source=host.querySelector('.accessible-copy'),result=host.querySelector('.fall-result');
  const A=source.textContent.trim().replace(/\s+/g,' '),B=result.textContent.trim().replace(/\s+/g,' ');
  const pen=document.createElement('canvas').getContext('2d');
  let glyphs=[],done=false,cw=14,line=36,rows={a:0,w:0,b:0};

  // Word-wrap to cols, each line centred; [{ch,col,row}] for every letter (spaces skipped).
  function setText(text,cols,row0){
    const lines=[];let cur='';
    for(const w of text.split(' ')){if(cur&&cur.length+1+w.length>cols){lines.push(cur);cur=w}else cur=cur?cur+' '+w:w}
    if(cur)lines.push(cur);
    const out=[];lines.forEach((l,r)=>{const x0=Math.floor((cols-l.length)/2);[...l].forEach((ch,i)=>{if(ch!==' ')out.push({ch,col:x0+i,row:row0+r})})});
    return {out,n:lines.length};
  }
  // The nearest free letter of the same character to (col,row), counted mostly across.
  function take(pool,ch,col,row,used){let best=null,bd=Infinity;
    for(const g of pool){if(used.has(g)||g.ch!==ch)continue;const d=Math.abs(g.c-col)+.35*Math.abs(g.r-row);if(d<bd){bd=d;best=g}}
    if(best)used.add(best);return best}
  // Rarest characters first, so that common ones do not use up what a rare one needed.
  const byRarity=(slots,pool)=>{const n=new Map();for(const g of pool)n.set(g.ch,(n.get(g.ch)||0)+1);return [...slots].sort((a,b)=>(n.get(a.ch)||0)-(n.get(b.ch)||0))};

  function layout(){
    const cs=getComputedStyle(host),size=parseFloat(cs.fontSize);
    pen.font=`${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    cw=pen.measureText('0').width||size*.6;line=parseFloat(cs.lineHeight)||size*1.5;
    const cols=Math.max(16,Math.floor(host.clientWidth/cw));
    const a=setText(A,cols,0);rows.a=a.n;
    const wRow=a.n+1,words=[];WORDS.forEach((w,i)=>{const x0=Math.floor((cols-w.length)/2);[...w].forEach((ch,j)=>{if(ch!==' ')words.push({ch,col:x0+j,row:wRow+i})})});
    rows.w=WORDS.length;
    const b=setText(B,cols,wRow);rows.b=b.n;
    // Every letter of A is a glyph; c, r: where it is now in the plan (columns, rows).
    glyphs.forEach(g=>g.el?.remove());
    glyphs=a.out.map(s=>({ch:s.ch,c:s.col,r:s.row,a:[s.col,s.row],w:null,b:null}));
    // The words take their letters out of A.
    const used=new Set();
    for(const s of byRarity(words,glyphs)){const g=take(glyphs,s.ch,s.col,s.row,used);if(g)g.w=[s.col,s.row]}
    // B takes its letters from where each one is when the second fall begins.
    for(const g of glyphs){if(g.w){g.c=g.w[0];g.r=g.w[1]}}
    const usedB=new Set();
    const late=[];
    for(const s of byRarity(b.out,glyphs)){const g=take(glyphs,s.ch,s.col,s.row,usedB);if(g)g.b=[s.col,s.row];else late.push({ch:s.ch,c:s.col,r:s.row,a:null,w:null,b:[s.col,s.row],late:true})}
    glyphs.push(...late);
    // A column's pace: when it starts and how long it takes.
    for(const g of glyphs){const col=(g.a||g.b)[0];g.d1=hash(col)*.12;g.s1=.17+hash(col+71)*.1;g.d2=hash(col+13)*.13;g.s2=.2+hash(col+29)*.11}
    if(!paint)for(const g of glyphs){g.el=document.createElement('span');g.el.className='glyph';g.el.setAttribute('aria-hidden','true');g.el.textContent=g.ch;host.append(g.el)}
    // In the page, the result sits where its lines land.
    result.style.paddingTop=(b.out[0]?.row||0)*line+'px';
    host.style.setProperty('--rain-h',(wRow+Math.max(WORDS.length,b.n))*line+'px');
    host.classList.add('ready');apply(done?1:0);
  }
  // Moving from p to q over f: across early, down evenly, so it reads as a fall that drifts.
  const along=(p,q,f)=>[p[0]+(q[0]-p[0])*ease(clamp(f*1.5)),p[1]+(q[1]-p[1])*ease(f)];
  const T1=.06,HOLD=.5,T2=.56;
  function apply(t){
    const list=[];
    for(const g of glyphs){let pos,o=1;
      const f1=clamp((t-T1-g.d1)/g.s1),f2=clamp((t-T2-g.d2)/g.s2);
      if(g.late){pos=[g.b[0],g.b[1]-.6*(1-ease(f2))];o=ease(clamp((f2-.45)/.55))*.9+(f2>=1?.1:0)}
      else{
        const mid=g.w||g.a;pos=g.w&&t<T2?along(g.a,g.w,f1):mid;
        if(t>=T2){if(g.b)pos=along(mid,g.b,f2);else{pos=[mid[0],mid[1]+(rows.b+3)*ease(f2)];o=1-ease(clamp(f2*1.3))}}
      }
      list.push({x:pos[0]*cw,y:pos[1]*line,ch:g.ch,a:o});
      if(g.el){g.el.style.transform=`translate(${(pos[0]*cw).toFixed(1)}px,${(pos[1]*line).toFixed(1)}px)`;g.el.style.opacity=o.toFixed(3)}}
    if(paint)paint(list);
    if(t>=.999)done=true;
    if(!paint){const end=t>=.999;glyphs.forEach(g=>g.el.style.visibility=end?'hidden':'');result.style.opacity=end?1:0}
  }
  if(!reduced){layout();document.fonts.ready.then(layout);addEventListener('resize',layout)}
  const run=t=>{if(!done)apply(clamp(t))};
  // The type has changed (wall-tune.js): measure again, and play again from the start.
  run.reset=()=>{if(reduced)return;done=false;layout()};
  return run;
}

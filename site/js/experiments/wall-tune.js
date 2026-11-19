// Study 04.15: a panel for tuning the type and the place of every screen.
//
// Type. Two roles: headings (the page's --sans) and text (its --mono). For each: the face,
// the weight, the face's own extra axis (Areal's MONO, Pressura's mono cut, the width of
// Pressura and Publisher) and the letter spacing.
//
// The wall is drawn into WebGL from a 2D canvas, and a canvas takes a font only by its name,
// weight and style: font-variation-settings set in CSS never reaches it. So every setting is
// a new @font-face of its own, with the axes fixed in its descriptors, and the page is told
// to use that name. Canvas and CSS then draw exactly the same thing.
//
// Screens. Each screen (and the hole with what comes out of it, and About) can be made
// larger or smaller and moved across and up or down from the point it is placed at.
//
// Everything is kept in this browser (localStorage) and can be copied out as JSON.
const KEY='wall-menu-tune-v1';
const F='assets/fonts/';
export const FONTS={
  areal:{name:'ABC Areal',src:F+'areal/ABCArealSuperfamilyVariable.woff2',w:[400,700],mono:[0,100]},
  pressura:{name:'GT Pressura',src:F+'pressura/GT-Pressura-VF-Trial.woff2',monoSrc:F+'pressura/GT-Pressura-Mono-VF-Trial.woff2',w:[300,900],wd:[100,125],monoCut:true},
  'publisher-sans':{name:'Publisher Rounded Sans',src:F+'publisher/ABCPublisherRoundedSansWidthsVariableTrial.woff2',w:[200,900],wd:[75,100]},
  'publisher-slab':{name:'Publisher Rounded Slab',src:F+'publisher/ABCPublisherRoundedSlabWidthsVariableTrial.woff2',w:[200,900],wd:[75,100]},
  'publisher-mix':{name:'Publisher Rounded Mix',src:F+'publisher/ABCPublisherRoundedMixWidthsVariableTrial.woff2',w:[200,900],wd:[75,100]},
  'grow-a':{name:'Grow A',src:F+'grow/ABCGrowTrial-A.woff2'},
  'grow-ab':{name:'Grow AB',src:F+'grow/ABCGrowTrial-AB.woff2'},
};
const ROLES={head:'Заголовки',text:'Текст'};
// Elisey's settings of 19 Nov, as the starting point.
const DEFAULT={
  head:{font:'pressura',w:300,mono:100,wd:100,ls:-.04},
  text:{font:'areal',w:400,mono:100,wd:100,ls:0},
  screens:{0:{s:1.75,x:0,y:-372},1:{s:1.55,x:0,y:0},2:{s:1.55,x:0,y:0},3:{s:1,x:0,y:0},4:{s:1,x:0,y:-162}},
};
const clone=o=>JSON.parse(JSON.stringify(o));
const load=()=>{try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.head&&s.text)return {...clone(DEFAULT),...s,screens:s.screens||{}}}catch{}return clone(DEFAULT)};
const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};

// screens: [{id, name}]; show(id): bring that screen into view.
// onType(): the type has changed and its fonts are loaded. onScreen(): a screen moved.
export function mountTune({screens,show=()=>{},onType=()=>{},onScreen=()=>{}}){
  let state=load(),serial=0;
  const style=document.createElement('style');document.head.append(style);
  const fallback={head:"Arial,sans-serif",text:"Courier,monospace"};
  const HEAD=':is(h1,h2,h3,strong,.big-link,.burrow-link,.lead,.about-lead,.wordmark)';
  const TEXT=':is(p,.mono,.eyebrow,span,a,dt,dd,button,li,small)';

  // One @font-face for one setting of one role.
  function face(role,v,fam){
    const f=FONTS[v.font]||FONTS.areal,axes=[];let src=f.src;
    if(f.mono)axes.push(`'MONO' ${v.mono}`);
    if(f.monoCut&&v.mono>=50)src=f.monoSrc;
    else if(f.wd)axes.push(`'wdth' ${v.wd}`);
    const weight=f.w?`font-weight:${f.w[0]} ${f.w[1]};`:'';
    return `@font-face{font-family:'${fam}';src:url('${src}') format('woff2');${weight}font-style:normal;font-display:block;${axes.length?`font-variation-settings:${axes.join(',')};`:''}}`;
  }
  const weightOf=v=>{const f=FONTS[v.font]||FONTS.areal;return f.w?Math.max(f.w[0],Math.min(f.w[1],v.w)):400};
  async function applyType(){
    const n=++serial,fam={head:`tune-head-${n}`,text:`tune-text-${n}`},{head,text}=state;
    style.textContent=face('head',head,fam.head)+face('text',text,fam.text)+`
.wall-page.tune{--sans:'${fam.head}',${fallback.head};--mono:'${fam.text}',${fallback.text}}
.wall-page.tune ${TEXT}:not(.tune-panel *,.cookie-bar *){font-weight:${weightOf(text)};letter-spacing:${text.ls}em}
.wall-page.tune ${HEAD}:not(.tune-panel *,.cookie-bar *){font-family:var(--sans)!important;font-weight:${weightOf(head)}!important;letter-spacing:${head.ls}em!important}
.wall-page.tune h2 em{font-family:var(--sans)}`;
    try{await Promise.all([document.fonts.load(`${weightOf(head)} 40px '${fam.head}'`,'Tomorrow'),document.fonts.load(`${weightOf(text)} 20px '${fam.text}'`,'Tomorrow')])}catch{}
    if(n===serial)onType();
  }
  document.body.classList.add('tune');

  // ---------- the panel ----------
  const panel=document.createElement('details');panel.className='tune-panel';panel.open=innerWidth>900;
  const opts=Object.entries(FONTS).map(([k,f])=>`<option value="${k}">${f.name}</option>`).join('');
  const role=r=>`<fieldset data-role="${r}"><legend>${ROLES[r]}</legend>
    <label>Шрифт<select data-k="font">${opts}</select></label>
    <label data-only="w">Жирность <output></output><input type="range" data-k="w" step="1"></label>
    <label data-only="mono">Mono <output></output><input type="range" data-k="mono" min="0" max="100" step="1"></label>
    <label data-only="cut" class="check"><input type="checkbox" data-k="cut"> Mono (отдельное начертание)</label>
    <label data-only="wd">Ширина <output></output><input type="range" data-k="wd" step="1"></label>
    <label>Межбуквенный <output></output><input type="range" data-k="ls" min="-.12" max=".2" step=".001"></label></fieldset>`;
  panel.innerHTML=`<summary>Шрифты и экраны</summary>${role('head')}${role('text')}
    <fieldset data-screen><legend>Экран</legend>
    <label>Какой<select data-k="screen">${screens.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
    <label>Размер <output></output><input type="range" data-k="s" min=".3" max="2.5" step=".01"></label>
    <label>По ширине <output></output><input type="range" data-k="x" min="-800" max="800" step="1"></label>
    <label>По высоте <output></output><input type="range" data-k="y" min="-800" max="800" step="1"></label>
    <div class="tune-row"><button data-act="show">Показать</button><button data-act="screen-reset">Сбросить экран</button></div></fieldset>
    <div class="tune-row"><button data-act="copy">Скопировать настройки</button><button data-act="reset">Сбросить всё</button></div>
    <small>Настройки хранятся в этом браузере. Размер и сдвиг считаются от базовой точки экрана, в его собственных пикселях.</small>`;
  document.body.append(panel);
  // Nothing in the panel is the wall's: no scroll, click or key from it reaches the page.
  for(const t of ['wheel','touchstart','touchmove','pointerdown','click','keydown'])panel.addEventListener(t,e=>e.stopPropagation(),{passive:true});

  const fmt=(k,v)=>k==='ls'?(+v).toFixed(3)+' em':k==='s'?(+v).toFixed(2)+'×':k==='x'||k==='y'?Math.round(v)+' px':String(Math.round(v));
  function syncRole(r){
    const box=panel.querySelector(`[data-role="${r}"]`),v=state[r],f=FONTS[v.font]||FONTS.areal;
    const show=(what,on)=>box.querySelector(`[data-only="${what}"]`).hidden=!on;
    show('w',!!f.w);show('mono',!!f.mono);show('cut',!!f.monoCut);show('wd',!!f.wd&&!(f.monoCut&&v.mono>=50));
    box.querySelector('[data-k="font"]').value=v.font;
    const w=box.querySelector('[data-k="w"]');if(f.w){w.min=f.w[0];w.max=f.w[1];w.value=weightOf(v)}
    const wd=box.querySelector('[data-k="wd"]');if(f.wd){wd.min=f.wd[0];wd.max=f.wd[1];wd.value=Math.max(f.wd[0],Math.min(f.wd[1],v.wd))}
    box.querySelector('[data-k="mono"]').value=v.mono;box.querySelector('[data-k="cut"]').checked=v.mono>=50;
    box.querySelector('[data-k="ls"]').value=v.ls;
    box.querySelectorAll('input[type=range]').forEach(i=>{const o=i.previousElementSibling;if(o)o.value=fmt(i.dataset.k,i.value)});
  }
  for(const r of Object.keys(ROLES)){
    const box=panel.querySelector(`[data-role="${r}"]`);
    box.addEventListener('input',e=>{const k=e.target.dataset.k,v=state[r];if(!k)return;
      if(k==='font'){v.font=e.target.value;const f=FONTS[v.font];if(f.w)v.w=Math.max(f.w[0],Math.min(f.w[1],v.w));if(f.wd)v.wd=Math.max(f.wd[0],Math.min(f.wd[1],v.wd));if(f.monoCut)v.mono=v.mono>=50?100:0}
      else if(k==='cut')v.mono=e.target.checked?100:0;
      else v[k]=+e.target.value;
      syncRole(r);save(state);applyType()});
  }
  // Screens.
  const sbox=panel.querySelector('[data-screen]'),pick=sbox.querySelector('[data-k="screen"]');
  const of=id=>state.screens[id]||{s:1,x:0,y:0};
  function syncScreen(){const a=of(pick.value);for(const k of ['s','x','y']){const i=sbox.querySelector(`[data-k="${k}"]`);i.value=a[k];i.previousElementSibling.value=fmt(k,a[k])}}
  pick.addEventListener('change',()=>{syncScreen();show(pick.value)});
  sbox.addEventListener('input',e=>{const k=e.target.dataset.k;if(!k||k==='screen')return;const a={...of(pick.value)};a[k]=+e.target.value;state.screens[pick.value]=a;e.target.previousElementSibling.value=fmt(k,a[k]);save(state);onScreen()});
  panel.addEventListener('click',e=>{const act=e.target.dataset?.act;if(!act)return;
    if(act==='show')show(pick.value);
    if(act==='screen-reset'){delete state.screens[pick.value];save(state);syncScreen();onScreen()}
    if(act==='reset'){state=clone(DEFAULT);save(state);Object.keys(ROLES).forEach(syncRole);syncScreen();applyType();onScreen()}
    if(act==='copy'){const t=JSON.stringify(state,null,1);navigator.clipboard?.writeText(t).then(()=>{e.target.textContent='Скопировано';setTimeout(()=>e.target.textContent='Скопировать настройки',1400)},()=>prompt('Настройки',t))}});
  Object.keys(ROLES).forEach(syncRole);syncScreen();applyType();

  return {
    // How screen `id` is adjusted: s, its size; x and y, its shift in its own pixels.
    screen:id=>of(String(id)),
    panel,
  };
}

// A consent bar for cookies and personal data: on the foot of the window, at the left, open
// at the bottom. The answer is kept in this browser; ?cookies shows the bar again.
const KEY='tomorrow-consent-v1';
export function mountCookieBar(){
  let seen=null;try{seen=localStorage.getItem(KEY)}catch{}
  if(seen&&!new URLSearchParams(location.search).has('cookies'))return null;
  const bar=document.createElement('section');bar.className='cookie-bar';bar.setAttribute('role','region');bar.setAttribute('aria-label','Cookies and personal data');
  bar.innerHTML=`<p>We use cookies and process personal data to run this site and to understand how it is used. By choosing Accept, you agree to the use of cookies and to the processing of your personal data.</p><div class="cookie-actions"><button data-consent="accepted">Accept</button><button data-consent="declined">Decline</button></div>`;
  // Nothing on the bar reaches the page under it.
  for(const t of ['wheel','touchstart','touchmove','pointerdown','click'])bar.addEventListener(t,e=>e.stopPropagation(),{passive:true});
  bar.addEventListener('click',e=>{const v=e.target.dataset?.consent;if(!v)return;try{localStorage.setItem(KEY,v)}catch{}bar.classList.add('gone');root.style.removeProperty('--consent-h');setTimeout(()=>bar.remove(),400)});
  document.body.append(bar);
  // While it is there, what else sits on the foot of the window stands on it (--consent-h).
  const root=document.documentElement,keep=()=>root.style.setProperty('--consent-h',bar.offsetHeight+'px');keep();
  if('ResizeObserver' in window)new ResizeObserver(keep).observe(bar);
  return bar;
}

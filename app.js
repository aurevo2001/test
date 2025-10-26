/* ======================================================================
   app.js  — FATISM 前端行為（完整版）
   - 主題切換（含系統偏好偵測、持久化）
   - Header 遮罩陰影 & 自動隱藏/顯示（向下捲隱藏、向上顯示）
   - Drawer（手機側欄）＋焦點圈（Focus Trap）＋ESC 關閉
   - Smooth Scroll（含 #hash 導航 & 退回 fallback）
   - Scroll Reveal（進場動畫）＋一次顯示/重複顯示選項
   - Lazyload 圖片/影片（IntersectionObserver）
   - Emoji 動態背景（節流 & 安全移除）
   - Hero 簽名「出場動畫」：CSS 遮罩 6s 書寫完 → 0.6s 淡出 → 移除節點
   - 簽名「內嵌 SVG」描邊動畫（如果有 .sig-stroke path）
   - 展覽 Timeline：可折疊（可選）
   - 商品頁：簡易篩選（可選）
   - Contact 表單：前端驗證（可選）
   - 年份自動更新
   - 無障礙：Skip link、Tab 焦點環、鍵盤導覽小強化
   - 偏好「減少動效」支援（prefers-reduced-motion）
   備註：檔案內任何 DOM 查找都做了存在檢查，缺少區塊不會噴錯。
====================================================================== */

/* ===================== 基礎工具區 ===================== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const raf = (fn) => (window.requestAnimationFrame||setTimeout)(fn, 16);
const caf = (id) => (window.cancelAnimationFrame||clearTimeout)(id);

const throttle = (fn, wait=100) => {
  let t = 0, pending=false, lastArgs=null;
  return function throttled(...args){
    const now = Date.now();
    lastArgs = args;
    if(now - t >= wait){
      t = now; fn.apply(this,args); pending=false;
    } else if(!pending){
      pending = true;
      setTimeout(()=>{ t=Date.now(); fn.apply(this,lastArgs); pending=false; }, wait-(now-t));
    }
  };
};

const debounce = (fn, wait=200) => {
  let timer=null;
  return function debounced(...args){
    clearTimeout(timer); timer=setTimeout(()=>fn.apply(this,args), wait);
  }
};

const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 可控事件中心（小型 Emitter） */
const Emitter = (() => {
  const map = new Map();
  return {
    on(evt, handler){
      if(!map.has(evt)) map.set(evt, new Set());
      map.get(evt).add(handler);
      return () => map.get(evt).delete(handler);
    },
    emit(evt, payload){
      const set = map.get(evt);
      if(set) set.forEach(h=>h(payload));
    }
  }
})();

/* ===================== 主題切換 ===================== */
const htmlEl     = document.documentElement;
const themeBtn   = $('#themeBtn');
const themeIcon  = $('#themeIcon');
const THEME_KEY  = 'theme';

function applyThemeIcon(){
  if(!themeIcon) return;
  themeIcon.textContent = htmlEl.dataset.theme === 'dark' ? '🌙' : '🌞';
}
function setTheme(theme){
  htmlEl.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyThemeIcon();
  Emitter.emit('theme:change', theme);
}
function initTheme(){
  const saved   = localStorage.getItem(THEME_KEY);
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved){ htmlEl.dataset.theme = saved; }
  else { htmlEl.dataset.theme = systemDark ? 'dark' : 'light'; }
  applyThemeIcon();
}
initTheme();

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = htmlEl.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
  // 當系統偏好改變時自動同步（若沒有使用者手動覆蓋）
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e=>{
      const userSet = localStorage.getItem(THEME_KEY);
      if(!userSet){ setTheme(e.matches?'dark':'light'); }
    });
  }
}

/* ===================== Header 行為 ===================== */
const headerWrap = $('.header-wrap');
let lastY = window.scrollY;
const onScrollHeader = throttle(()=>{
  const y = window.scrollY;
  // 陰影：滾動 >10px 顯示
  if(headerWrap){
    headerWrap.style.boxShadow = y>10 ? 'var(--shadow-sm)' : 'none';
    headerWrap.style.borderBottomColor = y>10 ? 'color-mix(in oklab,var(--line) 86%,transparent)' : 'transparent';
  }
  // 自動隱藏/顯示（向下捲隱藏、向上顯示）
  if(headerWrap){
    if(y > lastY && y > 120) headerWrap.style.transform = 'translateY(-100%)';
    else headerWrap.style.transform = 'translateY(0)';
  }
  lastY = y;
}, 80);
window.addEventListener('scroll', onScrollHeader, {passive:true});

/* ===================== Drawer (手機側欄) ===================== */
const menuBtn  = $('#menuBtn');
const drawer   = $('#drawer');
const overlay  = $('#overlay');

const FocusTrap = {
  stack: [],
  trap(container){
    if(!container) return;
    const FOCUSABLE = 'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const els = $$(FOCUSABLE, container).filter(el=>!el.hasAttribute('disabled'));
    if(!els.length) return;
    const first = els[0], last = els[els.length-1];

    function loop(e){
      if(e.key !== 'Tab') return;
      if(e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
      else if(!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
    }
    container.addEventListener('keydown', loop);
    this.stack.push({container, loop});
    first.focus();
  },
  release(container){
    const item = this.stack.find(i=>i.container===container);
    if(!item) return;
    item.container.removeEventListener('keydown', item.loop);
    this.stack = this.stack.filter(i=>i!==item);
  }
};

function openDrawer(){
  if(!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  FocusTrap.trap(drawer);
}
function closeDrawer(){
  if(!drawer) return;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  FocusTrap.release(drawer);
}
if(menuBtn && drawer && overlay){
  menuBtn.addEventListener('click', ()=> drawer.classList.toggle('open') ? openDrawer():closeDrawer());
  overlay.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (e)=>{ if(e.target.matches('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && drawer.classList.contains('open')) closeDrawer(); });
}

/* ===================== Smooth Scroll（含 hash） ===================== */
function smoothToHash(targetEl){
  if(!targetEl) return;
  const top = targetEl.getBoundingClientRect().top + window.pageYOffset - 76; // 預留 header
  if('scrollBehavior' in document.documentElement.style){
    window.scrollTo({ top, behavior:'smooth' });
  }else{
    // fallback
    const start = window.pageYOffset; const dist = top - start; const dur=400;
    let startTime=null;
    function step(ts){
      if(!startTime) startTime=ts;
      const p = Math.min(1, (ts-startTime)/dur);
      const ease = p<.5 ? 2*p*p : -1+(4-2*p)*p;
      window.scrollTo(0, start + dist*ease);
      if(p<1) raf(step);
    }
    raf(step);
  }
}
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href');
  if(id.length<=1) return;
  const target = $(id);
  if(target){
    e.preventDefault();
    smoothToHash(target);
    history.pushState(null,'',id);
  }
});
window.addEventListener('load', ()=>{
  if(location.hash){
    const t = $(location.hash);
    if(t) smoothToHash(t);
  }
});

/* ===================== Scroll Reveal（進場動畫顯示） ===================== */
const reveals = $$('.reveal');
const revealOnce = true; // 若要重複顯示，改為 false
let revealObs=null;
if('IntersectionObserver' in window){
  revealObs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('show');
        if(revealOnce) revealObs.unobserve(entry.target);
      }else if(!revealOnce){
        entry.target.classList.remove('show');
      }
    });
  }, { root:null, rootMargin:'0px 0px -10% 0px', threshold:0.1 });
  reveals.forEach(el=>revealObs.observe(el));
}else{
  // fallback
  const run = ()=>{
    const trigger = window.innerHeight*0.9;
    reveals.forEach(el=>{
      const top = el.getBoundingClientRect().top;
      if(top<trigger) el.classList.add('show');
      else if(!revealOnce) el.classList.remove('show');
    });
  };
  window.addEventListener('scroll', throttle(run,100));
  window.addEventListener('load', run);
}

/* ===================== Lazyload Media ===================== */
const lazyMedias = $$('img[data-src], video[data-src]');
if('IntersectionObserver' in window){
  const lazyObs = new IntersectionObserver((entries,obs)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const m = en.target;
        const src = m.getAttribute('data-src');
        if(src){ m.setAttribute('src',src); m.removeAttribute('data-src'); }
        if(m.tagName==='VIDEO'){
          const ps = m.getAttribute('data-poster'); if(ps) { m.poster = ps; m.removeAttribute('data-poster'); }
        }
        obs.unobserve(m);
      }
    });
  }, {root:null,threshold:.02,rootMargin:'120px 0px'});
  lazyMedias.forEach(m=>lazyObs.observe(m));
}

/* ===================== Emoji 動態背景 ===================== */
(function initEmojiFloat(){
  const EMOJI_CLASS = 'float-emoji';
  const style = document.createElement('style');
  style.textContent = `
    .${EMOJI_CLASS}{
      position: fixed;
      bottom: -40px;
      will-change: transform, opacity;
      animation: emojiRise var(--dur,6s) linear forwards;
      z-index: 0;
      pointer-events: none;
      user-select:none;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.12));
    }
    @keyframes emojiRise{
      0% { transform: translateY(0) translateX(0) rotate(0deg); opacity:.05; }
      10%{ opacity:.4; }
      100%{ transform: translateY(-120vh) translateX(var(--dx, 0)) rotate(var(--rot, 0deg)); opacity:0; }
    }
  `;
  document.head.appendChild(style);

  if(prefersReduced) return; // 使用者偏好減少動效時停用

  const emojis = ['🌸','🍃','💫','🌈','⭐','✨','🍑','🐾'];
  let timer=null;
  function spawn(){
    const el = document.createElement('div');
    el.className = EMOJI_CLASS;
    el.textContent = emojis[(Math.random()*emojis.length)|0];
    const size = 16 + Math.random()*28;
    const left = Math.random()*100; // vw
    const dur  = 5.5 + Math.random()*3.2;
    const drift= (Math.random()>.5?1:-1)*(10+Math.random()*60); // X 位移
    const rot  = (Math.random()>.5?1:-1)*(20+Math.random()*120);
    el.style.left = left+'vw';
    el.style.fontSize = size+'px';
    el.style.setProperty('--dur', dur+'s');
    el.style.setProperty('--dx', drift+'px');
    el.style.setProperty('--rot', rot+'deg');
    document.body.appendChild(el);
    setTimeout(()=> el.remove(), (dur*1000)+120);
  }
  function loop(){ spawn(); timer = setTimeout(loop, 1100 + (Math.random()*700|0)); }
  loop();

  // 頁面隱藏時暫停產生，節能
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ clearTimeout(timer); timer=null; }
    else if(!timer){ loop(); }
  });
})();

/* ===================== 年份自動更新 ===================== */
const yEl = $('#y'); if(yEl) yEl.textContent = new Date().getFullYear();

/* ===================== 簽名「出場動畫」（Hero 上層，不占版面） ===================== */
/*
  對應 CSS：
  .hero { position:relative }
  <div class="sig-overlay" aria-hidden="true">
    <img class="sig-overlay__img" src="images/signature.svg" alt="">
  </div>
  CSS 會用 mask 6s 從左到右掃出，這裡 6.7s 後移除節點，避免阻擋互動
*/
(function initSigOverlay(){
  const overlay = $('.sig-overlay');
  if(!overlay) return;
  if(prefersReduced){ overlay.remove(); return; } // 尊重使用者偏好
  // 6s 書寫 + 0.6s 淡出 + buffer
  setTimeout(()=>overlay.remove(), 6700);
})();

/* ===================== 內嵌 SVG 簽名：描邊書寫動畫（若有 .sig-stroke） ===================== */
/*
  若在 HTML 內嵌 <svg class="sig-svg"><path class="sig-stroke" .../>…</svg>
  這段會動態測量 path 長度，設定 stroke-dasharray/offset，使其 6s 從 100% → 0%
  注意：若你的 CSS 已用 .sig-stroke { animation: write 6s ... }，此段會補齊未設的長度。
*/
(function initInlineSig(){
  const paths = $$('.sig-stroke');
  if(!paths.length) return;
  paths.forEach(p=>{
    try{
      const len = Math.ceil(p.getTotalLength());
      p.style.strokeDasharray = p.style.strokeDasharray || (len+' '+len);
      p.style.strokeDashoffset = p.style.strokeDashoffset || String(len);
      // 若沒有動畫屬性，補上一個
      const hasAnim = (p.style.animation && p.style.animation.includes('write')) || window.getComputedStyle(p).animationName !== 'none';
      if(!hasAnim && !prefersReduced){
        p.style.animation = 'write 6s ease-in-out forwards';
      }
    }catch(e){
      // 某些環境 getTotalLength 可能失敗，忽略
    }
  });
})();

/* ===================== 展覽 Timeline：可折疊（可選） ===================== */
(function initTimeline(){
  const items = $$('.timeline .tl-item');
  if(!items.length) return;
  items.forEach((it)=>{
    const head = $('.tl-head', it);
    const body = $('.tl-body', it);
    if(!head || !body) return;
    head.setAttribute('tabindex','0');
    head.style.cursor='pointer';
    head.addEventListener('click',()=> it.classList.toggle('open'));
    head.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); it.classList.toggle('open'); }});
  });
})();

/* ===================== 商品頁：簡易篩選（可選） ===================== */
/*
  HTML 例：
  <div class="filters" data-scope="products">
    <button data-filter="all" class="is-active">全部</button>
    <button data-filter="sticker">貼紙</button>
    …
  </div>
  <div class="grid-3" id="productGrid">…每張卡加 data-tags="sticker,bag"…</div>
*/
(function initProductFilters(){
  const scope = $('[data-scope="products"]');
  const grid  = $('#productGrid');
  if(!scope || !grid) return;
  const cards = $$('.card, .product-card', grid);

  function applyFilter(tag){
    cards.forEach(c=>{
      const tags = (c.getAttribute('data-tags')||'').split(',').map(s=>s.trim());
      const show = (tag==='all') || tags.includes(tag);
      c.style.display = show ? '' : 'none';
    });
  }
  scope.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-filter]'); if(!btn) return;
    e.preventDefault();
    const tag = btn.getAttribute('data-filter');
    $$('.is-active', scope).forEach(b=>b.classList.remove('is-active'));
    btn.classList.add('is-active');
    applyFilter(tag);
  });
})();

/* ===================== Contact 表單：前端驗證（可選） ===================== */
/*
  HTML 例：
  <form id="contactForm">
    <input name="name"   required class="input">
    <input name="email"  type="email" required class="input">
    <textarea name="msg" required class="input textarea"></textarea>
    <button type="submit" class="btn">送出</button>
  </form>
*/
(function initContactForm(){
  const form = $('#contactForm');
  if(!form) return;
  const tip  = document.createElement('div');
  tip.setAttribute('role','alert');
  tip.style.marginTop='10px';
  tip.style.fontSize='14px';
  form.appendChild(tip);

  function showTip(msg, ok=false){
    tip.textContent = msg;
    tip.style.color = ok ? 'green' : 'crimson';
  }
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const name  = (fd.get('name')||'').toString().trim();
    const email = (fd.get('email')||'').toString().trim();
    const msg   = (fd.get('msg')||'').toString().trim();
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if(!name || !email || !msg){ showTip('請完整填寫所有欄位'); return; }
    if(!emailOK){ showTip('Email 格式不正確'); return; }

    // demo：僅前端驗證與成功提示（如需串接後端，改成 fetch 到你的 API）
    showTip('已收到表單，感謝你的訊息！', true);
    form.reset();
  });
})();

/* ===================== Skip Link / 鍵盤導覽小強化 ===================== */
(function initA11y(){
  // Skip to content: <a href="#main" class="skip-link">Skip to content</a>
  const main = $('#main');
  if(main){
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Tab' && location.hash==='#main'){
        main.setAttribute('tabindex','-1');
        main.focus();
      }
    });
  }
  // :focus-visible polyfill-like（僅添加 class）
  document.body.addEventListener('keydown', ()=> document.documentElement.classList.add('using-kb'), {once:true});
})();

/* ===================== Resize 調節（可選） ===================== */
(function initResizeTweaks(){
  const onResize = debounce(()=> Emitter.emit('layout:resize', {w:window.innerWidth,h:window.innerHeight}), 150);
  window.addEventListener('resize', onResize);
})();

/* ===================== Parallax（可選，Hero 圖輕微視差） ===================== */
(function initParallax(){
  const heroShot = $('.hero-shot img');
  if(!heroShot || prefersReduced) return;
  let rAF = null;
  const onScroll = ()=>{
    const rect = heroShot.getBoundingClientRect();
    const mid  = window.innerHeight/2;
    const delta= (rect.top + rect.height/2 - mid)/mid; // -1~1
    heroShot.style.transform = `translateY(${delta*10}px)`;
  };
  const loop = throttle(()=>{ caf(rAF); rAF = raf(onScroll); }, 20);
  window.addEventListener('scroll', loop, {passive:true});
  window.addEventListener('load', onScroll);
})();

/* ===================== Hash 變動時輕微偏移修正 ===================== */
window.addEventListener('hashchange', ()=>{
  const el = $(location.hash);
  if(!el) return;
  setTimeout(()=>{ // 等瀏覽器自動捲動完成，再修正 header 高度
    const top = el.getBoundingClientRect().top + window.pageYOffset - 76;
    window.scrollTo({ top, behavior:'smooth' });
  }, 60);
});

/* ===================== Page 專屬 Hook（若有需要可擴充） ===================== */
Emitter.on('theme:change', (t)=>{
  // 若需要在主題切換時做額外調整（例如替換圖檔）
  // console.log('theme->', t);
});

/* ======================================================================
   結束：所有功能皆做了存在檢查；即使某頁缺少對應 DOM，也不會報錯。
   若你還有自家的客製段落，可把程式碼貼到這行下方，確保在最後執行。
====================================================================== */

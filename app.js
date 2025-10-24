// REPLACE START: app.js 全站互動（主題切換／抽屜選單／進場動畫）
document.documentElement.classList.remove('no-js');const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);
const themeBtn=$("#themeBtn"),themeIcon=$("#themeIcon"),menuBtn=$("#menuBtn"),drawer=$("#drawer"),overlay=$("#overlay");
(function initTheme(){const saved=localStorage.getItem("theme");if(saved){document.documentElement.setAttribute("data-theme",saved);if(themeIcon)themeIcon.textContent=saved==="dark"?"🌙":"🌞"}else{const prefers=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",prefers?"dark":"light");if(themeIcon)themeIcon.textContent=prefers?"🌙":"🌞"}})();
if(themeBtn){themeBtn.addEventListener("click",()=>{const cur=document.documentElement.getAttribute("data-theme");const nxt=cur==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",nxt);localStorage.setItem("theme",nxt);if(themeIcon)themeIcon.textContent=nxt==="dark"?"🌙":"🌞"})}
if(menuBtn&&drawer&&overlay){menuBtn.addEventListener("click",()=>{drawer.classList.add("open");drawer.setAttribute("aria-hidden","false")});overlay.addEventListener("click",()=>{drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true")});drawer.querySelectorAll("[data-close]").forEach(a=>a.addEventListener("click",()=>{drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true")}))}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("show");io.unobserve(e.target)}}),{threshold:.12});$$(".reveal").forEach(el=>io.observe(el));
const yEl=$("#y");if(yEl){yEl.textContent=new Date().getFullYear()}
// REPLACE END: app.js 全站互動

/* REPLACE START: app.js（FATISM 主腳本｜主題切換／抽屜／Reveal／簽名清理） */
(() => {
  'use strict';

  /** 小工具 **/
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  /** 年份自動更新 **/
  const y = $('#y');
  if (y) y.textContent = String(new Date().getFullYear());

  /** 主題切換（localStorage + 系統偏好） **/
  const THEME_KEY = 'fatism-theme';
  const themeBtn = $('#themeBtn');
  const themeIcon = $('#themeIcon');

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const getSavedTheme = () => localStorage.getItem(THEME_KEY);
  const setThemeAttr = (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    if (themeIcon) themeIcon.textContent = mode === 'dark' ? '🌙' : '🌞';
  };
  const initTheme = () => {
    const saved = getSavedTheme();
    if (saved === 'light' || saved === 'dark') {
      setThemeAttr(saved);
    } else {
      const mode = systemDark.matches ? 'dark' : 'light';
      setThemeAttr(mode);
    }
  };
  initTheme();
  systemDark.addEventListener?.('change', e => {
    if (!getSavedTheme()) setThemeAttr(e.matches ? 'dark' : 'light');
  });
  themeBtn?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    setThemeAttr(next);
  });

  /** Drawer（側邊選單） **/
  const drawer = $('#drawer');
  const menuBtn = $('#menuBtn');
  const overlay = $('#overlay');
  const openDrawer = () => drawer?.classList.add('open');
  const closeDrawer = () => drawer?.classList.remove('open');

  menuBtn?.addEventListener('click', openDrawer);
  overlay?.addEventListener('click', closeDrawer);
  $$('#drawer [data-close]').forEach(a => a.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
  });

  /** Reveal 進場動畫（IntersectionObserver） **/
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          obs.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08});
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    // 低動畫裝置直接顯示
    $$('.reveal').forEach(el => el.classList.add('show'));
  }

  /** 簽名出場動畫：完成後從 DOM 移除，避免殘留（可省略，純優化） **/
  const sigOverlay = $('.sig-overlay');
  if (sigOverlay) {
    const cleanup = () => sigOverlay.remove();
    // 6s 繪製 + 0.6s 淡出 ≈ 6.6s，這裡保守抓 7s
    const timer = setTimeout(cleanup, 7000);
    // 若 CSS 動畫終止或被跳過，也確保移除
    sigOverlay.addEventListener('animationend', (e) => {
      if (e.animationName === 'sigFadeOut') {
        clearTimeout(timer);
        cleanup();
      }
    });
  }

  /** 平滑滾動（僅限站內 hash） **/
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({behavior: prefersReduced ? 'auto' : 'smooth', block: 'start'});
    history.pushState(null, '', `#${id}`);
  });

  /** 圖片載入懶載（原生 loading="lazy" 優先；此段做兼容/回退） **/
  const lazyImgs = $$('img[loading="lazy"]');
  if ('loading' in HTMLImageElement.prototype === false && lazyImgs.length) {
    // 簡單回退：進視口才換 src（如果你已用正式 lazy 庫可移除）
    const onScroll = () => {
      for (const img of lazyImgs) {
        if (img.dataset.src && inViewport(img)) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
      }
      if (lazyImgs.every(i => !i.dataset.src)) window.removeEventListener('scroll', onScroll);
    };
    const inViewport = (el) => {
      const r = el.getBoundingClientRect();
      return r.top <= innerHeight * 1.2 && r.bottom >= -innerHeight * .2;
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /** 可選：連點保護（避免行動裝置點兩次） **/
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 350) e.preventDefault();
    lastTap = now;
  }, {passive:false});

})();
/* REPLACE END: app.js */

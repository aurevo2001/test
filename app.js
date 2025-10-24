/* ==========================================================
   app.js（最終版｜多頁共用｜高質量＋全功能）
   - 主題切換（localStorage＋系統偏好）
   - Drawer 導覽（可存取、Esc 關閉、焦點圈）
   - 平滑錨點滾動（自動避開 sticky header）
   - 導航高亮（跨頁）
   - IntersectionObserver 進場動畫
   - Lazy-load <img data-src>
   - 背景 Emoji 漂浮引擎（純 JS，無需任何 CSS 動畫）
     * 上飄 + 左右擺動 + 微旋轉
     * 滑鼠 / 觸控 / 滾動 視差
     * 分頁隱藏自動暫停、尊重「減少動態」
     * 小螢幕密度調整
   使用方式：
   1) 不需在 HTML 放 .emoji-sky，不需任何 emoji 相關 CSS。
   2) 在頁尾（</body> 前）載入：<script src="/app.js?v=1" defer></script>
   3) 其他 CSS/HTML 不變。
   ========================================================== */
(() => {
  "use strict";

  /* ============ 小工具 ============ */
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => document.querySelectorAll(q);
  const on = (t, e, h, o) => t && t.addEventListener(e, h, o);
  const throttle = (fn, ms = 120) => {
    let t = 0;
    return (...a) => {
      const n = Date.now();
      if (n - t >= ms) {
        t = n;
        fn.apply(null, a);
      }
    };
  };

  /* ============ 主題切換 ============ */
  const themeBtn = $("#themeBtn"),
    themeIcon = $("#themeIcon");
  (function initTheme() {
    const saved = localStorage.getItem("theme");
    const prefersDark =
      !saved && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const cur = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", cur);
    if (themeIcon) themeIcon.textContent = cur === "dark" ? "🌙" : "🌞";
  })();
  on(themeBtn, "click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const nxt = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nxt);
    localStorage.setItem("theme", nxt);
    if (themeIcon) themeIcon.textContent = nxt === "dark" ? "🌙" : "🌞";
  });

  /* ============ Drawer（含可存取焦點圈） ============ */
  const menuBtn = $("#menuBtn"),
    drawer = $("#drawer"),
    overlay = $("#overlay");
  let lastFocus = null;
  const trapKeys = (e) => {
    if (e.key !== "Tab") return;
    const focusables = drawer?.querySelectorAll(
      'a[href],button,[tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || !focusables.length) return;
    const f = [...focusables].filter((el) => !el.hasAttribute("disabled"));
    const first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const openDrawer = () => {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", trapKeys);
    const first = drawer.querySelector('a,button,[tabindex]:not([tabindex="-1"])');
    first && first.focus();
  };
  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", trapKeys);
    lastFocus && lastFocus.focus();
  };
  on(menuBtn, "click", openDrawer);
  on(overlay, "click", closeDrawer);
  drawer?.querySelectorAll("[data-close]")?.forEach((a) => on(a, "click", closeDrawer));
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("open")) closeDrawer();
  });

  /* ============ 平滑錨點滾動 ============ */
  const SCROLL_OFF = 68;
  $$('a[href^="#"]').forEach((a) =>
    on(a, "click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.length > 1) {
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFF;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    })
  );

  /* ============ 導航高亮（跨頁） ============ */
  (function markActiveNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    $$(".nav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const clean = href.includes("#") ? href.split("#")[0] : href;
      if (clean === path || (clean === "index.html" && path === ""))
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  })();

  /* ============ IntersectionObserver 進場動畫 ============ */
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ============ 版權年份 ============ */
  const y = $("#y");
  if (y) y.textContent = new Date().getFullYear();

  /* ============ Lazy-load 圖片（<img data-src>） ============ */
  $$("img[data-src]").forEach((img) => {
    const o = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            o.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );
    o.observe(img);
  });

  /* ==========================================================
     背景 Emoji 漂浮引擎（純 JS，不需要 CSS 動畫）
     ========================================================== */
  const EmojiEngine = (() => {
    // ---- 可調參數 ----
    const CFG = {
      emojis: ["🍳", "🥚", "☕️", "🍓", "🍞", "🍪", "🍰", "🧋", "🥐", "🥑", "🐣", "⭐", "🍯", "🧈", "🍵"],
      count: { xl: 2, lg: 4, md: 6, sm: 6 },   // 各尺寸數量
      speed: [22, 36],                         // 垂直速度（秒數越大越慢）
      amp: [6, 16],                            // 左右擺幅
      sway: [0.6, 1.2],                        // 左右擺動頻率
      rotAmp: [2, 5],                          // 微旋轉幅度（度）
      mouseShift: { x: 8, y: 6 },              // 視差偏移（滑鼠/觸控）
      scrollFactor: 0.03,                      // 視差偏移（滾動）
      hideXLUnder: 640,                        // 寬度 < 640 隱藏部分 XL
      opacity: 0.85
    };

    // ---- 內部狀態 ----
    let sky;
    let items = [];
    let raf = 0;
    let last = performance.now();
    let paused = false;
    let mx = 0.5,
      my = 0.5,
      scrollY = 0,
      vw = innerWidth,
      vh = innerHeight;
    const REDUCED = matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    const DPR = Math.max(1, Math.min(devicePixelRatio || 1, 2));

    // ---- 工具 ----
    const rand = (a, b) => a + Math.random() * (b - a);
    const fontSizeOf = (cls) => (cls === "xl" ? 46 : cls === "lg" ? 36 : cls === "md" ? 26 : 18);

    // ---- 建立容器 ----
    function ensureSky() {
      sky = document.querySelector(".emoji-sky");
      if (!sky) {
        sky = document.createElement("div");
        sky.className = "emoji-sky";
        sky.setAttribute("aria-hidden", "true");
        document.body.prepend(sky);
      }
      // 最小必要樣式（不依賴 CSS）
      sky.style.position = "fixed";
      sky.style.inset = "0";
      sky.style.zIndex = "1";
      sky.style.pointerEvents = "none";
      sky.style.overflow = "hidden";
      sky.style.opacity = "0.78";
      sky.style.mixBlendMode = "normal";
      if (document.documentElement.getAttribute("data-theme") === "dark") {
        sky.style.opacity = "0.55";
        sky.style.mixBlendMode = "screen";
      }
    }

    // ---- 產生 Emoji ----
    function spawn() {
      sky.innerHTML = "";
      items.length = 0;

      const classes = [];
      const pushN = (n, cls) => {
        for (let i = 0; i < n; i++) classes.push(cls);
      };
      pushN(CFG.count.xl, "xl");
      pushN(CFG.count.lg, "lg");
      pushN(CFG.count.md, "md");
      pushN(CFG.count.sm, "small");
      classes.sort(() => Math.random() - 0.5);

      classes.forEach((cls, i) => {
        const el = document.createElement("span");
        el.textContent = CFG.emojis[i % CFG.emojis.length];
        el.style.position = "absolute";
        el.style.willChange = "transform";
        el.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,.12))";
        el.style.opacity = String(CFG.opacity);
        el.style.fontSize = fontSizeOf(cls) + "px";
        sky.appendChild(el);

        items.push({
          el,
          cls,
          xPct: rand(2, 98), // 2% ~ 98%
          phase: Math.random() * Math.PI * 2,
          spd: rand(CFG.speed[0], CFG.speed[1]),
          amp: rand(CFG.amp[0], CFG.amp[1]) * (cls === "xl" ? 1.2 : cls === "lg" ? 1.1 : cls === "md" ? 1 : 0.9),
          sway: rand(CFG.sway[0], CFG.sway[1]) * (cls === "xl" ? 0.8 : 1),
          rotA: rand(CFG.rotAmp[0], CFG.rotAmp[1]),
          delay: Math.random() * 8
        });
      });

      // 小螢幕適度減量
      if (vw < CFG.hideXLUnder) {
        items.forEach((it, idx) => {
          if (it.cls === "xl" && idx % 2 === 0) it.el.style.display = "none";
        });
      }
    }

    // ---- 版面 ----
    function layout() {
      vw = innerWidth;
      vh = innerHeight;
    }

    // ---- 主迴圈 ----
    function tick(t) {
      if (paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(64, (t - last) || 16);
      last = t;

      const tx = (mx - 0.5) * CFG.mouseShift.x;
      const ty = (my - 0.5) * CFG.mouseShift.y + scrollY * CFG.scrollFactor;

      for (const it of items) {
        const time = t / 1000 - it.delay;
        if (time < 0) continue;

        const path = (time * it.spd * DPR) % (vh + 200); // 從下往上循環
        const y = vh + 100 - path;
        const xBase = (it.xPct * vw) / 100;
        const x = xBase + Math.sin(time * it.sway + it.phase) * it.amp + tx;
        const rot = Math.sin(time * it.sway * 0.7 + it.phase) * it.rotA;

        it.el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rot}deg)`;
      }

      sky.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      raf = requestAnimationFrame(tick);
    }

    // ---- 控制 ----
    function play() {
      if (REDUCED) {
        pause();
        return;
      }
      paused = false;
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function pause() {
      paused = true;
      cancelAnimationFrame(raf);
    }

    // ---- 事件 ----
    function init() {
      ensureSky();
      layout();
      spawn();
      REDUCED ? pause() : play();

      on(
        window,
        "mousemove",
        (e) => {
          const cx = e.clientX ?? vw / 2,
            cy = e.clientY ?? vh / 2;
          mx = cx / vw;
          my = cy / vh;
        },
        { passive: true }
      );
      on(
        window,
        "touchmove",
        (e) => {
          const t = e.touches?.[0];
          if (t) {
            mx = t.clientX / vw;
            my = t.clientY / vh;
          }
        },
        { passive: true }
      );
      on(
        window,
        "scroll",
        throttle(() => {
          scrollY = pageYOffset || 0;
        }, 80),
        { passive: true }
      );
      on(document, "visibilitychange", () => {
        document.hidden ? pause() : play();
      });
      on(
        window,
        "resize",
        throttle(() => {
          layout();
          // 依寬度切換 XL 顯示策略
          if (vw < CFG.hideXLUnder) {
            items.forEach((it, idx) => {
              if (it.cls === "xl" && idx % 2 === 0) it.el.style.display = "none";
            });
          } else {
            items.forEach((it) => (it.el.style.display = ""));
          }
        }, 160)
      );
    }

    init();

    // 對外 API（可選）
    return Object.freeze({
      setEmojis: (arr) => {
        if (Array.isArray(arr) && arr.length) {
          CFG.emojis = arr;
          spawn();
        }
      },
      setDensity: (d) => {
        CFG.count = { ...CFG.count, ...d };
        spawn();
      },
      setSpeed: (min, max) => {
        CFG.speed = [min, max];
      },
      refresh: () => spawn(),
      pause,
      play
    });
  })();

  // 對外掛載（可選）
  window.FatismApp = Object.freeze({
    setTheme: (t) => {
      if (!["light", "dark"].includes(t)) return;
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("theme", t);
      const themeIcon = $("#themeIcon");
      if (themeIcon) themeIcon.textContent = t === "dark" ? "🌙" : "🌞";
    },
    emoji: EmojiEngine
  });

  // JS 啟用標記
  document.documentElement.classList.remove("no-js");

  // 簡易狀態輸出（可看 Console）
  console.log(
    "%cApp loaded",
    "background:#111;color:#fff;padding:2px 6px;border-radius:4px",
    { emojiEngine: true }
  );
})();

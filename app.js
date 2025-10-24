/* ==========================================================
   app.js（最終版｜多頁共用｜高質量＋全功能）
   - 主題切換（localStorage＋系統偏好）
   - Drawer 導覽（可存取、Esc 關閉、焦點圈）
   - 平滑錨點滾動（自動避開 sticky header）
   - 導航高亮（跨頁）
   - IntersectionObserver 進場動畫
   - Lazy-load <img data-src>
   - 背景 Emoji 漂浮引擎（純 JS，無需任何 CSS 動畫）
     * 置於內容「後面」(z-index 修正，JS 自動處理)
     * 慢慢生成（漸進出生）、隨機起始進度、廣域延遲
     * 上飄 + 左右擺動 + 微旋轉
     * 滑鼠 / 觸控 / 滾動 視差
     * 分頁隱藏自動暫停、尊重「減少動態」
     * 小螢幕密度調整
   使用方式：
   1) 不需在 HTML 放 .emoji-sky，不需任何 emoji 相關 CSS。
   2) 在頁尾（</body> 前）載入：<script src="/app.js?v=3" defer></script>
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
     — 修正：
       1) 置於內容後面（z-index:0 + 其他元素抬升到 2）
       2) 慢慢生成（漸進出生）、隨機起始進度、延遲擴大
     ========================================================== */
  const EmojiEngine = (() => {
    // ---- 可調參數 ----
    const CFG = {
      emojis: ["🍳", "🥚", "☕️", "🍓", "🍞", "🍪", "🍰", "🧋", "🥐", "🥑", "🐣", "⭐", "🍯", "🧈", "🍵"],
      count: { xl: 2, lg: 4, md: 6, sm: 6 },     // 目標總數（會漸進生成）
      birthInterval: 280,                         // 每顆出生間隔（毫秒）→ 設定「慢慢來」
      speed: [24, 40],                            // 垂直速度（秒數越大越慢）→ 稍微放慢
      amp: [6, 16],                               // 左右擺幅
      sway: [0.5, 1.1],                           // 左右擺動頻率（更柔）
      rotAmp: [1.5, 4],                           // 微旋轉幅度（更細）
      mouseShift: { x: 8, y: 6 },                 // 視差偏移（滑鼠/觸控）
      scrollFactor: 0.03,                         // 視差偏移（滾動）
      hideXLUnder: 640,                           // 寬度 < 640 隱藏部分 XL
      opacity: 0.8,                               // 透明度稍降，避免壓過內容
      startDelayRange: [0, 18],                   // 進場延遲範圍（秒）→ 更分散
      startProgressJitter: [0, 1]                 // 初始進度 0~1（隨機放到空中某位置）
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

    // ---- 置底：把其他直屬子元素抬到上層 ----
    function elevateContent() {
      const kids = [...document.body.children].filter((n) => !n.classList.contains("emoji-sky"));
      kids.forEach((el) => {
        if (!el.style.position) el.style.position = "relative";
        if (!el.style.zIndex) el.style.zIndex = "2";
      });
    }

    // ---- 建立容器（置於內容後面） ----
    function ensureSky() {
      sky = document.querySelector(".emoji-sky");
      if (!sky) {
        sky = document.createElement("div");
        sky.className = "emoji-sky";
        sky.setAttribute("aria-hidden", "true");
        document.body.prepend(sky);
      }
      // 容器樣式：固定、可視差、在底層
      sky.style.position = "fixed";
      sky.style.inset = "0";
      sky.style.zIndex = "0";          // 關鍵：在內容之下
      sky.style.pointerEvents = "none";
      sky.style.overflow = "hidden";
      sky.style.opacity = String(CFG.opacity);
      sky.style.mixBlendMode = "normal";
      if (document.documentElement.getAttribute("data-theme") === "dark") {
        sky.style.opacity = "0.6";
        sky.style.mixBlendMode = "screen";
      }
    }

    // ---- 目標數量（依密度） ----
    function targetList() {
      const classes = [];
      const pushN = (n, cls) => {
        for (let i = 0; i < n; i++) classes.push(cls);
      };
      pushN(CFG.count.xl, "xl");
      pushN(CFG.count.lg, "lg");
      pushN(CFG.count.md, "md");
      pushN(CFG.count.sm, "small");
      return classes.sort(() => Math.random() - 0.5);
    }

    // ---- 逐顆生成（慢慢出生） ----
    let birthTimer = null;
    function startBirth() {
      const classes = targetList();
      let i = 0;
      clearInterval(birthTimer);
      birthTimer = setInterval(() => {
        if (i >= classes.length) {
          clearInterval(birthTimer);
          return;
        }
        spawnOne(classes[i], i);
        i++;
      }, CFG.birthInterval);
    }

    // ---- 生成單顆 ----
    function spawnOne(cls, idx) {
      const el = document.createElement("span");
      el.textContent = CFG.emojis[idx % CFG.emojis.length];
      el.style.position = "absolute";
      el.style.willChange = "transform";
      el.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,.12))";
      el.style.opacity = String(CFG.opacity);
      el.style.fontSize = fontSizeOf(cls) + "px";
      sky.appendChild(el);

      // 初始隨機：位置、速度、相位、延遲、起始進度
      const startDelay = rand(CFG.startDelayRange[0], CFG.startDelayRange[1]); // 秒
      const progress0 = rand(CFG.startProgressJitter[0], CFG.startProgressJitter[1]); // 0~1

      const it = {
        el,
        cls,
        xPct: rand(2, 98),
        phase: Math.random() * Math.PI * 2,
        spd: rand(CFG.speed[0], CFG.speed[1]),
        amp: rand(CFG.amp[0], CFG.amp[1]) * (cls === "xl" ? 1.2 : cls === "lg" ? 1.1 : cls === "md" ? 1 : 0.9),
        sway: rand(CFG.sway[0], CFG.sway[1]) * (cls === "xl" ? 0.8 : 1),
        rotA: rand(1.5, 4),       // 更細的旋轉
        delay: startDelay * (Math.random() < 0.5 ? 1 : Math.random()*1.8), // 擴散一點
        progress0               // 讓一部分出生就已經在半空
      };

      // 手機適度減量（XL）
      if (vw < CFG.hideXLUnder && cls === "xl" && idx % 2 === 0) {
        el.style.display = "none";
      }

      items.push(it);
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
        // 將初始進度映射到路徑（讓一部分出生即在不同高度）
        const time = t / 1000 - it.delay + it.progress0 * (vh + 200) / Math.max(1e-3, it.spd);
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
      // 先把內容抬到上層，再放 emoji 容器在底層
      elevateContent();
      ensureSky();
      layout();

      // 清空既有、重新開始漸進生成
      sky.innerHTML = "";
      items = [];

      // 啟動
      if (!REDUCED) play(); else pause();
      startBirth();

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
        }, 160)
      );
    }

    init();

    // 對外 API（可選）
    return Object.freeze({
      setEmojis: (arr) => {
        if (Array.isArray(arr) && arr.length) {
          items = [];
          document.querySelector(".emoji-sky").innerHTML = "";
          CFG.emojis = arr;
          startBirth();
        }
      },
      setDensity: (d) => {
        items = [];
        document.querySelector(".emoji-sky").innerHTML = "";
        CFG.count = { ...CFG.count, ...d };
        startBirth();
      },
      setSpeed: (min, max) => {
        CFG.speed = [min, max];
      },
      refresh: () => {
        items = [];
        document.querySelector(".emoji-sky").innerHTML = "";
        startBirth();
      },
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

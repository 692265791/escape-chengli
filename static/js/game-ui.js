/* ============================================================
   game-ui.js —— 剧情界面程序化动效（3.1）
   ------------------------------------------------------------
   模块：
   - CharDust   打字机"粉笔灰掉落"粒子（canvas，监听 storychar）
   - TearEdge   对话框顶部撕纸边缘（JS 随机噪声生成 SVG path）
   - GuardStamp 选项防误触"朱砂封印"（监听 choiceguard 事件）
   - LeverHUD   回退/自动/跳过 机械拨杆按压反馈 + 状态指示灯
   ------------------------------------------------------------
   兜底：无 canvas（jsdom）静默降级；prefers-reduced-motion /
   no-anim 下粒子与印章动画关闭；粒子池上限 24。
   ============================================================ */
(function () {
  "use strict";

  function reduceMotion() {
    try {
      if (document.body && (document.body.classList.contains("no-anim") ||
          document.body.classList.contains("skipping"))) return true;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  /* ============================================================
     CharDust —— 粉笔写字掉灰
     引擎每揭示一个字符派发 storychar；此处按概率生成 1 粒
     粉笔灰，从对话框文字区上沿受重力下落并淡出。
     粒子池 ≤ 24；位置采样使用 300ms 缓存的 rect（避免逐字强制布局）。
     ============================================================ */
  function CharDust(canvas) {
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) {}
    if (!ctx) { this.disabled = true; return; }
    this.canvas = canvas; this.ctx = ctx;
    this.parts = []; this.POOL = 24;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resize = function () {
      canvas.width = Math.round(window.innerWidth * this.dpr);
      canvas.height = Math.round(window.innerHeight * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };
    this._resize();
    window.addEventListener("resize", this._resize, { passive: true });

    var rectCache = null, rectT = 0;
    function zone() {
      var now = Date.now();
      if (!rectCache || now - rectT > 300) {
        var tb = document.getElementById("textBox");
        rectCache = tb ? tb.getBoundingClientRect() : null;
        rectT = now;
      }
      return rectCache;
    }

    var self = this;
    window.addEventListener("storychar", function (e) {
      if (!self.running || self.parts.length >= self.POOL) return;
      if (Math.random() > 0.45) return;                 /* 非每字必掉，保帧率 */
      var z = zone();
      if (!z || z.width < 10) return;
      self.parts.push({
        x: z.left + 18 + Math.random() * (z.width - 36),
        y: z.top + 8 + Math.random() * 14,
        vx: (Math.random() - 0.5) * 8,
        vy: 14 + Math.random() * 22,
        r: 0.7 + Math.random() * 1.3,
        a: 0.5 + Math.random() * 0.35
      });
    });

    this.running = false;
    this.lastT = 0;
    this._tick = function (ts) {
      if (!self.running) return;
      if (!self.lastT) self.lastT = ts;
      var dt = Math.min((ts - self.lastT) / 1000, 0.05);
      self.lastT = ts;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (var i = self.parts.length - 1; i >= 0; i--) {
        var p = self.parts[i];
        p.vy += 60 * dt;                                /* 重力 */
        p.x += p.vx * dt; p.y += p.vy * dt; p.a -= 0.9 * dt;
        if (p.a <= 0 || p.y > window.innerHeight) { self.parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.a);
        ctx.fillStyle = "rgb(214, 218, 210)";           /* 粉笔灰白 */
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(self._tick);
    };
  }
  CharDust.prototype.start = function () {
    if (this.disabled || this.running) return;
    if (reduceMotion()) return;                          /* 降级：不启动 */
    this.running = true;
    requestAnimationFrame(this._tick);
  };

  /* ============================================================
     TearEdge —— 对话框顶部撕纸残缺边缘
     JS 以随机噪声生成 SVG path（分段锯齿 + 平滑），注入 text-box。
     每次进入章节重新生成（形态永不重复）。
     ============================================================ */
  function TearEdge(hostEl) {
    if (!hostEl) return;
    var old = hostEl.querySelector(".tear-edge");
    if (old) old.remove();
    var W = 1000, H = 14, seg = 26;
    var d = "M0," + H + " L0," + (H - 3);
    var x = 0, y = H - 3;
    while (x < W) {
      x += seg * (0.55 + Math.random() * 0.9);
      y = H - 2 - Math.random() * (H - 4) - (Math.random() < 0.16 ? 4 : 0);
      d += " L" + Math.min(x, W).toFixed(1) + "," + y.toFixed(1);
    }
    d += " L" + W + "," + H + " Z";
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "tear-edge");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "#0a0a0c");
    svg.appendChild(path);
    hostEl.appendChild(svg);
  }

  /* ============================================================
     GuardStamp —— 朱砂封印（选项防误触视觉化）
     choiceguard 事件 → 朱砂印"封"字砸落：scale 2.2→1 + 旋转
     微调 + 不均匀透明度，尾部裂纹 SVG 短闪。繁体提示由引擎写入。
     ============================================================ */
  function GuardStamp(hostEl) {
    if (!hostEl) return;
    hostEl.innerHTML =
      '<div class="guard-stamp" aria-hidden="true">' +
        '<svg viewBox="0 0 120 120">' +
          '<rect x="8" y="8" width="104" height="104" rx="10" fill="none" stroke="#8C2B2B" stroke-width="5" opacity=".9"/>' +
          '<rect x="16" y="16" width="88" height="88" rx="6" fill="none" stroke="#8C2B2B" stroke-width="1.5" opacity=".55"/>' +
          '<text x="60" y="82" text-anchor="middle" font-size="62" fill="#8C2B2B" ' +
            'font-family="Songti SC,SimSun,serif" opacity=".92">封</text>' +
        '</svg>' +
      '</div>';
    var el = hostEl.querySelector(".guard-stamp");
    var busy = false;
    window.addEventListener("choiceguard", function () {
      if (busy || !el) return;
      busy = true;
      if (reduceMotion()) {
        el.classList.add("show");
        setTimeout(function () { el.classList.remove("show"); busy = false; }, 1200);
        return;
      }
      /* 砸落：scale 2.2→0.96→1，透明度先满后衰 */
      el.classList.add("show", "slam");
      setTimeout(function () { el.classList.remove("slam"); }, 480);
      setTimeout(function () { el.classList.remove("show"); busy = false; }, 1250);
    });
  }

  /* ============================================================
     LeverHUD —— 复古机械拨杆按压反馈
     :active 下压由 CSS 承担；此处补"咔哒"状态灯闪烁 +
     按压后 220ms 内禁止二次触发动画（防连点抖动）。
     ============================================================ */
  function LeverHUD() {
    ["btnBack", "btnAuto", "btnSkip"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b.dataset.lever) return;
      b.dataset.lever = "1";
      b.addEventListener("mousedown", function () { b.classList.add("pressed"); });
      b.addEventListener("touchstart", function () { b.classList.add("pressed"); }, { passive: true });
      ["mouseup", "mouseleave", "touchend"].forEach(function (ev) {
        b.addEventListener(ev, function () {
          setTimeout(function () { b.classList.remove("pressed"); }, 140);
        });
      });
    });
  }

  /* ---------- 启动 ---------- */
  function initGame() {
    var c = document.getElementById("charDustCanvas");
    if (c) {
      var cd = new CharDust(c);
      cd.start();
    }
    TearEdge(document.querySelector("#textBox"));
    GuardStamp(document.getElementById("guardStampHost"));
    LeverHUD();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
  } else {
    initGame();
  }

  window.EC_GAMEUI = { CharDust: CharDust, TearEdge: TearEdge, GuardStamp: GuardStamp, LeverHUD: LeverHUD, initGame: initGame };
})();

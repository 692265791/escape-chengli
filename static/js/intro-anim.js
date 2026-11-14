/* ============================================================
   intro-anim.js —— 《逃离 程丽》程序化动效引擎（3.1）
   全部核心动画由 Canvas 2D / SVG 路径运算 / 原生 JS 物理驱动，
   不使用装饰性 CSS 关键帧。
   ------------------------------------------------------------
   模块：
   - DustField   粉笔灰粒子场（rAF，DPR 自适应，粒子限额）
   - PaperFall   试卷/遗书物理坠落（重力 + 空气阻力 + 钟摆摆动）
   - BloodTitle  SVG 血迹书写（stroke-dashoffset 笔画生长 + 渗墨 + 血滴）
   - Stitch      红线缝合（SVG rect getTotalLength + 针脚虚线推进）
   - Fluorescent 日光灯频闪（随机间隔 4~8s，80ms 青黑交替）
   - Parallax    3D 探头视差（鼠标 / 触摸 / 陀螺仪，lerp 平滑）
   ------------------------------------------------------------
   兜底：prefers-reduced-motion 全部降级；jsdom/无 canvas 环境
   静默跳过；移动端粒子 ≤ 50。
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

  function makeCtx(canvas) {
    try {
      var ctx = canvas.getContext("2d");
      if (!ctx) return null;
      return ctx;
    } catch (e) { return null; }
  }

  /* 高 DPI 适配：画布物理像素 = CSS 尺寸 × dpr（上限 2，老旧设备省带宽） */
  function fitCanvas(canvas, ctx) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h, dpr: dpr };
  }

  /* ============================================================
     DustField —— 粉笔灰粒子场
     数量：按视口面积自适应，硬上限 50（移动端红线）
     运动：基础漂移 + 正弦噪声扰动（伪布朗），边界环绕
     ============================================================ */
  function DustField(canvas, opts) {
    opts = opts || {};
    var ctx = makeCtx(canvas);
    if (!ctx) { this.disabled = true; return; }
    this.canvas = canvas; this.ctx = ctx;
    this.max = opts.max || 50;
    this.tint = opts.tint || "220, 224, 220";
    this.size = opts.size || [0.6, 2.2];
    this.running = false;
    this.parts = [];
    this.size_ = fitCanvas(canvas, ctx);
    var self = this;
    this._onResize = function () { self.size_ = fitCanvas(self.canvas, self.ctx); self._populate(); };
    window.addEventListener("resize", this._onResize, { passive: true });
    this._populate();
  }
  DustField.prototype._populate = function () {
    var area = this.size_.w * this.size_.h;
    var n = Math.max(14, Math.min(this.max, Math.round(area / 14000)));
    this.parts = [];
    for (var i = 0; i < n; i++) this.parts.push(this._spawn(true));
  };
  DustField.prototype._spawn = function (anywhere) {
    var W = this.size_.w, H = this.size_.h;
    var r = this.size[0] + Math.random() * (this.size[1] - this.size[0]);
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + r,
      vx: (Math.random() - 0.5) * 6,
      vy: -(3 + Math.random() * 9),           /* 灰尘缓慢上浮 */
      r: r,
      a: 0.12 + Math.random() * 0.3,
      ph: Math.random() * Math.PI * 2,         /* 噪声相位 */
      phs: 0.4 + Math.random() * 0.9
    };
  };
  DustField.prototype.step = function (dt) {
    var W = this.size_.w, H = this.size_.h;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      p.ph += p.phs * dt;
      p.x += (p.vx + Math.sin(p.ph) * 5) * dt;   /* 横向噪声漂移 */
      p.y += p.vy * dt;
      if (p.y < -4 || p.x < -6 || p.x > W + 6) this.parts[i] = this._spawn(false);
    }
  };
  DustField.prototype.draw = function (ctx) {
    ctx = ctx || this.ctx;
    ctx.clearRect(0, 0, this.size_.w, this.size_.h);
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "rgb(" + this.tint + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  DustField.prototype.destroy = function () {
    this.running = false;
    window.removeEventListener("resize", this._onResize);
  };

  /* ============================================================
     PaperFall —— 试卷 / 遗书物理坠落
     物理：重力加速度 g、线性空气阻力、钟摆式左右摆动
     （angle = baseAngle + sin(phase) * amp，phase 匀速推进）
     生成节律：每 5s 一张，同屏 ≤ 3
     ============================================================ */
  function PaperFall(canvas, opts) {
    opts = opts || {};
    var ctx = makeCtx(canvas);
    if (!ctx) { this.disabled = true; this.papers = []; return; }
    this.canvas = canvas; this.ctx = ctx;
    this.dust = opts.dust || null;    /* 复用 DustField 的画布尺寸/循环 */
    this.papers = [];
    this.spawnEvery = opts.spawnEvery || 5;   /* 秒 */
    this.maxAlive = opts.maxAlive || 3;
    this.timer = 0;
    this.kinds = opts.kinds || ["paper", "paper", "note"];
  }
  PaperFall.prototype._spawn = function () {
    var W = this.dust.size_.w;
    var kind = this.kinds[Math.floor(Math.random() * this.kinds.length)];
    return {
      kind: kind,
      x: W * (0.15 + Math.random() * 0.7),
      y: -140,
      vy: 6,                          /* 初速 */
      vx: (Math.random() - 0.5) * 8,
      g: 55,                          /* 重力加速度 px/s² */
      drag: 0.985,                    /* 空气阻力系数（指数衰减） */
      base: (Math.random() - 0.5) * 0.5,
      amp: 0.28 + Math.random() * 0.3,
      ph: Math.random() * Math.PI * 2,
      phs: 1.6 + Math.random() * 1.2, /* 钟摆频率 */
      sway: (Math.random() - 0.5) * 30,
      scale: 0.8 + Math.random() * 0.45,
      seed: Math.random()
    };
  };
  PaperFall.prototype.step = function (dt) {
    this.timer += dt;
    if (this.timer >= this.spawnEvery && this.papers.length < this.maxAlive) {
      this.timer = 0;
      this.papers.push(this._spawn());
    }
    var H = this.dust.size_.h;
    for (var i = this.papers.length - 1; i >= 0; i--) {
      var p = this.papers[i];
      p.vy = (p.vy + p.g * dt) * p.drag;              /* 重力 + 阻力 */
      p.y += p.vy * dt;
      p.x += (p.vx + p.sway * Math.sin(p.ph)) * dt;   /* 摆动横移 */
      p.ph += p.phs * dt;
      if (p.y > H + 160) this.papers.splice(i, 1);    /* 出屏回收 */
    }
  };
  /* 一张纸 = 矩形 + 横格线 + 顶部朱批字 + 折痕阴影，全部程序化绘制 */
  PaperFall.prototype._drawPaper = function (ctx, p) {
    var w = 92 * p.scale, h = 122 * p.scale;
    var ang = p.base + Math.sin(p.ph) * p.amp;      /* 钟摆旋转角 */
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.92;
    /* 纸底 */
    var g = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    if (p.kind === "note") {
      g.addColorStop(0, "#d9cfb4"); g.addColorStop(1, "#c4b894");
    } else {
      g.addColorStop(0, "#e7dfc8"); g.addColorStop(1, "#d3c8a6");
    }
    ctx.fillStyle = g;
    ctx.fillRect(-w/2, -h/2, w, h);
    /* 纸边阴影 */
    ctx.strokeStyle = "rgba(40,32,18,.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-w/2, -h/2, w, h);
    /* 折痕 */
    ctx.strokeStyle = "rgba(80,68,40,.22)";
    ctx.beginPath();
    ctx.moveTo(-w/2 + 4, -h/2 + h*0.42);
    ctx.lineTo(w/2 - 4, -h/2 + h*0.42 + 3);
    ctx.stroke();
    /* 横格线 */
    ctx.strokeStyle = "rgba(74,101,114,.5)";
    ctx.lineWidth = 0.8;
    for (var i = 1; i <= 4; i++) {
      var yy = -h/2 + h*0.3 + i*(h*0.16);
      ctx.beginPath(); ctx.moveTo(-w/2 + 8, yy); ctx.lineTo(w/2 - 8, yy); ctx.stroke();
    }
    /* 朱批标题 */
    ctx.fillStyle = "rgba(140,43,43,.85)";
    ctx.font = (11 * p.scale) + 'px "Songti SC","Noto Serif SC",serif';
    ctx.textAlign = "center";
    ctx.fillText(p.kind === "note" ? "遗 书" : "试 卷", 0, -h/2 + 16 * p.scale);
    /* 随笔字迹（seed 驱动的歪斜短线，模拟手写） */
    ctx.strokeStyle = "rgba(48,52,66,.6)";
    for (var k = 0; k < 3; k++) {
      var ly = -h/2 + h*0.34 + k*(h*0.16) + 3;
      var lx = -w/2 + 10;
      var lw = w * (0.34 + ((p.seed * 97 + k * 31) % 40) / 100);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lw, ly + ((k % 2) ? 1.5 : 0)); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };
  PaperFall.prototype.draw = function (ctx) {
    ctx = ctx || this.ctx;
    for (var i = 0; i < this.papers.length; i++) this._drawPaper(ctx, this.papers[i]);
  };

  /* ============================================================
     主循环（单一 rAF 驱动 dust + papers —— 合并调度省 CPU）
     ============================================================ */
  function Loop(dust, papers) {
    this.dust = dust; this.papers = papers;
    this.rafId = null; this.lastT = 0;
    var self = this;
    this._tick = function (ts) {
      if (!self.running) return;
      if (!self.lastT) self.lastT = ts;
      var dt = Math.min((ts - self.lastT) / 1000, 0.05);   /* 跳帧上限 50ms */
      self.lastT = ts;
      self.dust.step(dt);
      self.papers.step(dt);
      self.dust.draw();
      self.papers.draw(self.dust.ctx);
      self.rafId = requestAnimationFrame(self._tick);
    };
  }
  Loop.prototype.start = function () {
    if (this.running || (this.dust && this.dust.disabled) || !this.dust || this.dust.disabled) return;
    this.running = true; this.lastT = 0;
    this.rafId = requestAnimationFrame(this._tick);
  };
  Loop.prototype.stop = function () {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  };

  /* ============================================================
     BloodTitle —— SVG 血迹书写
     每个 <text> 字：估算笔画周长 → stroke-dashoffset 生长（笔尖）
     → fill 渗墨渐入 → 底部血滴（回调 drips 画布）
     ============================================================ */
  function BloodTitle(svg, opts) {
    opts = opts || {};
    var chars = svg.querySelectorAll("text");
    var items = [];
    for (var i = 0; i < chars.length; i++) {
      var t = chars[i];
      var L = 900;                                   /* 估算周长（回退值） */
      try {
        var b = t.getBBox();
        L = Math.max(300, Math.round((b.width + b.height) * 2.6));
      } catch (e) {}
      t.style.strokeDasharray = L + " " + L;
      t.style.strokeDashoffset = L;
      items.push({ el: t, L: L, delay: (opts.stagger || 0.35) * i, dur: opts.charDur || 0.85 });
    }
    this.items = items;
    this.dripFn = opts.onDrip || null;
    this.running = false;
    this.t = 0;
  }
  BloodTitle.prototype.play = function () {
    if (reduceMotion()) { this.finish(); return; }
    this.running = true; this.t = 0;
    this._tick2 = this._tick2 || this._makeTick();
    this.raf = requestAnimationFrame(this._tick2);
  };
  BloodTitle.prototype._makeTick = function () {
    var self = this;
    return function (ts) {
      if (!self.running) return;
      if (!self.t) self.t = ts;
      var el = (ts - self.t) / 1000;
      var allDone = true;
      for (var i = 0; i < self.items.length; i++) {
        var it = self.items[i];
        if (it.done) continue;
        allDone = false;
        var p = (el - it.delay) / it.dur;             /* 本字进度 0~1 */
        if (p <= 0) continue;
        if (p >= 1) {
          it.el.style.strokeDashoffset = 0;
          it.el.classList.add("inked");               /* 渗墨：fill 渐入 */
          it.done = true;
          /* 该字落成 → 血滴（渗落粒子） */
          if (self.dripFn) {
            try {
              var b = it.el.getBBox();
              self.dripFn(b.x + b.width / 2, b.y + b.height * 0.92, b.width);
            } catch (e) { self.dripFn(120 + i * 180, 200, 120); }
          }
        } else {
          /* 笔尖推进 easeInOut */
          var e2 = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          it.el.style.strokeDashoffset = it.L * (1 - e2);
        }
      }
      if (allDone) { self.running = false; return; }
      self.raf = requestAnimationFrame(self._tick2);
    };
  };
  BloodTitle.prototype.finish = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    for (var i = 0; i < this.items.length; i++) {
      this.items[i].el.style.strokeDashoffset = 0;
      this.items[i].el.classList.add("inked");
    }
  };

  /* ============================================================
     Stitch —— 红线缝合（SVG rect + 针脚虚线推进）
     ============================================================ */
  function Stitch(rectEl, opts) {
    opts = opts || {};
    var L = 1200;
    try { L = rectEl.getTotalLength(); } catch (e) {}
    this.el = rectEl;
    this.L = L;
    rectEl.style.strokeDasharray = "9 6";             /* 针脚：9px 线 + 6px 空 */
    rectEl.style.strokeDashoffset = L;
    this.dur = opts.duration || 3.2;
    this.running = false;
  }
  Stitch.prototype.play = function () {
    if (reduceMotion()) { this.el.style.strokeDashoffset = 0; return; }
    var el = this.el, L = this.L, dur = this.dur;
    this.running = true;
    var t0 = 0;
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / (dur * 1000));
      /* 缝合速度不均匀：前慢后快再收（手感） */
      var e2 = p < 0.7 ? (p / 0.7) * (p / 0.7) * 0.8 : 0.8 + ((p - 0.7) / 0.3) * 0.2;
      el.style.strokeDashoffset = L * (1 - Math.min(1, e2));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  /* ============================================================
     Fluorescent —— 日光灯频闪
     随机 4~8s 触发：80ms 青色（灯管余辉）或黑色（断电），可二连闪
     ============================================================ */
  function Fluorescent(overlayEl) {
    this.el = overlayEl;
    this.stopped = false;
    var self = this;
    function flashOnce(color) {
      self.el.style.background = color;
      self.el.style.opacity = "1";
      setTimeout(function () { self.el.style.opacity = "0"; }, 80);
    }
    function schedule() {
      if (self.stopped) return;
      var wait = 4000 + Math.random() * 4000;         /* 4~8s */
      setTimeout(function () {
        if (reduceMotion()) { schedule(); return; }   /* 降级：不闪 */
        var cyan = "rgba(158, 216, 208, 0.10)";
        var black = "rgba(0, 0, 0, 0.42)";
        if (Math.random() < 0.5) {
          flashOnce(Math.random() < 0.6 ? cyan : black);
          setTimeout(function () {                    /* 接触不良二连闪 */
            flashOnce(Math.random() < 0.5 ? cyan : black);
          }, 140);
        } else {
          flashOnce(cyan);
        }
        schedule();
      }, wait);
    }
    schedule();
  }

  /* ============================================================
     Parallax —— 3D 探头视差
     输入：鼠标 / 触摸 / 陀螺仪（deviceorientation）
     输出：每层 translate3d(tx*k, ty*k, 0)，rAF lerp 平滑
     ============================================================ */
  function Parallax(layers) {
    this.layers = layers;                    /* [{el, k}] */
    this.tx = 0; this.ty = 0;                /* 目标（-1~1） */
    this.cx = 0; this.cy = 0;                /* 当前 */
    this.running = false;
    var self = this;
    function onMouse(e) {
      self.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      self.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function onTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      self.tx = (t.clientX / window.innerWidth - 0.5) * 2;
      self.ty = (t.clientY / window.innerHeight - 0.5) * 2;
    }
    function onGyro(e) {
      if (e.gamma == null) return;
      var g = Math.max(-45, Math.min(45, e.gamma));
      var b = Math.max(-45, Math.min(45, (e.beta || 0) - 45));
      self.tx = g / 45; self.ty = b / 45;
    }
    this._detach = function () {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch, { passive: true });
      window.removeEventListener("deviceorientation", onGyro);
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("deviceorientation", onGyro);
    this._tick3 = function () {
      if (!self.running) return;
      self.cx += (self.tx - self.cx) * 0.06;          /* lerp 缓动 */
      self.cy += (self.ty - self.cy) * 0.06;
      for (var i = 0; i < self.layers.length; i++) {
        var L = self.layers[i];
        L.el.style.transform = "translate3d(" + (self.cx * L.k).toFixed(2) + "px," + (self.cy * L.k).toFixed(2) + "px,0)";
      }
      requestAnimationFrame(self._tick3);
    };
  }
  Parallax.prototype.start = function () {
    if (reduceMotion() || this.running) return;
    this.running = true;
    requestAnimationFrame(this._tick3);
  };
  Parallax.prototype.stop = function () {
    this.running = false; this._detach();
  };

  /* ============================================================
     index 初始化
     ============================================================ */
  function initIndex() {
    var fxCanvas = document.getElementById("fxCanvas");
    if (!fxCanvas) return;
    var isMobile = Math.min(window.innerWidth, window.innerHeight) < 500;

    /* 场景 A：粒子场（粉笔灰 ≤50 + 试卷/遗书物理坠落） */
    var dust = new DustField(fxCanvas, { max: isMobile ? 34 : 50 });
    var papers = new PaperFall(fxCanvas, { dust: dust, spawnEvery: 5, maxAlive: isMobile ? 2 : 3 });
    var loop = new Loop(dust, papers);
    if (reduceMotion()) {
      /* 降级：静帧渲染一帧（无动画），保留氛围 */
      dust.step(0.016); dust.draw();
    } else {
      loop.start();
    }

    /* 场景 C：3D 探头视差（背景 6px / 中景 14px / 前景 26px） */
    var bg = document.querySelector(".plx-bg");
    var mid = document.querySelector(".poster");
    var parallax = new Parallax([
      { el: bg, k: 7 },
      { el: mid, k: 14 },
      { el: fxCanvas, k: 26 }
    ]);
    parallax.start();

    /* 场景 B：血迹书写 */
    var svg = document.getElementById("bloodTitle");
    if (svg) {
      /* 血滴：落在标题底部，由 fx canvas 承载 */
      var drips = [];
      var dripOn = function (x, y, w) {
        for (var i = 0; i < 3; i++) {
          drips.push({
            x: x + (Math.random() - 0.5) * w * 0.7, y: y + Math.random() * 8,
            vy: 10 + Math.random() * 14, r: 1 + Math.random() * 1.8, a: 0.75
          });
        }
      };
      /* 血滴随主循环绘制（挂在 dust.step 后） */
      var _origStep = dust.step.bind(dust);
      dust.step = function (dt) {
        _origStep(dt);
        for (var i = drips.length - 1; i >= 0; i--) {
          var d = drips[i];
          d.vy += 90 * dt; d.y += d.vy * dt; d.a -= 0.5 * dt;
          if (d.a <= 0) drips.splice(i, 1);
        }
      };
      var _origDraw = dust.draw.bind(dust);
      dust.draw = function () {
        _origDraw();
        var ctx = dust.ctx;
        for (var i = 0; i < drips.length; i++) {
          var d = drips[i];
          ctx.globalAlpha = Math.max(0, d.a);
          ctx.fillStyle = "#7d1f1f";
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
      var bt = new BloodTitle(svg, { stagger: 0.38, charDur: 0.9, onDrip: dripOn });
      setTimeout(function () { bt.play(); }, 500);
    }

    /* 场景 E：红线缝合（档案卡） */
    var rect = document.getElementById("stitchRect");
    if (rect) setTimeout(function () { new Stitch(rect, { duration: 3.4 }).play(); }, 1100);

    /* 场景 D：日光灯频闪 */
    var fo = document.getElementById("flickerOverlay");
    if (fo) new Fluorescent(fo);
  }

  /* ============================================================
     home 初始化（粉尘背景 + 扫描线由 CSS 承担）
     ============================================================ */
  function initHome(canvasId) {
    var c = document.getElementById(canvasId || "dustCanvas");
    if (!c) return;
    var dust = new DustField(c, { max: 30, tint: "120, 128, 120", size: [0.5, 1.8] });
    if (reduceMotion()) { dust.step(0.016); dust.draw(); return; }
    var loop = new Loop(dust, new PaperFall(c, { dust: dust, spawnEvery: 9, maxAlive: 1, kinds: ["paper"] }));
    loop.start();
  }

  window.EC_ANIM = {
    DustField: DustField,
    PaperFall: PaperFall,
    Loop: Loop,
    BloodTitle: BloodTitle,
    Stitch: Stitch,
    Fluorescent: Fluorescent,
    Parallax: Parallax,
    reduceMotion: reduceMotion,
    initIndex: initIndex,
    initHome: initHome
  };
})();

/* ============================================================
   逃离程丽 - 自适应监视器
   职责：
   1. 修正移动端 100vh 抖动（用真实 innerHeight 写 --vh）
   2. 测量对话框真实高度，写回 --dialog-h
   3. 计算立绘可用高度，写回 --sprite-h，保证立绘完整不被挡
   4. 监听 resize / orientationchange / 字体加载完成
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;

  function isDesktop() {
    // 宽 > 1024 且非粗指针，判定为电脑
    var wide = window.innerWidth >= 1024;
    var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    return wide && fine;
  }

  function applyViewportUnit() {
    // 真机地址栏收起/弹出会导致 100vh 变化，用真实值替代
    root.style.setProperty("--vh", (window.innerHeight * 0.01) + "px");
  }

  function measureDialog() {
    var wrap = document.getElementById("dialogWrap");
    if (!wrap) return 0;
    // 对话框整体（名字栏 + 文字框 + 选项区）的实际高度
    var h = wrap.getBoundingClientRect().height;
    if (h > 0) root.style.setProperty("--dialog-h", Math.ceil(h) + "px");
    return h;
  }

  function computeSpriteHeight() {
    var wrap = document.getElementById("dialogWrap");
    var dialogH = wrap ? wrap.getBoundingClientRect().height : 200;
    var hud = document.querySelector(".hud");
    var hudH = hud ? hud.getBoundingClientRect().height : 40;

    // 立绘可用高度 = 视口高 - 对话框 - HUD - 一点余量
    var avail = window.innerHeight - dialogH - hudH - 8;
    var minH = Math.max(120, window.innerHeight * 0.28);
    if (avail < minH) avail = minH;
    root.style.setProperty("--sprite-h", Math.ceil(avail) + "px");
  }

  function relayout() {
    applyViewportUnit();
    measureDialog();
    computeSpriteHeight();
    // 触发一次重绘，让立绘重新按新高度布局
    var layer = document.getElementById("spriteLayer");
    if (layer) { void layer.offsetHeight; }
  }

  var raf = null;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(relayout);
  }

  // 尺寸变化 / 旋转
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", function () {
    // 旋转后要等布局稳定，多次采样
    setTimeout(schedule, 60);
    setTimeout(schedule, 260);
    setTimeout(schedule, 600);
  });

  // 选项出现 / 文字增多时对话框高度会变，用观察器盯着
  if (window.ResizeObserver) {
    var wrap = document.getElementById("dialogWrap");
    if (wrap) {
      var ro = new ResizeObserver(function () { schedule(); });
      ro.observe(wrap);
    }
  }

  // 字体加载完成后重新量一次
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule);
  }

  // 页面真正可见时（从后台切回）再量一次
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) schedule();
  });

  // 暴露给外部，切换节点/立绘时可手动调用
  window.__relayout = relayout;

  // 初始
  relayout();
  setTimeout(relayout, 120);
  setTimeout(relayout, 400);

  // 记录设备类型，方便调试（不影响显示）
  root.setAttribute("data-device", isDesktop() ? "desktop" : "mobile");

})();

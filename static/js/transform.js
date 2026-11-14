/* ============================================================
   逃离程丽 · 画风转换 transform.js v6
   已彻底移除闪烁：不再有白闪 / 黑闪 / 撕裂 / 噪点跳动
   只保留柔和的、有呼吸感的过渡

   时间线：
     0.0 ~ 2.2s   清新 Apple 风格
     2.2s         柔和过渡到诡异态（一次，不反复）
     之后         安静保持（无任何周期性闪烁）
   ============================================================ */
(function () {
  "use strict";

  var body = document.body;
  if (!body) return;

  var reduce = window.matchMedia &&
               window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toHorror(){
    body.classList.remove("mode-normal");
    body.classList.add("mode-horror");
  }
  function toNormal(){
    body.classList.remove("mode-horror");
    body.classList.add("mode-normal");
  }

  /* 柔和进入诡异态：加一个短暂的整体过渡类（无闪烁） */
  function enterHorror(){
    toHorror();
    var target = document.querySelector(".main-inner") ||
                 document.querySelector(".main") || body;
    target.classList.add("fx-enter-horror");
    setTimeout(function () {
      target.classList.remove("fx-enter-horror");
    }, 900);
  }

  function run(){
    toNormal();

    // 尊重减少动效：直接进入诡异态，不做过渡
    if (reduce) { toHorror(); return; }

    // 2.2s 后柔和过渡到诡异态（仅一次）
    setTimeout(enterHorror, 2200);
  }

  /* ---------- 对外接口 ---------- */
  window.__toNormal = toNormal;
  window.__toHorror = toHorror;
  // 兼容旧调用名（不再产生闪烁）
  window.__glitchBurst = function(){ enterHorror(); };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else { run(); }
})();

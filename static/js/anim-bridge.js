/* anim-bridge.js —— 补齐静态版缺失的 UI 动画（配合 Animate.css） */
(function(){
  "use strict";
  function $(s){ return document.querySelector(s); }
  function ready(fn){ if(document.readyState!="loading") fn(); else document.addEventListener("DOMContentLoaded",fn); }

  /* 全局配置：根据用户偏好决定是否禁用动画 */
  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function play(el, cls){
    if (!el || REDUCE) return;
    el.classList.remove(cls);
    void el.offsetWidth;   /* 强制重排，让动画能重播 */
    el.classList.add(cls);
  }

  ready(function(){
    /* ---------- 1. 对话框文字切换：轻微上浮淡入 ---------- */
    var textEl = document.getElementById("dialogText");
    if (textEl) {
      var mo = new MutationObserver(function(){
        play(textEl, "animate__animated animate__fadeIn");
      });
      mo.observe(textEl, { childList: true, characterData: true, subtree: true });
    }

    /* ---------- 2. 选项按钮：逐个滑入 ---------- */
    var choicesBox = document.getElementById("choicesBox");
    if (choicesBox) {
      var mo2 = new MutationObserver(function(){
        var btns = choicesBox.querySelectorAll(".choice-btn");
        btns.forEach(function(b, i){
          if (b.dataset.animDone) return;
          b.dataset.animDone = "1";
          b.style.animationDelay = (i * 0.05) + "s";
          play(b, "animate__animated animate__fadeInUp");
        });
      });
      mo2.observe(choicesBox, { childList: true });
    }

    /* ---------- 3. 菜单 / 章节 / 设置弹窗：卡片弹入 ---------- */
    ["menuOverlay","chaptersOverlay","settingsOverlay","endingOverlay"].forEach(function(id){
      var ov = document.getElementById(id);
      if (!ov) return;
      var mo3 = new MutationObserver(function(){
        if (ov.classList.contains("show")) {
          var card = ov.querySelector(".menu-card,.chapters-card,.settings-card,.ending-card");
          if (card) play(card, "animate__animated animate__zoomIn");
        }
      });
      mo3.observe(ov, { attributes: true, attributeFilter: ["class"] });
    });

    /* ---------- 4. 顶栏恐惧值变化：抖动一下 ---------- */
    var sanNum = document.getElementById("sanNum");
    if (sanNum) {
      var lastSan = sanNum.textContent;
      var mo4 = new MutationObserver(function(){
        if (sanNum.textContent !== lastSan) {
          lastSan = sanNum.textContent;
          play(sanNum, "animate__animated animate__headShake");
        }
      });
      mo4.observe(sanNum, { childList: true, characterData: true, subtree: true });
    }

    /* ---------- 5. 立绘出现：柔和放大 ---------- */
    var spriteLayer = document.getElementById("spriteLayer");
    if (spriteLayer) {
      var mo5 = new MutationObserver(function(){
        var img = spriteLayer.querySelector("img");
        if (img && !img.dataset.animDone) {
          img.dataset.animDone = "1";
          play(img, "animate__animated animate__fadeInUp");
        }
      });
      mo5.observe(spriteLayer, { childList: true });
    }

    /* ---------- 6. 背景切换：淡入 ---------- */
    var bg = document.getElementById("bgLayer");
    if (bg) {
      var mo6 = new MutationObserver(function(){
        if (bg.classList.contains("show")) {
          play(bg, "animate__animated animate__fadeIn");
        }
      });
      mo6.observe(bg, { attributes: true, attributeFilter: ["class"] });
    }
  });
})();

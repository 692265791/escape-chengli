/* ============================================================
   anim-bridge.js（v4 · 事件订阅版）
   - 修复：play() 对含空格的多类名字符串 split(/\s+/) 后逐个操作
   - 架构：移除全部 6 个 MutationObserver（在无头/自动化环境下与
     高频 DOM 突变相互作用会冻结事件循环；真实浏览器中也是
     每行台词若干次无谓回调）。改为订阅引擎派发的 story* 事件，
     与剧情渲染逻辑完全解耦。
   - 引擎事件：storyline / storychoice / storysan / storysprite /
     storybg / storyoverlay
   - 无障碍：prefers-reduced-motion / body.no-anim / body.skipping
     时不播放入场动画
   ============================================================ */
(function(){
  "use strict";

  function reduceMotion(){
    try {
      if (document.body && (document.body.classList.contains("no-anim") ||
          document.body.classList.contains("skipping"))) return true;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch(e) { return false; }
  }

  /* 修复：classList 不接受含空格的多类名字符串，必须拆分后逐个操作；
     性能：以 rAF 重置动画代替 void offsetWidth 强制回流 */
  function play(el, cls){
    if (!el || !cls || reduceMotion()) return;
    var toks = String(cls).split(/\s+/).filter(Boolean);
    if (!toks.length) return;
    toks.forEach(function(c){ try { el.classList.remove(c); } catch(e){} });
    requestAnimationFrame(function(){
      if (reduceMotion()) return;
      toks.forEach(function(c){ try { el.classList.add(c); } catch(e){} });
    });
  }

  function on(name, fn){ window.addEventListener(name, function(e){ try { fn(e.detail || {}); } catch(err){} }); }

  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function(){

    /* ---------- 1. 对话文字：轻微上浮淡入 ---------- */
    on("storyline", function(){
      var el = document.getElementById("dialogText");
      if (el) play(el, "ec-in ec-in-up");
    });

    /* ---------- 2. 选项按钮：逐个滑入（交错延迟） ---------- */
    on("storychoice", function(detail){
      var box = document.getElementById("choicesBox");
      if (!box) return;
      var btns = box.querySelectorAll(".choice-btn");
      btns.forEach(function(b, i){
        if (b.dataset.animDone) return;
        b.dataset.animDone = "1";
        b.style.animationDelay = (i * 0.06) + "s";
        play(b, "ec-in ec-in-choice");
      });
    });

    /* ---------- 3. 弹层卡片：弹入 ---------- */
    on("storyoverlay", function(detail){
      var ov = detail && detail.id ? document.getElementById(detail.id) : null;
      if (!ov) return;
      var card = ov.querySelector(".menu-card,.chapters-card,.settings-card,.save-card,.ending-card");
      if (card) play(card, "ec-in ec-in-card");
    });

    /* ---------- 4. 恐惧值变化：抖动一下 ---------- */
    on("storysan", function(detail){
      var el = document.getElementById("sanNum");
      if (el && detail && detail.changed) play(el, "ec-in ec-in-shake");
    });

    /* ---------- 5. 立绘出现：柔和放大 ---------- */
    on("storysprite", function(){
      var layer = document.getElementById("spriteLayer");
      if (!layer) return;
      var img = layer.querySelector("img");
      if (img && !img.dataset.animDone) {
        img.dataset.animDone = "1";
        play(img, "ec-in ec-in-fade");
      }
    });

    /* ---------- 6. 背景切换：淡入 ---------- */
    on("storybg", function(){
      var bg = document.getElementById("bgLayer");
      if (bg && bg.classList.contains("show")) play(bg, "ec-in ec-in-fade");
    });

  });
})();

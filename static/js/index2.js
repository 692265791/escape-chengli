/* ============================================================
   逃离程丽 v2.0 · 主页交互 index2.js
   ============================================================ */
(function () {
  "use strict";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function reveal() {
    var els = document.querySelectorAll(".sec, .hero-inner, .feat, .tl-item, .th");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    els.forEach(function (el) {
      el.style.opacity = 0;
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity .6s ease, transform .6s ease";
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.style.opacity = 1;
          en.target.style.transform = "none";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  function smoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        var t = document.getElementById(id);
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function checkLogin() {
    
  }

  function init() { reveal(); smoothAnchors(); checkLogin(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

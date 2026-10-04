/* ui_patch.js —— 逃离程丽 · 手机端交互
   菜单（向上展开）+ UI设置（字号/圆角/主题/动画）+ 存读档面板
   设置存 localStorage（与 settings.js 同键，避免互相覆盖）
*/
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function on(el, fn) { if (el) el.addEventListener("click", fn); }
  function fire(id) { var b = $(id); if (b) b.click(); }

  /* ---------- 设置存储（localStorage 同键） ---------- */
  var KEY = "escape_chengli_settings";
  var DEF = { fontScale: 100, speed: 60, anim: true, horror: true, noise: 50, dark: true, radius: 12 };
  function loadCfg() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEF); }
  }
  function saveCfg(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }

  var cfg = loadCfg();

  function applyCfg() {
    var root = document.documentElement, body = document.body;
    root.style.setProperty("--fs-scale", (cfg.fontScale / 100).toFixed(2));
    window.__typeSpeed = Math.round(80 - (cfg.speed / 100) * 72);
    body.classList.toggle("ui-dark", !!cfg.dark);
    body.classList.toggle("no-anim", !cfg.anim);
    body.classList.toggle("no-horror", !cfg.horror);
    // 圆角变量
    var r = (cfg.radius == null ? 12 : cfg.radius) + "px";
    root.style.setProperty("--ui-radius", r);
    root.style.setProperty("--radius", r);
    root.style.setProperty("--min-radius", r);
    saveCfg(cfg);
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  /* ---------- 菜单 ---------- */
  var wrap = document.querySelector(".qk-wrap");
  var panel = $("qkPanel");
  function closePanel() { if (panel) panel.classList.remove("on"); }
  on($("qkMenuBtn"), function (e) { e.stopPropagation(); if (panel) panel.classList.toggle("on"); });
  on($("qkClose"), closePanel);

  /* ---------- 存/读档面板 ---------- */
  var saveOv = $("saveOverlay"), saveList = $("saveList"), saveName = $("saveName"), saveTitle = $("saveTitle"), saveConfirm = $("saveConfirm");
  var saveMode = "save";
  on($("qkSave"), function () { closePanel(); openSave("save"); });
  on($("qkLoad"), function () { closePanel(); openSave("load"); });
  on($("saveClose"), function () { if (saveOv) saveOv.classList.remove("show"); });
  if (saveOv) saveOv.addEventListener("click", function (e) { if (e.target === saveOv) saveOv.classList.remove("show"); });

  function api() { return window.GAME_API || {}; }
  function openSave(mode) {
    saveMode = mode;
    if (saveOv) saveOv.classList.add("show");
    if (saveTitle) saveTitle.textContent = (mode === "save" ? "保存进度" : "读取进度");
    if (saveName) saveName.style.display = (mode === "save" ? "" : "none");
    if (saveConfirm) saveConfirm.textContent = (mode === "save" ? "保存到这里" : "读取选中");
    refreshSaves();
  }
  function refreshSaves() {
    if (!saveList) return;
    saveList.innerHTML = '<p style="color:#8a8a8e;font-size:13px">读取中…</p>';
    
  }
  if (saveConfirm) saveConfirm.addEventListener("click", function () {
    var active = saveList ? saveList.querySelector(".save-item.active") : null;
    var slot = active ? parseInt(active.dataset.slot, 10) : 0;
    if (saveMode === "save") {
      var nm = saveName ? saveName.value.trim() : "";
      } else {
      }
  });
  /* ---------- 存/读档面板（新版） ---------- */
  var saveOv = $("saveOverlay"), saveList = $("saveList"), saveTitle = $("saveTitle");
  var saveClose = $("saveClose");
  var saveMode = "save";

  function closeSave(){ if (saveOv) saveOv.classList.remove("show"); }
  on($("qkSave"), function () { closePanel(); openSave("save"); });
  on($("qkLoad"), function () { closePanel(); openSave("load"); });
  if (saveClose) saveClose.addEventListener("click", closeSave);
  if (saveOv) saveOv.addEventListener("click", function(e){ if (e.target === saveOv) closeSave(); });

  function openSave(mode){
    saveMode = mode;
    if (saveOv) saveOv.classList.add("show");
    if (saveTitle) saveTitle.textContent = (mode === "save" ? "保存进度" : "读取进度");
    refreshSaves();
  }

  function refreshSaves(){
    if (!saveList) return;
    saveList.innerHTML = "";
    var S = window.__SAVE_SYSTEM;

    /* 自动存档行 */
    if (S && S.loadAuto()){
      var auto = S.loadAuto();
      var row = document.createElement("div");
      row.className = "save-item auto";
      row.innerHTML =
        '<div class="save-info">' +
          '<b>自动存档</b>' +
          '<span>' + (auto.chapter || "?") + ' · ' + (auto.node_id || "") + ' · ' + (auto.time || "") + '</span>' +
        '</div>' +
        '<div class="save-acts">' +
          (saveMode === "load" ? '<button class="save-btn" data-act="loadauto">读取</button>' : '') +
        '</div>';
      if (saveMode === "load"){
        row.querySelector('[data-act="loadauto"]').addEventListener("click", function(e){
          e.stopPropagation();
          if (S.apply(auto)) closeSave();
        });
      }
      saveList.appendChild(row);
    }

    /* 3 个手动存档 */
    var all = S ? S.loadAll() : {};
    for (var slot = 1; slot <= 3; slot++){
      (function(s){
        var d = all[s];
        var row = document.createElement("div");
        row.className = "save-item" + (d ? "" : " empty");
        var info = d
          ? '<b>存档 ' + s + ' · ' + (d.name || "") + '</b><span>' + (d.chapter || "?") + ' · ' + (d.node_id || "") + ' · ' + (d.time || "") + '</span>'
          : '<b>存档 ' + s + '</b><span class="empty">空</span>';
        var acts = '<div class="save-acts">';
        if (saveMode === "save"){
          acts += '<button class="save-btn" data-act="save">' + (d ? "覆盖" : "保存") + '</button>';
          if (d) acts += '<button class="save-btn danger" data-act="del">删除</button>';
        } else {
          if (d){
            acts += '<button class="save-btn" data-act="load">读取</button>';
            acts += '<button class="save-btn danger" data-act="del">删除</button>';
          }
        }
        acts += '</div>';
        row.innerHTML = '<div class="save-info">' + info + '</div>' + acts;

        var saveBtn = row.querySelector('[data-act="save"]');
        var loadBtn = row.querySelector('[data-act="load"]');
        var delBtn = row.querySelector('[data-act="del"]');

        if (saveBtn) saveBtn.addEventListener("click", function(e){
          e.stopPropagation();
          var nm = prompt("存档名：", d ? (d.name || ("存档 " + s)) : ("存档 " + s));
          if (nm === null) return;
          if (S) S.save(s, nm || ("存档 " + s));
          refreshSaves();
        });
        if (loadBtn) loadBtn.addEventListener("click", function(e){
          e.stopPropagation();
          if (S && S.apply(d)) closeSave();
        });
        if (delBtn) delBtn.addEventListener("click", function(e){
          e.stopPropagation();
          if (!confirm("删除存档 " + s + " ？")) return;
          if (S) S.del(s);
          refreshSaves();
        });

        saveList.appendChild(row);
      })(slot);
    }
  }

  on($("qkHome"), function () { location.href = "index.html"; });

  /* ---------- 章节 ---------- */
  var chapters = $("chaptersOverlay"), chapterList = $("chapterList"), chaptersLoaded = false;
  on($("qkChapters"), function () { closePanel(); openChapters(); });
  function openChapters() {
    if (chapters) chapters.classList.add("show");
    if (chaptersLoaded || !chapterList) return;
    var api = (window.GAME_API && window.GAME_API.chapters) || "chapters.json";
    fetch(api).then(function (r) { return r.json(); }).then(function (d) {
      var list = (d && d.chapters) || d || [];
      chapterList.innerHTML = "";
      if (!list.length) { chapterList.innerHTML = '<p style="color:#8a8a8e;font-size:13px">暂无章节</p>'; return; }
      list.forEach(function (c) {
        var b = document.createElement("button"); b.type = "button";
        b.textContent = (c.title || c.name || c.id || "章节");
        b.addEventListener("click", function () {
          if (chapters) chapters.classList.remove("show");
          location.replace("game.html?chapter=" + (c.id || "ch1") + "&t=" + Date.now());
        });
        chapterList.appendChild(b);
      });
      chaptersLoaded = true;
    }).catch(function () { if (chapterList) chapterList.innerHTML = '<p style="color:#8a8a8e;font-size:13px">加载失败</p>'; });
  }

  /* ---------- UI 设置 ---------- */
  var settings = $("settingsOverlay");
  on($("qkSettings"), function () { closePanel(); openSettings(); });
  function openSettings() {
    if (settings) settings.classList.add("show");
    var f = $("setFont"), sp = $("setSpeed"), dk = $("setDark"), an = $("setAnim"), rd = $("setRadius");
    if (f) { f.value = cfg.fontScale; $("setFontVal").textContent = cfg.fontScale + "%"; }
    if (sp) { sp.value = cfg.speed; $("setSpeedVal").textContent = cfg.speed; }
    if (dk) dk.checked = !!cfg.dark;
    if (an) an.checked = !!cfg.anim;
    if (rd) { rd.value = cfg.radius; var rv = $("setRadiusVal"); if (rv) rv.textContent = cfg.radius; }
  }
  (function bindUI() {
    var f = $("setFont"), sp = $("setSpeed"), dk = $("setDark"), an = $("setAnim"), rd = $("setRadius");
    if (f) f.addEventListener("input", function () { cfg.fontScale = parseInt(f.value, 10); $("setFontVal").textContent = cfg.fontScale + "%"; applyCfg(); });
    if (sp) sp.addEventListener("input", function () { cfg.speed = parseInt(sp.value, 10); $("setSpeedVal").textContent = cfg.speed; applyCfg(); });
    if (dk) dk.addEventListener("change", function () { cfg.dark = dk.checked; applyCfg(); });
    if (an) an.addEventListener("change", function () { cfg.anim = an.checked; applyCfg(); });
    if (rd) rd.addEventListener("input", function () { cfg.radius = parseInt(rd.value, 10); var rv = $("setRadiusVal"); if (rv) rv.textContent = cfg.radius; applyCfg(); });
    var rs = $("btnResetSettings");
    if (rs) rs.addEventListener("click", function () { cfg = Object.assign({}, DEF); applyCfg(); openSettings(); });
    var cl = $("btnCloseSettings");
    if (cl) cl.addEventListener("click", function () { if (settings) settings.classList.remove("show"); });
    if (settings) settings.addEventListener("click", function (e) { if (e.target === settings) settings.classList.remove("show"); });
  })();

  /* 首次应用 */
  applyCfg();

  document.addEventListener("click", function (e) { if (wrap && !wrap.contains(e.target)) closePanel(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
})();

/* ---------- 章节黑幕过渡 ---------- */
(function(){
  if (!document.getElementById("chapFade")) {
    var f = document.createElement("div");
    f.id = "chapFade"; f.className = "chap-fade";
    var t = document.createElement("div");
    t.className = "chap-fade-title"; t.id = "chapFadeTitle";
    f.appendChild(t);
    document.body.appendChild(f);
  }
  var fadeEl = document.getElementById("chapFade");
  var titleEl = document.getElementById("chapFadeTitle");
  var CHAP_START = { "c2_b1": "第二章 · 混乱", "ch1_gate": "第一章 · 初见" };
  var wrapped = false;
  function wrapGoto() {
    if (wrapped || typeof window.__goto !== "function") return false;
    var orig = window.__goto;
    window.__goto = function(id) {
      if (CHAP_START[id]) {
        titleEl.textContent = CHAP_START[id];
        fadeEl.classList.add("show");
        setTimeout(function(){ orig(id); }, 620);
        setTimeout(function(){ fadeEl.classList.remove("show"); }, 1500);
        return;
      }
      return orig(id);
    };
    wrapped = true;
    return true;
  }
  if (!wrapGoto()) {
    var tries = 0;
    var iv = setInterval(function(){ if (wrapGoto() || ++tries > 40) clearInterval(iv); }, 100);
  }
})();

/* ---------- 地图按钮（第2章校园段显示） ---------- */
(function(){
  function $(id){ return document.getElementById(id); }
  var btn = $("qkMap");
  var lastMap = null;
  /* 记录最近一次节点的 map 数据（game.js 会调 __setMap 传入） */
  window.__setMapData = function(m){ lastMap = m; };
  window.__setMapBtn = function(show){
    if (!btn) return;
    btn.style.display = show ? "" : "none";
  };
  if (btn){
    btn.addEventListener("click", function(){
      var p = $("qkPanel"); if (p) p.classList.remove("on");
    });
  }
})();

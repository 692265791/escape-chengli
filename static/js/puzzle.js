/**************************************************************
   Escape Chengli - Chapter 2 engine:
   bag / puzzle / hint / timer
   window.__PUZZLE
   ************************************************************** */
(function () {
  "use strict";

  var ITEMS = {};
  var BAG = [];
  var usedHintAt = {};
  var HINT_COOLDOWN = 30000;
  var activeTimer = null;
  var toastTimer = null;

  function $(s){ return document.querySelector(s); }
  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function defineItems(list){
    (list||[]).forEach(function(it){ ITEMS[it.id] = it; });
  }
  function addItem(id){
    if (BAG.indexOf(id) === -1) BAG.push(id);
    renderBag();
    toast("\u83b7\u5f97\u7269\u54c1\uff1a" + (ITEMS[id] ? ITEMS[id].name : id));
  }
  function removeItem(id){
    var i = BAG.indexOf(id);
    if (i !== -1) BAG.splice(i,1);
    renderBag();
  }
  function hasItem(id){ return BAG.indexOf(id) !== -1; }
  function getBag(){ return BAG.slice(); }

  function ensureBagUI(){
    if ($("#bagBtn")) return;
    var btn = el("button", "topbar-btn", "\u80cc\u5305");
    btn.id = "bagBtn";
    btn.addEventListener("click", toggleBag);
    var right = $(".topbar-right");
    if (right) right.insertBefore(btn, right.firstChild);

    var overlay = el("div", "bag-overlay");
    overlay.id = "bagOverlay";
    overlay.innerHTML = '<div class="bag-card"><h3>\u80cc\u5305</h3><div class="bag-grid" id="bagGrid"></div><button class="set-close" id="bagClose">\u5173\u95ed</button></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function(e){ if(e.target===overlay) toggleBag(); });
    $("#bagClose").addEventListener("click", toggleBag);
  }
  function toggleBag(){ var o=$("#bagOverlay"); if(o) o.classList.toggle("show"); renderBag(); }
  function renderBag(){
    var g = $("#bagGrid"); if(!g) return;
    g.innerHTML = "";
    if (!BAG.length){ g.innerHTML = '<p class="bag-empty">\u80cc\u5305\u662f\u7a7a\u7684\u3002</p>'; return; }
    BAG.forEach(function(id){
      var it = ITEMS[id] || {name:id, desc:""};
      var c = el("div", "bag-item", '<div class="bag-ic">'+(it.icon||"\ud83d\udce6")+'</div><div class="bag-nm">'+it.name+'</div>');
      c.title = it.desc || "";
      c.addEventListener("click", function(){ inspectItem(id); });
      g.appendChild(c);
    });
  }
  function inspectItem(id){
    var it = ITEMS[id]; if(!it) return;
    toast(it.name + " \u2014 " + (it.desc||""));
  }

  function hintRemain(pz){
    var last = usedHintAt[pz] || 0;
    var left = HINT_COOLDOWN - (Date.now() - last);
    return left > 0 ? left : 0;
  }
  function useHint(pz, hints, onShow){
    var left = hintRemain(pz);
    if (left > 0){
      toast("\u63d0\u793a\u51b7\u5374\u4e2d\uff0c\u8017\u9700 " + Math.ceil(left/1000) + " \u7912");
      return false;
    }
    var nkey = pz + String.fromCharCode(58) + String.fromCharCode(110);
    var idx = usedHintAt[nkey] || 0;
    usedHintAt[nkey] = idx + 1;
    var h = (hints && hints[Math.min(idx, hints.length-1)]) || "\u518d\u4ed4\u7ec6\u7ec6\u770b\u5434\u56f4";
    if (onShow) onShow(h); else toast("\u63d0\u793a\uff1a" + h);
    return true;
  }

  function startTimer(sec, onTick, onEnd){
    stopTimer();
    var end = Date.now() + sec*1000;
    activeTimer = setInterval(function(){
      var left = Math.max(0, Math.round((end - Date.now())/1000));
      if (onTick) onTick(left);
      if (left <= 0){ stopTimer(); if(onEnd) onEnd(); }
    }, 250);
    if (onTick) onTick(sec);
  }
  function stopTimer(){ if(activeTimer){ clearInterval(activeTimer); activeTimer=null; } }

  function toast(msg){
    var t = $("#pzToast");
    if(!t){ t = el("div","pz-toast"); t.id="pzToast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2600);
  }

  window.__PUZZLE = {
    defineItems: defineItems, addItem: addItem, removeItem: removeItem,
    hasItem: hasItem, getBag: getBag,
    ensureBagUI: ensureBagUI, renderBag: renderBag, toggleBag: toggleBag,
    useHint: useHint, hintRemain: hintRemain, HINT_COOLDOWN: HINT_COOLDOWN,
    startTimer: startTimer, stopTimer: stopTimer, toast: toast,
    $: $, el: el
  };
})();

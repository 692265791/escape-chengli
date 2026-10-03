/* ============================================================
   逃离程丽 - 游戏主逻辑 v3
   剧情引擎 / 打字机 / 选项 / SAN / 存读档 / 过渡动画 / 章节 / 小游戏
   ============================================================ */
(function () {
  "use strict";

  var STORY = null;
  var IMAGES = {};
  var node = null;
  var nodeId = "";
  var lines = [];
  var lineIdx = 0;
  var typing = false;
  var vars = {};
  var finished = false;
  var typeTimer = null;
  var lastBg = "";

  // DOM
  var $bg      = document.getElementById("bgLayer");
  var $bgNext  = document.getElementById("bgNext");
  var $sprite  = document.getElementById("spriteLayer");
  var $speaker = document.getElementById("speakerBar");
  var $name    = document.getElementById("speakerName");
  var $chapter = document.getElementById("chapterTag");
  var $text    = document.getElementById("dialogText");
  var $hint    = document.getElementById("nextHint");
  var $choices = document.getElementById("choicesBox");
  var $textBox = document.getElementById("textBox");
  var $sanFill = document.getElementById("sanFill");
  var $sanNum  = document.getElementById("sanNum");
  var $memFill = document.getElementById("memFill");
  var $memNum  = document.getElementById("memNum");
  var $stamFill = document.getElementById("stamFill");
  var $stamNum  = document.getElementById("stamNum");
  var $flicker = document.getElementById("flickerLayer");
  var $flash   = document.getElementById("flashLayer");

  // ============================================================
  //  初始化
  // ============================================================
  function boot() {
    var _ch = "";
    try { _ch = new URLSearchParams(location.search).get("chapter") || ""; } catch(e){}
    var storyFile = (_ch === "ch2") ? "ch2.json" : "story.json";
    Promise.all([
      fetch(storyFile).then(function(r){ return r.json(); }),
      fetch("images.json").then(function(r){ return r.json(); }).catch(function(){ return {}; })
    ]).then(function(arr){
      var data = arr[0];
      var imgMap = arr[1] || {};
      STORY = data.story || data;
      if (!STORY || !STORY.nodes) { alert("剧情加载失败"); return; }
      // 用 images.json 的映射，替换掉裸 key
      IMAGES = {};
      for (var k in imgMap) IMAGES[k] = imgMap[k];
      var _sv = {};
      try { _sv = JSON.parse(localStorage.getItem("ec_vars") || "{}"); } catch(e){}
      vars = Object.assign({ san: 0, memory: 100, trust: 0, obey: 0, stamina: 100 }, _sv, (STORY.meta && STORY.meta.vars) || {});
      if (vars.memory == null || vars.memory <= 0) vars.memory = 100;
      updateSan();
      var _start = STORY.meta.start || "start";
      var _chapter = STORY.meta.chapter || "";
      setChapter(_chapter);
      goto(_start);
    }).catch(function(e){ alert("加载出错：" + e); });
  }

  function setChapter(t) { if ($chapter) $chapter.textContent = t; }
  var __lastChapter = "";
  function __CHAPTER_OF(id){
    if (/^c2_/.test(id)) return "第二章 · 混乱";
    if (/^c3_/.test(id)) return "第三章 · 终章";
    if (/^ch1_/.test(id)) return "第一章 · 初见";
    return "";
  }
  function __autoChapter(id){
    var c=__CHAPTER_OF(id);
    if (c && c!==__lastChapter){ __lastChapter=c; setChapter(c); }
  }

  // ============================================================
  //  进入节点
  // ============================================================
  function goto(id) {
    var n = STORY.nodes[id];
    if (!n) { console.warn("节点不存在：" + id); return; }
    /* autoSave disabled */
    if (typeof window.__lazyTick === "function") window.__lazyTick();
    nodeId = id;
    node = n;
    __autoChapter(id);
    lines = n.lines || [];
    lineIdx = 0;
    $choices.classList.remove("show");
    $choices.innerHTML = "";

    if (n.bg) {
      var url = IMAGES[n.bg] || ("static/img/" + n.bg);
      if (url !== lastBg) {
        crossFadeBg(url);
        lastBg = url;
      }
    }

    renderSprite(n.sprite, n.spriteAnim);
    playAnim(n.anim);
    if (n.fx && window.__FX) window.__FX.play(n.fx);
    if (window.__TIME){
      if (n.time!=null) window.__TIME.setPhase(n.time);
      if (n.stamina) { vars.stamina = Math.max(0, Math.min(100, (vars.stamina==null?100:vars.stamina) + n.stamina)); updateSan(); }
      if (n.sleep){ window.__TIME.sleep(function(){ if(n.sleepNext) goto(n.sleepNext); }); return; }
    }
      if (typeof window.__CH2_ON_NODE === "function"){
      var _h = window.__CH2_ON_NODE(n, { goto: goto, hideChoices: function(){ if($choices) $choices.classList.remove("show"); if($hint) $hint.classList.add("hidden"); } });
      if (_h) return;
    }

    if (n.page) {
      showFullPage(lines, function () {
        if (n.next) goto(n.next); else showChoices(n);
      });
      return;
    }

    if (n.effects) applyEffects(n.effects);
    playLine();
  }

  function crossFadeBg(url) {
    $bgNext.style.backgroundImage = "url('" + url + "')";
    $bgNext.classList.add("show", "zoom");
    setTimeout(function () {
      $bg.style.backgroundImage = "url('" + url + "')";
      $bgNext.classList.remove("show", "zoom");
    }, 800);
  }

  // ============================================================
  //  小游戏（剧情节点驱动）
  // ============================================================
  function runNodeMinigame(n) {
    var mg = n.minigame || {};
    if (window.__relayout) setTimeout(window.__relayout, 30);
    var _t = mg.type || "qte";
    var _fn = (window.__MINIGAMES && window.__MINIGAMES[_t]) || window.__runMinigame;
    _fn(_t, mg.opts || {}, function (res) {
      if (mg.winEffects && res.win) applyEffects(mg.winEffects);
      if (mg.loseEffects && !res.win) applyEffects(mg.loseEffects);
      if (vars.san >= 100) return;
      var next = res.win ? (mg.winNext || n.next || "") : (mg.loseNext || n.next || "");
      if (next) { goto(next); }
      else { showChoices(n); }
    });
  }

  // ============================================================
  //  立绘渲染
  // ============================================================
  function renderSprite(key, anim) {
    $sprite.innerHTML = "";
    if (!key) { if (window.__relayout) setTimeout(window.__relayout, 30); return; }
    var url = IMAGES[key] || ("static/img/" + key);
    var img = document.createElement("img");
    img.src = url;
    img.onerror = function () { $sprite.innerHTML = ""; };
    if (key.indexOf("normal") !== -1 || key.indexOf("smile") !== -1 || key.indexOf("yushuo") !== -1) {
      img.classList.add("breathe");
    }
    if (anim === "slideIn") img.classList.add("slide-in");
    else if (anim === "approach") img.classList.add("approach");
    else if (anim === "leave") img.classList.add("leave");
    $sprite.appendChild(img);
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  // ============================================================
  //  特效
  // ============================================================
  function playAnim(anim) {
    if (!anim || anim === "none") return;
    if (document.body.classList.contains("no-horror")) return;
    if (anim === "flash") {
      $flash.classList.add("on");
      setTimeout(function () { $flash.classList.remove("on"); }, 520);
    } else if (anim === "blackout") {
      $flicker.classList.add("on");
      setTimeout(function () { $flicker.classList.remove("on"); }, 200);
    } else if (anim === "shake") {
      document.body.classList.add("anim-shake");
      setTimeout(function () { document.body.classList.remove("anim-shake"); }, 600);
    } else if (anim === "glitch") {
      document.body.classList.add("anim-glitch");
      setTimeout(function () { document.body.classList.remove("anim-glitch"); }, 700);
    } else if (anim === "heartbeat") {
      document.body.classList.add("anim-heartbeat");
      setTimeout(function () { document.body.classList.remove("anim-heartbeat"); }, 1800);
    } else if (anim === "zoom") {
      document.body.classList.add("anim-zoom");
      setTimeout(function () { document.body.classList.remove("anim-zoom"); }, 900);
    } else if (anim === "flashFade") {
      $flash.classList.add("on");
      setTimeout(function () { $flash.classList.remove("on"); }, 200);
      setTimeout(function () { $flicker.classList.add("on"); }, 220);
      setTimeout(function () { $flicker.classList.remove("on"); }, 520);
    }
  }

  // ============================================================
  //  整屏大字
  // ============================================================
  function showFullPage(ls, done) {
    var wrap = document.createElement("div");
    wrap.className = "fullpage-text";
    var p = document.createElement("p");
    p.textContent = ls.map(function (l) { return l.text || ""; }).join("\n");
    wrap.appendChild(p);
    document.body.appendChild(wrap);
    var _hint = document.createElement("div"); _hint.className = "fp-hint"; _hint.textContent = "▼ 点击继续"; wrap.appendChild(_hint);
    wrap.addEventListener("click", function () {
      wrap.remove();
      done();
    });
  }

  // ============================================================
  //  逐句播放
  // ============================================================
  function playLine() {
    if (lineIdx >= lines.length) {
      if (node.minigame) { runNodeMinigame(node); return; }
      if (node.next) { goto(node.next); }
      else { showChoices(node); }
      return;
    }
    var line = lines[lineIdx];
    renderSpeaker(line);
    var html = formatLine(line);
    $text.classList.remove("fade-line");
    void $text.offsetWidth;
    $text.classList.add("fade-line");
    typeText(html, function () {
      finished = true;
      $hint.classList.remove("hidden");
    });
  }

  function advance() {
    if ($choices.classList.contains("show")) return;
    if (typing) {
      clearInterval(typeTimer);
      typing = false;
      $text.innerHTML = formatLine(lines[lineIdx]);
      finished = true;
      $hint.classList.remove("hidden");
      return;
    }
    /* 保险：无论状态如何，点击都能推进 */
    if (!finished) { clearInterval(typeTimer); typing=false; finished=true; }
    if (!finished) return;
    $hint.classList.add("hidden");
    finished = false;
    lineIdx++;
    playLine();
  }

  $textBox.addEventListener("click", advance);
  document.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); }
  });

  // ============================================================
  //  文本格式化
  // ============================================================
  function formatLine(line) {
    var raw = line.text || "";
    var html = escapeHtml(raw);
    html = html.replace(/（[^）]*）/g, function (m) {
      return '<span class="emote">' + m + '</span>';
    });
    html = html.replace(/\([^)]*\)/g, function (m) {
      return '<span class="emote">' + m + '</span>';
    });
    if (line.type === "inner") {
      html = '<span class="inner-os">【内心 OS】' + html + '</span>';
    } else if (line.type === "narration") {
      html = '<span class="narr">' + html + '</span>';
    }
    return html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ============================================================
  //  名字栏
  // ============================================================
  function renderSpeaker(line) {
    if (!$speaker) return;
    $speaker.className = "speaker-bar";
    if (line.type === "dialogue" && line.speaker) {
      $name.textContent = line.speaker + (line.emo ? "（" + line.emo + "）" : "");
      if (line.speaker === "程丽") $speaker.classList.add("chengli");
      else if (line.speaker === "我") $speaker.classList.add("me");
      else if (line.speaker.indexOf("鬼") !== -1) $speaker.classList.add("ghost");
      else if (line.speaker.indexOf("于硕") !== -1) $speaker.classList.add("yushuo");
      $speaker.classList.add("show");
    } else if (line.type === "inner") {
      $name.textContent = "我";
      $speaker.classList.add("me");
      $speaker.classList.add("show");
    } else {
      $name.textContent = "";
      $speaker.classList.add("hide");
    }
  }

  // ============================================================
  //  打字机
  // ============================================================
  function typeText(html, done) {
    typing = true;
    finished = false;
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var full = tmp.innerHTML;
    $text.innerHTML = "";
    var speed = window.__typeSpeed || 28;
    if (speed <= 0) { $text.innerHTML = full; typing = false; finished = true; if (done) done(); return; }
    var i = 0;
    var visibleLen = full.replace(/<[^>]*>/g, "").length;
    typeTimer = setInterval(function () {
      i++;
      $text.innerHTML = sliceHtml(full, i);
      if (i >= visibleLen) {
        clearInterval(typeTimer);
        typing = false;
        $text.innerHTML = full;
        if (done) done();
      }
    }, speed);
  }

  function sliceHtml(html, count) {
    var out = "", shown = 0, i = 0;
    while (i < html.length && shown < count) {
      if (html[i] === "<") {
        var end = html.indexOf(">", i);
        if (end === -1) { out += html.slice(i); break; }
        out += html.slice(i, end + 1);
        i = end + 1;
      } else {
        out += html[i];
        shown++;
        i++;
      }
    }
    return out;
  }

  // ============================================================
  //  选项
  // ============================================================
  function showChoices(n) {
    var chs = n.choices || [];
    if (!chs.length) {
      if (n.ending) showEnding(n.ending);
      return;
    }
    $choices.innerHTML = "";
    chs.forEach(function (ch) {
      var btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = ch.text;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        $choices.classList.remove("show");
        if (ch.effects) applyEffects(ch.effects);
        if (vars.san >= 100) {
          showEnding({ id: "lost", title: "迷失",
            desc: "恐惧值到达了上限。你听见走廊尽头有人在背单词，一个音节一个音节地，念着你的名字。你走过去，加入了他们。从此，你也学会了对新来的人绕开走。" });
          return;
        }
        if (ch.next) goto(ch.next);
        else if (ch.ending) showEnding(ch.ending);
      });
      $choices.appendChild(btn);
    });
    $choices.classList.add("show");
    $hint.classList.add("hidden");
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  // ============================================================
  //  变量 / SAN
  // ============================================================
  var __clueIds = {};
  function applyEffects(eff) {
    if (eff && eff.clue) {
      var cid = nodeId;
      if (!__clueIds[cid]) {
        __clueIds[cid] = 1;
        var _title = (lines && lines[0] && lines[0].text) ? lines[0].text : cid;
        __collect("clue", cid, _title.slice(0,40));
      }
    }
    for (var k in eff) {
      if (typeof vars[k] === "number") vars[k] += eff[k];
      else vars[k] = eff[k];
    }
    if (vars.san < 0) vars.san = 0;
    updateSan();
    if (false) {
      showEnding({ id: "memlost", title: "遗忘",
        desc: "你想不起自己是谁了。也想不起为什么会在这里。循环把你一点点擦干净，直到连“逃”这个念头都不剩。你成了这所学校的一部分。" });
    }
    if (false) {
      showEnding({ id: "lost", title: "迷失",
        desc: "恐惧值到达了上限。你听见走廊尽头有人在背单词，一个音节一个音节地，念着你的名字。你走过去，加入了他们。从此，你也学会了对新来的人绕开走。" });
    }
    try { localStorage.setItem("ec_vars", JSON.stringify({san:vars.san, trust:vars.trust, obey:vars.obey})); } catch(e){}
  }

  function updateSan() {
    var m = (vars.memory==null?100:Math.max(0,Math.min(100,vars.memory)));
    if ($memFill) $memFill.style.width=m+"%";
    if ($memNum) $memNum.textContent=Math.round(m);
    var s = Math.max(0, Math.min(100, vars.san || 0));
    $sanFill.style.width = s + "%";
    $sanNum.textContent = s;
    var st = (vars.stamina==null?100:Math.max(0,Math.min(100,vars.stamina)));
    if ($stamFill) $stamFill.style.width = st + "%";
    if ($stamNum) $stamNum.textContent = Math.round(st);
    var noiseEl = document.querySelector(".noise");
    if (noiseEl && !document.body.classList.contains("no-horror")) {
      var base = (window.__getSettings ? window.__getSettings().noise : 50) / 100 * 0.28;
      noiseEl.style.opacity = (base * (0.4 + s / 100 * 1.2)).toFixed(3);
    }
    var pulse = document.querySelector(".san-pulse");
    if (!pulse) {
      pulse = document.createElement("div");
      pulse.className = "san-pulse";
      document.body.appendChild(pulse);
    }
    if (s >= 60 && !document.body.classList.contains("no-horror")) {
      pulse.classList.add("active");
    } else {
      pulse.classList.remove("active");
    }
  }

  // ============================================================
  //  结局
  // ============================================================
  function __collect(kind, item_id, title){
    
  }
  function showEnding(end) {
    document.getElementById("endingTitle").textContent = end.title || "结局";
    document.getElementById("endingDesc").textContent = end.desc || "";
    document.getElementById("endingOverlay").classList.add("show");
    if (end.id) __collect("ending", end.id, end.title || "");
  }
  document.getElementById("btnRestart").addEventListener("click", function () {
    location.reload();
  });
  (function(){ var _h=document.getElementById("btnEndHome"); if(_h) _h.addEventListener("click", function(){ location.href="index.html"; }); })();

  // ============================================================
  //  菜单 / 存读档
  // ============================================================
  var $menu = document.getElementById("menuOverlay");
  document.getElementById("btnMenu").addEventListener("click", function () {
    $menu.classList.add("show");
  });
  document.getElementById("btnCloseMenu").addEventListener("click", function () {
    $menu.classList.remove("show");
  });
  document.getElementById("btnHome").addEventListener("click", function () {
    location.href = "index.html";
  });
  // -------- 自动保存：每个关键节点（有 next 或 choices 时）--------
  function autoSave() {
    // 静态版：禁用云存档，本地存档由 save_local.js 处理
  }

  // -------- 保存：弹窗命名 --------


  // -------- 读取：列出所有存档供选择 --------


  window.__goto = goto;
  window.__curNodeId = function(){ return nodeId; };
  window.__curVars = function(){ return vars; };
  window.__setVars = function(v){ vars = Object.assign(vars||{}, v||{}); if(typeof updateSan==="function") updateSan(); };

  // ============================================================
  //  启动
  // ============================================================
  boot();

  // ---- 懒加载：边玩边分批预热剩余图片（不阻塞）----
  var LAZY_BATCHES = [
    ["static/img/场景背景（正常）/操场台子.webp",
     "static/img/场景背景（正常）/教学楼篮球场一带.webp",
     "static/img/场景背景（正常）/教室后门.webp",
     "static/img/程丽立绘/微笑或鬼笑.webp"],
    ["static/img/场景背景（诡异悲凉）/教室.webp",
     "static/img/场景背景（诡异悲凉）/楼道.webp",
     "static/img/程丽立绘/拿着英语书.webp",
     "static/img/程丽立绘/拿着语文书.webp"],
    ["static/img/场景背景（诡异悲凉）/教学楼一楼门口.webp",
     "static/img/场景背景（诡异悲凉）/操场全貌.webp",
     "static/img/程丽立绘/拿着红木戒尺.webp",
     "static/img/程丽立绘/气愤或愤怒.webp"],
    ["static/img/场景背景（诡异悲凉）/操场台子.webp",
     "static/img/场景背景（诡异悲凉）/教学楼篮球场一带.webp",
     "static/img/场景背景（诡异悲凉）/教室后门.webp",
     "static/img/场景背景（诡异悲凉）/教学楼一楼门口.webp"]
  ];

  var _lazyDone = {};
  var _lazyBatch = 0;
  var _nodeCounter = 0;
  var NODES_PER_BATCH = 3;

  function _idle(fn){
    if (window.requestIdleCallback) requestIdleCallback(fn, {timeout: 2500});
    else setTimeout(fn, 600);
  }

  function _warmBatch(list){
    if (!list || !list.length) return;
    var q = list.filter(function(u){ return !_lazyDone[u]; });
    if (!q.length) return;
    (function next(){
      if (!q.length) return;
      var u = q.shift();
      _lazyDone[u] = 1;
      _idle(function(){
        var im = new Image();
        im.onload = im.onerror = function(){ setTimeout(next, 200); };
        im.src = u;
      });
    })();
  }

  window.__lazyTick = function(){
    _nodeCounter++;
    if (_nodeCounter % NODES_PER_BATCH !== 0) return;
    if (_lazyBatch >= LAZY_BATCHES.length) return;
    _warmBatch(LAZY_BATCHES[_lazyBatch]);
    _lazyBatch++;
  };

  setTimeout(function(){ window.__lazyTick(); }, 2500);

})();

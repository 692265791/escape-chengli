/* ============================================================
   逃离程丽 - 游戏主逻辑 v4（重构版）
   剧情引擎 / 打字机 / 选项 / SAN / 存读档 / 过渡动画 / 章节 / 小游戏
   新增：历史回退（Back）/ 自动播放（Auto）/ 快速跳过（Skip）/ 选项防误触
   修复：vars 覆盖顺序 / memory 钳制 / __setVars 快照同步 / fx 事件化 / 死代码清理
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

  /* ---- Galgame 系统状态 ---- */
  var historyStack = [];      /* 回退栈：{nodeId,lineIdx,vars} */
  var HISTORY_MAX = 120;
  var autoMode = false;
  var autoTimer = null;
  var skipping = false;
  var skipTimer = null;
  var guardArmed = false;     /* 本轮选项是否已触发过保护 */
  var choicesShownAt = 0;

  /* DOM */
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
  var $flicker = document.getElementById("flickerLayer");
  var $flash   = document.getElementById("flashLayer");
  var $guardHint = document.getElementById("guardHint");
  var $btnBack = document.getElementById("btnBack");
  var $btnAuto = document.getElementById("btnAuto");
  var $btnSkip = document.getElementById("btnSkip");

  function reduceMotion() {
    try {
      if (document.body && document.body.classList.contains("no-anim")) return true;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  /* ============================================================
     初始化
     ============================================================ */
  function boot() {
    var _ch = "";
    try { _ch = new URLSearchParams(location.search).get("chapter") || ""; } catch (e) {}
    var storyFile = "story.json";
    if (_ch === "ch2") storyFile = "ch2.json";
    else if (_ch === "ch3") {
      storyFile = "ch3.json";
      /* 集齐 6 个普通结局 + 未拿结局 7 → 走隐藏支线 */
      if (window.__SHOULD_TRIGGER_SECRET && window.__SHOULD_TRIGGER_SECRET()) {
        window.__SECRET_MODE = true;
      }
    }
    Promise.all([
      fetch(storyFile).then(function (r) { return r.json(); }),
      fetch("images.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (arr) {
      var data = arr[0];
      var imgMap = arr[1] || {};
      STORY = data.story || data;
      if (!STORY || !STORY.nodes) { alert("剧情加载失败"); return; }
      IMAGES = {};
      for (var k in imgMap) IMAGES[k] = imgMap[k];

      /* 修复：默认值 < 章节默认 < 历史存档，存档不再被 meta.vars 覆盖 */
      var _sv = {};
      try { _sv = JSON.parse(localStorage.getItem("ec_vars") || "{}"); } catch (e) {}
      var _chapterVars = (STORY.meta && STORY.meta.vars) || {};
      vars = Object.assign({ san: 0, memory: 100, trust: 0, obey: 0, stamina: 100 }, _chapterVars, _sv || {});
      clampVars();
      updateSan();

      var _start = STORY.meta.start || "start";
      var _chapter = STORY.meta.chapter || "";
      if (window.__SECRET_MODE && STORY.nodes && STORY.nodes["c3_secret_start"]) {
        _start = "c3_secret_start";
        _chapter = "第十章 · 放假 · 隐藏";
      }
      setChapter(_chapter);
      goto(_start);
    }).catch(function (e) { alert("加载出错：" + e); });
  }

  function setChapter(t) { if ($chapter) $chapter.textContent = t; }

  function clampVars() {
    if (!vars) return;
    if (typeof vars.san !== "number" || isNaN(vars.san)) vars.san = 0;
    vars.san = Math.max(0, Math.min(100, vars.san));
    if (typeof vars.memory !== "number" || isNaN(vars.memory)) vars.memory = 100;
    vars.memory = Math.max(0, Math.min(100, vars.memory));   /* 修复：memory 溢出 105 */
    if (typeof vars.stamina !== "number" || isNaN(vars.stamina)) vars.stamina = 100;
    vars.stamina = Math.max(0, Math.min(100, vars.stamina));
    if (typeof vars.clue === "number" && vars.clue < 0) vars.clue = 0;
  }

  function persistVars() {
    try {
      localStorage.setItem("ec_vars", JSON.stringify({ san: vars.san, trust: vars.trust, obey: vars.obey }));
    } catch (e) {}
  }

  /* ============================================================
     进入节点
     ============================================================ */
  function goto(id) {
    /* 中止进行中的打字机：防止旧 rAF 链与新节点状态串扰 */
    abortTyping();
    var n = STORY.nodes[id];
    if (!n) { console.warn("节点不存在：" + id); return; }
    if (typeof window.__lazyTick === "function") window.__lazyTick();
    nodeId = id;
    node = n;
    if (window.__TRACK_CURRENT) window.__TRACK_CURRENT(id, vars);
    /* 章节标签以剧情文件声明为准（修复「第三章·终章」与「第十章·放假」不一致） */
    if (STORY.meta && STORY.meta.chapter && !window.__SECRET_MODE) setChapter(STORY.meta.chapter);

    lines = n.lines || [];
    lineIdx = 0;
    if ($choices) {
      $choices.classList.remove("show");
      $choices.classList.remove("is-guarded");
      $choices.dataset.guard = "";
      $choices.innerHTML = "";
    }

    if (n.bg) {
      var url = IMAGES[n.bg] || ("static/img/" + n.bg);
      if (url !== lastBg) { crossFadeBg(url); lastBg = url; }
    }

    renderSprite(n.sprite, n.spriteAnim);
    playAnim(n.anim);
    if (n.fx) dispatchFx(n.fx);

    if (window.__TIME) {
      if (n.time != null) window.__TIME.setPhase(n.time);
      if (n.stamina) { vars.stamina = Math.max(0, Math.min(100, (vars.stamina == null ? 100 : vars.stamina) + n.stamina)); updateSan(); }
      if (n.sleep) {
        if (skipping) {
          /* 跳过模式：不做睡眠动画，直接推进 */
          setTimeout(function () { if (n.sleepNext) goto(n.sleepNext); }, 20);
          return;
        }
        window.__TIME.sleep(function () { if (n.sleepNext) goto(n.sleepNext); });
        return;
      }
    }
    if (typeof window.__CH2_ON_NODE === "function") {
      var _h = window.__CH2_ON_NODE(n, {
        goto: goto,
        hideChoices: function () {
          if ($choices) $choices.classList.remove("show");
          if ($hint) $hint.classList.add("hidden");
        }
      });
      if (_h) return;
    }

    if (n.page) {
      if (skipping) { if (n.next) { goto(n.next); } else { showChoices(n); } return; }
      showFullPage(lines, function () {
        if (n.next) goto(n.next); else showChoices(n);
      });
      return;
    }

    /* Boss 战节点：直接打开答题卡 */
    if (n.boss && window.__BOSS) {
      clearHistory(); stopAuto(); stopSkip();
      window.__BOSS.open();
      return;
    }

    if (n.effects) applyEffects(n.effects);
    playLine();
  }

  /* UI 动画桥解耦：anim-bridge.js 订阅这些事件，不再使用 MutationObserver */
  function dispatchUI(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }
  var _lastSan = null;
  var _lastSpriteKey = "";

  /* 特效解耦：只派发事件，fx.js 是订阅者 */
  function dispatchFx(list) {
    try {
      window.dispatchEvent(new CustomEvent("storyfx", { detail: list }));
    } catch (e) {
      if (window.__FX) window.__FX.play(list);
    }
  }

  function crossFadeBg(url) {
    dispatchUI("storybg");
    $bg.style.backgroundImage = "url('" + url + "')";
    $bg.classList.add("show");
    $bgNext.style.backgroundImage = "url('" + url + "')";
    $bgNext.classList.add("show", "zoom");
    setTimeout(function () {
      $bgNext.classList.remove("show", "zoom");
    }, 800);
  }

  /* ============================================================
     小游戏（剧情节点驱动）
     ============================================================ */
  function runNodeMinigame(n) {
    var mg = n.minigame || {};
    if (window.__relayout) setTimeout(window.__relayout, 30);
    var _t = mg.type || "qte";
    var _fn = (window.__MINIGAMES && window.__MINIGAMES[_t]) || window.__runMinigame;
    _fn(_t, mg.opts || {}, function (res) {
      if (mg.winEffects && res.win) applyEffects(mg.winEffects);
      if (mg.loseEffects && !res.win) applyEffects(mg.loseEffects);
      var next = res.win ? (mg.winNext || n.next || "") : (mg.loseNext || n.next || "");
      if (next) { goto(next); }
      else { showChoices(n); }
    });
  }

  /* ============================================================
     立绘渲染
     ============================================================ */
  function renderSprite(key, anim) {
    $sprite.innerHTML = "";
    if (!key) { if (window.__relayout) setTimeout(window.__relayout, 30); return; }
    if (key.indexOf("silhouette") !== -1 || key.indexOf("peng") !== -1) {
      $sprite.innerHTML = '<div class="sprite-silhouette"><span class="no-asset">[ 暂无素材 ]</span></div>';
      if (window.__relayout) setTimeout(window.__relayout, 30);
      return;
    }
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
    dispatchUI("storysprite");
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  /* ============================================================
     场景动效
     ============================================================ */
  function playAnim(anim) {
    if (!anim || anim === "none") return;
    if (document.body.classList.contains("no-horror") || reduceMotion()) return;
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

  /* ============================================================
     整屏大字
     ============================================================ */
  function showFullPage(ls, done) {
    if (skipping) { done(); return; }
    var wrap = document.createElement("div");
    wrap.className = "fullpage-text";
    var p = document.createElement("p");
    p.textContent = ls.map(function (l) { return l.text || ""; }).join("\n");
    wrap.appendChild(p);
    var _hint = document.createElement("div");
    _hint.className = "fp-hint";
    _hint.textContent = "▼ 点击继续";
    wrap.appendChild(_hint);
    wrap.addEventListener("click", function () {
      wrap.remove();
      done();
    });
    document.body.appendChild(wrap);
  }

  /* ============================================================
     历史回退
     ============================================================ */
  function snapshot() {
    return { nodeId: nodeId, lineIdx: lineIdx, vars: JSON.parse(JSON.stringify(vars)) };
  }
  function pushHistory() {
    if (!nodeId || !lines.length) return;
    if (historyStack.length && historyStack[historyStack.length - 1].nodeId === nodeId &&
        historyStack[historyStack.length - 1].lineIdx === lineIdx) return;
    historyStack.push(snapshot());
    if (historyStack.length > HISTORY_MAX) historyStack.shift();
  }
  function clearHistory() { historyStack.length = 0; }

  function back() {
    if (skipping) stopSkip();
    if (autoMode) stopAuto();
    if (document.getElementById("endingOverlay").classList.contains("show")) return;
    if (!historyStack.length) {
      toastHint("已到可回溯的尽头");
      return;
    }
    var st = historyStack.pop();
    var n = STORY.nodes[st.nodeId];
    if (!n) return;
    nodeId = st.nodeId;
    node = n;
    lines = n.lines || [];
    lineIdx = Math.min(st.lineIdx, Math.max(0, lines.length - 1));
    vars = st.vars || vars;
    clampVars();
    updateSan();
    if (window.__TRACK_CURRENT) window.__TRACK_CURRENT(nodeId, vars);
    persistVars();

    if ($choices) { $choices.classList.remove("show"); $choices.classList.remove("is-guarded"); $choices.innerHTML = ""; }
    if (n.bg) {
      var url = IMAGES[n.bg] || ("static/img/" + n.bg);
      if (url !== lastBg) { lastBg = url; $bg.style.backgroundImage = "url('" + url + "')"; $bg.classList.add("show"); }
    }
    renderSprite(n.sprite, "");
    /* 直接完整渲染该行，不重新应用节点 effects */
    var line = lines[lineIdx];
    if (!line) return;
    renderSpeaker(line);
    $text.innerHTML = formatLine(line);
    typing = false; finished = true;
    if ($hint) $hint.classList.remove("hidden");
  }

  function toastHint(msg) {
    var el = document.getElementById("sysToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "sysToast";
      el.className = "sys-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el.__t);
    el.__t = setTimeout(function () { el.classList.remove("show"); }, 1600);
  }

  /* ============================================================
     自动播放
     ============================================================ */
  function autoDelayFor(text) {
    var len = (text || "").length;
    var ms = 900 + len * 45;
    return Math.max(1200, Math.min(6000, ms));
  }
  function stopAuto() {
    autoMode = false;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if ($btnAuto) $btnAuto.classList.remove("active");
  }
  function toggleAuto() {
    if (autoMode) { stopAuto(); return; }
    if (skipping) stopSkip();
    autoMode = true;
    if ($btnAuto) $btnAuto.classList.add("active");
    scheduleAuto();
  }
  function scheduleAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (!autoMode) return;
    var line = lines[lineIdx];
    var wait = autoDelayFor(line && line.text);
    autoTimer = setTimeout(function () {
      if (!autoMode) return;
      if (blockingOverlay()) { stopAuto(); return; }
      advanceInternal(true);
    }, wait);
  }
  function blockingOverlay() {
    if ($choices && $choices.classList.contains("show")) return true;
    if (document.querySelector(".mg-overlay.show")) return true;
    if (document.querySelector(".boss-overlay.show")) return true;
    if (document.getElementById("endingOverlay").classList.contains("show")) return true;
    if (document.querySelector(".fullpage-text")) return true;
    return false;
  }

  /* ============================================================
     快速跳过
     ============================================================ */
  function stopSkip() {
    skipping = false;
    document.body.classList.remove("skipping");
    if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }
    if ($btnSkip) $btnSkip.classList.remove("active");
  }
  function toggleSkip() {
    if (skipping) { stopSkip(); return; }
    stopAuto();
    skipping = true;
    document.body.classList.add("skipping");
    if ($btnSkip) $btnSkip.classList.add("active");
    skipStep();
  }
  function skipStep() {
    if (!skipping) return;
    if (document.getElementById("endingOverlay").classList.contains("show")) { stopSkip(); return; }
    if ($choices && $choices.classList.contains("show")) { stopSkip(); toastHint("已到达选项，跳过停止"); return; }
    if (document.querySelector(".mg-overlay.show") || document.querySelector(".boss-overlay.show")) { stopSkip(); return; }
    var fp = document.querySelector(".fullpage-text");
    if (fp) { fp.click(); skipTimer = setTimeout(skipStep, 10); return; }
    advanceInternal(true);
    skipTimer = setTimeout(skipStep, 12);
  }

  /* ============================================================
     逐句播放
     ============================================================ */
  function playLine() {
    if (lineIdx >= lines.length) {
      if (node.minigame) { runNodeMinigame(node); return; }
      if (node.next) { goto(node.next); }
      else { showChoices(node); }
      return;
    }
    var line = lines[lineIdx];
    dispatchUI("storyline");
    renderSpeaker(line);
    var html = formatLine(line);
    if ($text) {
      $text.classList.remove("fade-line");
      requestAnimationFrame(function () { if ($text) $text.classList.add("fade-line"); });
    }
    typeText(html, function () {
      finished = true;
      if ($hint) $hint.classList.remove("hidden");
      scheduleAuto();
    });
  }

  /* 内部推进：fromAuto/fromSkip 用于区分用户点按 */
  function advanceInternal(silent) {
    if (!silent) {
      if (autoMode) stopAuto();   /* 用户任意操作打断自动播放 */
    }
    if ($choices && $choices.classList.contains("show")) return;
    if (typing) {
      clearInterval(typeTimer); typing = false;
      $text.innerHTML = formatLine(lines[lineIdx]);
      finished = true;
      if ($hint) $hint.classList.remove("hidden");
      return;
    }
    if (!finished) { clearInterval(typeTimer); typing = false; finished = true; }
    pushHistory();
    if ($hint) $hint.classList.add("hidden");
    finished = false;
    lineIdx++;
    playLine();
  }

  function advance() { advanceInternal(false); }

  if ($textBox) $textBox.addEventListener("click", advance);
  document.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      e.preventDefault();
      advance();
    }
  });

  /* ============================================================
     文本格式化
     ============================================================ */
  function formatLine(line) {
    var raw = line.text || "";
    var html = escapeHtml(raw);
    html = html.replace(/（[^）]*）/g, function (m) { return '<span class="emote">' + m + "</span>"; });
    html = html.replace(/\([^)]*\)/g, function (m) { return '<span class="emote">' + m + "</span>"; });
    if (line.type === "inner") {
      html = '<span class="inner-os">【内心 OS】' + html + "</span>";
    } else if (line.type === "narration") {
      html = '<span class="narr">' + html + "</span>";
    }
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ============================================================
     名字栏
     ============================================================ */
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

  /* ============================================================
     打字机（v4：全局单例 rAF 链 + 匀速预算 + 标点停顿）
     - 任意时刻只有一条动画链，重复调用/并发 goto 不会产生竞态
     - budget 模型保证匀速；跳帧时最多补 100ms，防爆发闪现
     - 标点停顿（，。！？；：、）额外消耗 0.6 倍字符时长
     ============================================================ */
  var tw = { chars: [], idx: 0, speed: 28, budget: 0, lastT: 0, running: false, rafId: null, onDone: null };

  function abortTyping() {
    tw.running = false;
    if (tw.rafId) { cancelAnimationFrame(tw.rafId); tw.rafId = null; }
    typing = false;
    typeTimer = null;
  }

  function typeText(html, done) {
    typing = true;
    finished = false;
    $text.innerHTML = html;

    var speed = window.__typeSpeed == null ? 28 : window.__typeSpeed;
    if (reduceMotion()) speed = 0;
    if (speed <= 0) { typing = false; finished = true; if (done) done(); return; }

    function wrapChars(node) {
      if (node.nodeType === 3) {
        var text = node.nodeValue;
        if (!text) return;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          var sp = document.createElement("span");
          sp.className = "tw-char";
          sp.textContent = text[i];
          frag.appendChild(sp);
        }
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        var children = Array.prototype.slice.call(node.childNodes);
        children.forEach(wrapChars);
      }
    }

    try {
      wrapChars($text);
      tw.chars = Array.prototype.slice.call($text.querySelectorAll(".tw-char"));
    } catch (e) {
      tw.chars = [];
    }

    /* 重置单例状态：旧链若在跑，下一帧会看到 running=false 而退出，随后本链接管 */
    tw.idx = 0;
    tw.speed = speed;
    tw.budget = 0;
    tw.onDone = done || null;
    if (!tw.running) {
      tw.running = true;
      tw.lastT = 0;
      tw.rafId = requestAnimationFrame(twStep);
    }
    typeTimer = { clear: abortTyping };
  }

  function twStep(ts) {
    if (!tw.running) return;
    if (!tw.lastT) tw.lastT = ts;
    tw.budget += Math.min(ts - tw.lastT, 100);
    tw.lastT = ts;

    var PUNCT = "，。！？；：、";
    while (tw.idx < tw.chars.length && tw.budget >= tw.speed) {
      var sp = tw.chars[tw.idx];
      if (sp) {
        sp.classList.add("tw-on");
        dispatchUI("storychar", { char: sp.textContent });
        /* 标点延迟加重（钢笔渗墨的顿笔感） */
        if (PUNCT.indexOf(sp.textContent) !== -1) tw.budget -= tw.speed * 2.2;
        else tw.budget -= tw.speed;
      }
      tw.idx++;
    }

    if (tw.idx >= tw.chars.length) {
      tw.running = false;
      tw.rafId = null;
      typing = false;
      finished = true;
      var d = tw.onDone;
      tw.onDone = null;
      if (d) d();
      return;
    }
    tw.rafId = requestAnimationFrame(twStep);
  }

  /* ============================================================
     选项（含防误触保护）
     ============================================================ */
  function showChoices(n) {
    var chs = n.choices || [];
    if (!chs.length) {
      if (n.ending) showEnding(n.ending);
      return;
    }
    stopAuto(); stopSkip();
    $choices.innerHTML = "";
    $choices.classList.remove("is-guarded");
    $choices.dataset.guard = "";
    guardArmed = false;
    choicesShownAt = (window.performance && performance.now) ? performance.now() : Date.now();

    chs.forEach(function (ch) {
      var btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = ch.text;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        /* 防误触：选项刚出现 <400ms 内的点击 → 触发 1.5s 静默保护并吞掉本次点击 */
        var now = (window.performance && performance.now) ? performance.now() : Date.now();
        if (!guardArmed && now - choicesShownAt < 400) {
          triggerChoiceGuard();
          return;
        }
        chooseOption(ch);
      });
      $choices.appendChild(btn);
    });
    $choices.classList.add("show");
    dispatchUI("storychoice");
    if ($hint) $hint.classList.add("hidden");
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  function triggerChoiceGuard() {
    guardArmed = true;
    $choices.classList.add("is-guarded");
    dispatchUI("choiceguard");
    if ($guardHint) {
      $guardHint.textContent = "客官莫急 · 請擇定奪";
      $guardHint.classList.add("show");
      $guardHint.classList.remove("out");
    }
    setTimeout(function () {
      $choices.classList.remove("is-guarded");
      if ($guardHint) {
        $guardHint.classList.add("out");
        setTimeout(function () { $guardHint.classList.remove("show", "out"); }, 320);
      }
    }, 1500);
  }

  function chooseOption(ch) {
    $choices.classList.remove("show");
    clearHistory();   /* 选择即屏障：不允许回退跨越已做选择 */
    if (ch.effects) applyEffects(ch.effects);
    if (ch.next) goto(ch.next);
    else if (ch.ending) showEnding(ch.ending);
  }

  /* ============================================================
     变量 / SAN
     ============================================================ */
  function applyEffects(eff) {
    if (!eff) return;
    for (var k in eff) {
      if (typeof vars[k] === "number") vars[k] += eff[k];
      else vars[k] = eff[k];
    }
    clampVars();
    updateSan();
    persistVars();
    if (window.__TRACK_CURRENT) window.__TRACK_CURRENT(nodeId, vars);
  }

  function updateSan() {
    var m = (vars.memory == null ? 100 : Math.max(0, Math.min(100, vars.memory)));
    var s = Math.max(0, Math.min(100, vars.san || 0));
    vars.memory = m;
    dispatchUI("storysan", { san: s, changed: _lastSan !== null && _lastSan !== s });
    _lastSan = s;
    if ($sanFill) $sanFill.style.width = s + "%";
    if ($sanNum) $sanNum.textContent = s;
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
    if (s >= 60 && !document.body.classList.contains("no-horror") && !reduceMotion()) {
      pulse.classList.add("active");
    } else {
      pulse.classList.remove("active");
    }
  }

  /* ============================================================
     结局
     ============================================================ */
  function showEnding(end) {
    clearHistory();
    stopAuto(); stopSkip();
    document.getElementById("endingTitle").textContent = end.title || "结局";
    document.getElementById("endingDesc").textContent = end.desc || "";
    document.getElementById("endingOverlay").classList.add("show");
    dispatchUI("storyoverlay", { id: "endingOverlay" });
    if (end.id && window.__UNLOCK_ENDING) window.__UNLOCK_ENDING(end.id);
  }
  var btnRestart = document.getElementById("btnRestart");
  if (btnRestart) btnRestart.addEventListener("click", function () { location.reload(); });
  (function () {
    var _h = document.getElementById("btnEndHome");
    if (_h) _h.addEventListener("click", function () { location.href = "home.html"; });
  })();

  /* ============================================================
     菜单 / HUD
     ============================================================ */
  var $menu = document.getElementById("menuOverlay");
  var btnMenu = document.getElementById("btnMenu");
  if (btnMenu && $menu) btnMenu.addEventListener("click", function () { $menu.classList.add("show"); });
  var btnCloseMenu = document.getElementById("btnCloseMenu");
  if (btnCloseMenu && $menu) btnCloseMenu.addEventListener("click", function () { $menu.classList.remove("show"); });
  var btnHome = document.getElementById("btnHome");
  if (btnHome) btnHome.addEventListener("click", function () { location.href = "home.html"; });

  if ($btnBack) $btnBack.addEventListener("click", function (e) { e.stopPropagation(); back(); });
  if ($btnAuto) $btnAuto.addEventListener("click", function (e) { e.stopPropagation(); toggleAuto(); });
  if ($btnSkip) $btnSkip.addEventListener("click", function (e) { e.stopPropagation(); toggleSkip(); });

  /* ============================================================
     对外接口
     ============================================================ */
  window.__goto = goto;
  window.__curNodeId = function () { return nodeId; };
  window.__curVars = function () { return vars; };
  window.__hasNode = function (id) { return !!(STORY && STORY.nodes && STORY.nodes[id]); };
  window.__setVars = function (v) {
    vars = Object.assign({}, vars || {}, v || {});
    clampVars();
    updateSan();
    persistVars();
    /* 修复：同步内存快照，避免刷新/存档读到旧值 */
    if (window.__TRACK_CURRENT) window.__TRACK_CURRENT(nodeId, vars);
  };
  window.__back = back;
  window.__autoToggle = toggleAuto;
  window.__skipToggle = toggleSkip;
  window.__isAuto = function () { return autoMode; };
  window.__isSkipping = function () { return skipping; };
  window.__historySize = function () { return historyStack.length; };

  /* ============================================================
     启动
     ============================================================ */
  boot();

  /* ---- 懒加载：边玩边分批预热剩余图片（不阻塞）---- */
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

  function _idle(fn) {
    if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 600);
  }

  function _warmBatch(list) {
    if (!list || !list.length) return;
    var q = list.filter(function (u) { return !_lazyDone[u]; });
    if (!q.length) return;
    (function next() {
      if (!q.length) return;
      var u = q.shift();
      _lazyDone[u] = 1;
      _idle(function () {
        var im = new Image();
        im.onload = im.onerror = function () { setTimeout(next, 200); };
        im.src = u;
      });
    })();
  }

  window.__lazyTick = function () {
    _nodeCounter++;
    if (_nodeCounter % NODES_PER_BATCH !== 0) return;
    if (_lazyBatch >= LAZY_BATCHES.length) return;
    _warmBatch(LAZY_BATCHES[_lazyBatch]);
    _lazyBatch++;
  };

  setTimeout(function () { window.__lazyTick(); }, 2500);

})();

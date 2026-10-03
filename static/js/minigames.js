/* ============================================================
   逃离程丽 - 玩法引擎 v2
   1. spell    字母拼写卡片（点字母拼出单词）
   2. dictation 单词听写（4选1）
   3. copy     抄写惩罚（限时连点）
   4. qte      闪避戒尺（限时点击）
   由 game.js 通过 window.__runMinigame(type, opts, callback) 调用
   ============================================================ */
(function () {
  "use strict";

  var WORDS = null;
  var $ov = null;
  var active = false;

  function ensureOverlay() {
    if ($ov) return;
    $ov = document.createElement("div");
    $ov.className = "mg-overlay";
    document.body.appendChild($ov);
  }

  function loadWords() {
    if (WORDS) return Promise.resolve(WORDS);
    return fetch("static/data/unit1_words.json")
      .then(function (r) { return r.json(); })
      .then(function (d) { WORDS = d.words || []; return WORDS; })
      .catch(function () { WORDS = []; return WORDS; });
  }

  function rand(n) { return Math.floor(Math.random() * n); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickWord(opts, words) {
    if (opts && opts.fixed) {
      var f = words.filter(function (x) { return x.en === opts.fixed; })[0];
      if (f) return f;
    }
    return words[rand(words.length)];
  }

  function close() {
    active = false;
    if ($ov) { $ov.classList.remove("show"); $ov.innerHTML = ""; }
  }

  function escape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ============================================================
  //  1. 字母拼写卡片
  // ============================================================
  function spell(opts, done) {
    loadWords().then(function (words) {
      if (!words.length) { done({ win: true }); return; }
      var w = pickWord(opts, words);
      var target = w.en;
      var limit = (opts && opts.time) || 20;

      // 拆字母（保留空格作为分隔显示）
      var letters = [];
      for (var i = 0; i < target.length; i++) {
        var c = target[i];
        if (c === " ") continue;
        letters.push(c.toLowerCase());
      }
      var pool = shuffle(letters);

      ensureOverlay();
      active = true;
      $ov.innerHTML = "";

      var card = document.createElement("div");
      card.className = "mg-card mg-spell";
      card.innerHTML =
        '<div class="mg-tag">拼 写 单 词</div>' +
        '<div class="mg-hint">' + escape(w.zh) + '</div>' +
        '<div class="mg-slot" id="spellSlot"></div>' +
        '<div class="mg-pool" id="spellPool"></div>' +
        '<div class="mg-timer"><i></i></div>';
      $ov.appendChild(card);

      var $slot = card.querySelector("#spellSlot");
      var $pool = card.querySelector("#spellPool");
      var $fill = card.querySelector(".mg-timer i");
      var typed = [];

      function renderSlot() {
        $slot.innerHTML = "";
        for (var i = 0; i < letters.length; i++) {
          var d = document.createElement("span");
          d.className = "mg-slot-char" + (typed[i] ? " filled" : "");
          d.textContent = typed[i] || "_";
          $slot.appendChild(d);
        }
      }
      renderSlot();

      pool.forEach(function (ch, idx) {
        var b = document.createElement("button");
        b.className = "mg-letter";
        b.textContent = ch;
        b.dataset.idx = idx;
        b.addEventListener("click", function () {
          if (!active || b.classList.contains("used")) return;
          typed.push(ch);
          b.classList.add("used");
          renderSlot();
          if (typed.length === letters.length) {
            var ok = typed.join("") === letters.join("");
            active = false;
            clearInterval(timer);
            flashResult(ok ? "拼对了" : "拼错了", ok ? "ok" : "bad", function () {
              close();
              done({ win: ok, word: w.en, answer: w.zh });
            });
          }
        });
        $pool.appendChild(b);
      });

      var start = Date.now();
      var timer = setInterval(function () {
        if (!active) { clearInterval(timer); return; }
        var used = (Date.now() - start) / 1000;
        var pct = Math.max(0, 1 - used / limit);
        $fill.style.width = (pct * 100) + "%";
        if (pct <= 0) {
          clearInterval(timer);
          active = false;
          flashResult("时间到", "bad", function () {
            close();
            done({ win: false, timeout: true, word: w.en });
          });
        }
      }, 50);

      $ov.classList.add("show");
    });
  }

  // ============================================================
  //  2. 单词听写（4选1，干扰项来自真实词库）
  // ============================================================
  function dictation(opts, done) {
    loadWords().then(function (words) {
      if (!words.length) { done({ win: true }); return; }
      var w = pickWord(opts, words);
      var others = shuffle(words.filter(function (x) { return x.en !== w.en; })).slice(0, 3)
        .map(function (x) { return x.zh; });
      var options = shuffle([w.zh].concat(others));
      var limit = (opts && opts.time) || 8;

      ensureOverlay();
      active = true;
      $ov.innerHTML = "";

      var card = document.createElement("div");
      card.className = "mg-card mg-dictation";
      card.innerHTML =
        '<div class="mg-tag">单 词 听 写</div>' +
        '<div class="mg-word">' + escape(w.en) + '</div>' +
        '<div class="mg-ask">它的意思是？</div>' +
        '<div class="mg-timer"><i></i></div>' +
        '<div class="mg-options"></div>';
      $ov.appendChild(card);

      var $opts = card.querySelector(".mg-options");
      var $timer = card.querySelector(".mg-timer i");

      options.forEach(function (opt) {
        var b = document.createElement("button");
        b.className = "mg-opt";
        b.textContent = opt;
        b.addEventListener("click", function () {
          if (!active) return;
          var win = (opt === w.zh);
          active = false;
          clearInterval(timer);
          flashResult(win ? "答对了" : "答错了", win ? "ok" : "bad", function () {
            close();
            done({ win: win, word: w.en, answer: w.zh, chosen: opt });
          });
        });
        $opts.appendChild(b);
      });

      var start = Date.now();
      var timer = setInterval(function () {
        if (!active) { clearInterval(timer); return; }
        var used = (Date.now() - start) / 1000;
        var pct = Math.max(0, 1 - used / limit);
        $timer.style.width = (pct * 100) + "%";
        if (pct <= 0) {
          clearInterval(timer);
          active = false;
          flashResult("超时", "bad", function () {
            close();
            done({ win: false, timeout: true, word: w.en, answer: w.zh });
          });
        }
      }, 50);

      $ov.classList.add("show");
    });
  }

  // ============================================================
  //  3. 抄写惩罚
  // ============================================================
  function copy(opts, done) {
    loadWords().then(function (words) {
      var w = pickWord(opts, words);
      var need = (opts && opts.count) || 6;
      var limit = (opts && opts.time) || 9;
      var wrote = 0;

      ensureOverlay();
      active = true;
      $ov.innerHTML = "";

      var card = document.createElement("div");
      card.className = "mg-card mg-copy";
      card.innerHTML =
        '<div class="mg-tag">抄 写 惩 罚</div>' +
        '<div class="mg-word sm">' + escape(w.en) + '</div>' +
        '<div class="mg-ask">快速点击下方按钮，把它抄满</div>' +
        '<div class="mg-timer"><i></i></div>' +
        '<div class="mg-count"><b>0</b> / ' + need + '</div>' +
        '<button class="mg-write-btn">抄 一 遍</button>';
      $ov.appendChild(card);

      var $fill = card.querySelector(".mg-timer i");
      var $cnt = card.querySelector(".mg-count b");
      var $btn = card.querySelector(".mg-write-btn");

      $btn.addEventListener("click", function () {
        if (!active) return;
        wrote++;
        $cnt.textContent = wrote;
        $btn.classList.remove("pulse"); void $btn.offsetWidth; $btn.classList.add("pulse");
        if (wrote >= need) {
          active = false;
          clearInterval(timer);
          flashResult("抄完了", "ok", function () {
            close();
            done({ win: true, wrote: wrote });
          });
        }
      });

      var start = Date.now();
      var timer = setInterval(function () {
        if (!active) { clearInterval(timer); return; }
        var used = (Date.now() - start) / 1000;
        var pct = Math.max(0, 1 - used / limit);
        $fill.style.width = (pct * 100) + "%";
        if (pct <= 0) {
          clearInterval(timer);
          active = false;
          flashResult("没抄完", "bad", function () {
            close();
            done({ win: false, wrote: wrote });
          });
        }
      }, 50);

      $ov.classList.add("show");
    });
  }

  // ============================================================
  //  4. QTE 闪避戒尺
  // ============================================================
  function qte(opts, done) {
    ensureOverlay();
    active = true;
    $ov.innerHTML = "";

    var limit = (opts && opts.time) || 1.5;
    var card = document.createElement("div");
    card.className = "mg-card mg-qte";
    card.innerHTML =
      '<div class="mg-qte-flash">戒尺落下！</div>' +
      '<button class="mg-dodge">闪 避</button>';
    $ov.appendChild(card);

    if (!document.body.classList.contains("no-horror")) {
      var fl = document.getElementById("flashLayer");
      if (fl) { fl.classList.add("on"); setTimeout(function(){ fl.classList.remove("on"); }, 400); }
    }

    var $btn = card.querySelector(".mg-dodge");
    var start = Date.now();
    var raf = null;
    var hit = false;

    function tick() {
      if (!active) return;
      var used = (Date.now() - start) / 1000;
      if (used >= limit) {
        active = false;
        flashResult("没躲开", "bad", function () {
          close();
          done({ win: false });
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    $btn.addEventListener("click", function () {
      if (!active || hit) return;
      hit = true;
      active = false;
      cancelAnimationFrame(raf);
      flashResult("躲开了", "ok", function () {
        close();
        done({ win: true });
      });
    });

    var dx = (Math.random() - 0.5) * 30;
    var dy = (Math.random() - 0.5) * 30;
    $btn.style.transform = "translate(" + dx + "px," + dy + "px)";

    $ov.classList.add("show");
  }

  // ============================================================
  //  结果闪烁
  // ============================================================
  function flashResult(text, type, after) {
    var t = document.createElement("div");
    t.className = "mg-result " + type;
    t.textContent = text;
    if ($ov) $ov.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
      if (after) after();
    }, 700);
  }

  // ============================================================
  //  对外接口
  // ============================================================
  window.__runMinigame = function (type, opts, callback) {
    var done = callback || function () {};
    if (type === "spell") spell(opts, done);
    else if (type === "dictation") dictation(opts, done);
    else if (type === "copy") copy(opts, done);
    else if (type === "qte") qte(opts, done);
    else done({ win: true });
  };

})();

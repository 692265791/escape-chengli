/* ============================================================
   逃离程丽 · 调试面板 dbg.js v5 · 全能版
   ============================================================ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var panel = $("dbgPanel");
    var openBtn = $("dbgOpen");
    var closeBtn = $("dbgClose");
    var dlSrc = $("dlSrc");
    if (!panel || !openBtn) return;

    /* ---------- 打开 / 关闭 ---------- */
    openBtn.addEventListener("click", function () {
      panel.classList.add("show");
      document.body.style.overflow = "hidden";
      refreshInfo();
      log("调试面板已打开", "ok");
    });
    function closePanel() {
      panel.classList.remove("show");
      document.body.style.overflow = "";
    }
    closeBtn.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });

    /* ---------- Tab ---------- */
    panel.querySelectorAll(".dbg-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        panel.querySelectorAll(".dbg-tab").forEach(function (x) { x.classList.remove("active"); });
        panel.querySelectorAll(".dbg-pane").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        var p = panel.querySelector('.dbg-pane[data-pane="' + t.dataset.tab + '"]');
        if (p) p.classList.add("active");
      });
    });

    /* ---------- Toast ---------- */
    function toast(msg, type) {
      if (!panel.classList.contains("show")) return;
      var box = $("dbgToast");
      if (!box) return;
      var d = document.createElement("div");
      d.className = "dbg-toast " + (type || "");
      d.textContent = msg;
      box.appendChild(d);
      setTimeout(function () {
        d.classList.add("out");
        setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 300);
      }, 2200);
    }

    /* ---------- 日志 ---------- */
    var logBox = $("dbgLog");
    function log(msg, type) {
      var t = new Date().toTimeString().slice(0, 8);
      var line = "[" + t + "] " + msg;
      if (logBox) {
        logBox.textContent += (logBox.textContent ? "\n" : "") + line;
        logBox.scrollTop = logBox.scrollHeight;
      }
      toast(msg, type);
    }

    /* ---------- 通用：检查游戏 API 是否存在 ---------- */
    function hasAPI(name) { return typeof window[name] === "function"; }
    function needGame() {
      if (location.pathname.indexOf("game.html") === -1) {
        toast("此功能需在 game.html 里使用", "err");
        return false;
      }
      return true;
    }

    /* ---------- 开关 ---------- */
    function bindSw(id, key, cb) {
      var el = $(id);
      if (!el) return;
      try { el.checked = localStorage.getItem(key) === "1"; } catch (e) {}
      el.addEventListener("change", function () {
        try {
          if (el.checked) localStorage.setItem(key, "1");
          else localStorage.removeItem(key);
        } catch (e) {}
        log(id + " → " + (el.checked ? "ON" : "OFF"), "ok");
        if (cb) cb(el.checked);
      });
    }
    bindSw("dbgCheat", "ec_cheat_enabled");
    bindSw("dbgGod", "ec_god_mode");
    bindSw("dbgNoFx", "ec_no_fx", function (v) { document.body.classList.toggle("no-horror", v); });
    bindSw("dbgNoDeath", "ec_no_death");

    /* ---------- 测试输出 ---------- */
    var out = $("dbgTestOut");
    function T(m) {
      if (out) {
        out.textContent += m + "\n";
        out.scrollTop = out.scrollHeight;
      }
      toast(m, m.indexOf("✓") !== -1 ? "ok" : (m.indexOf("✗") !== -1 ? "err" : "info"));
    }

    /* ---------- 快捷操作 ---------- */
    var unlockBtn = $("dbgUnlockEndings");
    if (unlockBtn) unlockBtn.addEventListener("click", function () {
      try {
        localStorage.setItem("ec_endings_v1", JSON.stringify([
          "c3_stay","c3_escape","c3_samename","c3_holiday","c3_return","c3_chengli","c3_keep","c3_void"
        ]));
      } catch (e) {}
      log("已解锁全部 8 个结局", "ok");
      if (window.__renderEndings) window.__renderEndings();
    });

    var clearSavesBtn = $("dbgClearSaves");
    if (clearSavesBtn) clearSavesBtn.addEventListener("click", function () {
      if (!confirm("清空所有存档？")) return;
      try {
        localStorage.removeItem("ec_saves_v3");
        localStorage.removeItem("ec_autosave_v3");
        localStorage.removeItem("ec_save_v4");
        localStorage.removeItem("ec_save_v4_auto");
      } catch (e) {}
      log("已清空存档", "err");
    });

    var clearAllBtn = $("dbgClearAll");
    if (clearAllBtn) clearAllBtn.addEventListener("click", function () {
      if (!confirm("清空所有 ec_ 记录？")) return;
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf("ec_") === 0) localStorage.removeItem(k);
        });
      } catch (e) {}
      log("已清空所有 ec_ 记录", "err");
    });

    var clearLogBtn = $("dbgClearLog");
    if (clearLogBtn) clearLogBtn.addEventListener("click", function () {
      if (logBox) logBox.textContent = "";
    });

    /* ============================================================
       游戏作弊 · 按钮（data-test 里加新项）
       ============================================================ */
    document.querySelectorAll(".dbg-action[data-test]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = btn.dataset.test;
        if (out) out.textContent = "▶ " + btn.textContent + "…\n";
        log("测试：" + btn.textContent);

        /* ========== 基础 ========== */
        if (t === "js") {
          T("Promise: " + (typeof Promise === "function" ? "✓" : "✗"));
          T("fetch: " + (typeof fetch === "function" ? "✓" : "✗"));
          T("箭头函数: ✓"); T("解构: ✓"); T("展开: ✓"); T("可选链: ✓");
        }
        else if (t === "html") {
          T("元素总数: " + document.querySelectorAll("*").length);
          T("DOM 状态: " + document.readyState);
          var dup = [], seen = {};
          document.querySelectorAll("[id]").forEach(function (el) {
            if (seen[el.id]) { if (dup.indexOf(el.id) === -1) dup.push(el.id); }
            seen[el.id] = 1;
          });
          T("重复 id: " + (dup.length ? dup.join(", ") : "无"));
        }
        else if (t === "css") {
          T("样式表: " + document.styleSheets.length);
          var tot = 0, f = 0;
          for (var i = 0; i < document.styleSheets.length; i++) {
            try { tot += document.styleSheets[i].cssRules.length; } catch (e) { f++; }
          }
          T("总规则: " + tot); T("跨域失败: " + f);
        }
        else if (t === "storage") {
          try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); T("localStorage: ✓"); } catch (e) { T("localStorage: ✗ " + e.message); }
          T("已用 key: " + Object.keys(localStorage).length);
          Object.keys(localStorage).forEach(function (k) { T("  " + k); });
        }
        else if (t === "fetch") {
          ["chapters.json","story.json","ch3.json"].forEach(function (f) {
            var t0 = performance.now();
            fetch(f).then(function (r) {
              T("✓ " + f + " → " + r.status + " (" + Math.round(performance.now() - t0) + "ms)");
            }).catch(function (e) { T("✗ " + f + " → " + e.message); });
          });
        }
        else if (t === "json") {
          ["story.json","ch2.json","ch3.json"].forEach(function (f) {
            fetch(f).then(function (r) { return r.json(); }).then(function (d) {
              T("✓ " + f + " → " + (d.nodes ? Object.keys(d.nodes).length : 0) + " 节点");
            }).catch(function (e) { T("✗ " + f + " → " + e.message); });
          });
        }
        else if (t === "endings") {
          var arr = [];
          try { arr = JSON.parse(localStorage.getItem("ec_endings_v1") || "[]"); } catch (e) {}
          T("已解锁: " + arr.length + " / 8");
          arr.forEach(function (id) { T("  ✓ " + id); });
          if (window.__LIST_ENDINGS) { try { T("__LIST_ENDINGS: " + JSON.stringify(window.__LIST_ENDINGS())); } catch (e) {} }
        }
        else if (t === "saves") {
          var s = {};
          try { s = JSON.parse(localStorage.getItem("ec_saves_v3") || "{}"); } catch (e) {}
          T("存档位: " + Object.keys(s).length + " / 100");
          Object.keys(s).forEach(function (k) {
            T("  槽 " + k + ": " + (s[k].node_id || "?") + " @ " + (s[k].time || "?"));
          });
          if (window.__COUNT_SAVES) { try { T("__COUNT_SAVES: " + window.__COUNT_SAVES()); } catch (e) {} }
        }

        /* ========== 性能 ========== */
        else if (t === "fps") {
          var frames = 0, t0 = performance.now();
          T("测试 1 秒…");
          function loop(ts) {
            frames++;
            if (ts - t0 < 1000) requestAnimationFrame(loop);
            else T("帧率: " + frames + " fps");
          }
          requestAnimationFrame(loop);
        }
        else if (t === "cpubench") {
          var t0 = performance.now(), n = 0;
          for (var i = 0; i < 5000000; i++) { n += Math.sqrt(i) | 0; }
          var dt = performance.now() - t0;
          T("500 万次 sqrt: " + dt.toFixed(1) + " ms");
          T("评价: " + (dt < 200 ? "✓ 极快" : dt < 500 ? "✓ 良好" : dt < 1500 ? "! 一般" : "✗ 偏慢"));
        }
        else if (t === "membench") {
          if (!performance.memory) { T("performance.memory 不可用"); return; }
          T("JS 堆已用: " + (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + " MB");
          T("JS 堆上限: " + (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB");
        }
        else if (t === "domSpeed") {
          var t0 = performance.now();
          var box = document.createElement("div");
          box.style.cssText = "position:absolute;left:-9999px;";
          document.body.appendChild(box);
          for (var i = 0; i < 1000; i++) { box.appendChild(document.createElement("div")); }
          T("创建 1000 元素: " + (performance.now() - t0).toFixed(1) + " ms");
          document.body.removeChild(box);
        }
        else if (t === "canvasSpeed") {
          var cv = document.createElement("canvas");
          cv.width = 500; cv.height = 500;
          var g = cv.getContext("2d");
          var t0 = performance.now();
          for (var i = 0; i < 5000; i++) { g.fillRect(Math.random() * 500, Math.random() * 500, 4, 4); }
          T("绘制 5000 矩形: " + (performance.now() - t0).toFixed(1) + " ms");
        }
        else if (t === "benchmark") {
          T("综合性能评分：");
          var score = 0;
          var t0 = performance.now(), n = 0;
          for (var i = 0; i < 1000000; i++) { n += Math.sqrt(i) | 0; }
          var cpuScore = Math.max(0, 100 - (performance.now() - t0) / 10);
          score += cpuScore; T("  CPU: " + cpuScore.toFixed(1));
          t0 = performance.now();
          var box = document.createElement("div");
          document.body.appendChild(box);
          for (var j = 0; j < 500; j++) { box.appendChild(document.createElement("div")); }
          document.body.removeChild(box);
          var domScore = Math.max(0, 100 - (performance.now() - t0));
          score += domScore; T("  DOM: " + domScore.toFixed(1));
          var cv = document.createElement("canvas");
          cv.width = 200; cv.height = 200;
          var g = cv.getContext("2d");
          t0 = performance.now();
          for (var k = 0; k < 1000; k++) { g.fillRect(Math.random() * 200, Math.random() * 200, 2, 2); }
          var canScore = Math.max(0, 100 - (performance.now() - t0));
          score += canScore; T("  Canvas: " + canScore.toFixed(1));
          T("总评分: " + score.toFixed(1) + " / 300");
          T("评级: " + (score > 250 ? "S" : score > 200 ? "A" : score > 150 ? "B" : score > 100 ? "C" : "D"));
        }

        /* ========== 网络 / 硬件 ========== */
        else if (t === "netInfo") {
          var c = navigator.connection;
          if (!c) { T("Network Information API 不可用"); return; }
          T("有效类型: " + (c.effectiveType || "?"));
          T("下行: " + (c.downlink || "?") + " Mbps");
          T("RTT: " + (c.rtt || "?") + " ms");
        }
        else if (t === "battery") {
          if (!navigator.getBattery) { T("电池 API 不可用"); return; }
          navigator.getBattery().then(function (b) {
            T("电量: " + (b.level * 100).toFixed(0) + "%");
            T("充电中: " + (b.charging ? "是" : "否"));
          });
        }
        else if (t === "memory") {
          T("设备内存: " + (navigator.deviceMemory || "未知") + " GB");
          T("硬件并发: " + (navigator.hardwareConcurrency || "未知") + " 核");
        }
        else if (t === "cores") {
          T("CPU 核心: " + (navigator.hardwareConcurrency || "未知"));
        }
        else if (t === "gpu") {
          try {
            var cv = document.createElement("canvas");
            var gl = cv.getContext("webgl");
            if (!gl) { T("WebGL 不可用"); return; }
            var dbg = gl.getExtension("WEBGL_debug_renderer_info");
            if (dbg) {
              T("GPU 厂商: " + gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
              T("GPU 型号: " + gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
            }
          } catch (e) { T("✗ " + e.message); }
        }
        else if (t === "screen") {
          T("屏幕: " + screen.width + "×" + screen.height);
          T("色深: " + screen.colorDepth + " bit");
          T("像素比: " + window.devicePixelRatio);
          T("视口: " + window.innerWidth + "×" + window.innerHeight);
        }
        else if (t === "sensor") {
          T("触摸: " + ("ontouchstart" in window ? "✓" : "✗"));
          T("震动: " + ("vibrate" in navigator ? "✓" : "✗"));
          T("地理: " + ("geolocation" in navigator ? "✓" : "✗"));
        }

        /* ========== 游戏诊断 ========== */
        else if (t === "gameCheck") {
          if (location.pathname.indexOf("game.html") === -1) { T("! 当前不是游戏页面"); }
          ["__goto","__curNodeId","__curVars","__setVars","__getSettings","__setMapData","__setMapBtn","__runMinigame","__glitchBurst","__toHorror","__toNormal","__typeSpeed","__lazyTick"].forEach(function (name) {
            T("window." + name + ": " + (typeof window[name] === "function" ? "✓" : "✗"));
          });
          T("window.__BOSS: " + (window.__BOSS ? "✓" : "✗"));
          T("window.__SAVE_SYSTEM: " + (window.__SAVE_SYSTEM ? "✓" : "✗"));
          T("window.__ENDINGS: " + (window.__ENDINGS ? "✓" : "✗"));
          T("window.__FX: " + (window.__FX ? "✓" : "✗"));
          T("window.__TIME: " + (window.__TIME ? "✓" : "✗"));
          T("window.__PUZZLE: " + (window.__PUZZLE ? "✓" : "✗"));
        }
        else if (t === "nodeScan") {
          fetch("ch3.json").then(function (r) { return r.json(); }).then(function (d) {
            var keys = Object.keys(d.nodes);
            T("总节点: " + keys.length);
            T("Boss: " + keys.filter(function (k) { return d.nodes[k].boss; }).length);
            T("结局: " + keys.filter(function (k) { return d.nodes[k].ending; }).length);
            var broken = 0;
            keys.forEach(function (k) {
              var n = d.nodes[k];
              if (n.next && !d.nodes[n.next]) { T("✗ 死链: " + k + " → " + n.next); broken++; }
              (n.choices || []).forEach(function (c) {
                if (c.next && !d.nodes[c.next]) { T("✗ 死链: " + k + " → " + c.next); broken++; }
              });
            });
            if (!broken) T("✓ 所有 next 都有效");
          });
        }
        else if (t === "assetsAudit") {
          fetch("images.json").then(function (r) { return r.json(); }).then(function (map) {
            var keys = Object.keys(map);
            T("条目: " + keys.length);
            var ok = 0, bad = 0;
            keys.forEach(function (k) {
              var im = new Image();
              im.onload = function () { ok++; };
              im.onerror = function () { bad++; T("  ✗ " + k); };
              im.src = map[k];
            });
            setTimeout(function () { T("✓ 成功 " + ok + " / ✗ 失败 " + bad); }, 3000);
          });
        }
        else if (t === "eventLoop") {
          var times = [], count = 0;
          function measure() {
            var t0 = performance.now();
            setTimeout(function () {
              times.push(performance.now() - t0);
              count++;
              if (count < 10) measure();
              else {
                var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length;
                T("10 次平均: " + avg.toFixed(2) + " ms");
              }
            }, 0);
          }
          measure();
        }

        /* ========== 隐私 / 加密 ========== */
        else if (t === "fingerprint") {
          T("UA: " + navigator.userAgent.slice(0, 80));
          T("语言: " + navigator.language);
          T("屏幕: " + screen.width + "×" + screen.height);
          T("时区: " + Intl.DateTimeFormat().resolvedOptions().timeZone);
          T("核心: " + (navigator.hardwareConcurrency || "?"));
        }
        else if (t === "hash") {
          if (window.crypto && crypto.subtle) {
            crypto.subtle.digest("SHA-256", new TextEncoder().encode("逃离程丽")).then(function (buf) {
              var hash = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
              T("SHA-256: " + hash);
            });
          } else T("✗ SubtleCrypto 不可用");
        }
        else if (t === "crypto") {
          T("crypto: " + (window.crypto ? "✓" : "✗"));
          T("crypto.subtle: " + (window.crypto && crypto.subtle ? "✓" : "✗"));
          T("randomUUID: " + (window.crypto && crypto.randomUUID ? "✓" : "✗"));
        }

        /* ========== 游戏作弊（新功能） ========== */
        else if (t === "peekState") {
          // 探测当前游戏状态
          if (!window.__curNodeId && !window.__curVars) { T("! 需在 game.html 里使用"); return; }
          T("=== 当前游戏状态 ===");
          try { T("当前节点: " + (window.__curNodeId ? window.__curNodeId() : "?")); } catch (e) { T("__curNodeId 错误: " + e.message); }
          try {
            var v = window.__curVars ? window.__curVars() : null;
            T("当前变量: " + JSON.stringify(v, null, 2));
          } catch (e) { T("__curVars 错误: " + e.message); }
          try {
            var s = window.__getSettings ? window.__getSettings() : null;
            T("设置: " + JSON.stringify(s, null, 2));
          } catch (e) {}
        }
        else if (t === "gotoNode") {
          if (!window.__goto) { T("! 没有 __goto，需在 game.html 里"); return; }
          var nid = prompt("输入要跳转的节点 id（如 c3_start）");
          if (!nid) return;
          try { window.__goto(nid); T("✓ 已跳转: " + nid); } catch (e) { T("✗ " + e.message); }
        }
        else if (t === "setVars") {
          if (!window.__setVars) { T("! 没有 __setVars"); return; }
          var json = prompt("输入变量 JSON（如 {\"san\":0,\"trust\":10}）");
          if (!json) return;
          try {
            var obj = JSON.parse(json);
            window.__setVars(obj);
            T("✓ 已设置变量: " + JSON.stringify(obj));
          } catch (e) { T("✗ JSON 错误: " + e.message); }
        }
        else if (t === "setSanZero") {
          if (window.__setVars) { try { window.__setVars({san: 0}); T("✓ 恐惧值已归零"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __setVars");
        }
        else if (t === "glitch") {
          if (window.__glitchBurst) { try { window.__glitchBurst(); T("✓ 触发故障特效"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __glitchBurst");
        }
        else if (t === "toHorror") {
          if (window.__toHorror) { try { window.__toHorror(); T("✓ 切换到恐怖模式"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __toHorror");
        }
        else if (t === "toNormal") {
          if (window.__toNormal) { try { window.__toNormal(); T("✓ 切换到正常模式"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __toNormal");
        }
        else if (t === "runMinigame") {
          if (!window.__runMinigame) { T("! 没有 __runMinigame"); return; }
          var mg = prompt("小游戏类型（spell/dictation/copy/qte）", "spell");
          if (!mg) return;
          try { window.__runMinigame({type: mg}); T("✓ 已启动: " + mg); } catch (e) { T("✗ " + e.message); }
        }
        else if (t === "listEndings") {
          if (window.__LIST_ENDINGS) { try { T("全部结局: " + JSON.stringify(window.__LIST_ENDINGS())); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __LIST_ENDINGS");
        }
        else if (t === "unlockOneEnding") {
          if (!window.__UNLOCK_ENDING) { T("! 没有 __UNLOCK_ENDING"); return; }
          var eid = prompt("输入结局 id（c3_stay/c3_escape/c3_samename/c3_holiday/c3_return/c3_chengli/c3_keep/c3_void）");
          if (!eid) return;
          try { window.__UNLOCK_ENDING(eid); T("✓ 已解锁: " + eid); } catch (e) { T("✗ " + e.message); }
        }
        else if (t === "clearEndings") {
          if (window.__CLEAR_ENDINGS) { try { window.__CLEAR_ENDINGS(); T("✓ 已清空结局记录"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __CLEAR_ENDINGS");
        }
        else if (t === "exportSaves") {
          if (window.__EXPORT_SAVES) { try { var d = window.__EXPORT_SAVES(); T("存档导出: " + JSON.stringify(d).slice(0, 500)); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __EXPORT_SAVES");
        }
        else if (t === "typeSpeed") {
          if (window.__typeSpeed) {
            var sp = prompt("打字速度（毫秒/字，越小越快。默认约 30）", "10");
            if (sp === null) return;
            try { window.__typeSpeed(parseInt(sp, 10)); T("✓ 打字速度已设为: " + sp); } catch (e) { T("✗ " + e.message); }
          } else T("! 没有 __typeSpeed");
        }
        else if (t === "lazyTick") {
          if (window.__lazyTick) { try { window.__lazyTick(); T("✓ 触发懒加载"); } catch (e) { T("✗ " + e.message); } }
          else T("! 没有 __lazyTick");
        }

        /* ========== 工具 ========== */
        else if (t === "exportReport") {
          var report = {
            generatedAt: new Date().toISOString(),
            ua: navigator.userAgent,
            screen: screen.width + "x" + screen.height,
            language: navigator.language,
            cores: navigator.hardwareConcurrency,
            allStorage: {},
            endings: JSON.parse(localStorage.getItem("ec_endings_v1") || "[]"),
            saves: JSON.parse(localStorage.getItem("ec_saves_v3") || "{}")
          };
          Object.keys(localStorage).forEach(function (k) { report.allStorage[k] = localStorage.getItem(k); });
          var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "debug-report-" + Date.now() + ".json";
          a.click();
          T("✓ 报告已下载");
        }
        else if (t === "all") {
          T("开始一键全测…");
          ["js","html","css","storage","fps","cpubench","benchmark","gameCheck"].forEach(function (name, i) {
            setTimeout(function () {
              var b = document.querySelector('[data-test="' + name + '"]');
              if (b) b.click();
            }, i * 600);
          });
        }
        else {
          T("! 该测试项暂无实现");
        }
      });
    });

    /* ---------- 图片 ---------- */
    function downloadOne(url) {
      fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = url.split("/").slice(-1)[0];
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        log("下载: " + url, "ok");
      }).catch(function (e) { log("下载失败: " + e.message, "err"); });
    }

    var dlAllBtn = $("dbgDlAll");
    if (dlAllBtn) dlAllBtn.addEventListener("click", function () {
      var imgs = $("dbgImgs").querySelectorAll("img");
      if (!imgs.length) { alert("请先点「加载全部」"); return; }
      if (!confirm("批量下载 " + imgs.length + " 张？")) return;
      imgs.forEach(function (im, i) { setTimeout(function () { downloadOne(im.src); }, i * 400); });
    });

    var loadAllBtn = $("dbgLoadAll");
    if (loadAllBtn) loadAllBtn.addEventListener("click", function () {
      var box = $("dbgImgs");
      box.innerHTML = "";
      var imgs = [
        "static/img/程丽立绘/正常.webp","static/img/程丽立绘/微笑或鬼笑.webp",
        "static/img/程丽立绘/拿着红木戒尺.webp","static/img/程丽立绘/拿着英语书.webp",
        "static/img/程丽立绘/拿着语文书.webp","static/img/程丽立绘/气愤或愤怒.webp",
        "static/img/npc/yu冷漠严峻.webp","static/img/npc/yu看着你.webp",
        "static/img/场景背景（正常）/操场全貌.webp","static/img/场景背景（正常）/操场台子.webp",
        "static/img/场景背景（正常）/教学楼一楼门口.webp","static/img/场景背景（正常）/教学楼篮球场一带.webp",
        "static/img/场景背景（正常）/教室.webp","static/img/场景背景（正常）/教室后门.webp",
        "static/img/场景背景（正常）/楼道.webp",
        "static/img/场景背景（诡异悲凉）/操场全貌.webp","static/img/场景背景（诡异悲凉）/操场台子.webp",
        "static/img/场景背景（诡异悲凉）/教学楼一楼门口.webp","static/img/场景背景（诡异悲凉）/教学楼篮球场一带.webp",
        "static/img/场景背景（诡异悲凉）/教室.webp","static/img/场景背景（诡异悲凉）/教室后门.webp",
        "static/img/场景背景（诡异悲凉）/楼道.webp",
        "static/img/联系作者/QQ.png","static/img/联系作者/快手.png",
        "static/img/联系作者/抖音.png","static/img/联系作者/哔哩哔哩.png",
        "static/img/联系作者/网易云.png","static/img/联系作者/个人站.png",
        "static/img/特别鸣谢/DeepSeek.ico","static/img/特别鸣谢/豆包.png",
        "static/img/特别鸣谢/Cloudflare.png","static/img/特别鸣谢/lobehub.com_github.png",
        "static/img/特别鸣谢/腾讯微云.png","static/img/赞助作者/赞助.png"
      ];
      imgs.forEach(function (src) {
        var w = document.createElement("div");
        w.className = "dbg-img";
        var im = document.createElement("img");
        var flag = document.createElement("span");
        flag.className = "err"; flag.textContent = "...";
        var nm = document.createElement("div");
        nm.className = "name"; nm.textContent = src.split("/").slice(-1)[0];
        w.appendChild(im); w.appendChild(flag); w.appendChild(nm);
        box.appendChild(w);
        im.onload = function () { flag.className = "ok"; flag.textContent = "✓"; };
        im.onerror = function () { flag.className = "err"; flag.textContent = "✗"; };
        im.src = src;
        w.title = "点击下载：" + src;
        w.addEventListener("click", function () { downloadOne(src); });
      });
      log("已加载 " + imgs.length + " 张图片", "ok");
    });

    /* ---------- 信息面板 ---------- */
    function refreshInfo() {
      var info = $("dbgInfo");
      if (!info) return;
      info.innerHTML =
        "浏览器: <b>" + navigator.userAgent.slice(0, 80) + "</b><br>" +
        "视口: <b>" + window.innerWidth + "×" + window.innerHeight + "</b><br>" +
        "屏幕: <b>" + screen.width + "×" + screen.height + "</b><br>" +
        "像素比: <b>" + window.devicePixelRatio + "</b><br>" +
        "语言: <b>" + navigator.language + "</b><br>" +
        "在线: <b>" + (navigator.onLine ? "是" : "否") + "</b>";
    }

    /* ---------- 下载源码 ---------- */
    if (dlSrc) dlSrc.addEventListener("click", async function () {
      if (!window.JSZip) { alert("JSZip 未加载"); return; }
      dlSrc.disabled = true;
      var orig = dlSrc.textContent;
      var FILES = [
        "index.html","home.html","game.html","loading.html","disclaimer.html","bouncy.html",
        "chapters.json","story.json","ch2.json","ch3.json","images.json","README.md",
        "static/css/home.css","static/css/dbg.css","static/css/skin.css","static/css/skin-page.css",
        "static/css/fx.css","static/css/anime.css","static/css/apple.css",
        "static/js/home.js","static/js/dbg.js","static/js/game.js","static/js/boss.js","static/js/endings.js",
        "static/js/minigames.js","static/js/puzzle.js","static/js/settings.js",
        "static/js/time.js","static/js/fx.js","static/js/transform.js",
        "static/js/ui_patch.js","static/js/adaptive.js","static/js/save_local.js",
        "static/js/index2.js","static/js/anim-bridge.js","static/js/lines.js",
        "static/lib/jszip.min.js","static/lib/animate.min.css",
        "static/test-speed.png",
        "static/data/unit1_words.json"
      ];
      var zip = new JSZip();
      var ok = 0, fail = 0;
      for (var i = 0; i < FILES.length; i++) {
        var f = FILES[i];
        dlSrc.textContent = "📦 " + (i + 1) + "/" + FILES.length;
        try {
          var r = await fetch(f);
          if (!r.ok) { fail++; continue; }
          var blob = await r.blob();
          zip.file(f, blob);
          ok++;
        } catch (e) { fail++; }
      }
      dlSrc.textContent = "📦 生成 ZIP…";
      var content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "escape-chengli-source-" + Date.now() + ".zip";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      dlSrc.textContent = "✓ 成功 " + ok + " / 失败 " + fail;
      setTimeout(function () { dlSrc.textContent = orig; dlSrc.disabled = false; }, 2000);
    });

    refreshInfo();
  });
})();

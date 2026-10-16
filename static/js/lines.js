/* 逃离程丽 · 线路测速模块 lines.js（连通性测速版） */
(function (global) {
  "use strict";

  var LINES = [
    { name: "线路 1", url: "https://chengli.dpdns.org" },
    { name: "线路 2", url: "https://escape-chengli.pages.dev" },
    { name: "线路 3", url: "https://692265791.github.io/escape-chengli" }
  ];

  var TIMEOUT = 3500;   // 单次超时 3.5 秒
  var ROUNDS  = 2;      // 每条测 2 次取最快

  /* 单次：fetch 连接，测握手时间，不下载内容 */
  function pingOnce(line) {
    return new Promise(function (resolve) {
      var start = Date.now();
      var ctrl  = new AbortController();
      var fin   = false;

      var timer = setTimeout(function () {
        if (fin) return; fin = true;
        try { ctrl.abort(); } catch (e) {}
        resolve({ ok: false, ms: 99999 });
      }, TIMEOUT);

      fetch(line.url, {
        method: "GET",
        mode: "no-cors",       // 跨域能发，不读内容
        cache: "no-store",     // 防缓存
        signal: ctrl.signal
      })
        .then(function () {
          if (fin) return; fin = true;
          clearTimeout(timer);
          resolve({ ok: true, ms: Date.now() - start });
        })
        .catch(function () {
          if (fin) return; fin = true;
          clearTimeout(timer);
          resolve({ ok: false, ms: 99999 });
        });
    });
  }

  /* 每条测 ROUNDS 次取最快 */
  function pingBest(line) {
    var tasks = [];
    for (var i = 0; i < ROUNDS; i++) tasks.push(pingOnce(line));
    return Promise.all(tasks).then(function (rs) {
      var ok = rs.filter(function (r) { return r.ok; });
      if (!ok.length) return { ok: false, ms: 99999 };
      return { ok: true, ms: Math.min.apply(null, ok.map(function (r) { return r.ms; })) };
    });
  }

  function testAll(onEach) {
    return Promise.all(LINES.map(function (line, i) {
      return pingBest(line).then(function (r) {
        var out = { line: line, index: i, ok: r.ok, ms: r.ms };
        if (typeof onEach === "function") onEach(out);
        return out;
      });
    }));
  }

  function grade(ms, ok) {
    if (!ok || ms >= 99999) return { color: "#666",    label: "不可用" };
    if (ms < 300)           return { color: "#30d158", label: "极速" };
    if (ms < 800)           return { color: "#ffd60a", label: "正常" };
    if (ms < 2000)          return { color: "#ff9f0a", label: "偏慢" };
    return                         { color: "#ff453a", label: "很慢" };
  }

  global.Lines = { LINES: LINES, pingOnce: pingOnce, pingBest: pingBest, testAll: testAll, grade: grade };
})(window);

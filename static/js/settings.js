/* ============================================================
   逃离程丽 - 设置面板 / 章节选择
   字号、速度、动画、恐怖特效、噪点；配置持久化到 localStorage
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var KEY = "escape_chengli_settings";

  // 默认配置
  var DEFAULTS = {
    fontScale: 100,   // 80 - 160 (%)
    speed: 60,        // 0 - 100，越大越快
    anim: true,
    horror: true,
    noise: 50         // 0 - 100
  };

  var cfg = load();

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return Object.assign({}, DEFAULTS, s);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  // 把配置应用到页面
  function apply() {
    // 字号：写入 --fs-scale
    root.style.setProperty("--fs-scale", (cfg.fontScale / 100).toFixed(2));

    // 动画开关
    body.classList.toggle("no-anim", !cfg.anim);

    // 恐怖特效开关
    body.classList.toggle("no-horror", !cfg.horror);

    // 噪点强度
    var noiseEl = document.querySelector(".noise");
    if (noiseEl) noiseEl.style.opacity = (cfg.noise / 100 * 0.28).toFixed(3);

    // 打字速度：暴露给 game.js
    window.__typeSpeed = speedToMs(cfg.speed);

    save();
    if (window.__relayout) setTimeout(window.__relayout, 30);
  }

  // 0 -> 慢 (80ms)，100 -> 快 (8ms)
  function speedToMs(v) {
    return Math.round(80 - (v / 100) * 72);
  }

  // ============================================================
  //  绑定 UI
  // ============================================================
  function bind() {
    var $set = document.getElementById("settingsOverlay");
    var $font = document.getElementById("setFont");
    var $fontVal = document.getElementById("setFontVal");
    var $speed = document.getElementById("setSpeed");
    var $speedVal = document.getElementById("setSpeedVal");
    var $anim = document.getElementById("setAnim");
    var $horror = document.getElementById("setHorror");
    var $noise = document.getElementById("setNoise");
    var $noiseVal = document.getElementById("setNoiseVal");

    if (!$set) return;

    // 回填当前值
    $font.value = cfg.fontScale; $fontVal.textContent = cfg.fontScale + "%";
    $speed.value = cfg.speed;    $speedVal.textContent = cfg.speed;
    $anim.checked = cfg.anim;
    $horror.checked = cfg.horror;
    $noise.value = cfg.noise;    $noiseVal.textContent = cfg.noise;

    // 打开 / 关闭
    document.getElementById("btnSettings").addEventListener("click", function () {
      $set.classList.add("show");
    });
    document.getElementById("btnCloseSettings").addEventListener("click", function () {
      $set.classList.remove("show");
    });
    $set.addEventListener("click", function (e) {
      if (e.target === $set) $set.classList.remove("show");
    });

    // 字号
    $font.addEventListener("input", function () {
      cfg.fontScale = parseInt($font.value, 10);
      $fontVal.textContent = cfg.fontScale + "%";
      apply();
    });

    // 速度
    $speed.addEventListener("input", function () {
      cfg.speed = parseInt($speed.value, 10);
      $speedVal.textContent = cfg.speed;
      apply();
    });

    // 动画
    $anim.addEventListener("change", function () {
      cfg.anim = $anim.checked; apply();
    });

    // 恐怖特效
    $horror.addEventListener("change", function () {
      cfg.horror = $horror.checked; apply();
    });

    // 噪点
    $noise.addEventListener("input", function () {
      cfg.noise = parseInt($noise.value, 10);
      $noiseVal.textContent = cfg.noise;
      apply();
    });
  }

  // ============================================================
  //  章节选择
  // ============================================================
  function bindChapters() {
    var $ov = document.getElementById("chaptersOverlay");
    var $list = document.getElementById("chapterList");
    if (!$ov || !$list) return;

    document.getElementById("btnChapters").addEventListener("click", function () {
      $ov.classList.add("show");
      loadChapters();
    });
    document.getElementById("btnCloseChapters").addEventListener("click", function () {
      $ov.classList.remove("show");
    });
    $ov.addEventListener("click", function (e) {
      if (e.target === $ov) $ov.classList.remove("show");
    });

    function loadChapters() {
      $list.innerHTML = "";
      fetch(window.GAME_API.chapters)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var list = d.chapters || d || [];
          if (!list.length) { $list.innerHTML = "<p class='menu-tip'>章节列表加载失败</p>"; return; }
          list.forEach(function (ch) {
            var item = document.createElement("div");
            item.className = "chapter-item" + (ch.available ? "" : " locked");
            var name = document.createElement("span");
            name.textContent = ch.title;
            var st = document.createElement("span");
            st.className = "ch-status";
            st.textContent = ch.available ? (ch.updated || "可游玩") : "敬请期待";
            item.appendChild(name);
            item.appendChild(st);
            if (ch.available) {
              item.addEventListener("click", function () {
                $ov.classList.remove("show");
                window.location.replace("game.html?chapter=" + ch.id + "&t=" + Date.now());
              });
            }
            $list.appendChild(item);
          });
        })
        .catch(function () {
          $list.innerHTML = "<p class='menu-tip'>无法连接服务器</p>";
        });
    }
  }

  // 启动
  function init() {
    apply();
    bind();
    bindChapters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 暴露配置给外部
  window.__getSettings = function () { return cfg; };

})();

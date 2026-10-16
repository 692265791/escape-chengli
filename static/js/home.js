/* ============================================================
   逃离程丽 · 主页交互 home.js
   ============================================================ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------- 更新日志数据 ---------- */
  var LOG = {
    v4: [
      { cat: "🎨 视觉重构", items: [
        "去除二次元/动态壁纸背景",
        "固定为老式监视器 CRT 风（扫描线 + 磷光绿 + 暗角 + 噪点）",
        "全站配色统一：冷绿 + 近黑底",
        "按钮、卡片、弹窗全部重做"
      ]},
      { cat: "🧩 代码拆分", items: [
        "home.html 瘦身，只保留结构",
        "新增 static/css/home.css —— 页面样式",
        "新增 static/css/dbg.css —— 调试面板样式",
        "新增 static/js/home.js —— 页面交互",
        "新增 static/js/dbg.js —— 调试面板逻辑",
        "旧文件全部保留，不影响游戏本体"
      ]},
      { cat: "🐞 调试面板", items: [
        "30+ 测试项全部恢复",
        "5 个 Tab：作弊 / 测试 / 图片 / 日志 / 信息",
        "开关 + 快捷操作全部回来",
        "样式独立，可被 game.html 复用"
      ]},
      { cat: "🌐 首页优化", items: [
        "版本号升级至 v4.0",
        "静态资源加版本号（防缓存）"
      ]}
    ],
    v3: [
      { cat: "📖 第十章 · 放假（主线）", items: [
        "新增第十章「放假」，国庆放假 = 逃出程丽",
        "新剧情约 150 节点，从程丽主动放行到 Boss 战",
        "新增国庆假期 7 天剧情（10 月 1 日 - 10 月 7 日）",
        "新增返校日 Boss 战场景"
      ]},
      { cat: "🏆 结局系统", items: [
        "新增 6 个普通结局：留下 / 逃出 / 同名 / 放假 / 返校 / 程丽",
        "新增 2 个隐藏结局：留下 程丽 / 虚空",
        "集齐 6 个普通结局后解锁隐藏支线",
        "首页新增「结局收集」，实时显示解锁进度"
      ]},
      { cat: "⚔️ Boss 战", items: [
        "新增考卷式 Boss 战，真实答题卡界面",
        "5 道道德困境题，涂格作答",
        "答完自动判分，全对进入好结局"
      ]},
      { cat: "🎭 新角色", items: [
        "新增彭梦玲（五班语文老师）",
        "黑色剪影立绘（暂无素材标记）",
        "她与程丽的师生关系揭示"
      ]},
      { cat: "💾 存档系统", items: [
        "100 位手动存档位",
        "自动存档（每次跳节点自动更新）",
        "存档导入 / 导出（跨设备搬运）"
      ]},
      { cat: "⚙️ 作弊菜单", items: [
        "全新「逃离控制台」UI（4 Tab 分类）",
        "恐惧值锁定 / 无敌 / 变量修改",
        "剧情推进 / 章节跳转 / 节点跳转",
        "6 个视觉滤镜 + 11 个恶趣味特效"
      ]},
      { cat: "🐞 调试面板", items: [
        "独立调试面板（开发者用）",
        "5 个 Tab：作弊 / 测试 / 图片 / 日志 / 信息",
        "35+ 测试项目（CPU / DOM / Canvas / JSON 基准）",
        "图片资源查看 + 单张下载 + 批量下载",
        "一键打包下载全部源码（ZIP）"
      ]},
      { cat: "🎨 视觉改版", items: [
        "全站暗色恐怖风",
        "丝滑打字机（逐字淡入 + 标点停顿）",
        "标题随机恐怖动画池（8 种）"
      ]},
      { cat: "🌐 线路 / 部署", items: [
        "新增线路选择页（三线路自动测速）",
        "Cloudflare + GitHub Pages 双托管"
      ]},
      { cat: "🐛 Bug 修复", items: [
        "修复章节切换死链 / 小游戏卡死",
        "修复打字机 DOMException",
        "修复存档节点跳错",
        "修复免责声明 cookie 不生效"
      ]}
    ],
    v2: [
      { cat: "🎨 视觉改版", items: ["全站极简黑白改版", "Home 页布局重做"] },
      { cat: "📜 免责声明", items: ["改为长条款，必须输入 yes 同意", "支持「不再提示」"] },
      { cat: "💾 云存档", items: ["输入名字即可获取云存档", "跨设备续玩"] },
      { cat: "📖 剧情优化", items: ["第一章改名「初见」", "主线剧情衔接优化"] }
    ],
    v1: [
      { cat: "📖 第一章 · 名单", items: ["第一章「名单」完整可玩", "打字机对白 / 分支选项 / 存读档"] },
      { cat: "🎮 小游戏", items: ["拼写游戏（字母拼词）", "单词听写（4 选 1）", "抄写惩罚（限时连点）", "QTE 闪避戒尺"] },
      { cat: "🎭 恐怖氛围", items: ["恐怖主页：血色重影故障", "扫描线 / 噪点 / 暗角 / 随机闪白", "恐惧值系统（满 100 触发迷失结局）"] }
    ]
  };

  /* ---------- 结局数据 ---------- */
  var NORMAL = [
    { id: "c3_stay",     title: "留下",    tag: "坏" },
    { id: "c3_escape",   title: "逃出",    tag: "好" },
    { id: "c3_samename", title: "同名",    tag: "中立" },
    { id: "c3_holiday",  title: "放假",    tag: "中立" },
    { id: "c3_return",   title: "返校",    tag: "坏" },
    { id: "c3_chengli",  title: "程丽",    tag: "苦涩" }
  ];
  var SECRET = [
    { id: "c3_keep", title: "留下 程丽", tag: "真·好", secret: true },
    { id: "c3_void", title: "虚空",     tag: "最坏", secret: true }
  ];

  ready(function () {
    function openPanel(id) { var p = $(id); if (p) p.classList.add("show"); }
    function closePanel(p) { if (p) p.classList.remove("show"); }

    /* ---------- 打开弹窗 ---------- */
    document.querySelectorAll(".more-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.dataset.open;
        if (t === "log") { renderLog("v3"); openPanel("panelLog"); }
        else if (t === "endings") { renderEndings(); openPanel("panelEndings"); }
        else if (t === "contact") { openPanel("panelContact"); }
        else if (t === "sponsor") { openPanel("panelSponsor"); }
      });
    });

    /* ---------- 关闭弹窗 ---------- */
    document.querySelectorAll(".panel").forEach(function (p) {
      p.querySelectorAll("[data-close]").forEach(function (x) {
        x.addEventListener("click", function () { closePanel(p); });
      });
      p.addEventListener("click", function (e) {
        if (e.target === p && !p.classList.contains("force")) closePanel(p);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".panel.show").forEach(function (p) {
          if (!p.classList.contains("force")) closePanel(p);
        });
      }
    });

    /* ---------- 更新日志 ---------- */
    function renderLog(ver) {
      var body = $("logBody");
      if (!body) return;
      var list = LOG[ver] || [];
      body.innerHTML = list.map(function (cat) {
        return '<div class="log-cat">' +
          '<div class="log-cat-title">' + cat.cat + '</div>' +
          '<ul>' + cat.items.map(function (x) { return '<li>' + x + '</li>'; }).join("") + '</ul>' +
          '</div>';
      }).join("");
    }
    document.querySelectorAll("#panelLog .panel-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll("#panelLog .panel-tab").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        renderLog(t.dataset.tab);
      });
    });

    /* ---------- 结局渲染 ---------- */
    function renderEndings() {
      var grid = $("endingsGrid");
      var hint = $("endingsHint");
      if (!grid) return;
      var unlocked = [];
      try { unlocked = JSON.parse(localStorage.getItem("ec_endings_v1") || "[]"); } catch (e) {}
      function has(id) { return unlocked.indexOf(id) !== -1; }
      grid.innerHTML = "";
      NORMAL.concat(SECRET).forEach(function (e) {
        var got = has(e.id);
        var d = document.createElement("div");
        d.className = "ending-card" + (got ? " got" : " locked") + (e.secret ? " secret" : "");
        d.innerHTML =
          '<div class="ending-tag">' + (e.secret ? "隐藏 · " : "") + e.tag + '</div>' +
          '<div class="ending-name">' + (got ? e.title : "？？？") + '</div>' +
          '<div class="ending-state">' + (got ? "已解锁" : "未解锁") + '</div>';
        grid.appendChild(d);
      });
      var got = unlocked.length;
      var normalDone = NORMAL.filter(function (e) { return has(e.id); }).length;
      if (hint) {
        if (normalDone >= 6) {
          hint.textContent = "✓ 已集齐 6 个普通结局。重玩第 10 章，将开启隐藏支线。";
        } else {
          hint.textContent = "已解锁 " + got + " / 8 · 普通结局 " + normalDone + " / 6";
        }
      }
      var quick = $("endQuick");
      if (quick) quick.textContent = got + " / 8";
    }
    renderEndings();
    window.__renderEndings = renderEndings;

    /* ---------- 公告（强制） ---------- */
    var NOTICE_KEY = "ec_notice_v3_dismissed";
    var notice = $("panelNotice");
    var noticeOk = $("noticeOk");
    var noticeSkip = $("noticeSkip");
    var dismissed = false;
    try { dismissed = localStorage.getItem(NOTICE_KEY) === "1"; } catch (e) {}
    if (!dismissed && notice) setTimeout(function () { notice.classList.add("show"); }, 500);
    if (noticeOk) noticeOk.addEventListener("click", function () {
      if (noticeSkip && noticeSkip.checked) {
        try { localStorage.setItem(NOTICE_KEY, "1"); } catch (e) {}
      }
      notice.classList.remove("show");
    });

    /* ---------- 开始游戏 cookie 检查 ---------- */
    var startBtn = $("btnStart");
    if (startBtn) {
      startBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var agreed = false;
        try { agreed = localStorage.getItem("ec_agreed") === "1"; } catch (err) {}
        location.href = agreed ? "loading.html?ch=ch1" : "disclaimer.html";
      });
    }
  });
})();

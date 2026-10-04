/* ============================================================
   boss.js —— 考卷式 Boss 战
   玩家在答题卡上涂黑选项，涂完自动判定
   ============================================================ */
(function(){
  "use strict";

  var QUESTIONS = [
    {
      q: "如果放假 = 逃出，你愿意删掉谁的名字？",
      options: [
        "删掉我自己的名字",
        "删掉程丽的名字",
        "删掉于硕的名字",
        "谁的名字都不删"
      ],
      right: 3,        /* 索引，正确答案 */
      effects: { trust: 3, clue: 1 }
    },
    {
      q: "如果只能带一个人离开，选谁？",
      options: ["带我妈妈", "带于硕", "带彭梦玲", "谁都不带，我自己走"],
      right: 2,
      effects: { clue: 1, trust: 1 }
    },
    {
      q: "你确定你自己的名字是真实的吗？",
      options: ["确定。我是真实的。", "不确定。但我在。", "我不知道。", "名字不重要。重要的是我做了什么。"],
      right: 3,
      effects: { trust: 3, clue: 1 }
    },
    {
      q: "如果放假是假的，你还想放假吗？",
      options: ["想。哪怕只有一天。", "不想。我要真的。", "我不知道什么是真的。", "只要你在等，我就回来。"],
      right: 3,
      effects: { trust: 4, clue: 2 }
    },
    {
      q: "如果我把笔给你，你会划掉我吗？",
      options: ["会。我要出去。", "不会。你不是我要杀的人。", "我不知道。", "笔给我，我自己决定。"],
      right: 1,
      effects: { trust: 5, clue: 2 }
    }
  ];

  function $(s){ return document.querySelector(s); }
  function ce(t,c){ var e=document.createElement(t); if(c)e.className=c; return e; }

  var overlay = null;
  var answers = [-1, -1, -1, -1, -1];  /* 每题涂的选项索引 */
  var current = 0;  /* 当前题号 */
  var cells = [];   /* 5x4 的格子 DOM */

  function build(){
    overlay = ce("div","boss-overlay");
    overlay.innerHTML =
      '<div class="boss-sheet">' +
        '<div class="boss-head">' +
          '<h2>答题卡</h2>' +
          '<p class="boss-sub">姓名：____________  班级：五班  科目：英语</p>' +
        '</div>' +
        '<div class="boss-body">' +
          '<div class="boss-question" id="bossQ"></div>' +
          '<div class="boss-card" id="bossCard">' +
            '<div class="boss-card-head">' +
              '<span>题号</span><span>A</span><span>B</span><span>C</span><span>D</span>' +
            '</div>' +
            '<div id="bossRows"></div>' +
          '</div>' +
        '</div>' +
        '<div class="boss-foot">' +
          '<div class="boss-progress" id="bossProgress">已涂 0 / 5</div>' +
          '<div class="boss-acts">' +
            '<button id="bossClear" type="button">擦除当前题</button>' +
            '<button id="bossSubmit" type="button" disabled>交卷</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    /* 生成 5 行 x 4 列格子 */
    var rows = overlay.querySelector("#bossRows");
    for (var i = 0; i < 5; i++){
      var row = ce("div","boss-row");
      var num = ce("span","boss-num");
      num.textContent = (i+1);
      row.appendChild(num);
      var rowCells = [];
      for (var j = 0; j < 4; j++){
        var cell = ce("div","boss-cell");
        cell.dataset.q = i;
        cell.dataset.o = j;
        /* 涂格：按住鼠标涂黑 */
        bindPaint(cell);
        row.appendChild(cell);
        rowCells.push(cell);
      }
      cells.push(rowCells);
      rows.appendChild(row);
    }

    overlay.querySelector("#bossClear").addEventListener("click", clearCurrent);
    overlay.querySelector("#bossSubmit").addEventListener("click", submit);
  }

  /* 涂格：mousedown / touchstart 涂黑 */
  function bindPaint(cell){
    function paint(e){
      e.preventDefault && e.preventDefault();
      var q = parseInt(cell.dataset.q, 10);
      var o = parseInt(cell.dataset.o, 10);
      /* 同题只允许涂一个 */
      for (var j = 0; j < 4; j++){
        cells[q][j].classList.remove("painted");
      }
      cell.classList.add("painted");
      answers[q] = o;
      updateProgress();
      /* 如果当前题涂了，自动跳到下一题 */
      if (q === current && current < 4){
        current++;
        setTimeout(renderQuestion, 250);
      }
    }
    cell.addEventListener("mousedown", paint);
    cell.addEventListener("touchstart", paint, { passive: false });
    cell.addEventListener("click", paint);
  }

  function updateProgress(){
    var n = answers.filter(function(x){ return x >= 0; }).length;
    overlay.querySelector("#bossProgress").textContent = "已涂 " + n + " / 5";
    overlay.querySelector("#bossSubmit").disabled = (n < 5);
  }

  function renderQuestion(){
    var q = QUESTIONS[current];
    var box = overlay.querySelector("#bossQ");
    box.innerHTML =
      '<div class="boss-q-num">第 ' + (current+1) + ' 题</div>' +
      '<div class="boss-q-text">' + q.q + '</div>' +
      '<div class="boss-q-opts">' +
        q.options.map(function(o, i){
          return '<div class="boss-q-opt"><b>' + "ABCD"[i] + '.</b> ' + o + '</div>';
        }).join("") +
      '</div>';
  }

  function clearCurrent(){
    for (var j = 0; j < 4; j++){
      cells[current][j].classList.remove("painted");
    }
    answers[current] = -1;
    updateProgress();
  }

  function submit(){
    /* 判分 */
    var rightCount = 0;
    var effectSum = {};
    for (var i = 0; i < 5; i++){
      if (answers[i] === QUESTIONS[i].right){
        rightCount++;
        var e = QUESTIONS[i].effects || {};
        for (var k in e){
          effectSum[k] = (effectSum[k] || 0) + e[k];
        }
      }
    }
    /* 应用变量 */
    if (window.__setVars){
      window.__setVars(effectSum);
    }
    /* 显示结果 */
    showResult(rightCount, effectSum);
  }

  function showResult(rightCount, effectSum){
    overlay.innerHTML =
      '<div class="boss-sheet boss-result">' +
        '<div class="boss-head"><h2>成绩单</h2></div>' +
        '<div class="boss-body">' +
          '<div class="boss-score">' + rightCount + ' / 5</div>' +
          '<div class="boss-score-line">' +
            (rightCount === 5 ? "全对。" : rightCount >= 3 ? "及格。" : "不及格。") +
          '</div>' +
          '<div class="boss-score-detail">' +
            '恐惧值 +' + (effectSum.san || 0) + '<br>' +
            '信任值 +' + (effectSum.trust || 0) + '<br>' +
            '线索 +' + (effectSum.clue || 0) +
          '</div>' +
        '</div>' +
        '<div class="boss-foot">' +
          '<button id="bossConfirm" type="button">继续</button>' +
        '</div>' +
      '</div>';

    overlay.querySelector("#bossConfirm").addEventListener("click", function(){
      /* 关闭弹窗，回到剧情 */
      close();
      /* 让剧情跳到下一个节点 */
      if (window.__goto){
        /* 全对 → 好的下一节点，否则 → 差的 */
        var nextNode = rightCount === 5 ? "c3_boss_end_good" : (rightCount >= 3 ? "c3_boss_end_mid" : "c3_boss_end_bad");
        window.__goto(nextNode);
      }
    });
  }

  function open(){
    if (!overlay) build();
    else {
      /* 重置 */
      answers = [-1,-1,-1,-1,-1];
      current = 0;
      for (var i = 0; i < 5; i++){
        for (var j = 0; j < 4; j++){
          cells[i][j].classList.remove("painted");
        }
      }
      updateProgress();
      renderQuestion();
    }
    overlay.classList.add("show");
    renderQuestion();
  }

  function close(){
    if (overlay) overlay.classList.remove("show");
  }

  window.__BOSS = { open: open, close: close };
})();

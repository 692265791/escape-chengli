/* ============================================================
   endings.js —— 结局收集 + 隐藏支线触发
   ============================================================ */
(function(){
  "use strict";

  var KEY = "ec_endings_v1";

  /* 普通 6 个结局的 id */
  var NORMAL = ["c3_stay", "c3_escape", "c3_samename", "c3_holiday", "c3_return", "c3_chengli"];
  /* 隐藏 2 个 */
  var SECRET = ["c3_keep", "c3_void"];
  var ALL = NORMAL.concat(SECRET);

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch(e){ return []; }
  }
  function save(arr){
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch(e){}
  }

  /* 解锁某个结局 */
  window.__UNLOCK_ENDING = function(id){
    if (!id || ALL.indexOf(id) === -1) return false;
    var arr = load();
    if (arr.indexOf(id) === -1){
      arr.push(id);
      save(arr);
    }
    return true;
  };

  /* 是否已解锁 */
  window.__HAS_ENDING = function(id){
    return load().indexOf(id) !== -1;
  };

  /* 已解锁数量 */
  window.__ENDING_COUNT = function(){
    return load().length;
  };

  /* 是否集齐 6 个普通结局 */
  window.__ALL_NORMAL_DONE = function(){
    var arr = load();
    for (var i = 0; i < NORMAL.length; i++){
      if (arr.indexOf(NORMAL[i]) === -1) return false;
    }
    return true;
  };

  /* 是否集齐 8 个（全通） */
  window.__ALL_DONE = function(){
    var arr = load();
    for (var i = 0; i < ALL.length; i++){
      if (arr.indexOf(ALL[i]) === -1) return false;
    }
    return true;
  };

  /* 是否触发隐藏支线（集齐 6 普通 + 还未拿到结局 7） */
  window.__SHOULD_TRIGGER_SECRET = function(){
    return window.__ALL_NORMAL_DONE() && !window.__HAS_ENDING("c3_keep");
  };

  /* 清空结局（调试用） */
  window.__CLEAR_ENDINGS = function(){
    try { localStorage.removeItem(KEY); } catch(e){}
  };

  /* 结局列表（用于主菜单显示） */
  window.__LIST_ENDINGS = function(){
    var arr = load();
    return {
      all: ALL,
      unlocked: arr,
      count: arr.length,
      total: ALL.length,
      normalDone: window.__ALL_NORMAL_DONE(),
      allDone: window.__ALL_DONE()
    };
  };

  window.__ENDINGS = {
    unlock: window.__UNLOCK_ENDING,
    has: window.__HAS_ENDING,
    count: window.__ENDING_COUNT,
    allNormal: window.__ALL_NORMAL_DONE,
    allDone: window.__ALL_DONE,
    shouldTriggerSecret: window.__SHOULD_TRIGGER_SECRET,
    clear: window.__CLEAR_ENDINGS,
    list: window.__LIST_ENDINGS,
    NORMAL: NORMAL,
    SECRET: SECRET
  };
})();

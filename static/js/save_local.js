/* ============================================================
   save_local.js v4 —— 内存快照存档
   核心：内存里维护一份"当前状态"，存档时直接读它
   ============================================================ */
(function(){
  "use strict";

  var STORE_KEY = "ec_save_v4";
  var MAX_SLOT = 100;

  /* ---------- 内存里的当前状态 ---------- */
  var CURRENT = {
    node: "",
    vars: {},
    chapter: ""
  };

  /* ---------- 游戏每次 goto 时调用这个 ---------- */
  window.__TRACK_CURRENT = function(nodeId, vars){
    if (nodeId) CURRENT.node = nodeId;
    if (vars) CURRENT.vars = JSON.parse(JSON.stringify(vars));
    /* 章节推断 */
    if (/^c3_/.test(CURRENT.node)) CURRENT.chapter = "ch3";
    else if (/^c2_/.test(CURRENT.node)) CURRENT.chapter = "ch2";
    else if (/^ch1_/.test(CURRENT.node)) CURRENT.chapter = "ch1";
  };

  window.__GET_CURRENT = function(){
    return JSON.parse(JSON.stringify(CURRENT));
  };

  /* ---------- 读写存档 ---------- */
  function loadAll(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch(e){ return {}; }
  }
  function saveAll(obj){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch(e){}
  }

  /* ---------- 保存到槽 ---------- */
  window.__SAVE_SLOT = function(slot, name){
    if (!CURRENT.node){
      alert("存档失败：游戏还没进入任何剧情节点");
      return null;
    }
    var data = {
      node_id: CURRENT.node,
      vars: JSON.parse(JSON.stringify(CURRENT.vars)),
      chapter: CURRENT.chapter,
      name: name || ("存档 " + slot),
      time: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    var all = loadAll();
    all[slot] = data;
    saveAll(all);
    return data;
  };

  /* ---------- 智能自动存档槽 ---------- */
  window.__SAVE_AUTO_SLOT = function(name){
    var all = loadAll();
    for (var i = 1; i <= MAX_SLOT; i++){
      if (!all[i]) return window.__SAVE_SLOT(i, name || ("存档 " + i));
    }
    return window.__SAVE_SLOT(MAX_SLOT, name || ("存档 " + MAX_SLOT));
  };

  /* ---------- 读取 ---------- */
  window.__READ_SLOT = function(slot){
    var all = loadAll();
    return all[slot] || null;
  };

  window.__DELETE_SLOT = function(slot){
    var all = loadAll();
    delete all[slot];
    saveAll(all);
  };

  /* ---------- 自动存档（后台，每次节点跳转触发） ---------- */
  window.__AUTOSAVE = function(){
    if (!CURRENT.node) return;
    var data = {
      node_id: CURRENT.node,
      vars: JSON.parse(JSON.stringify(CURRENT.vars)),
      chapter: CURRENT.chapter,
      name: "自动存档",
      time: new Date().toLocaleString("zh-CN", { hour12: false })
    };
    try { localStorage.setItem("ec_save_v4_auto", JSON.stringify(data)); } catch(e){}
  };

  window.__READ_AUTO = function(){
    try { return JSON.parse(localStorage.getItem("ec_save_v4_auto") || "null"); } catch(e){ return null; }
  };

  /* ---------- 应用存档 ---------- */
  window.__APPLY_SAVE = function(data){
    if (!data || !data.node_id){
      alert("存档数据损坏");
      return false;
    }
    /* 等 game.js 就绪 */
    function applyNow(){
      if (window.__setVars) window.__setVars(data.vars || {});
      if (window.__goto){
        window.__goto(data.node_id);
        /* 同步内存 */
        CURRENT.node = data.node_id;
        CURRENT.vars = JSON.parse(JSON.stringify(data.vars || {}));
        return true;
      }
      return false;
    }
    if (window.__goto) return applyNow();
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if (window.__goto){ clearInterval(iv); applyNow(); }
      else if (tries > 30){ clearInterval(iv); alert("游戏引擎未就绪"); }
    }, 100);
    return true;
  };

  /* ---------- 导入 / 导出 ---------- */
  window.__EXPORT_SAVES = function(){
    var pack = {
      version: 4,
      savedAt: new Date().toISOString(),
      slots: loadAll(),
      auto: window.__READ_AUTO()
    };
    var blob = new Blob([JSON.stringify(pack)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "escape-chengli-saves-" + Date.now() + ".json";
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  };

  window.__IMPORT_SAVES = function(){
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json";
    inp.onchange = function(e){
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(){
        try {
          var pack = JSON.parse(reader.result);
          if (!pack.slots) throw new Error("格式错误");
          saveAll(pack.slots);
          if (pack.auto) localStorage.setItem("ec_save_v4_auto", JSON.stringify(pack.auto));
          alert("导入成功！共 " + Object.keys(pack.slots).length + " 个存档");
        } catch(err){
          alert("导入失败：" + err.message);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  window.__CLEAR_ALL = function(){
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem("ec_save_v4_auto");
    } catch(e){}
  };

  window.__COUNT_SAVES = function(){
    return Object.keys(loadAll()).length;
  };

  window.__SAVE_SYSTEM = {
    MAX_SLOT: MAX_SLOT,
    loadAll: loadAll,
    loadAuto: window.__READ_AUTO,
    save: window.__SAVE_SLOT,
    saveAutoSlot: window.__SAVE_AUTO_SLOT,
    read: window.__READ_SLOT,
    del: window.__DELETE_SLOT,
    autosave: window.__AUTOSAVE,
    apply: window.__APPLY_SAVE,
    track: window.__TRACK_CURRENT,
    export: window.__EXPORT_SAVES,
    import: window.__IMPORT_SAVES,
    clearAll: window.__CLEAR_ALL,
    count: window.__COUNT_SAVES
  };
})();

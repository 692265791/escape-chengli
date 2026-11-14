/* ============================================================
   save_local.js v5 —— 内存快照存档 + 安全校验
   修复：首节点存档竞态 / 导入无校验 / 假成功提示 / 跨章读取
   ============================================================ */
(function(){
  "use strict";

  var STORE_KEY = "ec_save_v4";
  var AUTO_KEY  = "ec_save_v4_auto";
  var MAX_SLOT  = 100;
  var MAX_IMPORT_BYTES = 2 * 1024 * 1024;  /* 导入包上限 2MB，防卡死 */
  var MAX_SLOT_BYTES   = 20000;            /* 单槽上限 */

  var CURRENT = { node: "", vars: {}, chapter: "" };

  function clone(o){ try { return JSON.parse(JSON.stringify(o || {})); } catch (e) { return {}; } }
  function inferChapter(id){
    if (/^c3_/.test(id)) return "ch3";
    if (/^c2_/.test(id)) return "ch2";
    if (/^ch1_/.test(id)) return "ch1";
    return "";
  }
  function nowStr(){ try { return new Date().toLocaleString("zh-CN", { hour12: false }); } catch (e) { return ""; } }

  /* ---------- 内存快照 ---------- */
  window.__TRACK_CURRENT = function(nodeId, vars){
    if (nodeId) CURRENT.node = nodeId;
    if (vars) CURRENT.vars = clone(vars);
    var c = inferChapter(CURRENT.node);
    if (c) CURRENT.chapter = c;
  };

  window.__GET_CURRENT = function(){
    return { node: CURRENT.node, vars: clone(CURRENT.vars), chapter: CURRENT.chapter };
  };

  /* 修复竞态：save_local 晚于 game.js 首个 goto 时，从引擎当前状态回填快照 */
  function syncFromGame(){
    if (CURRENT.node) return true;
    try {
      if (typeof window.__curNodeId === "function") {
        var id = window.__curNodeId();
        if (!id) return false;
        CURRENT.node = id;
        if (typeof window.__curVars === "function") CURRENT.vars = clone(window.__curVars());
        CURRENT.chapter = inferChapter(id);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------- 读写存储 ---------- */
  function loadAll(){
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    } catch (e) { return {}; }
  }
  function saveAll(obj){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); return true; }
    catch (e) { return false; }  /* 配额不足等，不再静默成功 */
  }

  /* ---------- schema 校验 ---------- */
  function validSlot(d){
    if (!d || typeof d !== "object" || Array.isArray(d)) return "槽位结构非法";
    if (typeof d.node_id !== "string" || !d.node_id || d.node_id.length > 128) return "node_id 非法";
    if (d.vars != null && (typeof d.vars !== "object" || Array.isArray(d.vars))) return "vars 非法";
    if (d.name != null && typeof d.name !== "string") return "name 非法";
    if (d.time != null && typeof d.time !== "string") return "time 非法";
    if (d.chapter != null && typeof d.chapter !== "string") return "chapter 非法";
    try { if ((JSON.stringify(d) || "").length > MAX_SLOT_BYTES) return "槽位数据过大"; }
    catch (e) { return "槽位不可序列化"; }
    return "";
  }
  function validatePack(pack){
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) return "包结构非法";
    if (!pack.slots || typeof pack.slots !== "object" || Array.isArray(pack.slots)) return "缺少 slots";
    var keys = Object.keys(pack.slots);
    if (!keys.length) return "slots 为空";
    if (keys.length > MAX_SLOT) return "存档数量超过上限（" + MAX_SLOT + "）";
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!/^(?:[1-9]|[1-9]\d|100)$/.test(k)) return "槽位键非法：" + String(k).slice(0, 12);
      var prob = validSlot(pack.slots[k]);
      if (prob) return "槽 " + k + "：" + prob;
    }
    return "";
  }

  /* ---------- 保存 ---------- */
  window.__SAVE_SLOT = function(slot, name){
    syncFromGame();  /* 首节点竞态兜底 */
    if (!CURRENT.node) {
      alert("存档失败：游戏还没进入任何剧情节点");
      return null;
    }
    var data = {
      node_id: CURRENT.node,
      vars: clone(CURRENT.vars),
      chapter: CURRENT.chapter || inferChapter(CURRENT.node),
      name: String(name || ("存档 " + slot)).slice(0, 100),
      time: nowStr()
    };
    var err = validSlot(data);
    if (err) { alert("存档失败：" + err); return null; }
    var all = loadAll();
    all[slot] = data;
    if (!saveAll(all)) { alert("存档失败：浏览器存储空间不足"); return null; }
    return data;
  };

  window.__SAVE_AUTO_SLOT = function(name){
    var all = loadAll();
    for (var i = 1; i <= MAX_SLOT; i++) {
      if (!all[i]) return window.__SAVE_SLOT(i, name || ("存档 " + i));
    }
    return window.__SAVE_SLOT(MAX_SLOT, name || ("存档 " + MAX_SLOT));
  };

  /* ---------- 读取 / 删除 ---------- */
  window.__READ_SLOT = function(slot){
    var all = loadAll();
    return all[slot] || null;
  };
  window.__DELETE_SLOT = function(slot){
    var all = loadAll();
    delete all[slot];
    return saveAll(all);
  };

  /* ---------- 自动存档 ---------- */
  window.__AUTOSAVE = function(){
    syncFromGame();
    if (!CURRENT.node) return false;
    var data = {
      node_id: CURRENT.node,
      vars: clone(CURRENT.vars),
      chapter: CURRENT.chapter || inferChapter(CURRENT.node),
      name: "自动存档",
      time: nowStr()
    };
    try { localStorage.setItem(AUTO_KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  };
  window.__READ_AUTO = function(){
    try { return JSON.parse(localStorage.getItem(AUTO_KEY) || "null"); }
    catch (e) { return null; }
  };

  /* ---------- 应用存档（含跨章保护） ---------- */
  window.__APPLY_SAVE = function(data){
    if (!data || typeof data !== "object" || !data.node_id) {
      alert("存档数据损坏");
      return false;
    }
    var err = validSlot(data);
    if (err) { alert("存档数据损坏：" + err); return false; }

    /* 跨章节读取保护：节点必须存在于当前已加载的剧情文件 */
    try {
      if (typeof window.__hasNode === "function" && !window.__hasNode(data.node_id)) {
        alert("该存档属于其他章节：请先在「章节选择」中切换到对应章节，再读取此存档。");
        return false;
      }
    } catch (e) {}

    function applyNow(){
      if (!window.__goto) return false;
      if (window.__setVars) window.__setVars(clone(data.vars || {}));
      window.__goto(data.node_id);
      CURRENT.node = data.node_id;
      CURRENT.vars = clone(data.vars || {});
      CURRENT.chapter = data.chapter || inferChapter(data.node_id);
      return true;
    }
    if (window.__goto) return applyNow();
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      if (window.__goto) { clearInterval(iv); applyNow(); }
      else if (tries > 30) { clearInterval(iv); alert("游戏引擎未就绪"); }
    }, 100);
    return true;
  };

  /* ---------- 导入 / 导出 ---------- */
  window.__EXPORT_SAVES = function(){
    var pack = {
      version: 5,
      savedAt: new Date().toISOString(),
      slots: loadAll(),
      auto: window.__READ_AUTO()
    };
    try {
      var blob = new Blob([JSON.stringify(pack)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "escape-chengli-saves-" + Date.now() + ".json";
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) {
      alert("导出失败：当前浏览器不支持文件导出");
      return false;
    }
  };

  window.__IMPORT_SAVES = function(){
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = function(ev){
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        alert("导入失败：文件超过 2MB 上限");
        return;
      }
      var rd = new FileReader();
      rd.onload = function(){
        var pack;
        try { pack = JSON.parse(String(rd.result)); }
        catch (err) { alert("导入失败：JSON 格式错误"); return; }
        var prob = validatePack(pack);
        if (prob) { alert("导入失败：" + prob); return; }
        var all = loadAll();
        var n = 0;
        for (var k in pack.slots) { all[k] = pack.slots[k]; n++; }
        /* 修复假成功：只有落盘成功才提示成功 */
        if (!saveAll(all)) {
          alert("导入失败：存储空间不足，数据未写入");
          return;
        }
        if (pack.auto && typeof pack.auto === "object") {
          try { localStorage.setItem(AUTO_KEY, JSON.stringify(pack.auto)); } catch (e) {}
        }
        alert("导入成功：共 " + n + " 个存档");
      };
      rd.onerror = function(){ alert("导入失败：读取文件出错"); };
      rd.readAsText(file);
    };
    inp.click();
  };

  window.__CLEAR_ALL = function(){
    var ok = true;
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(AUTO_KEY);
    } catch (e) { ok = false; }
    return ok;
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
    count: window.__COUNT_SAVES,
    validateSlot: validSlot,
    validatePack: validatePack
  };
})();

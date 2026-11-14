/* 时间 + 精力系统 time.js（重构版）
   时段：早上 上午 中午 下午 黄昏 晚上
   说明：仅保留状态机与剧情接口；原 timeChip 渲染为死代码，已移除。
*/
(function(){
"use strict";
var PHASES=["早上","上午","中午","下午","黄昏","晚上"];
function ce(t,c){var e=document.createElement(t);if(c)e.className=c;return e;}
var st={phase:1, stamina:100, day:1};
function render(){ /* UI 未接入 HUD，保留空实现供兼容 */ }
function setPhase(p){ st.phase=Math.max(0,Math.min(PHASES.length-1,p)); render(); }
function nextPhase(){ setPhase(st.phase+1); return PHASES[st.phase]; }
function addStamina(v){ st.stamina=Math.max(0,Math.min(100,st.stamina+v)); render(); }
function cost(v){ addStamina(-v); return st.stamina>0; }
function isNight(){ return PHASES[st.phase]==="晚上"; }

/* 睡觉动画（受 reduced-motion 影响时退化为瞬时） */
function sleep(cb){
  var reduce=false;
  try{ reduce=(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)||document.body.classList.contains("no-anim"); }catch(e){}
  if (reduce){
    st.phase=0; st.day++; st.stamina=100; render(); if(cb) cb(); return;
  }
  var ov=ce("div","sleep-overlay");
  ov.innerHTML='<div class="sleep-inner"><div class="sleep-moon">☾</div><div class="sleep-txt" id="sleepTxt">夜深了……</div></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(function(){ ov.classList.add("show"); });
  setTimeout(function(){ var t=document.getElementById("sleepTxt"); if(t) t.textContent="你睡着了。"; },1300);
  setTimeout(function(){ ov.classList.remove("show"); },2400);
  setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); st.phase=0; st.day++; st.stamina=100; render(); if(cb) cb(); },2800);
}
window.__TIME={ get phase(){return st.phase;}, get stamina(){return st.stamina;}, get day(){return st.day;},
  PHASES:PHASES, setPhase:setPhase, nextPhase:nextPhase, addStamina:addStamina, cost:cost, isNight:isNight, sleep:sleep, render:render };
})();

/* 特效库 fx.js —— 剧情 JSON 写 "fx":[{"type":"..."}] 调用 */
(function(){
"use strict";
function ce(t,c){var e=document.createElement(t);if(c)e.className=c;return e;}
function rnd(a,b){return a+Math.random()*(b-a);}

function overlay(o){
  if(!document.body) return;
  var d=ce("div","fx-word fx-overlay");
  d.textContent=o.text||"";
  d.style.left=(o.x!=null?o.x:50)+"%"; d.style.top=(o.y!=null?o.y:50)+"%";
  if(o.color) d.style.color=o.color;
  if(o.size) d.style.fontSize=o.size+"px";
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add("show"); });
  var hold=o.hold!=null?o.hold:1600;
  setTimeout(function(){ d.classList.remove("show"); }, hold);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, hold+900);
}
function flashword(o){
  if(!document.body) return;
  var d=ce("div","fx-word fx-flash");
  d.textContent=o.text||"";
  d.style.left=(o.x!=null?o.x:50)+"%"; d.style.top=(o.y!=null?o.y:50)+"%";
  if(o.color) d.style.color=o.color;
  if(o.size) d.style.fontSize=o.size+"px";
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, o.dur!=null?o.dur:260);
}
function whisper(o){
  if(!document.body) return;
  var lines=o.lines||[o.text||""];
  var box=ce("div","fx-whisper"); document.body.appendChild(box);
  var gap=o.gap||420;
  lines.forEach(function(t,i){
    setTimeout(function(){
      var d=ce("div","fx-whisper-line");
      d.textContent=t; d.style.left=rnd(6,60)+"%";
      if(o.color) d.style.color=o.color;
      box.appendChild(d);
      requestAnimationFrame(function(){ d.classList.add("show"); });
    }, i*gap);
  });
  setTimeout(function(){ if(box.parentNode) box.parentNode.removeChild(box); }, lines.length*gap+2200);
}
function replace(o){
  var t=document.getElementById("dialogText"); if(!t||!o.from) return;
  var walk=function(n){ for(var i=0;i<n.childNodes.length;i++){ var c=n.childNodes[i];
    if(c.nodeType===3 && c.nodeValue.indexOf(o.from)!==-1) c.nodeValue=c.nodeValue.split(o.from).join(o.to||"");
    else if(c.nodeType===1) walk(c); } };
  walk(t);
}
function screenFx(cls,dur){ if(!document.body) return; document.body.classList.add(cls); setTimeout(function(){ document.body.classList.remove(cls); }, dur||600); }
function flash(o){ screenFx("fx-flash-white",(o&&o.dur)||420); }
function shake(o){ screenFx("fx-shake",(o&&o.dur)||600); }
function glitch(o){ screenFx("fx-glitch",(o&&o.dur)||700); }
function invert(o){ screenFx("fx-invert",(o&&o.dur)||260); }
function blur(o){ screenFx("fx-blur",(o&&o.dur)||800); }
function vignette(o){ screenFx("fx-vignette",(o&&o.dur)||1400); }
function staticFx(o){ screenFx("fx-static",(o&&o.dur)||900); }
function heartbeat(o){ screenFx("fx-heartbeat",(o&&o.dur)||1800); }
function zoom(o){ screenFx("fx-zoom",(o&&o.dur)||900); }
function spriteFx(cls,dur){ var s=document.getElementById("spriteLayer"); if(!s) return; s.classList.add(cls); setTimeout(function(){ s.classList.remove(cls); }, dur||600); }
function spriteGlitch(o){ spriteFx("fx-sp-glitch",(o&&o.dur)||700); }
function spriteShake(o){ spriteFx("fx-sp-shake",(o&&o.dur)||600); }
function spriteZoom(o){ spriteFx("fx-sp-zoom",(o&&o.dur)||900); }

var REG={
  overlay:overlay, flashword:flashword, whisper:whisper, replace:replace,
  flash:flash, shake:shake, glitch:glitch, invert:invert, blur:blur,
  vignette:vignette, static:staticFx, heartbeat:heartbeat, zoom:zoom,
  spriteGlitch:spriteGlitch, spriteShake:spriteShake, spriteZoom:spriteZoom
};
/* 高刺激特效清单：reduced-motion / 关闭动效时跳过（光敏保护） */
var HEAVY={flash:1,shake:1,glitch:1,invert:1,blur:1,static:1,heartbeat:1,zoom:1,
  spriteGlitch:1,spriteShake:1,spriteZoom:1};
function reduceOn(){
  try{
    if(document.body&&document.body.classList.contains("no-anim")) return true;
    if(document.body&&document.body.classList.contains("no-horror")) return true;
    return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }catch(e){ return false; }
}
function play(list){
  if(!list) return;
  var reduced=reduceOn();
  (Array.isArray(list)?list:[list]).forEach(function(o){
    if(!o||!o.type) return;
    if(reduced&&HEAVY[o.type]) return;   /* 降级：跳过强刺激视效 */
    var fn=REG[o.type];
    if(fn){ try{ fn(o); }catch(e){ console.warn("fx err",o.type,e); } }
    else console.warn("未知特效:",o.type);
  });
}
function reg(name,fn){ REG[name]=fn; }
window.__FX={ play:play, reg:reg, types:REG };
/* 事件解耦：game.js 只派发 storyfx 事件，不再直接调用特效实现 */
window.addEventListener("storyfx", function(e){ try{ play(e.detail); }catch(err){} });
})();

import { createSoundscape } from './sound.js';
import { createRenderer } from './renderer.js';
import { createFauna } from './fauna.js';
import { forestConfig, formatHour, createQualityController } from './scene-config.js';
import { createWorld } from './lib/sticker-world/world.js';
import { createDirector } from './lib/sticker-world/director.js';
import { forestManifest } from './world-manifest.js';
import { createWorldUI } from './world-ui.js';

const $=id=>document.getElementById(id);
const canvas=$('scene'), plate=$('plate'), motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const soundscape=createSoundscape();
const mobile=matchMedia('(pointer: coarse)').matches || innerWidth<700;
const quality=createQualityController(mobile?forestConfig.pixels.mobile:forestConfig.pixels.desktop);
const fauna=createFauna($('fauna'));
let renderer=null, contextLost=false, initialized=false;
let paused=motionPreference.matches, soundWanted=false, soundBusy=false, immersed=false;
let time=0, waterTime=0, hour=forestConfig.hours.initial, targetHour=hour, rain=0, targetRain=0;
let cycle=false, cycleTime=0, wind=.65, pointer=[0,0], easedPointer=[0,0];
let frame=0, lastTime=0, deadline=0, lastTelemetry=0;
let timingStart=0, paints=0, observedFps=0, submitSum=0, averageSubmit=0;
let lastEnvironmentTime=-Infinity;
const world=createWorld(forestManifest,{onEvent:event=>{
  if(event.type==='call'&&soundWanted&&!paused&&!document.hidden) soundscape.cue(event);
}});
const director=createDirector(world,forestManifest);
const environment=()=>({hour,rain,wind,paused:paused||document.hidden});
world.update(time,environment());

// Local, inspectable command boundary. No secrets, remote evaluation or network.
// A future controller can replace the ambient policy without replacing rendering.
function dispatch(command) {
  if(!renderer||document.hidden) return {ok:false,reason:'unavailable',revision:world.frame().revision};
  world.update(time,environment());
  const receipt=world.dispatch(command);
  if(receipt.ok) {director.setEnabled(false);requestFrame();}
  return receipt;
}
function setDirectorEnabled(enabled) {
  director.setEnabled(enabled);requestFrame();
  return {enabled:director.isEnabled};
}
const api=Object.freeze({observe:()=>({...world.observe(),directorEnabled:director.isEnabled}),dispatch,setDirectorEnabled});
globalThis.stickerWorld=api;
const worldUI=createWorldUI({manifest:forestManifest,...api,isDirectorEnabled:()=>director.isEnabled,requestFrame});

function announce(message) { $('status').textContent=message; }
function updateClock() {
  const formatted=formatHour(hour);
  $('hour-label').value=formatted;
  $('hour').value=String(hour);
  $('hour').setAttribute('aria-valuetext',formatted);
  $('cycle-button').setAttribute('aria-pressed',String(cycle));
  $('cycle-button').firstChild.textContent=cycle?'Day is passing ':'Let the day pass ';
}
function updateMotion() {
  $('motion-button').disabled=!renderer;
  $('motion-button').setAttribute('aria-pressed',String(Boolean(renderer)&&!paused));
  $('motion-button').title=paused?'Resume motion (Space)':'Pause motion (Space)';
  $('motion-icon').textContent=paused?'▷':'Ⅱ';
  $('motion-label').textContent=renderer?(paused?'Resume':'Pause'):'Still';
  $('scene-state').textContent=renderer?(paused?'A QUIET STILL':'A LIVING FOREST'):'STILL FRAME';
  soundscape.setActive(!paused);
}
function updateFallback() {
  const daylight=Math.max(.21,Math.min(1,(19.6-hour)/2.2))*Math.min(1,(hour-5.7)/1.25);
  plate.style.filter=`brightness(${.30+.70*daylight-rain*.13}) saturate(${.68+daylight*.32-rain*.2})`;
}
function draw(recordFrame=false) {
  if(!renderer) return;
  const start=performance.now();
  world.update(time,environment());director.update();
  const worldFrame=world.frame(), sceneWind=Math.min(2,wind+worldFrame.effects.gust*.9);
  renderer.draw({time,hour,rain,wind:sceneWind,pointer:easedPointer,pixelBudget:quality.pixels,waterTime,effects:worldFrame.effects});
  const aspect=innerWidth/innerHeight;
  const cover=[Math.min(1,aspect/forestConfig.imageAspect),Math.min(1,forestConfig.imageAspect/aspect)];
  fauna.draw({time:worldFrame.time,hour,rain,wind:sceneWind,paused:paused||document.hidden,width:innerWidth,height:innerHeight,cover,pointer:easedPointer,quality:quality.pixels/forestConfig.pixels.desktop,worldFrame});
  worldUI.drawGuides({cover,pointer:easedPointer});
  if(recordFrame) {submitSum+=performance.now()-start;paints++;}
  canvas.classList.add('ready');
}
function telemetry(now,force=false) {
  if(!force&&now-lastTelemetry<1000) return;
  lastTelemetry=now;
  $('forest').dataset.sceneTime=time.toFixed(3);
  $('forest').dataset.hour=hour.toFixed(2);
  $('forest').dataset.pixelBudget=String(quality.pixels);
  if(!timingStart) timingStart=now;
  if(now-timingStart>=3000) {
    observedFps=paints*1000/(now-timingStart);
    averageSubmit=paints?submitSum/paints:0;
    paints=0;submitSum=0;timingStart=now;
  }
  const label=paused?'Paused':`${observedFps.toFixed(1)} fps observed / 30 fps target`;
  $('performance-readout').textContent=`${label} · ${canvas.width} × ${canvas.height} render surface · ${(quality.pixels/1e6).toFixed(2)} MP cap · ${averageSubmit.toFixed(1)} ms average CPU submission (not GPU time).`;
  updateClock();
  worldUI.refresh();
}
function requestFrame() {
  if(!frame&&!document.hidden&&renderer) frame=requestAnimationFrame(tick);
}
function tick(now) {
  frame=0;if(!renderer||document.hidden) return;
  if(now+1<deadline) {requestFrame();return;}
  const interval=1000/forestConfig.fps;
  deadline=deadline?Math.max(deadline+interval,now+interval*.15):now+interval;
  const wall=lastTime?now-lastTime:0;
  const dt=Math.min(wall/1000,.15);lastTime=now;
  if(!paused) {
    time+=dt;
    waterTime+=dt*world.frame().effects.flow;
    quality.sample(wall,time);
    if(cycle) {
      cycleTime+=dt;
      const progress=Math.min(1,cycleTime/forestConfig.cycleSeconds);
      targetHour=forestConfig.hours.min+progress*(forestConfig.hours.max-forestConfig.hours.min);
      if(progress>=1) cycle=false;
    }
    easedPointer=easedPointer.map((v,i)=>v+(pointer[i]-v)*(1-Math.exp(-dt*2.4)));
  }
  const blend=motionPreference.matches||paused?1:1-Math.exp(-dt*1.3);
  hour+= (targetHour-hour)*blend;
  rain+= (targetRain-rain)*blend;
  const settling=Math.abs(hour-targetHour)>.005||Math.abs(rain-targetRain)>.002;
  if(!settling) {hour=targetHour;rain=targetRain;}
  wind=.58+rain*.32+.08*Math.sin(time*.19);
  if(time-lastEnvironmentTime>=.75||paused) {
    soundscape.setEnvironment({hour,rain,wind});lastEnvironmentTime=time;
  }
  draw(true);telemetry(now);
  if(!paused||settling) requestFrame();
}
function setHour(value) {
  if(!Number.isFinite(value)) return;
  cycle=false;targetHour=Math.max(forestConfig.hours.min,Math.min(forestConfig.hours.max,value));
  // Direct manipulation of a clock responds immediately, including while paused.
  hour=targetHour;
  soundscape.setEnvironment({hour,rain,wind});
  updateClock();updateFallback();requestFrame();
}
function toggleCycle() {
  cycle=!cycle;
  if(cycle) {
    if(hour>forestConfig.hours.max-.1) hour=targetHour=forestConfig.hours.min;
    cycleTime=(hour-forestConfig.hours.min)/(forestConfig.hours.max-forestConfig.hours.min)*forestConfig.cycleSeconds;
    if(paused) {paused=false;lastTime=deadline=0;timingStart=0;paints=0;submitSum=0;updateMotion();}
  }
  updateClock();requestFrame();
}
function toggleRain() {
  targetRain=targetRain?0:1;
  $('rain-button').setAttribute('aria-pressed',String(Boolean(targetRain)));
  if(paused||!renderer) rain=targetRain;
  soundscape.setEnvironment({hour,rain:targetRain,wind});
  updateFallback();requestFrame();
}
function toggleMotion() {
  if(!renderer) return;
  paused=!paused;lastTime=deadline=0;quality.reset();fauna.resetEvents(time);
  timingStart=0;paints=0;submitSum=0;
  updateMotion();
  if(paused) {
    cycle=false;hour=targetHour;rain=targetRain;
    soundscape.setEnvironment({hour,rain,wind});
    cancelAnimationFrame(frame);frame=0;draw();updateClock();
  } else requestFrame();
  telemetry(performance.now(),true);
  announce(paused?'Forest motion paused.':'Forest motion resumed.');
}
async function toggleSound() {
  if(soundBusy) return;soundBusy=true;$('sound-button').disabled=true;
  const desired=!soundWanted;
  try {
    if(desired) {
      soundscape.setEnvironment({hour,rain,wind});soundscape.setActive(!paused);
      const started=await soundscape.start();soundWanted=started!==false;
      if(document.hidden) await soundscape.stop();
    } else {soundWanted=false;await soundscape.stop();}
    $('sound-button').setAttribute('aria-pressed',String(soundWanted));
    $('sound-label').textContent=soundWanted?'Sound on':'Sound off';
    announce(soundWanted?'Forest ambience on.':'Forest ambience off.');
  } catch {
    soundWanted=false;$('sound-button').setAttribute('aria-pressed','false');
    $('sound-label').textContent='Try sound';announce('Sound could not start. Select sound to try again.');
  } finally {soundBusy=false;$('sound-button').disabled=false;}
}
function setImmersed(value) {
  worldUI.close();
  immersed=value;document.body.classList.toggle('immersed',value);
  $('interface').inert=value;$('return-button').hidden=!value;
  (value?$('return-button'):$('immerse-button')).focus({preventScroll:true});
}
async function fullscreen() {
  try {
    if(document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {announce('Fullscreen is unavailable here. Immerse hides the controls.');}
}
function fallback(message) {
  renderer?.destroy();renderer=null;canvas.classList.remove('ready');
  $('fauna').hidden=true;updateFallback();updateMotion();
  $('cycle-button').disabled=true;
  worldUI.setAvailable(false);
  $('performance-readout').textContent='Static fallback; no animation loop is running.';
  announce(message);
}
async function initialize() {
  try {
    await plate.decode();
    const current=createRenderer(canvas,plate);renderer=current;
    $('fauna').hidden=false;$('cycle-button').disabled=false;worldUI.setAvailable(true);updateMotion();requestFrame();
    await Promise.all([current.loadFoliage(),initialized?Promise.resolve():fauna.load()]);
    initialized=true;
    if(renderer===current) {draw();requestFrame();}
  } catch {fallback('The forest is displayed as a still image. Animated graphics are unavailable.');}
}

$('hour').addEventListener('input',event=>setHour(Number(event.target.value)));
$('cycle-button').addEventListener('click',toggleCycle);
$('rain-button').addEventListener('click',toggleRain);
$('volume').addEventListener('input',event=>{const value=Number(event.target.value);soundscape.setVolume(value/100);$('volume-label').value=`${value}%`;});
$('motion-button').addEventListener('click',toggleMotion);
$('sound-button').addEventListener('click',toggleSound);
$('immerse-button').addEventListener('click',()=>setImmersed(true));
$('return-button').addEventListener('click',()=>setImmersed(false));
$('fullscreen-button').addEventListener('click',fullscreen);
$('about-button').addEventListener('click',()=>{$('about').showModal();telemetry(performance.now(),true);});
$('about').addEventListener('click',event=>{
  if(event.target!==$('about')) return;
  const r=$('about').getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) $('about').close();
});
if(!document.fullscreenEnabled) $('fullscreen-button').hidden=true;
document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
document.addEventListener('keydown',event=>{
  if($('about').open||event.altKey||event.ctrlKey||event.metaKey||event.repeat) return;
  if(event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
  const key=event.key.toLowerCase();
  if(key===' '&&!event.target.closest('button,a')) {event.preventDefault();toggleMotion();}
  if(key==='s') toggleSound();
  if(key==='h') setImmersed(!immersed);
  if(key==='f') fullscreen();
  if(key==='escape'&&immersed) setImmersed(false);
});
document.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||paused||motionPreference.matches) return;
  pointer=[event.clientX/innerWidth-.5,event.clientY/innerHeight-.5];
},{passive:true});
document.addEventListener('pointerleave',()=>{pointer=[0,0];});
addEventListener('resize',()=>requestFrame());
motionPreference.addEventListener('change',event=>{
  if(!event.matches) return;
  paused=true;cycle=false;pointer=easedPointer=[0,0];hour=targetHour;rain=targetRain;
  timingStart=0;paints=0;submitSum=0;
  soundscape.setEnvironment({hour,rain,wind});
  cancelAnimationFrame(frame);frame=0;fauna.resetEvents(time);updateMotion();draw();updateClock();telemetry(performance.now(),true);
});
document.addEventListener('visibilitychange',async()=>{
  cancelAnimationFrame(frame);frame=0;lastTime=deadline=0;quality.reset();fauna.resetEvents(time);
  timingStart=0;paints=0;submitSum=0;
  world.update(time,environment());
  if(document.hidden) {await soundscape.stop();}
  else {
    requestFrame();
    if(soundWanted) {
      try {await soundscape.start();if(document.hidden) await soundscape.stop();}
      catch {soundWanted=false;$('sound-label').textContent='Sound off';$('sound-button').setAttribute('aria-pressed','false');}
    }
  }
});
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;
  fallback('Graphics paused. The still forest remains available.');
});
canvas.addEventListener('webglcontextrestored',()=>{
  if(contextLost) {contextLost=false;lastTime=deadline=0;initialize();}
});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastTime=deadline=0;soundscape.stop();});
addEventListener('pageshow',async event=>{
  requestFrame();
  if(event.persisted&&soundWanted&&!document.hidden) {
    try {await soundscape.start();if(document.hidden) await soundscape.stop();}
    catch {soundWanted=false;$('sound-label').textContent='Sound off';$('sound-button').setAttribute('aria-pressed','false');}
  }
});
updateClock();updateMotion();initialize();

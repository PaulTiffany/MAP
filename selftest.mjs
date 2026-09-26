// Dependency-free contract checks; browser visual/GPU verification is still required.
// Run: node selftest.mjs
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';
import { forestConfig, formatHour, createQualityController } from './scene-config.js';
import { createWorld } from './lib/sticker-world/world.js';
import { createDirector } from './lib/sticker-world/director.js';
import { forestManifest } from './world-manifest.js';
import { stickerCatalog } from './lib/sticker-world/catalog.js';

// Check the promoted static site without assuming deployment at the origin root.
for (const filename of ['index.html', 'methodology.html']) {
  const pageURL=new URL(filename,import.meta.url), html=await readFile(pageURL,'utf8');
  const references=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match=>match[1]);
  for(const match of html.matchAll(/srcset="([^"]+)"/g))
    references.push(...match[1].split(',').map(item=>item.trim().split(/\s+/)[0]));
  for(const reference of references) {
    if(/^(https?:|data:)/.test(reference)) continue;
    const deployed=new URL(reference,`https://example.test/MAP/${filename}`);
    assert.ok(deployed.pathname.startsWith('/MAP/'),'Local links retain the Pages project prefix');
    const target=new URL(reference,pageURL), fragment=target.hash.slice(1);target.hash='';
    await access(target);
    if(fragment) assert.ok((await readFile(target,'utf8')).includes(`id="${fragment}"`),`Missing anchor: ${reference}`);
  }
}
for(const sticker of Object.values(stickerCatalog)) if(sticker.asset) await access(new URL(sticker.asset.url));
await assert.rejects(access(new URL('./demos/dzanga-cinema/index.html',import.meta.url)),{code:'ENOENT'});
assert.ok(!(await readFile(new URL('./index.html',import.meta.url),'utf8')).includes('data-preset'));

assert.equal(formatHour(6.5),'06:30');
assert.equal(formatHour(19.5),'19:30');
const adaptive=createQualityController(1200000);
for(let n=0;n<100;n++) adaptive.sample(33.3,n/30);
assert.equal(adaptive.pixels,1200000,'Healthy cadence must not reduce quality');
for(let n=0;n<180;n++) adaptive.sample(60,10+n*.06);
assert.ok(adaptive.pixels<1200000,'Sustained missed budgets should reduce resolution');
for(let n=0;n<4000;n++) adaptive.sample(60,30+n*.06);
assert.equal(adaptive.pixels,forestConfig.pixels.minimum,'Adaptive quality must retain its lower bound');
const overloaded=createQualityController(1200000);
for(let n=0;n<90;n++) overloaded.sample(300,n*.3);
assert.equal(overloaded.pixels,912000,'Very slow foreground frames must also reduce quality');

const source=(await readFile(new URL('./scene.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const eventTarget=(extra={})=>{
  const handlers={};
  return Object.assign({addEventListener(name,fn){(handlers[name]??=[]).push(fn);},
    async dispatch(name,event={}){for(const fn of handlers[name]||[]) await fn(event);}},extra);
};
async function setup({reduced=false,graphics=true,delayedSound=false}={}) {
  const elements={};
  const noop=()=>{};
  const element=id=>elements[id]??=eventTarget({id,disabled:false,hidden:false,value:'',dataset:{},attrs:{},style:{},
    classList:{add:noop,remove:noop,toggle:noop},firstChild:{textContent:''},
    setAttribute(k,v){this.attrs[k]=v;},decode:()=>Promise.resolve(),focus:noop,open:false});
  const document=eventTarget({hidden:false,body:{classList:{toggle:noop}},getElementById:element,
    querySelectorAll:()=>[],fullscreenEnabled:false});
  const preference=eventTarget({matches:reduced}), window=eventTarget();
  let queue=new Map(),seq=0,now=0,draws=0,stops=0,resolveStart,soundEnvironment,renderState;
  const sound={setActive:noop,setEnvironment:value=>{soundEnvironment={...value};},setVolume:noop,cue:noop,
    start:()=>delayedSound?new Promise(resolve=>{resolveStart=resolve;}):Promise.resolve(true),
    stop:async()=>{stops++;return true;}};
  const renderer={draw:state=>{draws++;renderState={...state};},destroy:noop,loadFoliage:()=>Promise.resolve()};
  const fauna={draw:noop,resetEvents:noop,load:()=>Promise.resolve(true)};
  const context=vm.createContext({document,console,performance:{now:()=>now},innerWidth:1200,innerHeight:800,
    matchMedia:query=>query.includes('reduced-motion')?preference:{matches:false},
    createSoundscape:()=>sound,createFauna:()=>fauna,
    createWorld:(manifest,options)=>{
      const world=createWorld(manifest,options);
      // The test VM is a separate JS realm; use plain host objects at its boundary.
      return {...world,update:(time,env)=>world.update(time,JSON.parse(JSON.stringify(env))),
        dispatch:command=>world.dispatch(JSON.parse(JSON.stringify(command)))};
    },createDirector,forestManifest,
    createWorldUI:()=>({refresh:noop,drawGuides:noop,setAvailable:noop,close:noop}),
    createRenderer:()=>{if(!graphics)throw new Error('No WebGL');return renderer;},
    forestConfig,formatHour,createQualityController,
    requestAnimationFrame:fn=>{const id=++seq;queue.set(id,fn);return id;},
    cancelAnimationFrame:id=>queue.delete(id),addEventListener:window.addEventListener});
  vm.runInContext(source+'\nglobalThis.test={setHour,toggleRain,toggleMotion,toggleCycle,toggleSound,get time(){return time;},get hour(){return hour;},get cycle(){return cycle;},get wanted(){return soundWanted;}};',context);
  for(let n=0;n<8;n++) await Promise.resolve();
  return {document,elements,preference,context,window,get draws(){return draws;},get queued(){return queue.size;},
    get stops(){return stops;},get soundEnvironment(){return soundEnvironment;},get renderState(){return renderState;},resolveStart:value=>resolveStart(value),
    step(timestamp){now=timestamp;const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(now));}};
}
const reduced=await setup({reduced:true});reduced.step(100);
assert.equal(reduced.queued,0,'Reduced motion must have no continuous loop');
assert.equal(reduced.context.test.time,0);
reduced.context.test.setHour(18.7);reduced.step(200);
assert.equal(reduced.context.test.hour,18.7);
assert.equal(reduced.queued,0,'Manual time changes while paused must settle');
for(const reduction of ['pause','preference']) {
  const transition=await setup();transition.step(100);transition.context.test.toggleRain();
  for(let t=117;t<1200;t+=1000/60) transition.step(t);
  assert.ok(transition.soundEnvironment.rain>0&&transition.soundEnvironment.rain<1,'Regression must pause during an unsettled rain transition');
  if(reduction==='pause') transition.context.test.toggleMotion();
  else {transition.preference.matches=true;await transition.preference.dispatch('change',{matches:true});}
  assert.equal(transition.renderState.rain,1,'Pausing settles the requested visual rain');
  for(const key of ['hour','rain','wind']) assert.equal(transition.soundEnvironment[key],transition.renderState[key],`${reduction} must synchronize ${key} across audio and picture`);
  assert.equal(transition.queued,0,'Paused audio synchronization must not restart the render loop');
}
const timing=await setup();for(let t=100;t<5200;t+=1000/60) timing.step(t);
const measuredFps=()=>Number.parseFloat(timing.elements['performance-readout'].textContent);
assert.ok(measuredFps()>25,'Timing regression needs a populated running window');
timing.context.test.toggleMotion();timing.step(60000);timing.context.test.toggleMotion();
assert.ok(measuredFps()>25,'A long pause must not be counted in the resumed FPS window');
for(let t=60017;t<63200;t+=1000/60) timing.step(t);
assert.ok(measuredFps()>25&&measuredFps()<35,'First fresh resumed measurement should stay near the target cadence');
const live=await setup();for(let t=100;t<=1100;t+=1000/60)live.step(t);
assert.ok(live.context.test.time>.8);
assert.ok(live.draws>=25&&live.draws<=34,'60Hz RAF should present about30fps');
live.context.test.toggleMotion();const frozen=live.context.test.time;
live.step(2000);assert.equal(live.context.test.time,frozen);assert.equal(live.queued,0);
live.context.test.toggleMotion();live.context.test.toggleCycle();
for(let t=2100;t<190000;t+=1000/30)live.step(t);
assert.equal(live.context.test.cycle,false,'Accelerated day ends at dusk');
assert.ok(Math.abs(live.context.test.hour-19.5)<.01);
live.document.hidden=true;await live.document.dispatch('visibilitychange');
assert.equal(live.queued,0,'Hidden tabs stop presentation');
const still=await setup({graphics:false});
assert.equal(still.elements['motion-button'].disabled,true);
assert.equal(still.elements['cycle-button'].disabled,true);
still.context.test.setHour(12.5);assert.equal(still.queued,0);
assert.equal(still.context.stickerWorld.dispatch({id:'no-graphics',object:'parrot',action:'call'}).reason,'unavailable');
const controls=await setup();controls.step(100);
assert.equal(controls.context.stickerWorld.dispatch({id:'human-leaf',object:'leaf',action:'release',args:{path:'leaf-fall'}}).ok,true);
assert.equal(controls.context.stickerWorld.observe().directorEnabled,false,'Human/API actions take over ambient choices');
assert.equal(controls.context.stickerWorld.observe().objects.find(o=>o.id==='leaf').mode,'falling');
controls.context.test.toggleMotion();
assert.equal(controls.context.stickerWorld.dispatch({id:'paused-call',object:'parrot',action:'call'}).reason,'paused');
const race=await setup({delayedSound:true});
const starting=race.context.test.toggleSound();
race.document.hidden=true;await race.document.dispatch('visibilitychange');
race.resolveStart(true);await starting;
assert.ok(race.stops>=1,'Pending audio start cannot play in a hidden tab');
console.log('PASS: homepage links/assets/project prefix, retired route, clock, adaptive caps, reduced motion, scheduler, pause/audio, resumed timings, daylight, hidden tabs, fallback, pending audio start, manual commands.');

import { createSoundscape } from './sound.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const plate = $('plate');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const soundscape = createSoundscape();
const moods = { morning: [0, 0], rain: [1, 0], dusk: [0, 1] };
let mood = 'morning';
let weather = [0, 0];
let paused = motionPreference.matches;
let soundWanted = false;
let soundBusy = false;
let immersed = false;
let elapsed = 0;
let lastTime = 0;
let lastPaint = 0;
let frame = 0;
let renderer = null;
let contextLost = false;
let pointer = [0, 0];
let easedPointer = [0, 0];

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition, 0., 1.);
}`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#define HASH_SCALE 43758.5453
#else
precision mediump float;
#define HASH_SCALE 437.585
#endif
varying vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uPointer;
uniform vec2 uWeather;
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(fract(p*.031), vec2(127.1, 311.7))) * HASH_SCALE); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x),
             mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
}
float cloud(vec2 p) { return .62*noise(p) + .25*noise(p*2.03) + .13*noise(p*4.01); }
vec3 photograph(vec2 p) { return texture2D(uImage, vec2(p.x, 1.-p.y)).rgb; }

void main() {
  float rain = uWeather.x, dusk = uWeather.y, t = uTime;
  vec2 p = vec2(vUv.x, 1.-vUv.y);
  float viewportAspect = uResolution.x / uResolution.y;
  float imageAspect = uImageSize.x / uImageSize.y;
  vec2 cover = vec2(min(1., viewportAspect/imageAspect), min(1., imageAspect/viewportAspect));
  p = (p-.5)*cover/1.025 + .5;
  // Overscan is a fixed margin. Only pointer input adds minute viewing parallax.
  p += uPointer * vec2(.003, .002) * cover;
  vec3 original = photograph(p);

  // Authored stream envelope in source-image space; preserve the banks and fallen log.
  float downstream = smoothstep(.585, .99, p.y);
  float halfWidth = .017 + pow(downstream, .78)*.385;
  float river = (1.-smoothstep(halfWidth*.80, halfWidth, abs(p.x-.49))) * smoothstep(.585,.665,p.y);
  float logOcclusion = smoothstep(.565,.65,p.x) * (1.-smoothstep(.70,.82,p.y));
  river *= 1.-logOcclusion;
  float wave = sin(p.y*235.-t*1.5 + sin(p.x*35.+t*.25)) +
               .45*sin(p.y*391.+p.x*67.-t*2.15);
  vec2 refraction = vec2(wave*.0016, sin(p.x*92.+p.y*132.-t*.95)*.00042);
  refraction *= river * (.25+.75*downstream);

  // Green chroma confines tiny leaf movement; brown trunks stay anchored.
  float leaf = smoothstep(.018,.095,original.g-original.r) *
               (1.-smoothstep(.47,.67,p.y));
  vec2 leaves = vec2(sin(t*.49+p.y*26.)*.00042, sin(t*.36+p.x*31.)*.00022)*leaf;
  vec3 color = photograph(p+refraction+leaves);
  float shimmer = sin(p.y*460.-t*1.8+sin(p.x*39.+t*.2))* .008*river*downstream;
  color += shimmer;

  // Low, irregular air layers move across the central depth corridor.
  vec2 mistDistance = (p-vec2(.50,.51))*vec2(3.7,5.);
  float corridor = exp(-dot(mistDistance,mistDistance));
  float fog = smoothstep(.37,.79,cloud(vec2(p.x*5.-t*.012, p.y*8.+t*.006)));
  fog *= corridor * (.09 + .07*rain);
  color = mix(color, vec3(.64,.71,.61), fog);
  float lightDistance = (p.x-.58)*3.5;
  float light = exp(-lightDistance*lightDistance) * (1.-smoothstep(.2,.8,p.y));
  color += vec3(.022,.018,.007)*light*(.5+.5*sin(t*.21))* (1.-rain) * (1.-dusk);

  float luminance = dot(color,vec3(.2126,.7152,.0722));
  vec3 rainy = mix(vec3(luminance),color,.77)*vec3(.76,.85,.85);
  color = mix(color,rainy,rain);
  vec3 twilight = mix(vec3(luminance),color,.62)*vec3(.44,.61,.79);
  color = mix(color,twilight,dusk);

  // Rain is sparse, translucent and depth-scaled rather than a screen-wide veil.
  vec2 r = p*vec2(190.,80.);
  r.x += p.y*9.;
  float column = floor(r.x);
  float speed = 3.5+hash(vec2(column,2.))*3.;
  float drop = fract(r.y+t*speed+hash(vec2(column,1.))*20.);
  float line = (1.-smoothstep(.015,.08,abs(fract(r.x)-.5))) *
               smoothstep(.77,.90,drop)*(1.-smoothstep(.97,1.,drop));
  float sparse = step(.60,hash(vec2(column,floor(r.y+t*speed))));
  color += vec3(.40,.47,.44)*line*sparse*rain*.28;

  // A handful of small insects catches the light; no ornamental firefly field.
  for (int i=0; i<9; i++) {
    float seed = float(i);
    float cycle = fract(t*(.013+seed*.001)+seed*.137);
    vec2 mote = vec2(.27+hash(vec2(seed,1.))*.48+sin(t*.13+seed)*.025,
                     .72-cycle*.48);
    vec2 delta = (p-mote)*vec2(imageAspect,1.);
    float spark = (1.-smoothstep(.00035,.00125,length(delta)));
    float visible = sin(cycle*3.14159)*(.35+.65*sin(t*.3+seed)*sin(t*.3+seed));
    color += vec3(.58,.56,.34)*spark*visible*(1.-rain*.8)*(1.-dusk*.4);
  }
  gl_FragColor = vec4(color,1.);
}`;

function createRenderer() {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(message);
    }
    return result;
  }
  const program = gl.createProgram();
  const vertex = shader(gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program,'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,plate);
  const uniform = Object.fromEntries(['uResolution','uImageSize','uPointer','uWeather','uTime','uImage'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform1i(uniform.uImage,0);
  gl.uniform2f(uniform.uImageSize,plate.naturalWidth,plate.naturalHeight);
  return {
    draw() {
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1600000/(innerWidth*innerHeight)));
      const width = Math.round(innerWidth*ratio), height = Math.round(innerHeight*ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height; gl.viewport(0,0,width,height);
      }
      gl.uniform2f(uniform.uResolution,width,height);
      gl.uniform2f(uniform.uPointer,...easedPointer);
      gl.uniform2f(uniform.uWeather,...weather);
      gl.uniform1f(uniform.uTime,elapsed);
      gl.drawArrays(gl.TRIANGLES,0,6);
    },
    destroy() { gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
  };
}

function announce(message) { $('status').textContent = message; }
function updateMotion() {
  $('motion-button').setAttribute('aria-pressed',String(!paused));
  $('motion-button').title = paused ? 'Resume motion (Space)' : 'Pause motion (Space)';
  $('motion-icon').textContent = paused ? '▷' : 'Ⅱ';
  $('motion-label').textContent = paused ? 'Resume' : 'Pause';
  $('scene-state').textContent = renderer ? (paused ? 'A QUIET STILL' : 'A LIVING STILL') : 'STILL FRAME';
}
function requestFrame() {
  if (!frame && !document.hidden && renderer) frame = requestAnimationFrame(tick);
}
function tick(now) {
  frame = 0;
  if (!renderer || document.hidden) return;
  if (now-lastPaint < 1000/30) { requestFrame(); return; }
  const dt = lastTime ? Math.min((now-lastTime)/1000,.10) : 0;
  lastTime = lastPaint = now;
  if (!paused) elapsed += dt;
  const target = moods[mood];
  const blend = motionPreference.matches ? 1 : 1-Math.exp(-dt*1.5);
  let settling = false;
  weather = weather.map((v,i) => {
    const next = v+(target[i]-v)*blend;
    if (Math.abs(next-target[i])>.001) settling=true;
    return Math.abs(next-target[i])<.001 ? target[i] : next;
  });
  if (!paused) easedPointer = easedPointer.map((v,i)=>v+(pointer[i]-v)*(1-Math.exp(-dt*1.8)));
  renderer.draw();
  canvas.classList.add('ready');
  if (!paused || settling) requestFrame();
}
function setMood(next) {
  mood = next;
  document.querySelectorAll('[data-mood]').forEach(button => {
    const selected = button.dataset.mood === mood;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  soundscape.setRain(mood==='rain' ? .7 : 0);
  plate.style.filter = mood==='rain' ? 'saturate(.77) brightness(.82)' : mood==='dusk' ? 'saturate(.65) brightness(.58) sepia(.15) hue-rotate(150deg)' : '';
  lastTime = 0;
  requestFrame();
}
function toggleMotion() {
  if (!renderer) return;
  paused = !paused;
  lastTime = 0;
  updateMotion();
  if (paused) { cancelAnimationFrame(frame); frame=0; renderer.draw(); }
  else requestFrame();
  announce(paused ? 'Motion paused.' : 'Motion resumed.');
}
async function toggleSound() {
  if (soundBusy) return;
  soundBusy = true;
  $('sound-button').disabled = true;
  const desired = !soundWanted;
  try {
    if (desired) {
      const started = await soundscape.start();
      soundWanted = started !== false;
      // A permission/resume promise may finish after the user leaves this tab.
      if (document.hidden) await soundscape.stop();
    } else { soundWanted = false; await soundscape.stop(); }
    $('sound-button').setAttribute('aria-pressed',String(soundWanted));
    $('sound-label').textContent = soundWanted ? 'Sound on' : 'Sound off';
    announce(soundWanted ? 'Forest ambience on.' : 'Forest ambience off.');
  } catch {
    soundWanted = false;
    $('sound-button').setAttribute('aria-pressed','false');
    $('sound-label').textContent = 'Try sound';
    announce('Sound could not start. Select sound to try again.');
  } finally { soundBusy = false; $('sound-button').disabled = false; }
}
function setImmersed(value) {
  immersed = value;
  document.body.classList.toggle('immersed',value);
  $('interface').inert = value;
  $('return-button').hidden = !value;
  (value ? $('return-button') : $('immerse-button')).focus({preventScroll:true});
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { announce('Fullscreen is unavailable in this browser. Use Immerse to hide the controls.'); }
}
function fallback(message) {
  renderer = null;
  canvas.classList.remove('ready');
  $('motion-button').disabled = true;
  $('motion-label').textContent = 'Still';
  $('motion-button').setAttribute('aria-pressed','false');
  $('scene-state').textContent = 'STILL FRAME';
  announce(message);
}
async function initialize() {
  try {
    await plate.decode();
    renderer = createRenderer();
    $('motion-button').disabled = false;
    updateMotion(); requestFrame();
  } catch { fallback('The forest is shown as a still image. Animated rendering is unavailable.'); }
}

document.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>setMood(button.dataset.mood)));
$('motion-button').addEventListener('click',toggleMotion);
$('sound-button').addEventListener('click',toggleSound);
$('immerse-button').addEventListener('click',()=>setImmersed(true));
$('return-button').addEventListener('click',()=>setImmersed(false));
$('fullscreen-button').addEventListener('click',fullscreen);
$('about-button').addEventListener('click',()=>$('about').showModal());
$('about').addEventListener('click',event=>{ if(event.target===$('about')) { const r=$('about').getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) $('about').close(); } });
if (!document.fullscreenEnabled) $('fullscreen-button').hidden = true;
document.addEventListener('fullscreenchange',()=>{ $('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'); });
document.addEventListener('keydown',event=>{
  if ($('about').open || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  const key=event.key.toLowerCase();
  if (key===' ' && !event.target.closest('button, a')) { event.preventDefault(); toggleMotion(); }
  if (key==='s') toggleSound();
  if (key==='h') setImmersed(!immersed);
  if (key==='f') fullscreen();
  if (key==='escape' && immersed) setImmersed(false);
});
document.addEventListener('pointermove',event=>{
  if (event.pointerType !== 'mouse' || paused || motionPreference.matches) return;
  pointer=[event.clientX/innerWidth-.5,event.clientY/innerHeight-.5];
},{passive:true});
document.addEventListener('pointerleave',()=>{pointer=[0,0];});
addEventListener('resize',()=>{ if (renderer) { renderer.draw(); requestFrame(); } });
motionPreference.addEventListener('change',event=>{
  if (event.matches) {
    paused=true; pointer=easedPointer=[0,0]; weather=[...moods[mood]];
    cancelAnimationFrame(frame); frame=0; renderer?.draw();
    updateMotion();
  }
});
document.addEventListener('visibilitychange',async()=>{
  cancelAnimationFrame(frame); frame=0; lastTime=0;
  if (document.hidden) { if(soundWanted) await soundscape.stop(); }
  else {
    requestFrame();
    if(soundWanted) {
      try { await soundscape.start(); } catch {
        soundWanted=false;
        $('sound-label').textContent='Sound off';
        $('sound-button').setAttribute('aria-pressed','false');
      }
    }
  }
});
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault(); contextLost=true;
  cancelAnimationFrame(frame); frame=0;
  fallback('Graphics paused. The still forest remains available.');
});
canvas.addEventListener('webglcontextrestored',()=>{
  if(contextLost) {contextLost=false; initialize();}
});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastTime=0;soundscape.stop();});
addEventListener('pageshow',()=>requestFrame());
updateMotion();
initialize();

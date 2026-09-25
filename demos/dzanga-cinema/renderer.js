import { forestConfig } from './scene-config.js';

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0.,1.); }
`;

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
uniform sampler2D uFoliage;
uniform vec2 uResolution, uImageSize, uPointer;
uniform vec4 uEnvironment; // time, hour, rain, wind
uniform vec3 uStream; // center, horizon, spread
uniform vec4 uBough; // origin.xy, size.xy
uniform float uFoliageReady, uOverscan;

float hash(vec2 p) { return fract(sin(dot(fract(p*.031),vec2(127.1,311.7)))*HASH_SCALE); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float cloud(vec2 p) { return .65*noise(p)+.35*noise(p*2.03); }
vec3 photograph(vec2 p) { return texture2D(uImage,vec2(p.x,1.-p.y)).rgb; }
float ellipse(vec2 p,vec2 center,vec2 radius) {
  vec2 d=(p-center)/radius; return 1.-smoothstep(.20,1.,dot(d,d));
}
float waveHeight(vec2 q,float t) {
  return sin(q.y*18.-t*2.1+sin(q.x*4.3+t*.34))*.52
    +sin(q.x*11.+q.y*29.-t*3.1)*.27
    +sin(q.x*23.-q.y*37.+t*2.6)*.13;
}
vec3 lightGrade(vec3 color,float daylight,float warmth,float rain) {
  float luma=dot(color,vec3(.2126,.7152,.0722));
  vec3 day=mix(color,vec3(luma),rain*.24);
  day*=mix(vec3(.94,1.,.96),vec3(1.11,.96,.77),warmth*.55);
  vec3 night=mix(vec3(luma),color,.58)*vec3(.19,.30,.43);
  return mix(night,day,daylight)*(1.-rain*.19);
}

void main() {
  float t=uEnvironment.x, hour=uEnvironment.y, rain=uEnvironment.z, wind=uEnvironment.w;
  float aspect=uResolution.x/uResolution.y, imageAspect=uImageSize.x/uImageSize.y;
  vec2 cover=vec2(min(1.,aspect/imageAspect),min(1.,imageAspect/aspect));
  vec2 screen=vec2(vUv.x,1.-vUv.y);
  vec2 p=(screen-.5)*cover/uOverscan+.5+uPointer*vec2(.003,.002)*cover;
  float solar=clamp((hour-6.)/13.5,0.,1.);
  float elevation=max(0.,sin(solar*3.14159));
  float daylight=smoothstep(5.65,7.05,hour)*(1.-smoothstep(17.5,19.65,hour));
  float warmth=1.-smoothstep(.15,.8,elevation);
  vec2 sun=vec2(mix(.19,.89,solar),.045-elevation*.38);
  float gust=.55+.25*sin(t*.49)+.20*sin(t*.21+1.3);

  // Each patch is anchored to a branch group; trunks and roots never receive a global warp.
  float patch=ellipse(p,vec2(.34,.27),vec2(.19,.28))
             +ellipse(p,vec2(.72,.28),vec2(.14,.27))
             +ellipse(p,vec2(.065,.46),vec2(.12,.29))
             +ellipse(p,vec2(.94,.48),vec2(.12,.25));
  vec3 original=photograph(p);
  float green=smoothstep(.007,.085,original.g-original.r*.89);
  float foliage=min(1.,patch)*green;
  vec2 canopy=vec2(sin(t*.82+p.y*18.)*.0027,sin(t*.67+p.x*27.)*.0014);
  canopy*=foliage*(.42+wind*.75)*(.60+gust*.65);

  // Stream boundaries and a log occluder stay fixed in source space.
  float downstream=smoothstep(uStream.y,.99,p.y);
  float halfWidth=.017+pow(downstream,.78)*uStream.z;
  float water=(1.-smoothstep(halfWidth*.78,halfWidth,abs(p.x-uStream.x)))
              *smoothstep(uStream.y,.655,p.y);
  water*=1.-smoothstep(.565,.65,p.x)*(1.-smoothstep(.70,.82,p.y));
  vec2 q=vec2((p.x-uStream.x)*6.,(p.y-uStream.y)*4.);
  float height=waveHeight(q,t);
  vec2 slope=vec2(waveHeight(q+vec2(.025,0.),t)-height,
                 waveHeight(q+vec2(0.,.025),t)-height)/.025;
  vec2 refraction=vec2(height*.0045,sin(q.x*14.+q.y*36.-t*1.8)*.0016);
  refraction*=water*(.18+.82*downstream)*(1.+rain*.35);
  vec3 color=photograph(p+canopy+refraction);
  color=lightGrade(color,daylight,warmth,rain);

  // Analytic solar trajectory + moving canopy transmission. This is not ray tracing.
  vec2 ray=p-sun;
  float angle=atan(ray.x,max(.08,ray.y));
  float bands=pow(.5+.5*sin(angle*39.+sin(angle*12.+t*.10)*2.1),7.);
  float transmission=.58+.42*cloud(vec2(angle*9.+t*.043,p.y*.7+t*.022));
  float corridor=ellipse(p,vec2(.52,.35),vec2(.44,.55));
  float shafts=bands*transmission*corridor*daylight*(1.-rain*.85);
  vec3 sunColor=mix(vec3(.84,.92,.79),vec3(1.,.69,.32),warmth);
  color+=sunColor*shafts*.115;
  float dapple=cloud(p*vec2(24.,17.)+vec2(t*.060,-t*.029)+sun*5.);
  float movingShade=mix(.82,1.12,smoothstep(.25,.72,dapple));
  color*=mix(1.,movingShade,daylight*(1.-rain*.75)*(.42+.35*foliage));

  // A short normal model changes highlights independently of the original photographed ripples.
  vec3 normal=normalize(vec3(-slope.x*.09,-slope.y*.025,1.));
  vec3 lightDirection=normalize(vec3((sun.x-p.x)*1.4,.4+elevation,1.3));
  vec3 halfway=normalize(lightDirection+vec3(0.,-.3,1.));
  float glint=pow(max(dot(normal,halfway),0.),48.);
  float reflectionLane=exp(-abs(p.x-(uStream.x+(sun.x-.5)*downstream*.65))*12.);
  color+=sunColor*glint*water*downstream*reflectionLane*daylight*.15;
  color+=vec3(.020,.027,.026)*water*sin(q.y*64.-t*3.+sin(q.x*22.))*.45;

  // Rain-drop rings and occasional canopy drips disturb the stream, not its banks.
  for(int i=0;i<4;i++) {
    float seed=float(i), life=fract(t*(.23+seed*.035)+seed*.29);
    vec2 center=vec2(.36+hash(vec2(seed,2.))*.30,.73+hash(vec2(seed,4.))*.22);
    vec2 d=(p-center)*vec2(1.,2.8);
    float radius=life*.065;
    float ring=exp(-abs(length(d)-radius)*1800.)*(1.-life)*smoothstep(0.,.09,life);
    color+=vec3(.10,.12,.11)*ring*water*(.25+.75*rain);
  }

  float fog=cloud(vec2(p.x*5.-t*.030,p.y*8.+t*.012));
  float nearFog=cloud(vec2(p.x*3.+t*.018,p.y*11.-t*.017));
  float depth=ellipse(p,vec2(.51,.46),vec2(.29,.32));
  float ribbon=ellipse(p,vec2(.53,.65),vec2(.39,.12));
  float mist=(smoothstep(.35,.76,fog)*depth*.18+nearFog*ribbon*.11)*(1.+rain*.5);
  vec3 mistColor=mix(vec3(.09,.17,.23),vec3(.62,.70,.60),daylight);
  color=mix(color,mistColor,mist);

  vec2 r=p*vec2(210.,95.); r.x+=p.y*12.;
  float column=floor(r.x), speed=4.+hash(vec2(column,2.))*4.;
  float drop=fract(r.y+t*speed+hash(vec2(column,1.))*20.);
  float streak=(1.-smoothstep(.012,.065,abs(fract(r.x)-.5)))
    *smoothstep(.70,.88,drop)*(1.-smoothstep(.98,1.,drop));
  color+=vec3(.40,.47,.44)*streak*rain*.28*(.3+.7*daylight);

  // Transparent foreground branch. Pivot stays outside frame, leaf tips move in the breeze.
  vec2 b=(p-uBough.xy)/uBough.zw;
  vec2 hinge=b-vec2(1.,.08);
  float sway=(sin(t*.72)*.017+sin(t*1.13+.5)*.007)*(.5+wind);
  float cs=cos(sway), sn=sin(sway);
  b=mat2(cs,-sn,sn,cs)*hinge+vec2(1.,.08);
  b.x+=sin(t*1.7+b.y*18.)*.007*b.y*wind;
  b.y+=sin(t*1.1+b.x*13.)*.007*(1.-b.x)*wind;
  if(b.x>0.&&b.x<1.&&b.y>0.&&b.y<1.) {
    vec4 leaf=texture2D(uFoliage,vec2(b.x,1.-b.y));
    vec3 leafColor=lightGrade(leaf.rgb,daylight,warmth,rain)*(.68+.12*transmission);
    color=mix(color,leafColor,leaf.a*uFoliageReady);
  }
  gl_FragColor=vec4(max(color,vec3(0.)),1.);
}`;

export function createRenderer(canvas, plate) {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl) throw new Error('WebGL unavailable');
  const resources=[];
  const compile=(type,source)=>{
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);
    }
    return shader;
  };
  const program=gl.createProgram(), vertex=compile(gl.VERTEX_SHADER,vertexSource), fragment=compile(gl.FRAGMENT_SHADER,fragmentSource);
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'aPosition');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const names=['uImage','uFoliage','uResolution','uImageSize','uPointer','uEnvironment','uStream','uBough','uFoliageReady','uOverscan'];
  const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
  function texture(unit,image) {
    const tex=gl.createTexture();resources.push(tex);
    gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    if(image) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    return tex;
  }
  texture(0,plate);const branch=texture(1);
  gl.uniform1i(uniforms.uImage,0);gl.uniform1i(uniforms.uFoliage,1);
  gl.uniform2f(uniforms.uImageSize,plate.naturalWidth,plate.naturalHeight);
  gl.uniform1f(uniforms.uOverscan,forestConfig.overscan);
  gl.uniform3f(uniforms.uStream,forestConfig.stream.center,forestConfig.stream.horizon,forestConfig.stream.spread);
  gl.uniform4f(uniforms.uBough,...forestConfig.foliage.origin,...forestConfig.foliage.size);
  let disposed=false, loaded=false;
  return {
    async loadFoliage() {
      const image=new Image();image.src=forestConfig.assets.foliage;
      try {
        await image.decode();if(disposed) return;
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,branch);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        loaded=true;
      } catch { /* Main forest remains complete if optional foliage is unavailable. */ }
    },
    draw({time,hour,rain,wind,pointer,pixelBudget}) {
      const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(pixelBudget/(innerWidth*innerHeight)));
      const width=Math.max(1,Math.round(innerWidth*ratio)),height=Math.max(1,Math.round(innerHeight*ratio));
      if(canvas.width!==width||canvas.height!==height) {
        canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);
      }
      gl.uniform2f(uniforms.uResolution,width,height);
      gl.uniform2f(uniforms.uPointer,...pointer);
      gl.uniform4f(uniforms.uEnvironment,time,hour,rain,wind);
      gl.uniform1f(uniforms.uFoliageReady,loaded?1:0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    },
    destroy() { disposed=true;resources.forEach(tex=>gl.deleteTexture(tex));gl.deleteBuffer(buffer);gl.deleteProgram(program); }
  };
}

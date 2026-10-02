#!/usr/bin/env python3
"""Build splash-cursor.js with correct GLSL newlines."""
import json, os

# ── GLSL shader source lines ───────────────────────────────────────────────
shaders = {
"baseVS": [
  "precision highp float;",
  "attribute vec2 aPosition;",
  "varying vec2 vUv,vL,vR,vT,vB;",
  "uniform vec2 texelSize;",
  "void main(){",
  "  vUv=aPosition*0.5+0.5;",
  "  vL=vUv-vec2(texelSize.x,0.0); vR=vUv+vec2(texelSize.x,0.0);",
  "  vT=vUv+vec2(0.0,texelSize.y); vB=vUv-vec2(0.0,texelSize.y);",
  "  gl_Position=vec4(aPosition,0.0,1.0);}",
],
"copyFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv; uniform sampler2D uTexture;",
  "void main(){ gl_FragColor=texture2D(uTexture,vUv); }",
],
"clearFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;",
  "void main(){ gl_FragColor=value*texture2D(uTexture,vUv); }",
],
"splatFS": [
  "precision highp float; precision highp sampler2D;",
  "varying vec2 vUv; uniform sampler2D uTarget;",
  "uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;",
  "void main(){",
  "  vec2 p=vUv-point.xy; p.x*=aspectRatio;",
  "  vec3 s=exp(-dot(p,p)/radius)*color;",
  "  gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.0);}",
],
"advFS": [
  "precision highp float; precision highp sampler2D;",
  "varying vec2 vUv; uniform sampler2D uVelocity,uSource;",
  "uniform vec2 texelSize,dyeTexelSize; uniform float dt,dissipation;",
  "vec4 bilerp(sampler2D s,vec2 uv,vec2 ts){",
  "  vec2 st=uv/ts-0.5; vec2 i=floor(st); vec2 f=fract(st);",
  "  vec4 a=texture2D(s,(i+vec2(.5,.5))*ts),b=texture2D(s,(i+vec2(1.5,.5))*ts);",
  "  vec4 c=texture2D(s,(i+vec2(.5,1.5))*ts),d=texture2D(s,(i+vec2(1.5,1.5))*ts);",
  "  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}",
  "void main(){",
  "#ifdef MANUAL_FILTERING",
  "  vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;",
  "  gl_FragColor=bilerp(uSource,coord,dyeTexelSize);",
  "#else",
  "  vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;",
  "  gl_FragColor=texture2D(uSource,coord);",
  "#endif",
  "  gl_FragColor/=1.0+dissipation*dt;}",
],
"divFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;",
  "void main(){",
  "  float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x;",
  "  float T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;",
  "  vec2 C=texture2D(uVelocity,vUv).xy;",
  "  if(vL.x<0.0)L=-C.x; if(vR.x>1.0)R=-C.x;",
  "  if(vT.y>1.0)T=-C.y; if(vB.y<0.0)B=-C.y;",
  "  gl_FragColor=vec4(0.5*(R-L+T-B),0,0,1);}",
],
"curlFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;",
  "void main(){",
  "  float v=texture2D(uVelocity,vR).y-texture2D(uVelocity,vL).y",
  "           -texture2D(uVelocity,vT).x+texture2D(uVelocity,vB).x;",
  "  gl_FragColor=vec4(0.5*v,0,0,1);}",
],
"vortFS": [
  "precision highp float; precision highp sampler2D;",
  "varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl;",
  "uniform float curl,dt;",
  "void main(){",
  "  float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x;",
  "  float T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;",
  "  vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));",
  "  force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0;",
  "  vec2 v=texture2D(uVelocity,vUv).xy+force*dt;",
  "  gl_FragColor=vec4(clamp(v,-1000.0,1000.0),0,1);}",
],
"pressFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence;",
  "void main(){",
  "  float p=(texture2D(uPressure,vL).x+texture2D(uPressure,vR).x",
  "           +texture2D(uPressure,vB).x+texture2D(uPressure,vT).x",
  "           -texture2D(uDivergence,vUv).x)*0.25;",
  "  gl_FragColor=vec4(p,0,0,1);}",
],
"gradFS": [
  "precision mediump float; precision mediump sampler2D;",
  "varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity;",
  "void main(){",
  "  vec2 v=texture2D(uVelocity,vUv).xy;",
  "  v-=vec2(texture2D(uPressure,vR).x-texture2D(uPressure,vL).x,",
  "          texture2D(uPressure,vT).x-texture2D(uPressure,vB).x);",
  "  gl_FragColor=vec4(v,0,1);}",
],
"displaySrc": [
  "precision highp float; precision highp sampler2D;",
  "varying vec2 vUv,vL,vR,vT,vB;",
  "uniform sampler2D uTexture; uniform vec2 texelSize;",
  "void main(){",
  "  vec3 c=texture2D(uTexture,vUv).rgb;",
  "#ifdef SHADING",
  "  float dx=length(texture2D(uTexture,vR).rgb)-length(texture2D(uTexture,vL).rgb);",
  "  float dy=length(texture2D(uTexture,vT).rgb)-length(texture2D(uTexture,vB).rgb);",
  "  vec3 n=normalize(vec3(dx,dy,length(texelSize)));",
  "  c*=clamp(dot(n,vec3(0,0,1))+0.7,0.7,1.0);",
  "#endif",
  "  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b)));}",
],
}

# Join with real newlines
for k in shaders:
    shaders[k] = "\n".join(shaders[k])

# Verify
assert "#ifdef SHADING\n" in shaders["displaySrc"], "displaySrc missing real newline before ifdef"
assert "#ifdef MANUAL_FILTERING\n" in shaders["advFS"], "advFS missing real newline before ifdef"
print("GLSL newlines OK")

# ── JS Template ────────────────────────────────────────────────────────────
# We embed each shader as a JSON string literal (double-quoted, JSON-escaped)
def js_str(s):
    """Encode s as a JSON string (double-quoted, all special chars escaped)."""
    return json.dumps(s)

js = """\
/* ==========================================================================
   SPLASH CURSOR - Vanilla JS WebGL Fluid Simulation
   Ported from ReactBits SplashCursor. Scoped to #bhavexSlide canvas.
   Activates via IntersectionObserver when slide is visible.
   ROOT CAUSE FIX: GLSL #ifdef/#endif require real newlines, not literal \\n
   ========================================================================== */
(function initSplashCursor() {
  var slide  = document.getElementById('bhavexSlide');
  var canvas = document.getElementById('bhavex-fluid');
  if (!slide || !canvas) { console.warn('SplashCursor: missing elements'); return; }

  var CFG = {
    SIM_RESOLUTION:128, DYE_RESOLUTION:1440,
    DENSITY_DISSIPATION:3.5, VELOCITY_DISSIPATION:2,
    PRESSURE:0.1, PRESSURE_ITERATIONS:20,
    CURL:3, SPLAT_RADIUS:0.2, SPLAT_FORCE:6000,
    SHADING:true, COLOR_UPDATE_SPEED:10,
    COLOR:'#52678e'
  };

  var params = { alpha:true, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:false };
  var gl = canvas.getContext('webgl2', params);
  var isWebGL2 = !!gl;
  if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  if (!gl) { console.warn('SplashCursor: WebGL not supported'); return; }

  var halfFloat, supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }
  gl.clearColor(0,0,0,1);
  var halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);
  if (!supportLinearFiltering) { CFG.DYE_RESOLUTION = 256; CFG.SHADING = false; }

  function supportRTF(iF,f,t) {
    var tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,iF,4,4,0,f,t,null);
    var fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  }
  function getSF(iF,f,t) {
    if (!supportRTF(iF,f,t)) {
      if (iF===gl.R16F)  return getSF(gl.RG16F,gl.RG,t);
      if (iF===gl.RG16F) return getSF(gl.RGBA16F,gl.RGBA,t);
      return null;
    }
    return { internalFormat:iF, format:f };
  }
  var formatRGBA = isWebGL2 ? getSF(gl.RGBA16F,gl.RGBA,halfFloatTexType) : getSF(gl.RGBA,gl.RGBA,halfFloatTexType);
  var formatRG   = isWebGL2 ? getSF(gl.RG16F,gl.RG,halfFloatTexType)     : getSF(gl.RGBA,gl.RGBA,halfFloatTexType);
  var formatR    = isWebGL2 ? getSF(gl.R16F,gl.RED,halfFloatTexType)      : getSF(gl.RGBA,gl.RGBA,halfFloatTexType);
  if (!formatRGBA || !formatRG || !formatR) { console.warn('SplashCursor: unsupported texture format'); return; }

  /* ── Shader compiler ── */
  function compileShader(type, src, kw) {
    if (kw && kw.length) src = kw.map(function(k){ return '#define ' + k + '\\n'; }).join('') + src;
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('Shader error:', gl.getShaderInfoLog(s));
    return s;
  }
  function createProg(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p,gl.LINK_STATUS)) console.error('Program error:', gl.getProgramInfoLog(p));
    return p;
  }
  function getUniforms(prog) {
    var u = {}, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i=0;i<n;i++) { var nm=gl.getActiveUniform(prog,i).name; u[nm]=gl.getUniformLocation(prog,nm); }
    return u;
  }
  function Prog(vs,fs) { this.program=createProg(vs,fs); this.uniforms=getUniforms(this.program); }
  Prog.prototype.bind = function(){ gl.useProgram(this.program); };
  function Mat(vs,fsSrc) { this.vs=vs; this.fsSrc=fsSrc; this.cache={}; this.active=null; this.uniforms={}; }
  Mat.prototype.setKeywords = function(kw) {
    var key=kw.slice().sort().join('|');
    if (!this.cache[key]) this.cache[key]=createProg(this.vs, compileShader(gl.FRAGMENT_SHADER,this.fsSrc,kw));
    if (this.cache[key]===this.active) return;
    this.active=this.cache[key]; this.uniforms=getUniforms(this.active);
  };
  Mat.prototype.bind = function(){ gl.useProgram(this.active); };

  /* ── Compile all shaders (strings have REAL newlines via JSON embed) ── */
  var GLSL_baseVS   = SHADER_baseVS_PLACEHOLDER;
  var GLSL_copyFS   = SHADER_copyFS_PLACEHOLDER;
  var GLSL_clearFS  = SHADER_clearFS_PLACEHOLDER;
  var GLSL_splatFS  = SHADER_splatFS_PLACEHOLDER;
  var GLSL_advFS    = SHADER_advFS_PLACEHOLDER;
  var GLSL_divFS    = SHADER_divFS_PLACEHOLDER;
  var GLSL_curlFS   = SHADER_curlFS_PLACEHOLDER;
  var GLSL_vortFS   = SHADER_vortFS_PLACEHOLDER;
  var GLSL_pressFS  = SHADER_pressFS_PLACEHOLDER;
  var GLSL_gradFS   = SHADER_gradFS_PLACEHOLDER;
  var GLSL_displaySrc = SHADER_displaySrc_PLACEHOLDER;

  var baseVS  = compileShader(gl.VERTEX_SHADER,   GLSL_baseVS);
  var copyFS  = compileShader(gl.FRAGMENT_SHADER,  GLSL_copyFS);
  var clearFS = compileShader(gl.FRAGMENT_SHADER,  GLSL_clearFS);
  var splatFS = compileShader(gl.FRAGMENT_SHADER,  GLSL_splatFS);
  var advFS   = compileShader(gl.FRAGMENT_SHADER,  GLSL_advFS, supportLinearFiltering ? [] : ['MANUAL_FILTERING']);
  var divFS   = compileShader(gl.FRAGMENT_SHADER,  GLSL_divFS);
  var curlFS  = compileShader(gl.FRAGMENT_SHADER,  GLSL_curlFS);
  var vortFS  = compileShader(gl.FRAGMENT_SHADER,  GLSL_vortFS);
  var pressFS = compileShader(gl.FRAGMENT_SHADER,  GLSL_pressFS);
  var gradFS  = compileShader(gl.FRAGMENT_SHADER,  GLSL_gradFS);

  var copyP  = new Prog(baseVS,copyFS),  clearP = new Prog(baseVS,clearFS), splatP = new Prog(baseVS,splatFS);
  var advP   = new Prog(baseVS,advFS),   divP   = new Prog(baseVS,divFS),   curlP  = new Prog(baseVS,curlFS);
  var vortP  = new Prog(baseVS,vortFS),  pressP = new Prog(baseVS,pressFS), gradP  = new Prog(baseVS,gradFS);
  var displayM = new Mat(baseVS, GLSL_displaySrc);

  /* ── Quad ── */
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.enableVertexAttribArray(0);

  function blit(target) {
    if (target==null) { gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER,null); }
    else { gl.viewport(0,0,target.width,target.height); gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo); }
    gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
  }
  function createFBO(w,h,iF,f,t,p) {
    gl.activeTexture(gl.TEXTURE0);
    var tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,p); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,p);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,iF,w,h,0,f,t,null);
    var fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture:tex,fbo:fbo,width:w,height:h,texelSizeX:1/w,texelSizeY:1/h,
      attach:function(id){ gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D,tex); return id; }};
  }
  function createDFBO(w,h,iF,f,t,p) {
    var a=createFBO(w,h,iF,f,t,p),b=createFBO(w,h,iF,f,t,p);
    return { width:w,height:h,texelSizeX:a.texelSizeX,texelSizeY:a.texelSizeY,
      get read(){ return a; }, set read(v){ a=v; }, get write(){ return b; }, set write(v){ b=v; },
      swap:function(){ var tmp=a; a=b; b=tmp; }};
  }
  function resizeFBO(tgt,w,h,iF,f,t,p){ var n=createFBO(w,h,iF,f,t,p); copyP.bind(); gl.uniform1i(copyP.uniforms.uTexture,tgt.attach(0)); blit(n); return n; }
  function resizeDFBO(tgt,w,h,iF,f,t,p){ if(tgt.width===w&&tgt.height===h)return tgt; tgt.read=resizeFBO(tgt.read,w,h,iF,f,t,p); tgt.write=createFBO(w,h,iF,f,t,p); tgt.width=w; tgt.height=h; tgt.texelSizeX=1/w; tgt.texelSizeY=1/h; return tgt; }

  var dye,velocity,divergence,curlFBO,pressure;
  function getRes(r){ var ar=gl.drawingBufferWidth/gl.drawingBufferHeight; if(ar<1)ar=1/ar; var mn=Math.round(r),mx=Math.round(r*ar); return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:mx,height:mn}:{width:mn,height:mx}; }
  function px(v){ return Math.floor(v*(window.devicePixelRatio||1)); }
  function initFBOs() {
    var sim=getRes(CFG.SIM_RESOLUTION), dr=getRes(CFG.DYE_RESOLUTION), tt=halfFloatTexType, fi=supportLinearFiltering?gl.LINEAR:gl.NEAREST;
    gl.disable(gl.BLEND);
    dye      = dye      ? resizeDFBO(dye,dr.width,dr.height,formatRGBA.internalFormat,formatRGBA.format,tt,fi)   : createDFBO(dr.width,dr.height,formatRGBA.internalFormat,formatRGBA.format,tt,fi);
    velocity = velocity ? resizeDFBO(velocity,sim.width,sim.height,formatRG.internalFormat,formatRG.format,tt,fi) : createDFBO(sim.width,sim.height,formatRG.internalFormat,formatRG.format,tt,fi);
    divergence=createFBO(sim.width,sim.height,formatR.internalFormat,formatR.format,tt,gl.NEAREST);
    curlFBO   =createFBO(sim.width,sim.height,formatR.internalFormat,formatR.format,tt,gl.NEAREST);
    pressure  =createDFBO(sim.width,sim.height,formatR.internalFormat,formatR.format,tt,gl.NEAREST);
  }
  function resizeCanvas(){ var w=px(canvas.clientWidth),h=px(canvas.clientHeight); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;return true;}return false; }

  function hexToRgb(hex) {
    var m = /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(hex);
    return m ? {
      r: parseInt(m[1], 16) / 255,
      g: parseInt(m[2], 16) / 255,
      b: parseInt(m[3], 16) / 255
    } : { r: 82 / 255, g: 103 / 255, b: 142 / 255 };
  }
  var SPLASH_COLOR = hexToRgb((slide.dataset && slide.dataset.splashColor) || CFG.COLOR);

  function genColor(intensity) {
    var scale = (intensity !== undefined ? intensity : 0.32);
    var jitter = 0.95 + Math.random() * 0.1;
    var factor = scale * jitter;
    return {
      r: SPLASH_COLOR.r * factor,
      g: SPLASH_COLOR.g * factor,
      b: SPLASH_COLOR.b * factor
    };
  }

  var ptr = { texcoordX:0.5,texcoordY:0.5,prevTexcoordX:0.5,prevTexcoordY:0.5,deltaX:0,deltaY:0,moved:false,color:null };
  function getXY(cX,cY){ var r=canvas.getBoundingClientRect(); return {x:cX-r.left,y:cY-r.top}; }
  function cR(r){ var ar=canvas.width/canvas.height; if(ar>1)r*=ar; return r; }
  function cDX(d){ var ar=canvas.width/canvas.height; if(ar<1)d*=ar; return d; }
  function cDY(d){ var ar=canvas.width/canvas.height; if(ar>1)d/=ar; return d; }

  function splat(x,y,dx,dy,color) {
    splatP.bind();
    gl.uniform1i(splatP.uniforms.uTarget,velocity.read.attach(0)); gl.uniform1f(splatP.uniforms.aspectRatio,canvas.width/canvas.height);
    gl.uniform2f(splatP.uniforms.point,x,y); gl.uniform3f(splatP.uniforms.color,dx,dy,0); gl.uniform1f(splatP.uniforms.radius,cR(CFG.SPLAT_RADIUS/100));
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatP.uniforms.uTarget,dye.read.attach(0)); gl.uniform3f(splatP.uniforms.color,color.r,color.g,color.b);
    blit(dye.write); dye.swap();
  }
  function step(dt) {
    gl.disable(gl.BLEND);
    curlP.bind(); gl.uniform2f(curlP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(curlP.uniforms.uVelocity,velocity.read.attach(0)); blit(curlFBO);
    vortP.bind(); gl.uniform2f(vortP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(vortP.uniforms.uVelocity,velocity.read.attach(0)); gl.uniform1i(vortP.uniforms.uCurl,curlFBO.attach(1)); gl.uniform1f(vortP.uniforms.curl,CFG.CURL); gl.uniform1f(vortP.uniforms.dt,dt); blit(velocity.write); velocity.swap();
    divP.bind(); gl.uniform2f(divP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(divP.uniforms.uVelocity,velocity.read.attach(0)); blit(divergence);
    clearP.bind(); gl.uniform1i(clearP.uniforms.uTexture,pressure.read.attach(0)); gl.uniform1f(clearP.uniforms.value,CFG.PRESSURE); blit(pressure.write); pressure.swap();
    pressP.bind(); gl.uniform2f(pressP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(pressP.uniforms.uDivergence,divergence.attach(0));
    for(var i=0;i<CFG.PRESSURE_ITERATIONS;i++){ gl.uniform1i(pressP.uniforms.uPressure,pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    gradP.bind(); gl.uniform2f(gradP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY); gl.uniform1i(gradP.uniforms.uPressure,pressure.read.attach(0)); gl.uniform1i(gradP.uniforms.uVelocity,velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    advP.bind(); gl.uniform2f(advP.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
    if(!supportLinearFiltering) gl.uniform2f(advP.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);
    var vid=velocity.read.attach(0); gl.uniform1i(advP.uniforms.uVelocity,vid); gl.uniform1i(advP.uniforms.uSource,vid); gl.uniform1f(advP.uniforms.dt,dt); gl.uniform1f(advP.uniforms.dissipation,CFG.VELOCITY_DISSIPATION); blit(velocity.write); velocity.swap();
    if(!supportLinearFiltering) gl.uniform2f(advP.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY);
    gl.uniform1i(advP.uniforms.uVelocity,velocity.read.attach(0)); gl.uniform1i(advP.uniforms.uSource,dye.read.attach(1)); gl.uniform1f(advP.uniforms.dissipation,CFG.DENSITY_DISSIPATION); blit(dye.write); dye.swap();
  }
  function render() {
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
    displayM.bind();
    if(CFG.SHADING) gl.uniform2f(displayM.uniforms.texelSize,1/gl.drawingBufferWidth,1/gl.drawingBufferHeight);
    gl.uniform1i(displayM.uniforms.uTexture,dye.read.attach(0));
    blit(null);
  }

  var rafId=null, lastTime=Date.now(), colorTimer=0, isActive=false;
  function loop() {
    if (!isActive) return;
    var now=Date.now(), dt=Math.min((now-lastTime)/1000,0.016666); lastTime=now;
    if (resizeCanvas()) initFBOs();
    colorTimer+=dt*CFG.COLOR_UPDATE_SPEED;
    if(colorTimer>=1){ colorTimer=0; ptr.color=genColor(); }
    if(ptr.moved){ ptr.moved=false; splat(ptr.texcoordX,ptr.texcoordY,ptr.deltaX*CFG.SPLAT_FORCE,ptr.deltaY*CFG.SPLAT_FORCE,ptr.color||genColor()); }
    step(dt); render();
    rafId=requestAnimationFrame(loop);
  }
  function isDarkTheme() {
    var dt = document.documentElement.getAttribute('data-theme');
    if (dt) return dt === 'dark';
    return document.body.classList.contains('dark-theme');
  }

  function start() {
    if (!isDarkTheme()) return;
    if (isActive) return; isActive=true;
    var w=px(canvas.clientWidth)||px(slide.clientWidth)||window.innerWidth;
    var h=px(canvas.clientHeight)||px(slide.clientHeight)||window.innerHeight;
    if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; }
    displayM.setKeywords(CFG.SHADING ? ['SHADING'] : []);
    initFBOs(); lastTime=Date.now();
    rafId=requestAnimationFrame(loop);
  }
  function stop(){ isActive=false; if(rafId){ cancelAnimationFrame(rafId); rafId=null; } }

  function handleThemeChange() {
    if (!isDarkTheme()) {
      stop();
    } else {
      var rect = slide.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) start();
    }
  }

  window.addEventListener('themechange', handleThemeChange);
  var themeObserver = new MutationObserver(handleThemeChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  slide.addEventListener('mousemove', function(e) {
    if (!isDarkTheme()) return;
    var pos=getXY(e.clientX,e.clientY);
    ptr.prevTexcoordX=ptr.texcoordX; ptr.prevTexcoordY=ptr.texcoordY;
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    ptr.deltaX=cDX(ptr.texcoordX-ptr.prevTexcoordX); ptr.deltaY=cDY(ptr.texcoordY-ptr.prevTexcoordY);
    ptr.moved=Math.abs(ptr.deltaX)>0||Math.abs(ptr.deltaY)>0;
    if(!ptr.color) ptr.color=genColor();
  }, {passive:true});

  slide.addEventListener('mousedown', function(e) {
    if (!isDarkTheme()) return;
    var pos=getXY(e.clientX,e.clientY);
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    var c=genColor(2.5);
    splat(ptr.texcoordX,ptr.texcoordY,10*(Math.random()-.5),30*(Math.random()-.5),c);
  }, {passive:true});

  slide.addEventListener('touchmove', function(e) {
    if (!isDarkTheme()) return;
    e.preventDefault();
    var t=e.targetTouches[0], pos=getXY(t.clientX,t.clientY);
    ptr.prevTexcoordX=ptr.texcoordX; ptr.prevTexcoordY=ptr.texcoordY;
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    ptr.deltaX=cDX(ptr.texcoordX-ptr.prevTexcoordX); ptr.deltaY=cDY(ptr.texcoordY-ptr.prevTexcoordY);
    ptr.moved=true; if(!ptr.color) ptr.color=genColor();
  }, {passive:false});

  var observer=new IntersectionObserver(function(entries){
    if (entries[0].isIntersecting && isDarkTheme()) {
      start();
    } else {
      stop();
    }
  }, {threshold:0.05});
  observer.observe(slide);

})();
"""

# Replace SHADER_xxx_PLACEHOLDER with the actual JSON-encoded GLSL string
for name, src in shaders.items():
    placeholder = "SHADER_{}_PLACEHOLDER".format(name)
    js = js.replace(placeholder, js_str(src))

# Verify placeholders are all replaced
remaining = [p for p in ["baseVS","copyFS","clearFS","splatFS","advFS","divFS","curlFS","vortFS","pressFS","gradFS","displaySrc"] if "SHADER_{}_PLACEHOLDER".format(p) in js]
if remaining:
    print("ERROR: Unreplaced placeholders:", remaining)
    exit(1)

# Write
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_path = os.path.join(repo_root, "assets", "js", "splash-cursor.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Written {} bytes to {}".format(len(js), out_path))

# Final verification
with open(out_path, encoding="utf-8") as f:
    content = f.read()

# Check that #ifdef appears with real newline
idx = content.find("#ifdef SHADING")
ctx = content[max(0,idx-10):idx+25]
has_real_nl = "\n#ifdef" in content or '\\n#ifdef' not in content
print("displaySrc #ifdef SHADING context:", repr(ctx))
idx2 = content.find("#ifdef MANUAL_FILTERING")
ctx2 = content[max(0,idx2-10):idx2+30]
print("advFS #ifdef MANUAL_FILTERING context:", repr(ctx2))
print("DONE - file ready!")

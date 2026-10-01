/* ==========================================================================
   SPLASH CURSOR - Vanilla JS WebGL Fluid Simulation
   Ported from ReactBits SplashCursor. Scoped to #bhavexSlide canvas.
   Activates via IntersectionObserver when slide is visible.
   ROOT CAUSE FIX: GLSL #ifdef/#endif require real newlines, not literal \n
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
    SHADING:true, COLOR_UPDATE_SPEED:10
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
    if (kw && kw.length) src = kw.map(function(k){ return '#define ' + k + '\n'; }).join('') + src;
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
  var GLSL_baseVS   = "precision highp float;\nattribute vec2 aPosition;\nvarying vec2 vUv,vL,vR,vT,vB;\nuniform vec2 texelSize;\nvoid main(){\n  vUv=aPosition*0.5+0.5;\n  vL=vUv-vec2(texelSize.x,0.0); vR=vUv+vec2(texelSize.x,0.0);\n  vT=vUv+vec2(0.0,texelSize.y); vB=vUv-vec2(0.0,texelSize.y);\n  gl_Position=vec4(aPosition,0.0,1.0);}";
  var GLSL_copyFS   = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv; uniform sampler2D uTexture;\nvoid main(){ gl_FragColor=texture2D(uTexture,vUv); }";
  var GLSL_clearFS  = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;\nvoid main(){ gl_FragColor=value*texture2D(uTexture,vUv); }";
  var GLSL_splatFS  = "precision highp float; precision highp sampler2D;\nvarying vec2 vUv; uniform sampler2D uTarget;\nuniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;\nvoid main(){\n  vec2 p=vUv-point.xy; p.x*=aspectRatio;\n  vec3 s=exp(-dot(p,p)/radius)*color;\n  gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.0);}";
  var GLSL_advFS    = "precision highp float; precision highp sampler2D;\nvarying vec2 vUv; uniform sampler2D uVelocity,uSource;\nuniform vec2 texelSize,dyeTexelSize; uniform float dt,dissipation;\nvec4 bilerp(sampler2D s,vec2 uv,vec2 ts){\n  vec2 st=uv/ts-0.5; vec2 i=floor(st); vec2 f=fract(st);\n  vec4 a=texture2D(s,(i+vec2(.5,.5))*ts),b=texture2D(s,(i+vec2(1.5,.5))*ts);\n  vec4 c=texture2D(s,(i+vec2(.5,1.5))*ts),d=texture2D(s,(i+vec2(1.5,1.5))*ts);\n  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}\nvoid main(){\n#ifdef MANUAL_FILTERING\n  vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;\n  gl_FragColor=bilerp(uSource,coord,dyeTexelSize);\n#else\n  vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;\n  gl_FragColor=texture2D(uSource,coord);\n#endif\n  gl_FragColor/=1.0+dissipation*dt;}";
  var GLSL_divFS    = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;\nvoid main(){\n  float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x;\n  float T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;\n  vec2 C=texture2D(uVelocity,vUv).xy;\n  if(vL.x<0.0)L=-C.x; if(vR.x>1.0)R=-C.x;\n  if(vT.y>1.0)T=-C.y; if(vB.y<0.0)B=-C.y;\n  gl_FragColor=vec4(0.5*(R-L+T-B),0,0,1);}";
  var GLSL_curlFS   = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;\nvoid main(){\n  float v=texture2D(uVelocity,vR).y-texture2D(uVelocity,vL).y\n           -texture2D(uVelocity,vT).x+texture2D(uVelocity,vB).x;\n  gl_FragColor=vec4(0.5*v,0,0,1);}";
  var GLSL_vortFS   = "precision highp float; precision highp sampler2D;\nvarying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl;\nuniform float curl,dt;\nvoid main(){\n  float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x;\n  float T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;\n  vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));\n  force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0;\n  vec2 v=texture2D(uVelocity,vUv).xy+force*dt;\n  gl_FragColor=vec4(clamp(v,-1000.0,1000.0),0,1);}";
  var GLSL_pressFS  = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence;\nvoid main(){\n  float p=(texture2D(uPressure,vL).x+texture2D(uPressure,vR).x\n           +texture2D(uPressure,vB).x+texture2D(uPressure,vT).x\n           -texture2D(uDivergence,vUv).x)*0.25;\n  gl_FragColor=vec4(p,0,0,1);}";
  var GLSL_gradFS   = "precision mediump float; precision mediump sampler2D;\nvarying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity;\nvoid main(){\n  vec2 v=texture2D(uVelocity,vUv).xy;\n  v-=vec2(texture2D(uPressure,vR).x-texture2D(uPressure,vL).x,\n          texture2D(uPressure,vT).x-texture2D(uPressure,vB).x);\n  gl_FragColor=vec4(v,0,1);}";
  var GLSL_displaySrc = "precision highp float; precision highp sampler2D;\nvarying vec2 vUv,vL,vR,vT,vB;\nuniform sampler2D uTexture; uniform vec2 texelSize;\nvoid main(){\n  vec3 c=texture2D(uTexture,vUv).rgb;\n#ifdef SHADING\n  float dx=length(texture2D(uTexture,vR).rgb)-length(texture2D(uTexture,vL).rgb);\n  float dy=length(texture2D(uTexture,vT).rgb)-length(texture2D(uTexture,vB).rgb);\n  vec3 n=normalize(vec3(dx,dy,length(texelSize)));\n  c*=clamp(dot(n,vec3(0,0,1))+0.7,0.7,1.0);\n#endif\n  gl_FragColor=vec4(c,max(c.r,max(c.g,c.b)));}";

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

  function HSVtoRGB(h,s,v){ var i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),m=[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6]; return {r:m[0],g:m[1],b:m[2]}; }
  function genColor(){ var c=HSVtoRGB(Math.random(),1,1); c.r*=0.15; c.g*=0.15; c.b*=0.15; return c; }

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
  function start() {
    if (isActive) return; isActive=true;
    var w=px(canvas.clientWidth)||px(slide.clientWidth)||window.innerWidth;
    var h=px(canvas.clientHeight)||px(slide.clientHeight)||window.innerHeight;
    if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; }
    displayM.setKeywords(CFG.SHADING ? ['SHADING'] : []);
    initFBOs(); lastTime=Date.now();
    rafId=requestAnimationFrame(loop);
  }
  function stop(){ isActive=false; if(rafId){ cancelAnimationFrame(rafId); rafId=null; } }

  slide.addEventListener('mousemove', function(e) {
    var pos=getXY(e.clientX,e.clientY);
    ptr.prevTexcoordX=ptr.texcoordX; ptr.prevTexcoordY=ptr.texcoordY;
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    ptr.deltaX=cDX(ptr.texcoordX-ptr.prevTexcoordX); ptr.deltaY=cDY(ptr.texcoordY-ptr.prevTexcoordY);
    ptr.moved=Math.abs(ptr.deltaX)>0||Math.abs(ptr.deltaY)>0;
    if(!ptr.color) ptr.color=genColor();
  }, {passive:true});

  slide.addEventListener('mousedown', function(e) {
    var pos=getXY(e.clientX,e.clientY);
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    var c=genColor(); c.r*=10; c.g*=10; c.b*=10;
    splat(ptr.texcoordX,ptr.texcoordY,10*(Math.random()-.5),30*(Math.random()-.5),c);
  }, {passive:true});

  slide.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var t=e.targetTouches[0], pos=getXY(t.clientX,t.clientY);
    ptr.prevTexcoordX=ptr.texcoordX; ptr.prevTexcoordY=ptr.texcoordY;
    ptr.texcoordX=pos.x/canvas.width; ptr.texcoordY=1-pos.y/canvas.height;
    ptr.deltaX=cDX(ptr.texcoordX-ptr.prevTexcoordX); ptr.deltaY=cDY(ptr.texcoordY-ptr.prevTexcoordY);
    ptr.moved=true; if(!ptr.color) ptr.color=genColor();
  }, {passive:false});

  var observer=new IntersectionObserver(function(entries){ entries[0].isIntersecting ? start() : stop(); }, {threshold:0.05});
  observer.observe(slide);

})();

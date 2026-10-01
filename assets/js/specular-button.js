/**
 * SpecularButton — Shader-Driven Specular Rim Light Buttons
 * WebGL 2 implementation based on React Bits SpecularButton component.
 * Renders an SDF rounded rectangle with dynamic specular shine that sweeps
 * along the edge and follows the cursor with proximity fade.
 */

(function () {
  const PAD = 20;

  const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  // Dark base stroke hugging the edge for a sense of thickness
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  // Symmetric specular: the edges facing toward/away from the light both
  // catch a streak. The angular window (size + fade) is measured with an
  // elliptical normal so it varies continuously along straight edges.
  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

  // Color parser helper
  function parseColor(str) {
    if (!str) return [1, 1, 1];
    str = str.trim();
    if (str.startsWith('#')) {
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return [r, g, b];
      }
    }
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]) / 255, parseInt(match[2]) / 255, parseInt(match[3]) / 255];
    }
    return [1, 1, 1];
  }

  // Compile shader helper
  function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Shader compile failed:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Program link failed:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  const instances = [];

  class SpecularButtonInstance {
    constructor(btn, options = {}) {
      this.btn = btn;
      this.options = Object.assign({
        radius: 10,
        lineColor: '#ffffff',
        baseColor: '#525252',
        intensity: 1.2,
        shineSize: 12,
        shineFade: 45,
        thickness: 1.2,
        speed: 0.35,
        followMouse: true,
        proximity: 250,
        autoAnimate: false
      }, options);

      // Extract custom attributes from button if available
      if (btn.dataset.radius) this.options.radius = parseFloat(btn.dataset.radius);
      if (btn.dataset.lineColor) this.options.lineColor = btn.dataset.lineColor;
      if (btn.dataset.baseColor) this.options.baseColor = btn.dataset.baseColor;
      if (btn.dataset.speed) this.options.speed = parseFloat(btn.dataset.speed);
      if (btn.dataset.thickness) this.options.thickness = parseFloat(btn.dataset.thickness);
      if (btn.dataset.proximity) this.options.proximity = parseFloat(btn.dataset.proximity);

      this.pointerAngle = null;
      this.proximityT = 0;
      this.angle = 2.4;
      this.idleAngle = 2.4;
      this.bright = 0;
      this.last = performance.now();
      this.sizeRef = { w: 1, h: 1 };
      this.destroyed = false;

      this.initDOM();
      this.initGL();
      if (this.gl) {
        instances.push(this);
      }
    }

    initDOM() {
      this.btn.classList.add('specular-button');

      // Check if FX container already exists
      let fx = this.btn.querySelector('.specular-button__fx');
      if (!fx) {
        fx = document.createElement('span');
        fx.className = 'specular-button__fx';
        fx.setAttribute('aria-hidden', 'true');

        // Wrap existing content into label if not already wrapped
        let label = this.btn.querySelector('.specular-button__label');
        if (!label) {
          label = document.createElement('span');
          label.className = 'specular-button__label';
          while (this.btn.firstChild) {
            label.appendChild(this.btn.firstChild);
          }
          this.btn.appendChild(fx);
          this.btn.appendChild(label);
        } else {
          this.btn.insertBefore(fx, label);
        }
      }
      this.fx = fx;
    }

    initGL() {
      const canvas = document.createElement('canvas');
      this.canvas = canvas;
      this.fx.appendChild(canvas);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;

      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true
      });

      if (!gl) {
        console.warn('WebGL2 not supported, specular effect disabled for button.');
        return;
      }
      this.gl = gl;

      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const prog = createProgram(gl, VERT, FRAG);
      if (!prog) return;
      this.program = prog;

      // Full-screen triangle covering [-1, 1] clip space
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         3, -1,
        -1,  3
      ]), gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(prog, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      this.uniforms = {
        uCenter: gl.getUniformLocation(prog, 'uCenter'),
        uHalfSize: gl.getUniformLocation(prog, 'uHalfSize'),
        uRadius: gl.getUniformLocation(prog, 'uRadius'),
        uAngle: gl.getUniformLocation(prog, 'uAngle'),
        uPx: gl.getUniformLocation(prog, 'uPx'),
        uLineColor: gl.getUniformLocation(prog, 'uLineColor'),
        uBaseColor: gl.getUniformLocation(prog, 'uBaseColor'),
        uIntensity: gl.getUniformLocation(prog, 'uIntensity'),
        uShineSize: gl.getUniformLocation(prog, 'uShineSize'),
        uShineFade: gl.getUniformLocation(prog, 'uShineFade'),
        uThickness: gl.getUniformLocation(prog, 'uThickness'),
        uBaseWidth: gl.getUniformLocation(prog, 'uBaseWidth')
      };

      this.resize();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.btn);
    }

    resize() {
      if (!this.gl || this.destroyed) return;
      const rect = this.btn.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w === 0 || h === 0) return;

      this.sizeRef.w = w;
      this.sizeRef.h = h;
      const totalW = Math.round(w + PAD * 2);
      const totalH = Math.round(h + PAD * 2);

      this.canvas.width = Math.round(totalW * this.dpr);
      this.canvas.height = Math.round(totalH * this.dpr);
      this.canvas.style.width = `${totalW}px`;
      this.canvas.style.height = `${totalH}px`;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    onPointerMove(e) {
      if (!this.gl || this.destroyed) return;
      const rect = this.btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (cy - e.clientY) / (rect.height / 2);
        this.pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
      } else {
        this.pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
      }

      const t = Math.max(0, 1 - dist / Math.max(this.options.proximity, 1));
      this.proximityT = t * t * (3 - 2 * t);
    }

    update(now) {
      if (!this.gl || this.destroyed) return;

      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;

      const p = this.options;
      const isActive = this.btn.classList.contains('active');
      const shouldAutoAnimate = p.autoAnimate || isActive;

      this.idleAngle += p.speed * dt;
      const steer = p.followMouse && this.pointerAngle != null && (!shouldAutoAnimate || this.proximityT > 0);
      const target = steer ? this.pointerAngle : this.idleAngle;
      const diff = ((target - this.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.angle += diff * (1 - Math.exp(-dt * 7));

      const brightTarget = shouldAutoAnimate ? 1 : this.proximityT;
      this.bright += (brightTarget - this.bright) * (1 - Math.exp(-dt * 8));

      // Skip render if completely dark
      if (this.bright < 0.001 && !shouldAutoAnimate) {
        if (this.hadDrawn) {
          this.gl.clear(this.gl.COLOR_BUFFER_BIT);
          this.hadDrawn = false;
        }
        return;
      }
      this.hadDrawn = true;

      // Adjust dynamic colors based on theme & active state
      const isLight = document.body.classList.contains('light-theme') || document.documentElement.getAttribute('data-theme') === 'light';
      let lineColorStr = p.lineColor;
      let baseColorStr = p.baseColor;

      if (isActive) {
        lineColorStr = isLight ? '#4f46e5' : '#818cf8';
        baseColorStr = isLight ? '#a5b4fc' : '#4338ca';
      } else if (isLight) {
        lineColorStr = '#6366f1';
        baseColorStr = '#cbd5e1';
      }

      const lineC = parseColor(lineColorStr);
      const baseC = parseColor(baseColorStr);

      const gl = this.gl;
      gl.useProgram(this.program);

      gl.uniform2f(this.uniforms.uCenter, (PAD + this.sizeRef.w / 2) * this.dpr, (PAD + this.sizeRef.h / 2) * this.dpr);
      gl.uniform2f(this.uniforms.uHalfSize, (this.sizeRef.w / 2) * this.dpr, (this.sizeRef.h / 2) * this.dpr);
      gl.uniform1f(this.uniforms.uRadius, Math.min(p.radius, Math.min(this.sizeRef.w, this.sizeRef.h) / 2) * this.dpr);
      gl.uniform1f(this.uniforms.uAngle, this.angle);
      gl.uniform1f(this.uniforms.uPx, this.dpr);
      gl.uniform3fv(this.uniforms.uLineColor, lineC);
      gl.uniform3fv(this.uniforms.uBaseColor, baseC);
      gl.uniform1f(this.uniforms.uIntensity, p.intensity * this.bright);
      gl.uniform1f(this.uniforms.uShineSize, (p.shineSize * Math.PI) / 180);
      gl.uniform1f(this.uniforms.uShineFade, (p.shineFade * Math.PI) / 180);
      gl.uniform1f(this.uniforms.uThickness, p.thickness * this.dpr);
      gl.uniform1f(this.uniforms.uBaseWidth, this.dpr);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    destroy() {
      this.destroyed = true;
      if (this.ro) this.ro.disconnect();
      if (this.gl && this.canvas && this.canvas.parentNode === this.fx) {
        this.fx.removeChild(this.canvas);
        this.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
  }

  // Global pointer listener
  window.addEventListener('pointermove', (e) => {
    for (let i = 0; i < instances.length; i++) {
      instances[i].onPointerMove(e);
    }
  }, { passive: true });

  // Global requestAnimationFrame loop
  let globalRaf = 0;
  function loop(now) {
    globalRaf = requestAnimationFrame(loop);
    for (let i = 0; i < instances.length; i++) {
      instances[i].update(now);
    }
  }
  globalRaf = requestAnimationFrame(loop);

  // Auto-initialize function for all buttons
  function initAllSpecularButtons() {
    // 1. All navigation buttons (as shown in user image: Home, About, Education, Skills, etc.)
    const navLinks = document.querySelectorAll('.nav-menu .nav-link, .nav-list .nav-link, .nav-links a');
    navLinks.forEach(link => {
      if (link.dataset.specularInit) return;
      link.dataset.specularInit = 'true';
      new SpecularButtonInstance(link, {
        radius: 8,
        thickness: 0.9,
        intensity: 1.3,
        shineSize: 14,
        shineFade: 45,
        speed: 0.35,
        proximity: 80,
        followMouse: true,
        lineColor: '#ffffff',
        baseColor: '#525252ff'
      });
    });

    // 2. Any element explicitly tagged with .specular-button
    const explicitButtons = document.querySelectorAll('.specular-button:not(.nav-link)');
    explicitButtons.forEach(btn => {
      new SpecularButtonInstance(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSpecularButtons);
  } else {
    initAllSpecularButtons();
  }

  // Export to window
  window.SpecularButtonInstance = SpecularButtonInstance;
  window.initAllSpecularButtons = initAllSpecularButtons;
})();

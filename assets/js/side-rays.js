/**
 * SideRays — WebGL Atmospheric Volumetric God Rays
 * Based on React Bits SideRays component built with OGL.
 * Specially configured to render exclusively in Dark Theme (Dark Mode).
 * Automatically pauses rendering and frees GPU cycles in Light Mode.
 */

import { Renderer, Program, Triangle, Mesh } from './vendor/ogl.js';

const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const originToFlip = origin => {
  switch (origin) {
    case 'top-left': return [1, 0];
    case 'bottom-right': return [0, 1];
    case 'bottom-left': return [1, 1];
    default: return [0, 0];
  }
};

const VERT_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG_SHADER = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}
`;

export class SideRays {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    // Configuration with user snippet defaults
    this.options = {
      speed: 2.5,
      rayColor1: '#EAB308',
      rayColor2: '#96c8ff',
      intensity: 2.0,
      spread: 2.0,
      origin: 'top-right',
      tilt: 0,
      saturation: 1.5,
      blend: 0.75,
      falloff: 1.6,
      opacity: 1.0,
      darkOnly: true,
      ...this.readDataAttributes(),
      ...options
    };

    this.renderer = null;
    this.gl = null;
    this.uniforms = null;
    this.mesh = null;
    this.animationId = null;
    this.isIntersecting = false;
    this.isDarkTheme = true;
    this.isDestroyed = false;

    this.onResize = this.onResize.bind(this);
    this.loop = this.loop.bind(this);
    this.checkTheme = this.checkTheme.bind(this);

    this.init();
  }

  readDataAttributes() {
    if (!this.container) return {};
    const ds = this.container.dataset;
    const res = {};
    if (ds.speed) res.speed = parseFloat(ds.speed);
    if (ds.rayColor1) res.rayColor1 = ds.rayColor1;
    if (ds.rayColor2) res.rayColor2 = ds.rayColor2;
    if (ds.intensity) res.intensity = parseFloat(ds.intensity);
    if (ds.spread) res.spread = parseFloat(ds.spread);
    if (ds.origin) res.origin = ds.origin;
    if (ds.tilt) res.tilt = parseFloat(ds.tilt);
    if (ds.saturation) res.saturation = parseFloat(ds.saturation);
    if (ds.blend) res.blend = parseFloat(ds.blend);
    if (ds.falloff) res.falloff = parseFloat(ds.falloff);
    if (ds.opacity) res.opacity = parseFloat(ds.opacity);
    if (ds.darkOnly !== undefined) res.darkOnly = ds.darkOnly !== 'false';
    return res;
  }

  isCurrentThemeDark() {
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme) return docTheme === 'dark';
    return document.body.classList.contains('dark-theme');
  }

  init() {
    this.checkTheme();
    this.setupThemeObservers();
    this.setupIntersectionObserver();
    window.addEventListener('resize', this.onResize);

    if (this.shouldBeRunning()) {
      this.initWebGL();
    }
  }

  setupThemeObservers() {
    // 1. Listen for custom event
    window.addEventListener('themechange', this.checkTheme);

    // 2. Observe HTML and Body attribute changes
    this.themeObserver = new MutationObserver(this.checkTheme);
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // 3. Fallback: Listen for click on theme toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        setTimeout(this.checkTheme, 50);
      });
    }
  }

  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        this.isIntersecting = entry.isIntersecting;
        this.updatePlaybackState();
      },
      { threshold: 0.05 }
    );
    this.intersectionObserver.observe(this.container);
  }

  checkTheme() {
    const wasDark = this.isDarkTheme;
    this.isDarkTheme = this.isCurrentThemeDark();

    if (wasDark !== this.isDarkTheme) {
      this.updatePlaybackState();
    }
  }

  shouldBeRunning() {
    if (this.isDestroyed) return false;
    if (this.options.darkOnly && !this.isDarkTheme) return false;
    return this.isIntersecting;
  }

  updatePlaybackState() {
    const shouldRun = this.shouldBeRunning();

    if (shouldRun) {
      if (!this.renderer) {
        this.initWebGL();
      } else if (!this.animationId) {
        this.startLoop();
      }
      if (this.container) {
        this.container.style.visibility = 'visible';
      }
    } else {
      this.stopLoop();
      if (this.container && this.options.darkOnly && !this.isDarkTheme) {
        this.container.style.visibility = 'hidden';
      }
    }
  }

  initWebGL() {
    if (this.renderer || !this.container || this.isDestroyed) return;

    try {
      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
      this.renderer = renderer;

      const gl = renderer.gl;
      this.gl = gl;
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';

      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      this.container.appendChild(gl.canvas);

      const [flipX, flipY] = originToFlip(this.options.origin);
      this.uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        iSpeed: { value: this.options.speed },
        iRayColor1: { value: hexToRgb(this.options.rayColor1) },
        iRayColor2: { value: hexToRgb(this.options.rayColor2) },
        iIntensity: { value: this.options.intensity },
        iSpread: { value: this.options.spread },
        iFlipX: { value: flipX },
        iFlipY: { value: flipY },
        iTilt: { value: this.options.tilt },
        iSaturation: { value: this.options.saturation },
        iBlend: { value: this.options.blend },
        iFalloff: { value: this.options.falloff },
        iOpacity: { value: this.options.opacity }
      };

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: VERT_SHADER,
        fragment: FRAG_SHADER,
        uniforms: this.uniforms
      });
      this.mesh = new Mesh(gl, { geometry, program });

      this.onResize();
      this.startLoop();
    } catch (err) {
      console.warn('SideRays WebGL initialization skipped:', err);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.uniforms) return;
    this.renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.uniforms.iResolution.value = [w * this.renderer.dpr, h * this.renderer.dpr];
  }

  startLoop() {
    if (this.animationId || !this.renderer) return;
    this.loop(performance.now());
  }

  stopLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop(t) {
    if (!this.renderer || !this.uniforms || !this.mesh) return;
    if (!this.shouldBeRunning()) {
      this.stopLoop();
      return;
    }

    this.uniforms.iTime.value = t * 0.001;

    try {
      this.renderer.render({ scene: this.mesh });
      this.animationId = requestAnimationFrame(this.loop);
    } catch (e) {
      this.stopLoop();
    }
  }

  setOptions(newOptions = {}) {
    Object.assign(this.options, newOptions);
    if (!this.uniforms) return;

    const u = this.uniforms;
    if (newOptions.speed !== undefined) u.iSpeed.value = this.options.speed;
    if (newOptions.rayColor1 !== undefined) u.iRayColor1.value = hexToRgb(this.options.rayColor1);
    if (newOptions.rayColor2 !== undefined) u.iRayColor2.value = hexToRgb(this.options.rayColor2);
    if (newOptions.intensity !== undefined) u.iIntensity.value = this.options.intensity;
    if (newOptions.spread !== undefined) u.iSpread.value = this.options.spread;
    if (newOptions.origin !== undefined) {
      const [flipX, flipY] = originToFlip(this.options.origin);
      u.iFlipX.value = flipX;
      u.iFlipY.value = flipY;
    }
    if (newOptions.tilt !== undefined) u.iTilt.value = this.options.tilt;
    if (newOptions.saturation !== undefined) u.iSaturation.value = this.options.saturation;
    if (newOptions.blend !== undefined) u.iBlend.value = this.options.blend;
    if (newOptions.falloff !== undefined) u.iFalloff.value = this.options.falloff;
    if (newOptions.opacity !== undefined) u.iOpacity.value = this.options.opacity;

    this.updatePlaybackState();
  }

  destroy() {
    this.isDestroyed = true;
    this.stopLoop();

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('themechange', this.checkTheme);
    if (this.themeObserver) this.themeObserver.disconnect();
    if (this.intersectionObserver) this.intersectionObserver.disconnect();

    if (this.renderer) {
      try {
        const loseCtx = this.renderer.gl.getExtension('WEBGL_lose_context');
        if (loseCtx) loseCtx.loseContext();
        const canvas = this.renderer.gl.canvas;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch (e) {}
    }

    this.renderer = null;
    this.gl = null;
    this.uniforms = null;
    this.mesh = null;
  }
}

/**
 * Auto-initialize SideRays for containers marked in HTML
 */
export function initSideRays() {
  const containers = document.querySelectorAll('.side-rays-container, #side-rays-bg');
  const instances = [];

  containers.forEach(el => {
    if (el.dataset.sideRaysInit) return;
    el.dataset.sideRaysInit = 'true';
    instances.push(new SideRays(el));
  });

  return instances;
}

// Auto-run when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSideRays);
  } else {
    initSideRays();
  }
}

// Export for global browser window usage
if (typeof window !== 'undefined') {
  window.SideRays = SideRays;
  window.initSideRays = initSideRays;
}

export default SideRays;

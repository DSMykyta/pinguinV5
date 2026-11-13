/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — CLOUD GRADIENT                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: WebGL-хмара або легкий триколірний Aurora-режим.                      ║
 * ║ ЗАЛЕЖНОСТІ: WebGL 1, DOM observers, системна тема через CSS --pg-* tokens.        ║
 * ║ ПУБЛІЧНИЙ API: createCloudGradient({ tone, variant }) -> { element, mount, destroy }.║
 * ║ ПРИНЦИП: Незалежний renderer; не дублює CSS AnimatedGradient чи форму.            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

const TONES = new Set(['main', 'secondary', 'tertiary']);
const VARIANTS = new Set(['cloud', 'aurora']);
const AURORA_MAX_FPS = 30;
const AURORA_MAX_WIDTH = 768;
const AURORA_MAX_HEIGHT = 480;
const VERTEX = [
  'attribute vec2 position;',
  'void main(){gl_Position=vec4(position,0.0,1.0);}',
].join('\n');

// Verified Suno sine/cosine frequencies, moving hotspot and vignette.
// Pinguin supplies one semantic tone instead of Suno's three-color palette.
const FRAGMENT = [
  'precision highp float;',
  'uniform float time;',
  'uniform vec2 resolution;',
  'uniform vec3 backgroundColor;',
  'uniform vec3 glowColor;',
  'void main(){',
  ' vec2 uv=gl_FragCoord.xy/resolution;',
  ' vec2 p=(uv-0.5)*2.0;',
  ' float a=sin(p.x+time*0.8)*cos(p.y*0.75+time*0.6);',
  ' float b=sin(p.x*1.5-time*0.5)*cos(p.y*1.25-time*0.7);',
  ' float thermal=((a+b*1.15)/2.15)*0.5+0.5;',
  ' float hotspot=1.0-smoothstep(0.5,0.9,length(uv-0.5));',
  ' float detail=sin(p.x*1.5+time*0.3)*cos(p.y*1.5-time*0.4);',
  ' thermal*=hotspot*(detail*0.3+0.7);',
  ' float vignette=smoothstep(0.3,1.0,length(p));',
  ' float opacity=clamp(thermal*0.76*(1.0-vignette),0.0,1.0);',
  ' vec3 color=mix(backgroundColor,glowColor,opacity);',
  ' float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))',
  ' +time*0.1)*43758.5453);',
  ' color+=vec3((grain-0.5)*0.012*(1.0-vignette));',
  ' gl_FragColor=vec4(color,1.0);',
  '}',
].join('\n');

// Aurora deforms the BOUNDARIES between the three semantic tones.
// No extra texture, grain, blur or JS pixel loop. The original cloud shader
// above is intentionally unchanged for the login demo.
const AURORA_FRAGMENT = [
  'precision highp float;',
  'uniform float time;',
  'uniform vec2 resolution;',
  'uniform vec3 backgroundColor;',
  'uniform vec3 glowColor;',
  'uniform vec3 tertiaryColor;',
  'void main(){',
  ' vec2 uv=gl_FragCoord.xy/resolution;',
  ' vec2 p=(uv-0.5)*2.0;',
  ' float t=time*0.37;',
  ' float warpA=sin(p.x*2.4+t*0.83+0.6*cos(p.y*1.8-t*0.45));',
  ' float warpB=sin(p.x*4.8-t*0.49+sin(p.y*2.1+t*0.63));',
  ' float warpC=sin(p.y*3.2+p.x*1.4-t*0.58);',
  ' float ribbon=p.y+0.39*warpA+0.18*warpB+0.12*warpC;',
  ' float warm=smoothstep(-0.42,0.56,ribbon+0.15*sin(p.x*1.6+t*0.52));',
  ' float cool=1.0-smoothstep(-0.78,0.22,ribbon-0.15*cos(p.x*1.9-t*0.46));',
  ' float dark=1.0-smoothstep(0.12,0.52,abs(ribbon+0.12*sin(p.x*2.9-t)));',
  ' cool=clamp(cool*0.96-dark*0.25,0.0,1.0);',
  ' warm=clamp(warm*0.90-dark*0.21,0.0,1.0);',
  ' vec3 color=mix(backgroundColor,glowColor,cool);',
  ' color=mix(color,tertiaryColor,warm);',
  ' gl_FragColor=vec4(color,1.0);',
  '}',
].join('\n');

function parseHex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value).trim());
  if (!match) return null;
  return [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16) / 255);
}

function makeShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const message = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error('WebGL compilation failed: ' + message);
}

function createRenderer(canvas, variant) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power',
    });
  } catch { return null; }
  if (!gl) return null;
  let vertex = null, fragment = null, program = null, buffer = null;
  try {
    vertex = makeShader(gl, gl.VERTEX_SHADER, VERTEX);
    fragment = makeShader(gl, gl.FRAGMENT_SHADER,
      variant === 'aurora' ? AURORA_FRAGMENT : FRAGMENT);
    program = gl.createProgram();
    if (!program) throw new Error('WebGL program allocation failed');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL buffer allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'position');
    if (location < 0) throw new Error('WebGL position attribute unavailable');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, 'time');
    const resolution = gl.getUniformLocation(program, 'resolution');
    const background = gl.getUniformLocation(program, 'backgroundColor');
    const glow = gl.getUniformLocation(program, 'glowColor');
    const tertiary = variant === 'aurora'
      ? gl.getUniformLocation(program, 'tertiaryColor') : null;
    if ([time, resolution, background, glow].some(value => value === null) ||
        (variant === 'aurora' && tertiary === null)) {
      throw new Error('WebGL uniform unavailable');
    }
    return {
      paint(width, height, seconds, baseRgb, glowRgb, tertiaryRgb) {
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.uniform1f(time, seconds);
        gl.uniform2f(resolution, width, height);
        gl.uniform3fv(background, baseRgb);
        gl.uniform3fv(glow, glowRgb);
        if (tertiary !== null) gl.uniform3fv(tertiary, tertiaryRgb);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      destroy() {
        if (gl.isContextLost()) return;
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
      },
    };
  } catch (error) {
    if (!gl.isContextLost()) console.warn('CloudGradient: CSS fallback', error);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
}

export function createCloudGradient({ tone = 'tertiary', variant = 'cloud' } = {}) {
  if (!TONES.has(tone)) throw new RangeError('Unknown CloudGradient tone');
  if (!VARIANTS.has(variant)) throw new RangeError('Unknown CloudGradient variant');
  const element = document.createElement('div');
  element.className = 'pg-cloud-gradient';
  element.setAttribute('aria-hidden', 'true');
  element.dataset.pgRenderer = 'fallback';
  element.dataset.pgVariant = variant;
  element.dataset.pgMotion = 'paused';
  element.style.setProperty('--pg-cloud-gradient-glow',
    'var(--pg-tone-' + tone + '-base)');
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-cloud-gradient__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  element.append(canvas);

  const controller = new AbortController();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer = null;
  let resizeObserver = null, visibilityObserver = null, themeObserver = null;
  let mounted = false, destroyed = false, visible = true, blockedByDialog = false;
  let frame = 0, previousTime = null, elapsed = 0;
  let framesRendered = 0;
  let background = null, glow = null, tertiary = null;

  function readTheme() {
    const styles = getComputedStyle(element);
    background = parseHex(styles.getPropertyValue(variant === 'aurora'
      ? '--pg-tone-main-base' : '--pg-color-page'));
    glow = parseHex(styles.getPropertyValue(variant === 'aurora'
      ? '--pg-tone-secondary-base' : '--pg-tone-' + tone + '-base'));
    tertiary = variant === 'aurora'
      ? parseHex(styles.getPropertyValue('--pg-tone-tertiary-base')) : null;
  }

  function paint() {
    if (!renderer || !background || !glow) return;
    // Aurora is a small preview, not a full-resolution GPU wallpaper.
    // The original Cloud variant retains its existing DPR behavior.
    const cssWidth = element.clientWidth;
    const cssHeight = element.clientHeight;
    const dpr = variant === 'aurora'
      ? Math.min(window.devicePixelRatio || 1, 0.75,
        AURORA_MAX_WIDTH / Math.max(1, cssWidth),
        AURORA_MAX_HEIGHT / Math.max(1, cssHeight))
      : Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    renderer.paint(width, height, elapsed, background, glow, tertiary);
    framesRendered++;
  }

  function shouldRun() {
    return mounted && !!renderer && visible && !document.hidden &&
      !reduced.matches && !blockedByDialog && element.isConnected;
  }

  function tick(now) {
    frame = 0;
    if (!shouldRun()) { syncMotion(); return; }
    // Only Aurora limits draw calls to 30 Hz. Cloud stays visually identical
    // to the existing login experience.
    const delta = previousTime === null ? 0 : now - previousTime;
    if (variant === 'aurora' && previousTime !== null &&
        delta < 1000 / AURORA_MAX_FPS - 1) {
      frame = window.requestAnimationFrame(tick);
      return;
    }
    if (previousTime !== null) elapsed += Math.min(80, delta) / 1000;
    previousTime = now;
    paint();
    frame = window.requestAnimationFrame(tick);
  }

  function syncMotion() {
    const active = shouldRun();
    element.dataset.pgMotion = active ? 'running' : 'paused';
    if (active && !frame) frame = window.requestAnimationFrame(tick);
    if (!active) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      paint();
    }
  }

  function onModalChange() {
    const activeModal = document.querySelector('.pg-dialog[open]');
    blockedByDialog = Boolean(activeModal && !activeModal.contains(element));
    syncMotion();
  }

  function rebuildRenderer() {
    renderer?.destroy();
    renderer = createRenderer(canvas, variant);
    element.dataset.pgRenderer = renderer ? 'webgl' : 'fallback';
    readTheme();
    paint();
    syncMotion();
  }

  function mount() {
    if (destroyed) throw new Error('Destroyed CloudGradient cannot mount');
    if (mounted) return;
    if (!element.isConnected) throw new Error('Mount CloudGradient after insertion');
    mounted = true;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      renderer = null;
      element.dataset.pgRenderer = 'fallback';
      syncMotion();
    }, { signal: controller.signal });
    canvas.addEventListener('webglcontextrestored', rebuildRenderer,
      { signal: controller.signal });
    reduced.addEventListener('change', syncMotion, { signal: controller.signal });
    document.addEventListener('visibilitychange', syncMotion,
      { signal: controller.signal });
    document.addEventListener('pg:modal-change', onModalChange,
      { signal: controller.signal });
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(paint);
      resizeObserver.observe(element);
    } else window.addEventListener('resize', paint, { signal: controller.signal });
    if (typeof IntersectionObserver === 'function') {
      visibilityObserver = new IntersectionObserver(entries => {
        visible = Boolean(entries[entries.length - 1]?.isIntersecting);
        syncMotion();
      });
      visibilityObserver.observe(element);
    }
    if (typeof MutationObserver === 'function') {
      themeObserver = new MutationObserver(() => { readTheme(); paint(); });
      themeObserver.observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme'],
      });
    }
    rebuildRenderer();
    onModalChange();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mounted = false;
    syncMotion();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    themeObserver?.disconnect();
    controller.abort();
    renderer?.destroy();
    renderer = null;
    element.remove();
  }

  return Object.freeze({
    element, mount, destroy,
    getStats() {
      return Object.freeze({
        variant, framesRendered, width: canvas.width, height: canvas.height,
        running: element.dataset.pgMotion === 'running',
        renderer: element.dataset.pgRenderer,
      });
    },
  });
}

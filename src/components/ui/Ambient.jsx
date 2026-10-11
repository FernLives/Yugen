import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../lib/hooks';
import './ui.css';

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

// Domain-warped fractal noise → slow, aurora-like atmosphere. Intentionally dark and low-contrast.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec3 u_tint;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.035;
  vec2 m = (u_mouse - 0.5) * 0.35;

  vec2 q = vec2(fbm(p * 1.25 + t), fbm(p * 1.25 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.55 + 2.0 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(p * 1.55 + 2.0 * q + vec2(8.3, 2.8) - 0.5 * t));
  float f = fbm(p * 1.15 + 2.4 * r + m);

  vec3 base   = vec3(0.012, 0.016, 0.03);
  vec3 teal   = vec3(0.07, 0.34, 0.37);
  vec3 violet = vec3(0.24, 0.20, 0.62);

  vec3 col = base;
  col = mix(col, violet * 0.5, smoothstep(0.38, 0.92, f) * 0.6);
  col = mix(col, teal * 0.5, smoothstep(0.25, 0.85, r.x) * 0.34);
  col += u_tint * 0.20 * pow(smoothstep(0.42, 1.0, f * (0.6 + r.y)), 2.0);

  // soft light pool under the cursor
  float d = distance(uv * vec2(u_res.x / u_res.y, 1.0), u_mouse * vec2(u_res.x / u_res.y, 1.0));
  col += u_tint * 0.075 * smoothstep(0.55, 0.0, d);

  // top-down light + vignette
  col += vec3(0.02, 0.025, 0.04) * smoothstep(0.2, 1.0, uv.y);
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.1, 1.0)));
  col *= mix(0.35, 1.0, vig);

  // dithering to kill banding in the dark range
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[Ambient] shader error', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * Full-viewport WebGL atmosphere. Renders at reduced resolution (it is blurry by nature),
 * pauses when hidden, honours reduced-motion and eases between route tints.
 * @param {number[]} tint  linear-ish RGB (0–1) the shader leans toward
 */
export default function Ambient({ tint = [0.91, 0.77, 0.48] }) {
  const canvasRef = useRef(null);
  const tintRef = useRef(tint);
  const reduced = usePrefersReducedMotion();

  useEffect(() => { tintRef.current = tint; }, [tint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { canvas.style.display = 'none'; return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      tint: gl.getUniformLocation(prog, 'u_tint'),
    };

    const SCALE = 0.5;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * SCALE;
      const w = Math.max(2, Math.floor(window.innerWidth * dpr));
      const h = Math.max(2, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e) => { mouse.tx = e.clientX / window.innerWidth; mouse.ty = 1 - e.clientY / window.innerHeight; };
    window.addEventListener('pointermove', onMove, { passive: true });

    const cur = [...tintRef.current];
    let raf = 0;
    let last = 0;
    let t0 = performance.now() - 8000; // start mid-flow, not at the noise origin
    let running = true;

    const frame = (now) => {
      raf = 0;
      if (!running) return;
      if (!reduced) raf = requestAnimationFrame(frame);
      if (now - last < 33 && !reduced) return; // ~30fps is plenty for slow ambience
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const target = tintRef.current;
      for (let i = 0; i < 3; i++) cur[i] += (target[i] - cur[i]) * 0.04;
      gl.uniform1f(u.time, reduced ? 12 : (now - t0) / 1000);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.uniform3f(u.tint, cur[0], cur[1], cur[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
      else if (!running) { running = true; raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);

    const onLost = (e) => { e.preventDefault(); running = false; };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [reduced]);

  return (
    <div className="ambient" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-canvas" />
      <div className="ambient-fallback" />
      <div className="ambient-grid" />
    </div>
  );
}

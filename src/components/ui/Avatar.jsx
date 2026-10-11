import { useEffect, useRef } from 'react';

function seedNums(seed = '') {
  const nums = [];
  for (let i = 0; i < seed.length; i += 2) nums.push(parseInt(seed.slice(i, i + 2), 16) || 0);
  while (nums.length < 16) nums.push((nums.length * 37 + 11) % 256);
  return nums;
}

/** Deterministic "nebula orb" avatar generated from the user's avatarSeed. */
// eslint-disable-next-line react-refresh/only-export-components
export function paintAvatar(canvas, seed, size) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const n = seedNums(seed);
  const hue = (n[0] / 255) * 360;
  const hue2 = (hue + 40 + (n[1] % 90)) % 360;
  const c = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, `hsl(${hue} 40% 10%)`);
  bg.addColorStop(1, `hsl(${hue2} 45% 18%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const a = (n[2 + i] / 255) * Math.PI * 2;
    const d = (n[7 + i] / 255) * size * 0.28;
    const x = c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    const r = size * (0.22 + (n[3 + i] % 30) / 140);
    const h = i % 2 ? hue2 : hue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${h} 85% 62% / 0.75)`);
    g.addColorStop(1, `hsla(${h} 85% 50% / 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // thin orbital rings
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = Math.max(0.6, size / 140);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `hsla(${hue2} 80% 80% / ${0.18 - i * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(c, c, size * (0.18 + i * 0.1), size * (0.1 + i * 0.07), (n[10 + i] / 255) * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }

  // core
  const core = ctx.createRadialGradient(c, c, 0, c, c, size * 0.09);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // rim
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

export default function Avatar({ seed, size = 32, className = '', title }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) paintAvatar(ref.current, seed || 'yugen', size); }, [seed, size]);
  return <canvas ref={ref} className={`avatar ${className}`} role="img" aria-label={title || 'Avatar'} style={{ borderRadius: '50%', flex: 'none' }} />;
}

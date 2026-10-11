import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { usePrefersReducedMotion } from '../../lib/hooks';

/** 3D pointer-tilt container with a moving specular glare. */
export default function Tilt({ children, max = 9, className, glare = true }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glareBg = useTransform([sx, sy], ([x, y]) => `radial-gradient(520px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.10), transparent 55%)`);

  const move = (e) => {
    if (reduced) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => { px.set(0.5); py.set(0.5); };

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        ref={ref}
        className={className}
        style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY, transformStyle: 'preserve-3d', position: 'relative' }}
        onPointerMove={move}
        onPointerLeave={leave}
      >
        {children}
        {glare && !reduced && <motion.div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', background: glareBg, mixBlendMode: 'screen' }} />}
      </motion.div>
    </div>
  );
}

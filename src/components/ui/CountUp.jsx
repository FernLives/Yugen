import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';

/** Counts from 0 to `value` once when scrolled into view. */
export default function CountUp({ value, duration = 1.4, decimals = 0, prefix = '', suffix = '', className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = Number(value) || 0;
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={`num ${className || ''}`}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

import { motion } from 'motion/react';

/**
 * Yūgen mark: an open ensō ring with a drifting ember.
 * `draw` animates the stroke in (used by the boot sequence).
 */
export default function Logo({ size = 28, draw = false, id = 'lg' }) {
  const gid = `${id}-grad`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8e2ae" />
          <stop offset="0.55" stopColor="#e9c47a" />
          <stop offset="1" stopColor="#a98544" />
        </linearGradient>
      </defs>
      <motion.path
        d="M38.2 15.4A17 17 0 1 0 41 25.5"
        stroke={`url(#${gid})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        initial={draw ? { pathLength: 0, opacity: 0 } : false}
        animate={draw ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 1.5, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.circle
        cx="24" cy="24" r="3.6" fill={`url(#${gid})`}
        initial={draw ? { scale: 0, opacity: 0 } : false}
        animate={draw ? { scale: 1, opacity: 1 } : undefined}
        transition={{ delay: 1.1, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: '24px 24px' }}
      />
      <circle cx="41" cy="25.5" r="1.6" fill="#f8e2ae" opacity={draw ? 0 : 0.9}>
        {draw && <animate attributeName="opacity" from="0" to="0.9" begin="1.3s" dur="0.5s" fill="freeze" />}
      </circle>
    </svg>
  );
}

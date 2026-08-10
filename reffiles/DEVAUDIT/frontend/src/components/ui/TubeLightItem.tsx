'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * A single item in a "tube-light" staggered entrance: items switch on one by
 * one, each with a soft flicker (like an old fluorescent tube catching)
 * before settling into a steady glow. Wrap a list's children with this and
 * pass an incrementing `index` — no shared parent variants/orchestration
 * needed, so it works fine with items that mount/unmount dynamically (e.g.
 * resume-parsed cards streaming in one at a time).
 */
export function TubeLightItem({
  children,
  index = 0,
  className,
  style,
  baseDelay = 0,
  stagger = 0.08,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  baseDelay?: number;
  stagger?: number;
}) {
  const delay = baseDelay + index * stagger;
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 6, filter: 'brightness(0.4)' }}
      animate={{
        opacity: [0, 1, 0.25, 0.85, 0.4, 1],
        y: 0,
        filter: ['brightness(0.4)', 'brightness(2)', 'brightness(0.5)', 'brightness(1.6)', 'brightness(0.7)', 'brightness(1)'],
      }}
      transition={{
        delay,
        duration: 0.62,
        times: [0, 0.18, 0.34, 0.5, 0.68, 1],
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

/** Variants form of the same effect, for use with a parent `staggerChildren`. */
export const tubeLightVariants = {
  hidden: { opacity: 0, y: 6, filter: 'brightness(0.4)' },
  visible: {
    opacity: [0, 1, 0.25, 0.85, 0.4, 1],
    y: 0,
    filter: ['brightness(0.4)', 'brightness(2)', 'brightness(0.5)', 'brightness(1.6)', 'brightness(0.7)', 'brightness(1)'],
    transition: { duration: 0.62, times: [0, 0.18, 0.34, 0.5, 0.68, 1], ease: 'easeOut' },
  },
};

export const tubeLightContainer = (stagger = 0.08, baseDelay = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: baseDelay },
  },
});

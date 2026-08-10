'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LABELS = ['LEGAL', 'DOCS', 'TOS'];

export function LegalCyclingText({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % LABELS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`relative inline-block ${className || ''}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {LABELS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

'use client';

import { motion } from 'framer-motion';

interface RollingTimerProps {
  value: string;
  className?: string;
}

function Digit({ value }: { value: string }) {
  return (
    <div className="relative inline-flex justify-center items-center overflow-hidden w-[1.1ch] h-[1.2em] align-bottom">
      <motion.span
        key={value}
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {value}
      </motion.span>
    </div>
  );
}

export function RollingTimer({ value, className = '' }: RollingTimerProps) {
  return (
    <div className={`font-mono tabular-nums leading-none ${className}`}>
      {value.split('').map((char, i) =>
        char === ':' ? (
          <span key={i} className="inline-block opacity-40 mx-[0.1ch]">
            :
          </span>
        ) : (
          <Digit key={i} value={char} />
        )
      )}
    </div>
  );
}

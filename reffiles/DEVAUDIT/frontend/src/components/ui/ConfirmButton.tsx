'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ConfirmButtonProps = {
  onConfirm: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  confirmText?: string;
  timeout?: number;
  lineColor?: string;
};

export function ConfirmButton({
  onConfirm,
  className,
  style,
  children,
  confirmText = 'Are you sure?',
  timeout = 3000,
  lineColor = 'var(--accent)',
}: ConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (isConfirming) {
      onConfirm();
      setIsConfirming(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setIsConfirming(true);
      timerRef.current = setTimeout(() => setIsConfirming(false), timeout);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      style={style}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {isConfirming ? (
          <motion.span
            key="confirm"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {confirmText}
          </motion.span>
        ) : (
          <motion.span
            key="initial"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      {isConfirming && (
        <motion.div
          className="absolute bottom-0 left-0 h-[2px]"
          style={{ backgroundColor: lineColor }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: timeout / 1000, ease: 'linear' }}
        />
      )}
    </motion.button>
  );
}

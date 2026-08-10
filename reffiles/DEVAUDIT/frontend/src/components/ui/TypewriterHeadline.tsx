'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

function HighlightLastWord({ text }: { text: string }) {
  const lastSpace = text.lastIndexOf(' ');
  if (lastSpace < 0) {
    return <span style={{ color: 'var(--accent)' }}>{text}</span>;
  }
  return (
    <>
      {text.slice(0, lastSpace + 1)}
      <span style={{ color: 'var(--accent)' }}>{text.slice(lastSpace + 1)}</span>
    </>
  );
}

interface TypewriterHeadlineProps {
  phrases: string[];
  className?: string;
  style?: React.CSSProperties;
  typingSpeed?: number;
  deletingSpeed?: number;
  pause?: number;
  cursorBlinkSpeed?: number;
}

export function TypewriterHeadline({
  phrases,
  className = '',
  style,
  typingSpeed = 55,
  deletingSpeed = 30,
  pause = 2200,
  cursorBlinkSpeed = 0.7,
}: TypewriterHeadlineProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const [showCursor, setShowCursor] = useState(true);

  const currentPhrase = phrases[phraseIndex] || '';

  useEffect(() => {
    if (phase === 'typing') {
      if (text === currentPhrase) {
        const t = setTimeout(() => setPhase('pausing'), 150);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setText(currentPhrase.slice(0, text.length + 1));
      }, typingSpeed + Math.random() * 20);
      return () => clearTimeout(t);
    }

    if (phase === 'pausing') {
      const t = setTimeout(() => setPhase('deleting'), pause);
      return () => clearTimeout(t);
    }

    if (phase === 'deleting') {
      if (text === '') {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setPhase('typing');
        return;
      }
      const t = setTimeout(() => {
        setText(text.slice(0, -1));
      }, deletingSpeed + Math.random() * 10);
      return () => clearTimeout(t);
    }
  }, [text, phase, currentPhrase, phraseIndex, typingSpeed, deletingSpeed, pause]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(v => !v);
    }, cursorBlinkSpeed * 1000);
    return () => clearInterval(interval);
  }, [cursorBlinkSpeed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      <HighlightLastWord text={text} />
      <span
        className="inline-block ml-1"
        style={{
          opacity: showCursor ? 1 : 0,
          transition: 'opacity 0.08s ease',
          color: 'var(--accent)',
        }}
      >
        _
      </span>
    </motion.div>
  );
}

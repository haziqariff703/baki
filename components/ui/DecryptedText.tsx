'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

export function DecryptedText({ text, className, speed = 50, duration = 1000 }: { text: string; className?: string; speed?: number; duration?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (isAnimating) {
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            result += ' ';
            continue;
          }
          
          if (progress > i / text.length) {
            result += text[i];
          } else {
            result += characters[Math.floor(Math.random() * characters.length)];
          }
        }
        
        setDisplayText(result);

        if (progress === 1) {
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, speed);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [text, speed, duration, isAnimating]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {displayText}
    </motion.span>
  );
}

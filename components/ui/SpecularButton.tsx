'use client';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SpecularButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export function SpecularButton({ children, className, active = false, ...props }: SpecularButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0",
        active
          ? "bg-surface-3 border-border-3 text-text-primary"
          : "bg-surface-2 border-border-2 text-text-muted hover:bg-surface-3 hover:text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative overflow-hidden group flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold transition-all",
        "bg-gradient-to-b from-[#1e1e1e] to-[#111111] border border-[#333333] shadow-lg",
        active ? "border-[#666666] text-white shadow-[#666666]/20" : "text-[#888] hover:text-white",
        className
      )}
      {...props}
    >
      {/* Specular Highlight */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50" />
      </div>
      
      {/* Specular Glare/Shine */}
      <div className="absolute top-0 left-0 -translate-x-[150%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-30deg] group-hover:animate-[glare_1.5s_ease-in-out_infinite]" />

      <span className="relative z-10 flex items-center space-x-2">
        {children}
      </span>
    </motion.button>
  );
}

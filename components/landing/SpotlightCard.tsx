'use client';

/**
 * SpotlightCard — React Bits High-Craft Interactive Surface.
 *
 * Creates a subtle, elegant radial mouse-following illumination effect
 * over card borders and background without heavy GPU load or AI slop.
 */

import React, { useRef, useState, useCallback, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly spotlightColor?: string;
  readonly onClick?: () => void;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(245, 158, 11, 0.08)',
  onClick,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl border border-border-1 bg-surface-1 overflow-hidden transition-colors hover:border-border-3',
        className,
      )}
    >
      {/* Dynamic Radial Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

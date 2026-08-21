'use client';

/**
 * MarqueeTicker — Kinetic Malaysian Subscription Stream.
 *
 * Smooth infinite ticker showcasing real Malaysian subscriptions,
 * student concessions, and telco bills.
 */

import React from 'react';

interface TickerItem {
  name: string;
  price: string;
  tag?: string;
  tagType?: 'student' | 'essential' | 'standard';
}

const TICKER_ITEMS: TickerItem[] = [
  { name: 'Spotify Premium', price: 'RM 8.50/mo', tag: 'Student .edu.my', tagType: 'student' },
  { name: 'Time Internet 100M', price: 'RM 99.00/mo', tag: 'Essential Telco', tagType: 'essential' },
  { name: 'Apple Music Student', price: 'RM 8.00/mo', tag: 'Save RM 8/mo', tagType: 'student' },
  { name: 'Touch n Go NFC RFID', price: 'RM 35.00', tag: 'Transit Pass', tagType: 'essential' },
  { name: 'Netflix 4K Ultra', price: 'RM 55.00/mo', tag: 'Entertainment', tagType: 'standard' },
  { name: 'ChatGPT Plus (GPT-4o)', price: 'RM 94.50/mo', tag: 'Software & AI', tagType: 'standard' },
  { name: 'YouTube Premium', price: 'RM 10.90/mo', tag: 'Student Concession', tagType: 'student' },
  { name: 'GitHub Student Pack', price: 'FREE ($200+ Value)', tag: 'Verified .edu.my', tagType: 'student' },
  { name: 'Adobe Creative Cloud', price: 'RM 89.00/mo', tag: 'Student 60% Off', tagType: 'student' },
  { name: 'TM Unifi Fibre', price: 'RM 89.00/mo', tag: 'Utilities', tagType: 'essential' },
];

export function MarqueeTicker() {
  const duplicated = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="w-full border-y border-border-1 bg-surface-1/60 backdrop-blur-md overflow-hidden py-3 select-none">
      <div className="flex w-max animate-marquee gap-8 items-center">
        {duplicated.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <span className="text-text-primary font-medium">{item.name}</span>
            <span className="font-bold text-accent">{item.price}</span>
            {item.tag && (
              <span
                className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-sans font-bold border ${
                  item.tagType === 'student'
                    ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border'
                    : item.tagType === 'essential'
                    ? 'bg-status-blue-surface text-status-blue-text border-status-blue-border'
                    : 'bg-surface-2 text-text-muted border-border-1'
                }`}
              >
                {item.tag}
              </span>
            )}
            <span className="text-border-2 pl-4">/</span>
          </div>
        ))}
      </div>
    </div>
  );
}

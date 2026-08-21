import { describe, it, expect } from 'vitest';
import enMessages from '@/messages/en.json';
import msMessages from '@/messages/ms.json';

function getKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('Internationalization Translation Keys Parity', () => {
  it('en.json and ms.json have matching translation keys', () => {
    const enKeys = getKeys(enMessages);
    const msKeys = getKeys(msMessages);

    const missingInMs = enKeys.filter((k) => !msKeys.includes(k));
    const missingInEn = msKeys.filter((k) => !enKeys.includes(k));

    expect(missingInMs, `Missing keys in ms.json: ${missingInMs.join(', ')}`).toEqual([]);
    expect(missingInEn, `Missing keys in en.json: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('Dashboard trend flat translation keys are defined in both locales', () => {
    expect((enMessages as any).Dashboard?.trendAvg).toBeDefined();
    expect((enMessages as any).Dashboard?.trendMin).toBeDefined();
    expect((enMessages as any).Dashboard?.trendMax).toBeDefined();
    expect((enMessages as any).Dashboard?.trendRange3m).toBeDefined();
    expect((enMessages as any).Dashboard?.trendRange6m).toBeDefined();
    expect((enMessages as any).Dashboard?.trendRange12m).toBeDefined();
    expect((enMessages as any).Dashboard?.trendDeltaFlat).toBeDefined();

    expect((msMessages as any).Dashboard?.trendAvg).toBeDefined();
    expect((msMessages as any).Dashboard?.trendMin).toBeDefined();
    expect((msMessages as any).Dashboard?.trendMax).toBeDefined();
  });
});

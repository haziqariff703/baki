/**
 * Unit tests for lib/security redaction & sanitisation (AGENTS.md §2.3, §12).
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import { redactSensitive, sanitizeText } from '@/lib/security';

describe('redactSensitive', () => {
  it('redacts card-like numbers', () => {
    expect(redactSensitive('Card 4111 1111 1111 1111 was charged')).not.toContain('4111');
  });

  it('redacts email addresses', () => {
    expect(redactSensitive('contact me@example.com')).not.toContain('me@example.com');
  });

  it('redacts long digit runs (account numbers)', () => {
    expect(redactSensitive('Acct 123456789012345')).not.toContain('123456789012345');
  });

  it('redacts Malaysian IC-like identifiers', () => {
    expect(redactSensitive('IC 900101-14-1234')).not.toContain('900101');
  });

  it('preserves harmless short text', () => {
    const out = redactSensitive('Spotify RM 15.90');
    expect(out).toContain('Spotify');
  });
});

describe('sanitizeText', () => {
  it('collapses whitespace and trims', () => {
    expect(sanitizeText('  SPTF*   SPOTIFY   SE ')).toBe('SPTF* SPOTIFY SE');
  });

  it('strips control characters', () => {
    expect(sanitizeText('a\u0000b')).toBe('a b');
  });

  it('respects maxLength', () => {
    expect(sanitizeText('x'.repeat(200), 10)).toHaveLength(10);
  });
});

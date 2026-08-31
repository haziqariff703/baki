/**
 * Unit tests for lib/security redaction & sanitisation (AGENTS.md §2.3, §12).
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import { redactSensitive, sanitizeText } from '@/lib/security';
import { buildContentSecurityPolicy } from '@/lib/security/headers';
import {
  assertTrustedMutation,
  detectReceiptImageType,
  detectStatementFileType,
  safeRelativePath,
} from '@/lib/security/request';

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

describe('request security controls', () => {
  it('keeps auth redirects on a local path', () => {
    expect(safeRelativePath('/dashboard', '/')).toBe('/dashboard');
    expect(safeRelativePath('https://attacker.example', '/dashboard')).toBe('/dashboard');
    expect(safeRelativePath('//attacker.example', '/dashboard')).toBe('/dashboard');
  });

  it('rejects mismatched Origin and cross-site browser mutations', () => {
    const wrongOrigin = new Request('https://baki.example/api/subscriptions', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    });
    const crossSite = new Request('https://baki.example/api/subscriptions', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });

    expect(() => assertTrustedMutation(wrongOrigin)).toThrow('Cross-origin request rejected');
    expect(() => assertTrustedMutation(crossSite)).toThrow('Cross-origin request rejected');
  });

  it('accepts same-origin browser and headerless server mutations', () => {
    const sameOrigin = new Request('https://baki.example/api/subscriptions', {
      method: 'POST',
      headers: { origin: 'https://baki.example', 'sec-fetch-site': 'same-origin' },
    });
    const serverClient = new Request('https://baki.example/api/subscriptions', { method: 'POST' });

    expect(() => assertTrustedMutation(sameOrigin)).not.toThrow();
    expect(() => assertTrustedMutation(serverClient)).not.toThrow();
  });

  it('sniffs CSV/PDF and rejects executable-like bytes', () => {
    expect(detectStatementFileType(new TextEncoder().encode('merchant,amount,date\n'))).toBe('csv');
    expect(detectStatementFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('pdf');
    expect(detectStatementFileType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it('sniffs browser-only receipt image signatures', () => {
    expect(detectReceiptImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectReceiptImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectReceiptImageType(new TextEncoder().encode('RIFF1234WEBP'))).toBe('image/webp');
    expect(detectReceiptImageType(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  });
});

describe('content security policy', () => {
  it('uses a nonce and strict scripts without production unsafe-eval', () => {
    const policy = buildContentSecurityPolicy('test-nonce', false);

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('does not upgrade localhost requests during development', () => {
    expect(buildContentSecurityPolicy('test-nonce', true)).not.toContain(
      'upgrade-insecure-requests',
    );
  });
});

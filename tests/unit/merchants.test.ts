import { describe, it, expect } from 'vitest';
import { cleanDescriptor, resolveMerchant } from '@/features/merchants';

describe('Merchant Normalization & Matcher (§2.1)', () => {
  it('cleans corporate noise and banking artifacts from raw descriptors', () => {
    expect(cleanDescriptor('SPTF*SPOTIFY SE KUL')).toBe('SPOTIFY');
    expect(cleanDescriptor('NETFLIX COM MY SDN BHD')).toBe('NETFLIX COM');
    expect(cleanDescriptor('CELCOM AUTOPAY RECURRING PAYMENT')).toBe('CELCOM');
    expect(cleanDescriptor('TELEKOM MALAYSIA BERHAD KUALA LUMPUR')).toBe('TELEKOM MALAYSIA');
  });

  it('deterministically resolves messy descriptors to canonical brands and domains', () => {
    const spotify = resolveMerchant('SPTF*SPOTIFY SE');
    expect(spotify.isKnownMerchant).toBe(true);
    expect(spotify.canonicalName).toBe('Spotify');
    expect(spotify.domain).toBe('spotify.com');
    expect(spotify.category).toBe('Entertainment');

    const apple = resolveMerchant('APPLE.COM/BILL MY');
    expect(apple.isKnownMerchant).toBe(true);
    expect(apple.canonicalName).toBe('Apple Music');
    expect(apple.domain).toBe('apple.com');

    const unifi = resolveMerchant('TM BILL TELEKOM MALAYSIA');
    expect(unifi.isKnownMerchant).toBe(true);
    expect(unifi.canonicalName).toBe('Unifi Broadband');
    expect(unifi.domain).toBe('unifi.com.my');

    const chatgpt = resolveMerchant('OPENAI *CHATGPT PLUS');
    expect(chatgpt.isKnownMerchant).toBe(true);
    expect(chatgpt.canonicalName).toBe('ChatGPT Plus');
    expect(chatgpt.domain).toBe('openai.com');
  });

  it('gracefully handles unknown merchants with clean names', () => {
    const unknown = resolveMerchant('KEDAI KOPI AH HOCK SDN BHD');
    expect(unknown.isKnownMerchant).toBe(false);
    expect(unknown.canonicalName).toBe('KEDAI KOPI AH HOCK');
    expect(unknown.category).toBe('Other');
    expect(unknown.domain).toBeUndefined();
  });
});

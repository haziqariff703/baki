import { ApplicationError } from '@/lib/logging';

/** Accept only a same-site absolute path for post-auth redirects. */
export function safeRelativePath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

/** Reject cross-site browser mutations while retaining trusted server clients. */
export function assertTrustedMutation(request: Request): void {
  const fetchSite = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  const expectedOrigin = new URL(request.url).origin;

  if (fetchSite === 'cross-site' || (origin && origin !== expectedOrigin)) {
    throw new ApplicationError('FORBIDDEN', 'Cross-origin request rejected');
  }
}

export type StatementFileType = 'csv' | 'pdf';

/** Minimal byte sniffing for the two accepted statement formats. */
export function detectStatementFileType(bytes: Uint8Array): StatementFileType | null {
  if (bytes.length >= 5 && bytes.slice(0, 5).every((byte, index) => byte === [0x25, 0x50, 0x44, 0x46, 0x2d][index])) {
    return 'pdf';
  }

  const sample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 4096));
  if (!sample || sample.includes('\u0000') || !/[\r\n,]/.test(sample)) return null;
  return 'csv';
}

export type ReceiptImageType = 'image/png' | 'image/jpeg' | 'image/webp';

/** Minimal signature check before browser-side OCR. */
export function detectReceiptImageType(bytes: Uint8Array): ReceiptImageType | null {
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

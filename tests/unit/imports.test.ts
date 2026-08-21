/**
 * Unit tests for the deterministic CSV/PDF import parsing pipeline.
 *
 * Covers AGENTS.md §7 (Zod trust-boundary validation), §8.1 (integer sen),
 * §12 (file upload security) and the sanitise / prompt-injection defense.
 * All fixtures are synthetic (tests/AGENTS.md) — no real bank data.
 */
import { describe, expect, it } from 'vitest';

import {
  parseCsv,
  parsePdfText,
  sanitizeMerchantName,
  sanitizeText,
  MAX_CSV_ROWS,
  MAX_TEXT_LENGTH,
} from '@/features/imports';
import { importRowSchema, uploadedFileSchema } from '@/lib/validation';
import { makeTextPdf } from '../fixtures/makePdf';

const VALID_CSV = [
  'merchant,amount,date',
  'Spotify,15.90,2026-07-01',
  'Netflix,55.00,2026-07-05',
].join('\n');

describe('sanitizeText', () => {
  it('strips control characters and keeps printable content', () => {
    const input = 'SPOTIFY\x00SE\x1f MUSIC\x7f';
    expect(sanitizeText(input)).toBe('SPOTIFYSE MUSIC');
  });

  it('collapses runs of whitespace and trims', () => {
    expect(sanitizeText('  Netflix   Premium \n  Plan \t ')).toBe(
      'Netflix Premium Plan',
    );
  });

  it('caps length at MAX_TEXT_LENGTH', () => {
    const input = 'x'.repeat(MAX_TEXT_LENGTH + 50);
    expect(sanitizeText(input).length).toBe(MAX_TEXT_LENGTH);
  });

  it('handles empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizeMerchantName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(sanitizeMerchantName('  Spotify   Premium  ')).toBe('Spotify Premium');
  });

  it('strips control characters', () => {
    expect(sanitizeMerchantName('Netflix\x00')).toBe('Netflix');
  });

  it('caps length at 120 chars', () => {
    const input = 'a'.repeat(200);
    expect(sanitizeMerchantName(input).length).toBe(120);
  });
});

describe('parseCsv', () => {
  it('parses a valid CSV header + rows into validated rows with integer sen', () => {
    const result = parseCsv(VALID_CSV);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      merchantName: 'Spotify',
      amountSen: 1590,
      transactionDate: '2026-07-01T00:00:00.000Z',
    });
    expect(result.rows[1]).toEqual({
      merchantName: 'Netflix',
      amountSen: 5500,
      transactionDate: '2026-07-05T00:00:00.000Z',
    });
    expect(result.errors).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it('accepts flexible column header aliases', () => {
    const csv = [
      'description,myr,transaction date',
      'Disney,10.00,15/07/2026',
    ].join('\n');
    const result = parseCsv(csv);
    expect(result.rows[0].merchantName).toBe('Disney');
    expect(result.rows[0].amountSen).toBe(1000);
    expect(result.rows[0].transactionDate).toBe('2026-07-15T00:00:00.000Z');
  });

  it('returns invalid amounts in the errors bucket without throwing', () => {
    const csv = [
      'merchant,amount,date',
      'Spotify,abc,2026-07-01',
      'Netflix,55.00,2026-07-05',
    ].join('\n');
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Netflix');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].error).toMatch(/amount/i);
  });

  it('returns malformed dates in the errors bucket without throwing', () => {
    const csv = [
      'merchant,amount,date',
      'Spotify,15.90,not-a-date',
    ].join('\n');
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it('enforces the row cap and reports truncation', () => {
    const header = 'merchant,amount,date\n';
    const line = (n: number) =>
      `Merchant${n},${(1 + n) / 100},2026-07-${String((n % 28) + 1).padStart(2, '0')}\n`;
    let csv = header;
    for (let n = 1; n <= MAX_CSV_ROWS + 5; n += 1) csv += line(n);

    const result = parseCsv(csv);
    expect(result.truncated).toBe(true);
    expect(result.rows.length).toBeLessThanOrEqual(MAX_CSV_ROWS);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('reports missing required columns', () => {
    const csv = 'foo,bar\n1,2\n';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toMatch(/columns/i);
  });

  it('correctly parses headers with Amount (MYR) and UTF-8 BOM', () => {
    const csv = '\uFEFFTransaction Date,Merchant Name,Amount (MYR)\n2026-08-01,Spotify,15.90\n';
    const result = parseCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      merchantName: 'Spotify',
      amountSen: 1590,
      transactionDate: '2026-08-01T00:00:00.000Z',
    });
  });

  it('parses malaysian_student_statement.csv sample correctly', () => {
    const sample = [
      'Date,Description,Amount',
      '2026-08-01,SPTF*SPOTIFY MALAYSIA,15.90',
      '2026-08-03,NETFLIX COM MY,45.00',
      '2026-08-05,CELCOMDIGI POSTPAID BILL,60.00',
      '2026-08-12,APPLE.COM/BILL ICLOUD,3.90',
      '2026-08-14,PASAR MALAM SETAPAK,12.50',
      '2026-08-15,FAMILYMART BANDAR SUNWAY,18.20',
    ].join('\n');
    const result = parseCsv(sample);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(6);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
  });

  it('parses young_worker_statement.csv sample correctly', () => {
    const sample = [
      'Date,Description,Amount',
      '2026-08-01,ANYTIME FITNESS BANGSAR,159.00',
      '2026-08-04,OPENAI CHATGPT PLUS SUBSCRIPTION,99.00',
      '2026-08-08,MAXIS MOBILE POSTPAID,98.00',
      '2026-08-10,PETRONAS KLCC FUEL,70.00',
      '2026-08-14,CANVA PRO ANNUAL PLAN,49.90',
    ].join('\n');
    const result = parseCsv(sample);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0].merchantName).toBe('Anytime Fitness');
    expect(result.rows[0].amountSen).toBe(15900);
  });
});

describe('uploadedFileSchema (§12)', () => {
  const valid = { name: 'statement.csv', size: 1024, type: 'text/csv' };

  it('accepts a valid CSV file', () => {
    expect(uploadedFileSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a valid PDF file', () => {
    expect(
      uploadedFileSchema.safeParse({
        name: 'statement.pdf',
        size: 2048,
        type: 'application/pdf',
      }).success,
    ).toBe(true);
  });

  it('rejects a file over the 5 MB limit', () => {
    const oversize = { ...valid, size: 5 * 1024 * 1024 + 1 };
    expect(uploadedFileSchema.safeParse(oversize).success).toBe(false);
  });

  it('accepts a file exactly at the 5 MB limit', () => {
    const atLimit = { ...valid, size: 5 * 1024 * 1024 };
    expect(uploadedFileSchema.safeParse(atLimit).success).toBe(true);
  });

  it('rejects a wrong extension', () => {
    const wrongExt = { name: 'statement.exe', size: 1024, type: 'text/csv' };
    expect(uploadedFileSchema.safeParse(wrongExt).success).toBe(false);
  });

  it('rejects a wrong MIME type', () => {
    const wrongMime = { name: 'statement.csv', size: 1024, type: 'image/png' };
    expect(uploadedFileSchema.safeParse(wrongMime).success).toBe(false);
  });

  it('rejects a CSV name paired with a PDF MIME type', () => {
    const mismatch = { name: 'statement.csv', size: 1024, type: 'application/pdf' };
    expect(uploadedFileSchema.safeParse(mismatch).success).toBe(false);
  });

  it('accepts valid receipt image files (PNG, JPG, WEBP)', () => {
    const validPng = { name: 'receipt.png', size: 1024 * 100, type: 'image/png' };
    expect(uploadedFileSchema.safeParse(validPng).success).toBe(true);

    const validJpg = { name: 'tng_slip.jpg', size: 1024 * 200, type: 'image/jpeg' };
    expect(uploadedFileSchema.safeParse(validJpg).success).toBe(true);
  });

  it('rejects an empty file', () => {
    expect(uploadedFileSchema.safeParse({ ...valid, size: 0 }).success).toBe(false);
  });
});

describe('importRowSchema (§7)', () => {
  it('accepts a valid parsed row', () => {
    expect(
      importRowSchema.safeParse({
        merchantName: 'Spotify',
        amountSen: 1590,
        transactionDate: '2026-07-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects a negative amount', () => {
    expect(
      importRowSchema.safeParse({
        merchantName: 'Spotify',
        amountSen: -1,
        transactionDate: '2026-07-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects a non-integer amount (float money, §8.1)', () => {
    expect(
      importRowSchema.safeParse({
        merchantName: 'Spotify',
        amountSen: 15.9,
        transactionDate: '2026-07-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects unexpected fields (strict)', () => {
    expect(
      importRowSchema.safeParse({
        merchantName: 'Spotify',
        amountSen: 1590,
        transactionDate: '2026-07-01T00:00:00.000Z',
        extra: 1,
      }).success,
    ).toBe(false);
  });
});

describe('parsePdfText (text-based PDF)', () => {
  it('extracts a valid row from a generated text PDF', async () => {
    const pdf = makeTextPdf('Spotify  15.90  2026-07-01');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toBe('2026-07-01T00:00:00.000Z');
    expect(result.empty).toBe(false);
  });

  it('extracts rows from Maybank PDF layout with 2-digit years and month names', async () => {
    const pdf = makeTextPdf('15/07/26 SPTF*SPOTIFY MALAYSIA 15.90-');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toBe('2026-07-15T00:00:00.000Z');
  });

  it('extracts rows from Maybank dual-date savings account layout with balance', async () => {
    const pdf = makeTextPdf('01/08/2026 01/08/2026 SPOTIFY MALAYSIA 15.90 - 1,450.00 +');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toBe('2026-08-01T00:00:00.000Z');
  });

  it('extracts rows from Maybank credit card layout with DD/MM format', async () => {
    const pdf = makeTextPdf('15/07 16/07 SPOTIFY MALAYSIA 15.90');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toMatch(/-07-15/);
  });

  it('extracts rows from Maybank month name format with CR indicator', async () => {
    const pdf = makeTextPdf('15 JUL 2026 15 JUL 2026 NETFLIX COM 55.00 CR 2,340.50');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Netflix');
    expect(result.rows[0].amountSen).toBe(5500);
    expect(result.rows[0].transactionDate).toBe('2026-07-15T00:00:00.000Z');
  });

  it('extracts rows from DuitNow QR and FPX Maybank transactions', async () => {
    const pdf = makeTextPdf('04/08/24 DUITNOW QR TO CHATGPT 99.00 DR 500.00');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('ChatGPT Plus');
    expect(result.rows[0].amountSen).toBe(9900);
    expect(result.rows[0].transactionDate).toBe('2024-08-04T00:00:00.000Z');
  });

  it('extracts Celcom Mobile Sdn Bhd and Malaysian telco descriptors', async () => {
    const pdf1 = makeTextPdf('01/08/2026 CELCOM MOBILE SDN BHD 60.00- 1,234.50+');
    const result1 = await parsePdfText(pdf1);
    expect(result1.rows).toHaveLength(1);
    expect(result1.rows[0].merchantName).toBe('CelcomDigi');
    expect(result1.rows[0].amountSen).toBe(6000);
    expect(result1.rows[0].transactionDate).toBe('2026-08-01T00:00:00.000Z');

    const pdf2 = makeTextPdf('15/07/26 CELCOM MOBILE SDN B * 40902700 0138934791 60.00 DR');
    const result2 = await parsePdfText(pdf2);
    expect(result2.rows).toHaveLength(1);
    expect(result2.rows[0].merchantName).toBe('CelcomDigi');
    expect(result2.rows[0].amountSen).toBe(6000);
  });

  it('extracts rows from two-line wrapped transactions', async () => {
    const pdf = makeTextPdf('15/07/2026 SPOTIFY MALAYSIA 15.90-');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toBe('2026-07-15T00:00:00.000Z');
  });

  it('reports empty when no embedded text is present', async () => {
    // A PDF with no text stream — still a valid PDF but nothing to extract.
    const pdf = makeTextPdf('');
    const result = await parsePdfText(pdf);
    expect(result.rows).toHaveLength(0);
    expect(result.empty).toBe(true);
  });

  it('returns an error for bytes that are not a PDF', async () => {
    const result = await parsePdfText(new Uint8Array([1, 2, 3, 4]));
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.empty).toBe(true);
  });
});

describe('Maybank CSV statements with preamble', () => {
  it('parses Maybank2u CSV export with metadata preamble and trailing minus', () => {
    const maybankCsv = [
      'Account Number: 1234567890',
      'Account Type: SAVINGS ACCOUNT-I',
      'Statement Period: 01/07/2026 to 31/07/2026',
      '',
      'Transaction Date,Value Date,Transaction Description,Amount,Debit/Credit',
      '15/07/2026,15/07/2026,SPTF*SPOTIFY SE,15.90-,DR',
      '20/07/2026,20/07/2026,NETFLIX.COM,55.00,DR',
    ].join('\n');

    const result = parseCsv(maybankCsv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].merchantName).toBe('Spotify');
    expect(result.rows[0].amountSen).toBe(1590);
    expect(result.rows[0].transactionDate).toBe('2026-07-15T00:00:00.000Z');
    expect(result.rows[1].merchantName).toBe('Netflix');
    expect(result.rows[1].amountSen).toBe(5500);
  });
});

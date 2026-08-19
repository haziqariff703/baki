import { describe, it, expect } from 'vitest';
import { parseReceiptLines } from '@/features/imports/ocr';

describe('Receipt OCR Text Parser (§12 / §2.1)', () => {
  it('parses Touch n Go eWallet subscription slip text', () => {
    const rawText = `
      Touch 'n Go eWallet
      Spotify Malaysia
      Date: 2026-08-20
      Amount: MYR 15.90
      Status: Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-20');
    expect(row.amountSen).toBe(1590);
    expect(row.merchantName.toLowerCase()).toContain('spotify');
  });

  it('parses DD/MM/YYYY dates and RM prefixes correctly', () => {
    const rawText = `
      Netflix International B.V.
      Date: 15/08/2026
      Total: RM 54.90
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-15');
    expect(row.amountSen).toBe(5490);
    expect(row.merchantName.toLowerCase()).toContain('netflix');
  });

  it('sanitizes text and ignores empty inputs', () => {
    expect(parseReceiptLines('').rows.length).toBe(0);
    expect(parseReceiptLines('Just random text with no amount or date').rows.length).toBe(0);
  });
});

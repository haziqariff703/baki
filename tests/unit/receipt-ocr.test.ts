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

  it('parses Maybank MAE / DuitNow mobile screenshot text', () => {
    const rawText = `
      DuitNow Transfer
      Transfer To: OpenAI ChatGPT
      Reference: Sub 2026
      Date & Time: 20 Aug 2026 14:30:15
      Amount: RM 94.90
      Status: Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-20');
    expect(row.amountSen).toBe(9490);
    expect(row.merchantName.toLowerCase()).toContain('chatgpt');
  });

  it('parses CIMB OCTO / DuitNow QR mobile screenshot', () => {
    const rawText = `
      CIMB Clicks
      Recipient: Anytime Fitness Malaysia
      Tarikh: 18/08/2026
      Jumlah: RM 149.00
      Status: Berjaya
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-18');
    expect(row.amountSen).toBe(14900);
    expect(row.merchantName.toLowerCase()).toContain('anytime fitness');
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

  it('parses Public Bank & RHB DuitNow transfer screenshots', () => {
    const rawText = `
      Public Bank
      DuitNow Transfer
      Beneficiary Name: Apple Services
      Transfer Amount: RM 19.90
      Transaction Date: 22-08-2026
      Status: Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-22');
    expect(row.amountSen).toBe(1990);
    expect(row.merchantName.toLowerCase()).toContain('apple');
  });

  it('parses Hong Leong Bank e-receipts with biller label', () => {
    const rawText = `
      Hong Leong Connect
      Biller Name: TM UNIFI
      Amount: RM 136.75
      Date: 10 Aug 2026
      Status: Completed
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-10');
    expect(row.amountSen).toBe(13675);
    expect(row.merchantName.toLowerCase()).toContain('unifi');
  });

  it('parses Touch n Go 12-hour AM/PM receipt format', () => {
    const rawText = `
      Touch 'n Go eWallet
      Spotify
      -RM 15.90
      20 Aug 2026, 02:30 PM
      Order ID: TNG12345678
      Payment Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-20');
    expect(row.amountSen).toBe(1590);
    expect(row.merchantName.toLowerCase()).toContain('spotify');
  });

  it('parses GrabPay & ShopeePay auto-billing slips', () => {
    const rawText = `
      GrabPay
      Merchant: GrabUnlimited
      Total: RM 4.90
      Date: 15/08/2026
      Payment Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-15');
    expect(row.amountSen).toBe(490);
    expect(row.merchantName.toLowerCase()).toContain('grab');
  });

  it('sanitizes text and ignores empty inputs', () => {
    expect(parseReceiptLines('').rows.length).toBe(0);
    expect(parseReceiptLines('Just random text with no amount or date').rows.length).toBe(0);
  });
});


import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  parseReceiptLines,
  parseDuitNowQrPayload,
  recognizeReceiptImage,
} from '@/features/imports/ocr';

const tesseractMocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  setParameters: vi.fn(),
  terminate: vi.fn(),
}));

vi.mock('tesseract.js', () => ({
  createWorker: tesseractMocks.createWorker,
  PSM: {
    AUTO: '3',
    SPARSE_TEXT: '11',
  },
}));

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

  it('decodes DuitNow EMVCo QR code payloads directly', () => {
    const emvcoPayload =
      '00020101021226580014A00000072700200112123456789012520459995303458540515.905802MY5916Spotify Malaysia6012Kuala Lumpur';
    const parsed = parseDuitNowQrPayload(emvcoPayload);
    expect(parsed).not.toBeNull();
    expect(parsed?.merchantName.toLowerCase()).toContain('spotify');
    expect(parsed?.amountSen).toBe(1590);
  });

  it('parses multi-line bank slips where labels and values are on separate lines', () => {
    const rawText = `
      Transfer To
      Spotify Malaysia Sdn Bhd
      Amount
      RM 15.90
      Date
      20/08/2026
      Status
      Successful
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.merchantName.toLowerCase()).toContain('spotify');
    expect(row.amountSen).toBe(1590);
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-20');
  });

  it('parses Malay language mobile screenshots with multi-line layout', () => {
    const rawText = `
      Penerima
      Netflix International B.V.
      Jumlah Bayaran
      RM 54.90
      Tarikh & Masa
      20 Ogos 2026 14:30
      Status
      Berjaya
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.merchantName.toLowerCase()).toContain('netflix');
    expect(row.amountSen).toBe(5490);
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-20');
  });

  it('fixes common OCR character misrecognitions in amounts (l, I, | instead of 1)', () => {
    const rawText = `
      Touch 'n Go eWallet
      Merchant: Adobe Creative Cloud
      Amount: RMl49.90
      Date: 2026-08-20
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.merchantName.toLowerCase()).toContain('adobe');
    expect(row.amountSen).toBe(14990);
  });

  it('parses Maybank MAE DuitNow screenshot with minus sign and colon-less format', () => {
    const rawText = `
      MAE by Maybank2u
      DuitNow Transfer
      Penerima: OpenAI ChatGPT Plus
      -RM 94.90
      22 Ogos 2026, 09:15 AM
      Rujukan: AI Sub
      Berjaya
    `;

    const result = parseReceiptLines(rawText);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const row = result.rows[0];
    expect(row.merchantName.toLowerCase()).toContain('chatgpt');
    expect(row.amountSen).toBe(9490);
    expect(row.transactionDate.slice(0, 10)).toBe('2026-08-22');
  });

  it('decodes payment URL QR codes with query parameters', () => {
    const urlQr = 'https://duitnow.my/pay?to=Netflix%20Malaysia&amt=55.00&ref=SUB123';
    const parsed = parseDuitNowQrPayload(urlQr);
    expect(parsed).not.toBeNull();
    expect(parsed?.merchantName.toLowerCase()).toContain('netflix');
    expect(parsed?.amountSen).toBe(5500);
  });

  it('normalizes OCR-confused zeroes in labelled MYR amounts', () => {
    const result = parseReceiptLines(`
      Merchant Name: Example Mobile
      Amount: RM6.OO
      Date: 5 Jul 2026, 9:39 PM
      Successful
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      merchantName: 'Example Mobile',
      amountSen: 600,
    });
    expect(result.rows[0].transactionDate.slice(0, 10)).toBe('2026-07-05');
  });

  it('normalizes an OCR-confused leading digit in a month-name date', () => {
    const result = parseReceiptLines(`
      Merchant Name: Example Mobile
      Amount: RM 3.00
      Date: S Jul 2026, 9:39 PM
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].transactionDate.slice(0, 10)).toBe('2026-07-05');
  });

  it('does not turn an incoming person-to-person receipt into a subscription transaction', () => {
    const result = parseReceiptLines(`
      Example Bank
      21 Jul 2026, 08:04 PM
      Amount: RM 6.00
      Successful
      Transfer from
      SAMPLE PERSON
      DuitNow QR
    `);

    expect(result.rows).toEqual([]);
  });

  it('keeps outgoing statement rows and excludes incoming rows using amount signs first', () => {
    const result = parseReceiptLines(`
      ACCOUNT TRANSACTIONS
      01/07/26 SAMPLE COFFEE PAYMENT RM 3.20- 2.85
      03/07/26 TRANSFER FROM A/C SAMPLE PERSON RM 5.00+ 7.85
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amountSen).toBe(320);
    expect(result.rows[0].transactionDate.slice(0, 10)).toBe('2026-07-01');
  });

  it('excludes wrapped TNG incoming markers reconstructed from table OCR', () => {
    const result = parseReceiptLines(`
      TRANSACTION HISTORY
      05/06/2026 Success DUITNOW_RECEI VEFROM SAMPLE PERSON RM2.20 RM2.20
      06/06/2026 Success DUITNOW QR SAMPLE MERCHANT RM1.80 RM0.40
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amountSen).toBe(180);
    expect(result.rows[0].transactionDate.slice(0, 10)).toBe('2026-06-06');
  });
});

describe('Receipt image recognizer lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses self-hosted OCR assets and always terminates its worker', async () => {
    tesseractMocks.recognize.mockResolvedValueOnce({
      data: {
        text: 'Merchant: Example Mobile\nAmount: RM 6.00\nDate: 2026-07-05',
      },
    });
    tesseractMocks.setParameters.mockResolvedValueOnce(undefined);
    tesseractMocks.terminate.mockResolvedValueOnce(undefined);
    tesseractMocks.createWorker.mockResolvedValueOnce({
      recognize: tesseractMocks.recognize,
      setParameters: tesseractMocks.setParameters,
      terminate: tesseractMocks.terminate,
    });

    const result = await recognizeReceiptImage('synthetic-receipt.png');

    expect(tesseractMocks.createWorker).toHaveBeenCalledWith(
      'eng',
      1,
      expect.objectContaining({
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract',
        langPath: '/tesseract',
        gzip: false,
      }),
    );
    expect(tesseractMocks.setParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        tessedit_pageseg_mode: '3',
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      }),
    );
    expect(result.rows).toHaveLength(1);
    expect(tesseractMocks.terminate).toHaveBeenCalledOnce();
  });

  it('retries once with sparse text when the primary pass finds no eligible row', async () => {
    tesseractMocks.recognize
      .mockResolvedValueOnce({ data: { text: 'unreadable', confidence: 20 } })
      .mockResolvedValueOnce({
        data: {
          text: 'Merchant: Example Mobile\nAmount: RM 6.00\nDate: 2026-07-05',
          confidence: 80,
        },
      });
    tesseractMocks.setParameters.mockResolvedValue(undefined);
    tesseractMocks.terminate.mockResolvedValueOnce(undefined);
    tesseractMocks.createWorker.mockResolvedValueOnce({
      recognize: tesseractMocks.recognize,
      setParameters: tesseractMocks.setParameters,
      terminate: tesseractMocks.terminate,
    });

    const result = await recognizeReceiptImage('synthetic-receipt.png');

    expect(tesseractMocks.recognize).toHaveBeenCalledTimes(2);
    expect(tesseractMocks.setParameters).toHaveBeenLastCalledWith(
      expect.objectContaining({ tessedit_pageseg_mode: '11' }),
    );
    expect(result.rows).toHaveLength(1);
    expect(tesseractMocks.terminate).toHaveBeenCalledOnce();
  });

  it('terminates its worker when recognition fails', async () => {
    tesseractMocks.recognize.mockRejectedValueOnce(new Error('recognition failed'));
    tesseractMocks.setParameters.mockResolvedValueOnce(undefined);
    tesseractMocks.terminate.mockResolvedValueOnce(undefined);
    tesseractMocks.createWorker.mockResolvedValueOnce({
      recognize: tesseractMocks.recognize,
      setParameters: tesseractMocks.setParameters,
      terminate: tesseractMocks.terminate,
    });

    await expect(recognizeReceiptImage('synthetic-receipt.png')).rejects.toThrow(
      'recognition failed',
    );
    expect(tesseractMocks.terminate).toHaveBeenCalledOnce();
  });
});



/**
 * Synthetic PDF generator for tests (tests/AGENTS.md — synthetic fixtures only).
 *
 * Produces a tiny, valid text-based PDF (one page) with a single text line.
 * Used to exercise the pdfjs extraction path without committing any real bank
 * statement. The xref table offsets are computed so the file parses cleanly.
 */

function pdfObject(id: number, body: string): string {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

/** Build a minimal one-page text PDF whose only text item is `text`. */
export function makeTextPdf(text: string): Uint8Array {
  const textHex = Array.from(Buffer.from(text, 'utf8'))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const catalog = pdfObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const pages = pdfObject(
    2,
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  );
  const page = pdfObject(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  );
  const contents = pdfObject(
    4,
    `<< /Length ${textHex.length / 2} >>\nstream\nBT /F1 12 Tf 72 720 Td (${text}) Tj ET\nendstream`,
  );
  const font = pdfObject(
    5,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  );

  const body = [catalog, pages, page, contents, font].join('\n');

  // Build xref offsets.
  const objects = [catalog, pages, page, contents, font];
  const offsets: number[] = [];
  let cursor = 0;
  const header = '%PDF-1.4\n';
  cursor += Buffer.byteLength(header);
  for (const obj of objects) {
    offsets.push(cursor);
    cursor += Buffer.byteLength(obj);
  }
  const xrefStart = cursor;

  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(header + body + '\n' + xref, 'utf8'));
}

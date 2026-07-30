# File Upload & Import Feature Agent Rules (`features/imports/`)

## Domain Directives

1. **Untrusted Input Handling**:
   * All uploaded CSV and PDF files are treated as untrusted external payloads.
   * Validate file size (max 5 MB), extension, MIME type, and maximum row/page count using Zod.

2. **Prompt Injection Defense**:
   * Extracted text from PDFs must be sanitized and treated strictly as data payloads, never as prompt instructions.

3. **Storage & Purge Policy**:
   * Save uploaded files to private Supabase Storage buckets with short-lived signed URLs.
   * Delete raw uploaded statement files immediately after text/row extraction.

# OWASP Top 10:2025 hardening checklist

Status describes this repository, not an OWASP certification.

| Area | Status | BAKI control |
| --- | --- | --- |
| A01 Broken Access Control | ✅ | Authenticated identity is resolved server-side; user rows are scoped by ownership/RLS; standard transaction deletion no longer uses `service_role`. |
| A02 Security Misconfiguration | ✅ | Nonce-based CSP, clickjacking/MIME/referrer/permissions/cross-origin headers, same-origin CORS posture, and API-only `no-store`. Vercel previews use CSP report-only before production enforcement. |
| A03 Software Supply Chain Failures | ✅ | Lockfile-only installs, weekly grouped Dependabot updates, CI tests/build, CodeQL `security-and-quality`, least-privilege workflow permissions, and commit-pinned Actions. |
| A04 Cryptographic Failures | ⚠️ | TLS and Supabase encryption are platform controls. Secrets remain environment-only; deployment TLS/HSTS must be verified in Vercel. |
| A05 Injection | ✅ | Strict Zod request schemas, contextual React output encoding, strict script CSP, and CSV/PDF/image byte-signature checks. |
| A06 Insecure Design | ⚠️ | Deterministic financial core, authenticated/rate-limited email dispatch, explicit destructive transaction query, and browser-only receipt OCR. The current in-memory limiter must move to a shared store for multi-instance production. |
| A07 Authentication Failures | ✅ | Supabase verifies sessions server-side, protected-route refresh remains active, auth callback redirects are restricted to local paths, and failures are sanitized. |
| A08 Software/Data Integrity Failures | ✅ | CodeQL, Dependabot, lockfile CI, file content sniffing, strict parsed-row validation, and private temporary import storage with purge. |
| A09 Security Logging and Alerting Failures | ⚠️ | Operational errors use sanitized structured logging. CodeQL/Dependabot alerts are enabled; production log-drain alert thresholds still require deployment configuration. |
| A10 Mishandling of Exceptional Conditions | ✅ | Shared typed errors hide stack traces/SQL details; import persistence/storage failures log safe codes and purge temporary files. |

## Production gate

- ✅ `npm ci`, typecheck, lint, tests, audit, and production build must pass.
- ✅ Vercel preview receives `Content-Security-Policy-Report-Only`; inspect browser console before promotion.
- ✅ Production receives enforced `Content-Security-Policy` by default.
- ⚠️ In GitHub Settings → Code security, verify secret scanning and push protection are enabled. The current CLI token cannot read those alerts without additional administrative scope.
- ⚠️ In Vercel, verify HTTPS redirect/HSTS, environment-secret separation, log drains, and alert recipients.
- ✅ Use `.env.example` only as a key-name template; real server secrets stay in deployment secret stores and never use `NEXT_PUBLIC_`.
- ⚠️ Protect `master`: require CI and CodeQL checks, at least one review, and dismiss stale approvals.

## API boundary

Browser mutations use cookie sessions plus `Origin`/`Sec-Fetch-Site` same-origin checks. Future third-party webhooks must use separate endpoints with provider signatures, replay protection, and no browser-session assumptions.

Receipt PNG/JPEG/WebP files are signature-checked and OCR'd in the browser; raw receipt images are not sent to the import endpoint. CSV/PDF statements are independently allowlisted, byte-sniffed, limited to 5 MB, stored privately only during extraction, and then purged.

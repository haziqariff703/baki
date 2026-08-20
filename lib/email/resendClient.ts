import type { SendEmailPayload, SendEmailResult } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Baki <onboarding@resend.dev>';

/**
 * Decoupled Resend Email Transport Adapter.
 *
 * Uses native standard library `fetch` to call Resend REST API (Zero new dependencies).
 * Falls back to mock transport when RESEND_API_KEY is not configured (§13.3).
 */
export async function sendEmailNotification(
  payload: SendEmailPayload,
): Promise<SendEmailResult> {
  const from = payload.from || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const { to, subject, html } = payload;

  if (!to || !EMAIL_REGEX.test(to.trim())) {
    return {
      success: false,
      error: 'Invalid recipient email address',
    };
  }

  const apiKey = process.env.RESEND_API_KEY;

  // Fallback: If no API key is configured (local dev / test), mock successfully.
  if (!apiKey || apiKey.trim() === '') {
    const masked = to.length > 4 ? `${to.slice(0, 3)}***` : 'user';
    console.info(`[Email Transport: Mock] Simulated email to ${masked}: "${subject}"`);
    return {
      success: true,
      mocked: true,
      messageId: `mock-${Date.now()}`,
    };
  }


  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to.trim()],
        subject,
        html,
      }),
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `Resend API returned status ${response.status}`;
      console.error('[Email Transport: Error]', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }


    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
      mocked: false,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Network error';
    console.error('[Email Transport: Exception]', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

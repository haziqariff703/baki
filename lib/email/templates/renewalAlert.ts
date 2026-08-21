import type { RenewalEmailTemplateData } from '../types';
import { senToMyr } from '@/lib/money';

export function buildRenewalEmailHtml(data: RenewalEmailTemplateData): string {
  const { recipientName = 'there', items, totalSen, appUrl = 'https://baki.my' } = data;
  const totalMyr = senToMyr(totalSen);

  const itemsHtml = items
    .map((item) => {
      const amountStr = item.amountSen != null ? `MYR ${senToMyr(item.amountSen)}` : '';
      const daysText =
        item.daysRemaining === 0
          ? '<span style="color: #f43f5e; font-weight: bold;">TODAY</span>'
          : item.daysRemaining === 1
          ? '<span style="color: #fbbf24; font-weight: bold;">TOMORROW</span>'
          : `in ${item.daysRemaining} days`;

      return (
        '<tr>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #222222;">' +
        '<div style="font-size: 14px; font-weight: 600; color: #ededed;">' +
        (item.merchantName ?? item.title) +
        '</div>' +
        '<div style="font-size: 12px; color: #8a8a8a; margin-top: 2px;">Scheduled: ' +
        item.date +
        ' (' +
        daysText +
        ')</div>' +
        '</td>' +
        '<td style="padding: 12px 0; border-bottom: 1px solid #222222; text-align: right; font-family: Courier, monospace; font-size: 14px; font-weight: 600; color: #ededed;">' +
        amountStr +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<!DICTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Baki Renewal Reminder</title>' +
    '</head>' +
    '<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #ededed;">' +
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 32px 16px;">' +
    '<tr>' +
    '<td align="center">' +
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #141414; border: 1px solid #222222; border-radius: 12px; overflow: hidden; padding: 32px 24px;">' +
    '<tr>' +
    '<td style="padding-bottom: 24px; border-bottom: 1px solid #222222;">' +
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">' +
    '<tr>' +
    '<td><span style="font-size: 20px; font-weight: 700; color: #ededed; letter-spacing: -0.5px;">Baki<span style="color: #f59e0b;">.</span></span></td>' +
    '<td align="right"><span style="font-family: Courier, monospace; font-size: 11px; text-transform: uppercase; color: #6b6b6b; letter-spacing: 1px;">Renewal Alert</span></td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding: 24px 0 16px 0;">' +
    '<h1 style="font-size: 18px; font-weight: 600; color: #ededed; margin: 0 0 8px 0;">Upcoming Subscriptions Reminder</h1>' +
    '<p style="font-size: 14px; color: #a1a1aa; line-height: 1.5; margin: 0;">Hi ' +
    recipientName +
    ', you have <strong style="color: #ededed;">' +
    items.length +
    ' subscription commitment' +
    (items.length > 1 ? 's' : '') +
    '</strong> coming up for auto-debit soon.</p>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td>' +
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 8px;">' +
    itemsHtml +
    '</table>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding: 20px 0;">' +
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px;">' +
    '<tr>' +
    '<td><span style="font-size: 12px; color: #a1a1aa;">Total Upcoming Auto-Debits</span></td>' +
    '<td align="right"><span style="font-family: Courier, monospace; font-size: 18px; font-weight: 700; color: #ededed;">MYR ' +
    totalMyr +
    '</span></td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '<tr>' +
    '<td align="center" style="padding: 16px 0 24px 0;">' +
    '<a href="' +
    appUrl +
    '/subscriptions" style="display: inline-block; background-color: #f59e0b; color: #0a0a0a; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Review & Optimize on Baki &rarr;</a>' +
    '</td>' +
    '</table>' +
    '</tr>' +
    '<tr>' +
    '<td style="border-top: 1px solid #222222; padding-top: 20px; font-size: 11px; color: #6b6b6b; line-height: 1.5; text-align: center;">' +
    'Baki MVO &middot; Deterministic Value Scoring &middot; Zero Bank Credentials Required<br>' +
    'You received this automated reminder based on your subscription notification preferences.' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</body>' +
    '</html>'
  );
}

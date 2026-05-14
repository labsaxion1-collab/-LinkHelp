/** Text/filename checks — extend with vision AI & server moderation later. */

const PHONE_LIKE =
  /(\+?\d[\d\s().-]{7,}\d)|(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)|(\b\d{10,14}\b)/;
const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const HANDLE_LIKE = /(^|[^A-Za-z0-9_])@[A-Za-z0-9_]{2,}/;
const QR_HINT = /\bqr\b|qrcode|qr-code/i;
const URL_LIKE = /\b(https?:\/\/|www\.)\S+/i;
const PAYMENT_HINT =
  /\b(venmo|paypal|zelle|interac|e-transfer|etransfer|cashapp|pix)\b/i;
const CARD_HINT = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;

export type ContactGuardReason =
  | 'phone'
  | 'email'
  | 'handle'
  | 'qr_hint'
  | 'url'
  | 'payment'
  | 'card';

/** Full `t(...)` key for blocked uploads / captions */
export function contactGuardToastKey(reason: ContactGuardReason): string {
  switch (reason) {
    case 'phone':
      return 'portfolio_onboarding.upload_blocked_phone';
    case 'email':
      return 'portfolio_onboarding.upload_blocked_email';
    case 'handle':
      return 'portfolio_onboarding.upload_blocked_handle';
    case 'qr_hint':
      return 'portfolio_onboarding.upload_blocked_qr';
    case 'url':
      return 'portfolio_onboarding.upload_blocked_url';
    case 'payment':
      return 'portfolio_onboarding.upload_blocked_payment';
    case 'card':
      return 'portfolio_onboarding.upload_blocked_card';
    default:
      return 'portfolio_onboarding.upload_blocked_generic';
  }
}

export function detectContactInText(text: string): ContactGuardReason | null {
  const s = text.trim();
  if (!s) return null;
  if (PHONE_LIKE.test(s)) return 'phone';
  if (EMAIL_LIKE.test(s)) return 'email';
  if (HANDLE_LIKE.test(s)) return 'handle';
  if (QR_HINT.test(s)) return 'qr_hint';
  if (URL_LIKE.test(s)) return 'url';
  if (PAYMENT_HINT.test(s)) return 'payment';
  if (CARD_HINT.test(s)) return 'card';
  return null;
}

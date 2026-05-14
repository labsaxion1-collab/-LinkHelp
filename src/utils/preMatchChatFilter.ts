/**
 * Soft filter for pre-contract chat: replace risky segments instead of blocking the whole message.
 * Does not catch every bypass; balances UX with platform protection.
 */
export function sanitizePreMatchMessage(raw: string, blockedToken: string): { text: string; hadReplacement: boolean } {
  let text = raw;
  let hadReplacement = false;
  const mark = () => {
    hadReplacement = true;
  };

  // URLs (http, https, www)
  text = text.replace(/\bhttps?:\/\/[^\s]+/gi, () => {
    mark();
    return blockedToken;
  });
  text = text.replace(/\bwww\.[^\s]+/gi, () => {
    mark();
    return blockedToken;
  });

  // Common domains without scheme
  text = text.replace(
    /\b[a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+\.(com|net|org|ca|io|app|me|co|tv|gg|link|info|biz)\b/gi,
    () => {
      mark();
      return blockedToken;
    },
  );

  // Emails
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, () => {
    mark();
    return blockedToken;
  });

  // @handles (avoid touching email @ already removed)
  text = text.replace(/(?<![A-Za-z0-9])@[A-Za-z0-9._]{2,}\b/g, () => {
    mark();
    return blockedToken;
  });

  // Social / off-platform keywords
  text = text.replace(/\bwhatsapp\b/gi, () => {
    mark();
    return `WhatsApp ${blockedToken}`;
  });
  text = text.replace(/\binstagram\b/gi, () => {
    mark();
    return `Instagram ${blockedToken}`;
  });
  text = text.replace(/\btelegram\b/gi, () => {
    mark();
    return `Telegram ${blockedToken}`;
  });
  text = text.replace(/(^|[\s.,;:!?])(ig)([\s.,;:!?]|$)/gi, (_m, a: string, _b: string, c: string) => {
    mark();
    return `${a}IG ${blockedToken}${c}`;
  });

  // North-American style phone clusters
  text = text.replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, () => {
    mark();
    return blockedToken;
  });
  // Long digit runs
  text = text.replace(/\b\d{10,}\b/g, () => {
    mark();
    return blockedToken;
  });
  // Spaced digit patterns
  text = text.replace(/\b(?:\d[\s.-]){8,}\d\b/g, () => {
    mark();
    return blockedToken;
  });

  text = text.replace(/\s{2,}/g, ' ').trim();

  return { text, hadReplacement };
}

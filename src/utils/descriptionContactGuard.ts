/** Block direct contact sharing in request descriptions (platform policy). */
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s]+/i;
const HANDLE_PATTERN = /@[a-zA-Z0-9._]{2,}/;
const SOCIAL_KEYWORDS =
  /\b(whatsapp|whats\s*app|instagram|insta|facebook|face\s*book|tiktok|telegram|snapchat|linkedin)\b/i;

export function descriptionContainsContactInfo(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    PHONE_PATTERN.test(trimmed) ||
    EMAIL_PATTERN.test(trimmed) ||
    URL_PATTERN.test(trimmed) ||
    HANDLE_PATTERN.test(trimmed) ||
    SOCIAL_KEYWORDS.test(trimmed)
  );
}

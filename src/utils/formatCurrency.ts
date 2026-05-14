/** Format a number as CAD-style currency for previews (extend with i18n as needed) */
export function formatCurrency(amount: number, currency = 'CAD', locale = 'en-CA'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

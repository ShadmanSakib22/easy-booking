/**
 * SSR-safe local-time formatter for a UTC ISO timestamp.
 * Returns '' on the server (typeof window === 'undefined') so SSR output is a stable
 * placeholder that cannot mismatch the client's local-timezone render. In the browser,
 * Intl.DateTimeFormat with NO timeZone option uses the visitor's system timezone.
 */
export function formatSlotTime(utcIso: string, locale: string = 'en-US'): string {
  if (typeof window === 'undefined') return ''
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(utcIso))
}

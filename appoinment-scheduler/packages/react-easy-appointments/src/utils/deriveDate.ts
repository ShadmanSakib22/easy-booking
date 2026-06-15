/**
 * Extracts the UTC date key ("2026-05-19") from a full UTC ISO timestamp.
 * Uses string slicing — NOT a Date object — so it never shifts by local timezone.
 * Host apps should use this to build the `date` grouping key on Slot objects.
 */
export function deriveDate(startUtc: string): string {
  return startUtc.slice(0, 10)
}

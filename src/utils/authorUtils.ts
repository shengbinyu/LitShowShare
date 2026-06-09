/**
 * Author Name Utilities
 *
 * Provides a normalization function that converts "Last, First" author name
 * format to "First Last" (the display/preferred format).
 *
 * This is used at import time (BibTeX/RIS parsers) and at render time
 * (sidebar author cloud aggregation) to ensure consistent author name
 * display and accurate aggregation regardless of the source format.
 */

/**
 * Normalize an author name from "Last, First" to "First Last".
 *
 * - "Smith, John"       → "John Smith"
 * - "Smith, John Jr."   → "John Jr. Smith"
 * - "John Smith"        → "John Smith" (unchanged)
 * - "Doe, Jane Ann"     → "Jane Ann Doe"
 * - ""                  → ""
 */
export function normalizeAuthorName(name: string): string {
  if (!name) return ''

  const trimmed = name.trim()
  if (!trimmed) return ''

  // Check if the name is in "Last, First" format (contains a comma)
  const commaIndex = trimmed.indexOf(',')
  if (commaIndex === -1) {
    // Already in "First Last" format — return as-is
    return trimmed
  }

  const last = trimmed.slice(0, commaIndex).trim()
  const first = trimmed.slice(commaIndex + 1).trim()

  if (!first) {
    // Edge case: "Smith," with nothing after comma — return the raw string
    return trimmed
  }

  return `${first} ${last}`
}

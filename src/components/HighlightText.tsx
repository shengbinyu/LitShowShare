import { useLiteratureStore } from '@/store/literatureStore'

// ============================================================
// HighlightText Component
// ============================================================

interface HighlightTextProps {
  /** The full text to display with highlights */
  text: string
  /** Optional custom query (defaults to the global search query) */
  query?: string
  /** CSS class for the highlighted span */
  highlightClass?: string
}

/**
 * Renders text with search query matches highlighted.
 * Matches are case-insensitive. If no query is active, renders plain text.
 *
 * Usage:
 *   <HighlightText text="Machine Learning" />
 *   <HighlightText text="Custom text" query="custom" />
 */
export default function HighlightText({
  text,
  query: propQuery,
  highlightClass = 'theme-accent-subtle-bg theme-accent-subtle-text rounded-sm px-0.5',
}: HighlightTextProps) {
  const storeQuery = useLiteratureStore((s) => s.searchQuery)
  const query = propQuery ?? storeQuery

  if (!query?.trim() || !text) {
    return <>{text}</>
  }

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  try {
    const regex = new RegExp(`(${escapedQuery})`, 'gi')
    const parts = text.split(regex)

    if (parts.length === 1) {
      // No match found
      return <>{text}</>
    }

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className={highlightClass}>
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    )
  } catch {
    // If regex fails (e.g., invalid pattern), render plain text
    return <>{text}</>
  }
}

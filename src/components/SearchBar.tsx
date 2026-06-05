import { useCallback } from 'react'
import { Search, X, ArrowUpDown } from 'lucide-react'
import { useLiteratureStore } from '@/store/literatureStore'

// ============================================================
// Sort cycle definitions
// ============================================================

/** Each entry in the sort cycle: field + direction + display label. */
const SORT_CYCLE = [
  { by: 'createdAt' as const, order: 'desc' as const, label: 'Newest first' },
  { by: 'createdAt' as const, order: 'asc' as const, label: 'Oldest first' },
  { by: 'title' as const, order: 'asc' as const, label: 'Title A-Z' },
  { by: 'title' as const, order: 'desc' as const, label: 'Title Z-A' },
  { by: 'date' as const, order: 'desc' as const, label: 'Publish date (newest)' },
  { by: 'date' as const, order: 'asc' as const, label: 'Publish date (oldest)' },
]

// ============================================================
// Component
// ============================================================

/**
 * SearchBar provides a text search input and a sort toggle button.
 * Both controls are wired to the Zustand literature store so that
 * changes are immediately reflected in the literature list.
 */
export default function SearchBar() {
  const searchQuery = useLiteratureStore((s) => s.searchQuery)
  const setSearchQuery = useLiteratureStore((s) => s.setSearchQuery)
  const sortBy = useLiteratureStore((s) => s.sortBy)
  const sortOrder = useLiteratureStore((s) => s.sortOrder)
  const setSortBy = useLiteratureStore((s) => s.setSortBy)
  const setSortOrder = useLiteratureStore((s) => s.setSortOrder)

  // Find the current position in the sort cycle
  const currentIndex = SORT_CYCLE.findIndex(
    (c) => c.by === sortBy && c.order === sortOrder,
  )

  // Cycle to the next sort option on click
  const handleSortToggle = useCallback(() => {
    const nextIndex = (currentIndex + 1) % SORT_CYCLE.length
    const next = SORT_CYCLE[nextIndex]
    setSortBy(next.by)
    setSortOrder(next.order)
  }, [currentIndex, setSortBy, setSortOrder])

  // Current tooltip label (fallback to first entry if not found)
  const sortLabel = currentIndex >= 0
    ? SORT_CYCLE[currentIndex].label
    : SORT_CYCLE[0].label

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Search input wrapper */}
      <div className="relative flex-1">
        {/* Search icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted pointer-events-none" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search literature..."
          className="w-full theme-bg-input border theme-border-primary rounded-lg pl-10 pr-9 py-2 theme-text-primary theme-placeholder text-sm focus:outline-none theme-ring-focus theme-border-focus transition-colors"
        />

        {/* Clear button — only visible when there is a query */}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 theme-text-muted hover:theme-text-primary transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sort toggle */}
      <button
        onClick={handleSortToggle}
        title={sortLabel}
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg theme-bg-input border theme-border-primary theme-text-secondary hover:text-gold-500 hover:theme-border-focus transition-colors"
        aria-label={`Sort: ${sortLabel}`}
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>
    </div>
  )
}

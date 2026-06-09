import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BookOpen, Search, LayoutGrid, List } from 'lucide-react'
import { useLiteratures, useCategories, useTags } from '@/hooks/useLiterature'
import { useLiteratureStore } from '@/store/literatureStore'
import { useTranslation } from '@/i18n/LanguageContext'
import { UNCATEGORY_VALUE, type Literature, type Category } from '@/utils/db'
import { normalizeAuthorName } from '@/utils/authorUtils'
import LiteratureCard from '@/components/LiteratureCard'
import LiteratureListItem from '@/components/LiteratureListItem'

// ============================================================
// Helpers
// ============================================================

/** Case-insensitive match of a query string against multiple text fields */
function matchesQuery(lit: Literature, query: string): boolean {
  const q = query.toLowerCase()
  const fields = [lit.title, lit.abstract, ...lit.authors, ...lit.keywords]
  return fields.some((f) => f?.toLowerCase().includes(q))
}

/** Compare two literature records based on the given sort key */
function compareLit(
  a: Literature,
  b: Literature,
  sortBy: 'date' | 'title' | 'createdAt',
): number {
  switch (sortBy) {
    case 'date':
      return (a.publishDate ?? '').localeCompare(b.publishDate ?? '')
    case 'title':
      return a.title.localeCompare(b.title)
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt)
  }
}

// ============================================================
// Animation variants
// ============================================================

const gridContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const gridItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ============================================================
// Sub-components
// ============================================================

/** Shown when the database has zero literature entries */
function EmptyLibraryState() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <BookOpen className="w-16 h-16 text-gold-500 mb-4" />
      <h2 className="text-2xl font-display theme-text-heading">{t('home.noLiterature')}</h2>
      <p className="mt-2 theme-text-muted max-w-sm">
        {t('home.noLiteratureDesc')}
      </p>
      <Link
        to="/import"
        className="mt-6 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold rounded-lg transition-colors"
      >
        {t('home.importFirst')}
      </Link>
    </motion.div>
  )
}

/** Shown when active filters produce zero results */
function NoResultsState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <Search className="w-16 h-16 theme-text-muted mb-4" />
      <h2 className="text-2xl font-display theme-text-heading">{t('home.noResults')}</h2>
      <p className="mt-2 theme-text-muted max-w-sm">
        {t('home.noResultsDesc')}
      </p>
      <button
        onClick={onReset}
        className="mt-6 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold rounded-lg transition-colors"
      >
        {t('home.resetFilters')}
      </button>
    </motion.div>
  )
}

// ============================================================
// Home page
// ============================================================

export default function Home() {
  const literatures = useLiteratures()
  const categories = useCategories()
  const tags = useTags()
  const { searchQuery, selectedCategory, selectedTag, selectedAuthor, sortBy, sortOrder, resetFilters } =
    useLiteratureStore()
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // Build a category lookup map: name -> Category
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Filter and sort literature based on store state
  const filteredLiteratures = useMemo(() => {
    let result = literatures

    // Apply search query filter
    if (searchQuery.trim()) {
      result = result.filter((lit) => matchesQuery(lit, searchQuery))
    }

    // Apply category filter
    if (selectedCategory === UNCATEGORY_VALUE) {
      // Filter for uncategorized literature
      result = result.filter((lit) => !lit.category || lit.category === '')
    } else if (selectedCategory) {
      result = result.filter((lit) => lit.category === selectedCategory)
    }

    // Apply tag filter
    if (selectedTag) {
      result = result.filter((lit) => lit.tagIds.includes(selectedTag))
    }

    // Apply author filter (normalize names to match sidebar display)
    if (selectedAuthor) {
      result = result.filter((lit) =>
        lit.authors.some((a) => normalizeAuthorName(a.trim()) === selectedAuthor)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      const cmp = compareLit(a, b, sortBy)
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [literatures, searchQuery, selectedCategory, selectedTag, selectedAuthor, sortBy, sortOrder])

  // Determine which empty state to show
  const isLibraryEmpty = literatures.length === 0
  const hasNoResults = filteredLiteratures.length === 0

  return (
    <div className="space-y-8">
      {/* Section header with count badge and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-display font-bold theme-text-heading">{t('home.literatureLibrary')}</h2>
          {!isLibraryEmpty && (
            <span className="px-2.5 py-0.5 text-xs font-semibold theme-accent-subtle-bg theme-accent-subtle-text rounded-full">
              {filteredLiteratures.length}
            </span>
          )}
        </div>
        {!isLibraryEmpty && (
          <div className="flex items-center gap-1 rounded-lg border theme-border-secondary p-0.5">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'theme-bg-tertiary text-gold-500' : 'theme-text-muted hover:theme-text-primary'}`}
              title={t('home.viewCard')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'theme-bg-tertiary text-gold-500' : 'theme-text-muted hover:theme-text-primary'}`}
              title={t('home.viewList')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      {isLibraryEmpty ? (
        <EmptyLibraryState />
      ) : hasNoResults ? (
        <NoResultsState onReset={resetFilters} />
      ) : (
        viewMode === 'card' ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
            variants={gridContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredLiteratures.map((lit, idx) => (
              <motion.div key={lit.id} variants={gridItemVariants} className="h-full">
                <LiteratureCard
                  literature={lit}
                  category={categoryMap.get(lit.category ?? '')}
                  tags={tags}
                  index={idx}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col gap-2"
            variants={gridContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredLiteratures.map((lit) => (
              <motion.div key={lit.id} variants={gridItemVariants}>
                <LiteratureListItem
                  literature={lit}
                  category={categoryMap.get(lit.category ?? '')}
                />
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </div>
  )
}

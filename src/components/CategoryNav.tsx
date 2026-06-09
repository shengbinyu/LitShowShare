import { useState, useMemo } from 'react'
import { useCategories, useLiteratures, addCategory, updateCategory, deleteCategory } from '@/hooks/useLiterature'
import { useLiteratureStore } from '@/store/literatureStore'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'
import type { Category } from '@/utils/db'
import type { Literature } from '@/utils/db'
import { UNCATEGORY_VALUE } from '@/utils/db'
import { normalizeAuthorName } from '@/utils/authorUtils'
import { FolderOpen, Hash, Plus, Pencil, Trash2, X, Check, Settings2, PenLine } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

// ============================================================
// Color presets for new categories
// ============================================================

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#22c55e',
  '#14b8a6', '#6366f1', '#eab308', '#ec4899', '#06b6d4',
]

// ============================================================
// Author cloud tuning constants
// ============================================================

/** Maximum number of authors to render in the sidebar cloud. */
const MAX_AUTHORS = 40

/**
 * Visual tier specs for the author cloud — tier 4 is the most prominent,
 * tier 0 is the most subdued. The look intentionally mimics an editorial
 * "byline index" rather than a generic rounded tag-pill cloud.
 */
const AUTHOR_TIER_STYLES: Array<{
  font: string
  weight: string
  tracking: string
  text: string
  textActive: string
  family: string
  showCount: boolean
}> = [
  // tier 0 — rarely seen authors, smallest & most subdued
  {
    font: 'text-[11px]',
    weight: 'font-normal',
    tracking: 'tracking-[0.08em] uppercase',
    text: 'theme-text-muted',
    textActive: 'text-gold-500',
    family: 'font-body',
    showCount: false,
  },
  // tier 1
  {
    font: 'text-sm',
    weight: 'font-normal',
    tracking: 'tracking-[0.02em]',
    text: 'theme-text-secondary',
    textActive: 'text-gold-500',
    family: 'font-body',
    showCount: false,
  },
  // tier 2 — baseline / single-occurrence fallback
  {
    font: 'text-base',
    weight: 'font-medium',
    tracking: 'tracking-normal',
    text: 'theme-text-primary',
    textActive: 'text-gold-500',
    family: 'font-display',
    showCount: false,
  },
  // tier 3
  {
    font: 'text-xl',
    weight: 'font-semibold',
    tracking: 'tracking-[-0.01em]',
    text: 'theme-text-heading',
    textActive: 'text-gold-400',
    family: 'font-display',
    showCount: true,
  },
  // tier 4 — most prominent author(s)
  {
    font: 'text-2xl',
    weight: 'font-bold',
    tracking: 'tracking-[-0.02em]',
    text: 'text-gold-500',
    textActive: 'text-gold-400',
    family: 'font-display',
    showCount: true,
  },
]

// ============================================================
// Category Management Dialog
// ============================================================

interface CategoryDialogProps {
  categories: Category[]
  onClose: () => void
}

function CategoryDialog({ categories, onClose }: CategoryDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0])
  const { t } = useTranslation()

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    await updateCategory(id, { name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(t('sidebar.deleteConfirm', { name }))
    if (!confirmed) return
    await deleteCategory(id)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    await addCategory(newName.trim(), newColor)
    setNewName('')
    setNewColor(COLOR_PRESETS[0])
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="border theme-bg-card theme-border-primary rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border-primary">
          <h3 className="font-display text-lg theme-text-heading">{t('sidebar.editCategory')}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 theme-text-muted hover:theme-bg-hover hover:theme-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Existing categories */}
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-lg theme-bg-input border theme-border-secondary px-3 py-2.5"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 theme-bg-input border theme-border-secondary rounded px-2 py-1 text-sm theme-text-primary theme-border-focus theme-ring-focus"
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`h-5 w-5 rounded-full border-2 transition-all ${
                            editColor === c ? 'border-gold-400 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => saveEdit(cat.id)}
                      className="rounded p-1 text-green-500 hover:theme-bg-hover transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-sm theme-text-secondary truncate">{cat.name}</span>
                    <button
                      onClick={() => startEdit(cat)}
                      className="rounded p-1 theme-text-muted hover:theme-bg-hover hover:text-gold-500 transition-colors"
                      title={t('sidebar.editCategory')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="rounded p-1 theme-text-muted hover:theme-bg-hover hover:text-red-500 transition-colors"
                      title={t('sidebar.deleteCategory')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new category */}
          <div className="pt-2 border-t theme-border-primary">
            <p className="font-body text-xs theme-text-muted mb-2">{t('sidebar.addNew')}</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('sidebar.categoryName')}
                className="flex-1 theme-bg-input border theme-border-secondary rounded-lg px-3 py-2 text-sm theme-text-primary theme-placeholder theme-border-focus theme-ring-focus"
              />
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition-all ${
                      newColor === c ? 'border-gold-400 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="rounded-lg bg-gold-500 p-2 text-navy-950 hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// CategoryNav Component
// ============================================================

/**
 * CategoryNav - Sidebar navigation for literature categories.
 * Displays all categories with colored indicators and literature counts.
 * Supports selecting a category to filter the main view,
 * and managing categories (add/edit/delete, login required).
 *
 * Also renders an editorial-style author cloud below the categories,
 * where authors who appear more often are rendered with a larger
 * display-serif typography for stronger visual weight.
 */
export default function CategoryNav() {
  const categories = useCategories()
  const literatures = useLiteratures()
  const {
    selectedCategory,
    setSelectedCategory,
    selectedAuthor,
    setSelectedAuthor,
  } = useLiteratureStore()
  const { isAuthenticated } = useAuthStore()
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Count literatures per category
  const countByCategory = literatures.reduce<Record<string, number>>(
    (acc, lit: Literature) => {
      acc[lit.category ?? ''] = (acc[lit.category ?? ''] || 0) + 1
      return acc
    },
    {}
  )

  // Count uncategorized literature (category is null or empty string)
  const uncategorizedCount = literatures.filter(
    (lit: Literature) => !lit.category || lit.category === ''
  ).length

  // Count categories that have at least one literature
  const categoriesWithItems = categories.filter(
    (cat: Category) => (countByCategory[cat.name] || 0) > 0
  ).length

  // ----------------------------------------------------------------
  // Author cloud: aggregate authors across literatures and assign
  // a visual "tier" based on relative occurrence count.
  // ----------------------------------------------------------------
  const rankedAuthors = useMemo(() => {
    const countByAuthor = new Map<string, number>()
    for (const lit of literatures) {
      const n = lit.authors.length
      if (n === 0) continue

      // Count the first author
      const first = normalizeAuthorName((lit.authors[0] ?? '').trim())
      if (first) countByAuthor.set(first, (countByAuthor.get(first) ?? 0) + 1)

      // Count the last author (if different from the first, i.e., n > 1)
      if (n > 1) {
        const last = normalizeAuthorName((lit.authors[n - 1] ?? '').trim())
        if (last) countByAuthor.set(last, (countByAuthor.get(last) ?? 0) + 1)
      }
    }
    const list = Array.from(countByAuthor.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, MAX_AUTHORS)

    if (list.length === 0) {
      return { items: [] as Array<{ name: string; count: number; tier: number }> }
    }
    const max = list[0].count
    const min = list[list.length - 1].count
    const span = max - min

    const items = list.map(({ name, count }) => {
      let tier: number
      if (span === 0) {
        // All authors share the same count — fallback to the baseline tier
        tier = 2
      } else {
        tier = Math.round(((count - min) / span) * (AUTHOR_TIER_STYLES.length - 1))
      }
      return { name, count, tier }
    })
    return { items }
  }, [literatures])

  return (
    <>
      <nav className="flex flex-col gap-1 px-3 py-4">
        {/* Section title + manage button (manage only visible to logged-in users) */}
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider theme-text-muted">
            {t('sidebar.categories')}
          </h3>
          {isAuthenticated && (
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-lg p-1.5 theme-text-muted hover:theme-bg-hover hover:text-gold-500 transition-colors"
              title={t('sidebar.manage')}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* "All Literature" entry */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          onClick={() => setSelectedCategory(null)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
            selectedCategory === null
              ? 'theme-accent-subtle-bg text-gold-500 font-medium'
              : 'theme-text-secondary hover:theme-bg-hover hover:theme-text-primary'
          }`}
        >
          <FolderOpen
            size={16}
            className={selectedCategory === null ? 'text-gold-500' : 'theme-text-muted'}
          />
          <span className="flex-1 text-left">{t('sidebar.all')}</span>
          <span
            className={`text-xs tabular-nums ${
              selectedCategory === null ? 'text-gold-500/70' : 'theme-text-muted'
            }`}
          >
            {literatures.length}
          </span>
        </motion.button>

        {/* "Uncategorized" entry - filters literature with no category */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          onClick={() => setSelectedCategory(UNCATEGORY_VALUE)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
            selectedCategory === UNCATEGORY_VALUE
              ? 'theme-accent-subtle-bg text-gold-500 font-medium'
              : 'theme-text-secondary hover:theme-bg-hover hover:theme-text-primary'
          }`}
        >
          <FolderOpen
            size={16}
            className={selectedCategory === UNCATEGORY_VALUE ? 'text-gold-500' : 'theme-text-muted'}
          />
          <span className="flex-1 text-left">{t('sidebar.uncategorized')}</span>
          <span
            className={`text-xs tabular-nums ${
              selectedCategory === UNCATEGORY_VALUE ? 'text-gold-500/70' : 'theme-text-muted'
            }`}
          >
            {uncategorizedCount}
          </span>
        </motion.button>

        {/* Category list with stagger animation */}
        <div className="flex flex-col gap-0.5">
          {categories.map((category: Category, index: number) => {
            const count = countByCategory[category.name] || 0
            const isActive = selectedCategory === category.name

            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.08 * (index + 1) }}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                  isActive
                    ? 'theme-accent-subtle-bg text-gold-500 font-medium'
                    : 'theme-text-secondary hover:theme-bg-hover hover:theme-text-primary'
                }`}
              >
                {/* Colored dot indicator */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 text-left truncate">{category.name}</span>
                <span
                  className={`text-xs tabular-nums ${
                    isActive ? 'text-gold-500/70' : 'theme-text-muted'
                  }`}
                >
                  {count}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* Summary footer */}
        <div className="mt-4 px-3 pt-3 border-t theme-border-primary">
          <div className="flex items-center gap-2 text-xs theme-text-muted">
            <Hash size={12} />
            <span>
              {t('sidebar.categoriesInUse', { active: categoriesWithItems, total: categories.length })}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Authors section — editorial-style ranked byline cloud         */}
        {/* ============================================================ */}
        <section className="mt-6 px-3 pt-4 border-t theme-border-primary">
          {/* Title row with icon */}
          <div className="flex items-center gap-2 mb-1">
            <PenLine size={14} className="text-gold-500/80" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] theme-text-muted">
              {t('sidebar.authors')}
            </h3>
          </div>
          {/* Editorial accent: small gold rule + italic byline */}
          <span className="block h-px w-8 bg-gold-500/50 mb-2" />
          <p className="font-body text-[11px] italic theme-text-muted mb-4">
            {t('sidebar.byline')}
          </p>

          {rankedAuthors.items.length === 0 ? (
            <p className="text-xs theme-text-muted italic">{t('sidebar.noAuthors')}</p>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5"
            >
              {rankedAuthors.items.map(({ name, count, tier }, index) => {
                const spec = AUTHOR_TIER_STYLES[tier] ?? AUTHOR_TIER_STYLES[2]
                const isActive = selectedAuthor === name
                return (
                  <motion.button
                    key={name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.6) }}
                    onClick={() => setSelectedAuthor(isActive ? null : name)}
                    aria-pressed={isActive}
                    title={`${name} (${count})`}
                    className={[
                      'group relative inline-flex items-baseline leading-tight',
                      'transition-colors duration-200',
                      'hover:text-gold-400 focus:outline-none focus-visible:text-gold-400',
                      spec.font,
                      spec.weight,
                      spec.tracking,
                      spec.family,
                      isActive ? spec.textActive : spec.text,
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'border-b transition-colors duration-200',
                        isActive
                          ? 'border-gold-500'
                          : 'border-transparent group-hover:border-gold-500/40',
                      ].join(' ')}
                    >
                      {name}
                    </span>
                    {spec.showCount && (
                      <sup className="ml-0.5 text-[10px] tabular-nums text-gold-500/70 font-body not-italic">
                        ×{count}
                      </sup>
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </section>
      </nav>

      {/* Category management dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <CategoryDialog
            categories={categories}
            onClose={() => setDialogOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

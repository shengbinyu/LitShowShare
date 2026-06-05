import { useState } from 'react'
import { useCategories, useLiteratures, useTags, addCategory, updateCategory, deleteCategory } from '@/hooks/useLiterature'
import { useLiteratureStore } from '@/store/literatureStore'
import { useTranslation } from '@/i18n/LanguageContext'
import type { Category } from '@/utils/db'
import type { Literature } from '@/utils/db'
import type { Tag } from '@/utils/db'
import { UNCATEGORY_VALUE } from '@/utils/db'
import { FolderOpen, Hash, Plus, Pencil, Trash2, X, Check, Settings2, Tag as TagIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

// ============================================================
// Color presets for new categories
// ============================================================

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#22c55e',
  '#14b8a6', '#6366f1', '#eab308', '#ec4899', '#06b6d4',
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
          <h3 className="font-display text-lg theme-text-primary">{t('sidebar.editCategory')}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 theme-text-muted hover:bg-navy-800 hover:text-navy-100 transition-colors"
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
                      className="flex-1 bg-navy-700 border border-navy-600 rounded px-2 py-1 text-sm theme-text-primary focus:outline-none focus:border-gold-500"
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
                      className="rounded p-1 text-green-400 hover:bg-navy-700 transition-colors"
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
                      className="rounded p-1 theme-text-muted hover:bg-navy-700 hover:text-gold-400 transition-colors"
                      title={t('sidebar.editCategory')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="rounded p-1 theme-text-muted hover:bg-navy-700 hover:text-red-400 transition-colors"
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
                className="flex-1 theme-bg-input border theme-border-secondary rounded-lg px-3 py-2 text-sm theme-text-primary placeholder-navy-500 focus:outline-none focus:border-gold-500"
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
 * and managing categories (add/edit/delete).
 */
export default function CategoryNav() {
  const categories = useCategories()
  const literatures = useLiteratures()
  const tags = useTags()
  const { selectedCategory, setSelectedCategory, selectedTag, setSelectedTag } = useLiteratureStore()
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Count literatures per category
  const countByCategory = literatures.reduce<Record<string, number>>(
    (acc, lit: Literature) => {
      acc[lit.category] = (acc[lit.category] || 0) + 1
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

  // Count literatures per tag (by tag id)
  const countByTagId = literatures.reduce<Record<string, number>>(
    (acc, lit: Literature) => {
      for (const tagId of lit.tagIds) {
        acc[tagId] = (acc[tagId] || 0) + 1
      }
      return acc
    },
    {}
  )

  return (
    <>
      <nav className="flex flex-col gap-1 px-3 py-4">
        {/* Section title + manage button */}
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider theme-text-muted">
            {t('sidebar.categories')}
          </h3>
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded-lg p-1.5 theme-text-muted hover:bg-navy-800 hover:text-gold-400 transition-colors"
            title={t('sidebar.manage')}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* "All Literature" entry */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          onClick={() => setSelectedCategory(null)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
            selectedCategory === null
              ? 'bg-gold-500/10 text-gold-500 font-medium'
              : 'theme-text-secondary hover:bg-navy-800/60 hover:text-navy-100'
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
              ? 'bg-gold-500/10 text-gold-500 font-medium'
              : 'theme-text-secondary hover:bg-navy-800/60 hover:text-navy-100'
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
                    ? 'bg-gold-500/10 text-gold-500 font-medium'
                    : 'theme-text-secondary hover:bg-navy-800/60 hover:text-navy-100'
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

        {/* Tags section */}
        <div className="mt-4 px-3 pt-3 border-t theme-border-primary">
          {/* Section title */}
          <div className="flex items-center gap-2 mb-3">
            <TagIcon size={14} className="theme-text-muted" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider theme-text-muted">
              {t('sidebar.tags')}
            </h3>
          </div>

          {/* Tag list */}
          {tags.length === 0 ? (
            <p className="text-xs theme-text-muted italic">{t('sidebar.noTags')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag: Tag) => {
                const count = countByTagId[tag.id] || 0
                const isActive = selectedTag === tag.id

                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(isActive ? null : tag.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors duration-200 ${
                      isActive
                        ? 'bg-gold-500/15 text-gold-500 font-medium ring-1 ring-gold-500/30'
                        : 'theme-bg-input theme-text-secondary hover:bg-navy-800 hover:text-navy-100'
                    }`}
                  >
                    <span>{tag.name}</span>
                    <span className={`tabular-nums ${isActive ? 'text-gold-500/70' : 'theme-text-muted'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
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

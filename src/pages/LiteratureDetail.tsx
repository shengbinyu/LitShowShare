import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Download, Check, X as XIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useLiterature, useExternalLinks, useTags, deleteLiterature, updateLiterature, useLiteratureMutations, useCategories } from '@/hooks/useLiterature'
import { useTranslation } from '@/i18n/LanguageContext'
import MetadataDisplay from '@/components/MetadataDisplay'

// ============================================================
// Literature Detail Page
// ============================================================

/**
 * Displays the full detail view for a single literature entry.
 * Supports: loading skeleton, 404 not-found state, delete with confirmation,
 * inline editing, and navigation back to the library.
 */
export default function LiteratureDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const literature = useLiterature(id ?? '')
  const externalLinks = useExternalLinks(id ?? '')
  const tags = useTags()
  const categories = useCategories()
  const mutations = useLiteratureMutations()
  const { t } = useTranslation()

  // Track whether the initial query window has elapsed.
  const [querySettled, setQuerySettled] = useState(false)
  // Track editing state
  const [isEditing, setIsEditing] = useState(false)
  // Edit form state
  const [editForm, setEditForm] = useState<{
    title: string
    authors: string
    abstract: string
    keywords: string
    publishDate: string
    category: string
    doi: string
    journal: string
    volume: string
    number: string
    pages: string
    publisher: string
    cloudLink: string
  }>({
    title: '',
    authors: '',
    abstract: '',
    keywords: '',
    publishDate: '',
    category: '',
    doi: '',
    journal: '',
    volume: '',
    number: '',
    pages: '',
    publisher: '',
    cloudLink: '',
  })

  useEffect(() => {
    setQuerySettled(false)
    const timer = setTimeout(() => setQuerySettled(true), 80)
    return () => clearTimeout(timer)
  }, [id])

  // Populate edit form when literature loads or editing starts
  useEffect(() => {
    if (literature && isEditing) {
      setEditForm({
        title: literature.title,
        authors: literature.authors.join(', '),
        abstract: literature.abstract,
        keywords: literature.keywords.join(', '),
        publishDate: literature.publishDate,
        category: literature.category ?? '',
        doi: literature.doi,
        journal: literature.journal,
        volume: literature.volume,
        number: literature.number,
        pages: literature.pages,
        publisher: literature.publisher,
        cloudLink: literature.cloudLink,
      })
    }
  }, [literature, isEditing])

  // ---- Handlers ----

  async function handleDelete() {
    if (!id) return
    const confirmed = window.confirm(t('detail.deleteConfirm'))
    if (!confirmed) return
    await deleteLiterature(id)
    navigate('/')
  }

  function handleExport() {
    console.info('Export clicked for literature:', id)
  }

  function handleStartEdit() {
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setIsEditing(false)
  }

  async function handleSaveEdit() {
    if (!id) return
    try {
      await mutations.update({ id, data: {
        title: editForm.title.trim(),
        authors: editForm.authors.split(',').map((a) => a.trim()).filter(Boolean),
        abstract: editForm.abstract.trim(),
        keywords: editForm.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        publishDate: editForm.publishDate.trim(),
        category: editForm.category || null,
        doi: editForm.doi.trim(),
        journal: editForm.journal.trim(),
        volume: editForm.volume.trim(),
        number: editForm.number.trim(),
        pages: editForm.pages.trim(),
        publisher: editForm.publisher.trim(),
        cloudLink: editForm.cloudLink.trim(),
      }})
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update literature:', err)
    }
  }

  // ---- Loading State ----
  if (!querySettled) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-24 animate-pulse rounded bg-navy-800" />
          <div className="flex gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-navy-800" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-navy-800" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-navy-800" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-navy-800" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-navy-800" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-navy-800" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-20 animate-pulse rounded bg-navy-800" />
            <div className="h-20 w-full animate-pulse rounded bg-navy-800" />
          </div>
        </div>
      </div>
    )
  }

  // ---- 404 Not Found ----
  if (!literature) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center min-h-[60vh] space-y-4"
      >
        <span className="font-display text-8xl font-bold text-navy-700">404</span>
        <p className="font-body text-lg text-navy-400">{t('detail.notFound')}</p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5
                     font-body text-sm font-medium text-navy-950
                     hover:bg-gold-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.backToLibrary')}
        </Link>
      </motion.div>
    )
  }

  // ---- Edit Mode ----
  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-4xl mx-auto px-4 py-8 space-y-6"
      >
        {/* Edit Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2
                       font-body text-sm text-navy-300
                       hover:bg-navy-800 hover:text-navy-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('detail.back')}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2
                         font-body text-sm font-semibold text-navy-950
                         hover:bg-gold-400 transition-colors"
            >
              <Check className="h-4 w-4" />
              {t('detail.save') || 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 px-4 py-2
                         font-body text-sm text-navy-300
                         hover:bg-navy-800 hover:text-navy-100 transition-colors"
            >
              <XIcon className="h-4 w-4" />
              {t('detail.cancel') || 'Cancel'}
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="space-y-5 rounded-xl border border-navy-700/50 bg-navy-900/40 p-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-body text-sm font-medium text-navy-300">
              {t('import.pdfTitle') || 'Title'} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                         font-body text-sm text-navy-100 placeholder-navy-500
                         focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                         transition-colors"
            />
          </div>

          {/* Authors */}
          <div className="space-y-1.5">
            <label className="font-body text-sm font-medium text-navy-300">
              {t('import.pdfAuthors') || 'Authors'}
            </label>
            <input
              type="text"
              value={editForm.authors}
              onChange={(e) => setEditForm({ ...editForm, authors: e.target.value })}
              placeholder="Comma separated"
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                         font-body text-sm text-navy-100 placeholder-navy-500
                         focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                         transition-colors"
            />
          </div>

          {/* Abstract */}
          <div className="space-y-1.5">
            <label className="font-body text-sm font-medium text-navy-300">
              {t('import.pdfAbstract') || 'Abstract'}
            </label>
            <textarea
              value={editForm.abstract}
              onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3
                         font-body text-sm text-navy-100 placeholder-navy-500
                         focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                         resize-y transition-colors"
            />
          </div>

          {/* Two-column fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keywords */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('import.pdfKeywords') || 'Keywords'}
              </label>
              <input
                type="text"
                value={editForm.keywords}
                onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                placeholder="Comma separated"
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Publish Date */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.published') || 'Publish Date'}
              </label>
              <input
                type="text"
                value={editForm.publishDate}
                onChange={(e) => setEditForm({ ...editForm, publishDate: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Journal */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.journal') || 'Journal'}
              </label>
              <input
                type="text"
                value={editForm.journal}
                onChange={(e) => setEditForm({ ...editForm, journal: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('import.pdfCategory') || 'Category'}
              </label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              >
                <option value="">{t('import.noCategory') || 'No Category'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* DOI */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">DOI</label>
              <input
                type="text"
                value={editForm.doi}
                onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Publisher */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.publisher') || 'Publisher'}
              </label>
              <input
                type="text"
                value={editForm.publisher}
                onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Volume */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.volumeIssue') || 'Volume'}
              </label>
              <input
                type="text"
                value={editForm.volume}
                onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Number */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.number') || 'Number'}
              </label>
              <input
                type="text"
                value={editForm.number}
                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Pages */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.pages') || 'Pages'}
              </label>
              <input
                type="text"
                value={editForm.pages}
                onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>

            {/* Cloud Link */}
            <div className="space-y-1.5">
              <label className="font-body text-sm font-medium text-navy-300">
                {t('detail.cloudLink') || 'Cloud Link'}
              </label>
              <input
                type="text"
                value={editForm.cloudLink}
                onChange={(e) => setEditForm({ ...editForm, cloudLink: e.target.value })}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5
                           font-body text-sm text-navy-100 placeholder-navy-500
                           focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500
                           transition-colors"
              />
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ---- Detail View ----
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2
                     font-body text-sm text-navy-300
                     hover:bg-navy-800 hover:text-navy-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartEdit}
            title={t('detail.edit')}
            className="rounded-lg p-2 text-navy-400
                       hover:bg-navy-800 hover:text-gold-400 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            title={t('detail.export')}
            className="rounded-lg p-2 text-navy-400
                       hover:bg-navy-800 hover:text-gold-400 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            title={t('detail.delete')}
            className="rounded-lg p-2 text-navy-400
                       hover:bg-navy-800 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MetadataDisplay literature={literature} externalLinks={externalLinks} tags={tags} />
    </motion.div>
  )
}

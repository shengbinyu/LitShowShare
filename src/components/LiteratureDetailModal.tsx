import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Pencil, Trash2, Download, Check, X as XIcon, Upload, FileText } from 'lucide-react'
import type { Literature } from '@/utils/db'
import { useExternalLinks, useTags, useCategories, useLiteratureMutations, deleteLiterature, uploadPdf } from '@/hooks/useLiterature'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'
import MetadataDisplay from '@/components/MetadataDisplay'

// ============================================================
// Edit form type
// ============================================================

interface EditForm {
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
}

const emptyForm: EditForm = {
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
}

function literatureToForm(lit: Literature): EditForm {
  return {
    title: lit.title,
    authors: lit.authors.join(', '),
    abstract: lit.abstract,
    keywords: lit.keywords.join(', '),
    publishDate: lit.publishDate,
    category: lit.category ?? '',
    doi: lit.doi,
    journal: lit.journal,
    volume: lit.volume,
    number: lit.number,
    pages: lit.pages,
    publisher: lit.publisher,
    cloudLink: lit.cloudLink,
  }
}

// ============================================================
// Props
// ============================================================

interface LiteratureDetailModalProps {
  literature: Literature | null
  isOpen: boolean
  onClose: () => void
  /** Called after a literature is successfully deleted. */
  onDeleted?: () => void
}

// ============================================================
// Component
// ============================================================

export default function LiteratureDetailModal({
  literature,
  isOpen,
  onClose,
  onDeleted,
}: LiteratureDetailModalProps) {
  const { t } = useTranslation()
  const externalLinks = useExternalLinks(literature?.id ?? '')
  const tags = useTags()
  const categories = useCategories()
  const mutations = useLiteratureMutations()
  const { user, isAdmin, isAuthenticated } = useAuthStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Permission: only the uploader or an admin can modify
  const canModify = Boolean(
    user && literature && (isAdmin || literature.uploadedBy === user.id),
  )

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false)
        } else {
          onClose()
        }
      }
    },
    [onClose, isEditing],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false)
      setPdfFile(null)
    }
  }, [isOpen])

  // Populate edit form when editing starts
  useEffect(() => {
    if (literature && isEditing) {
      setEditForm(literatureToForm(literature))
    }
  }, [literature, isEditing])

  // ---- Handlers ----

  async function handleDelete() {
    if (!literature) return
    const confirmed = window.confirm(t('detail.deleteConfirm'))
    if (!confirmed) return
    await deleteLiterature(literature.id)
    onDeleted?.()
    onClose()
  }

  function handleExport() {
    if (!literature) return
    // Export as BibTeX-like text
    const lines = [
      `@article{${literature.id},`,
      `  title = {${literature.title}},`,
      `  author = {${literature.authors.join(' and ')}},`,
      literature.journal ? `  journal = {${literature.journal}},` : '',
      literature.publishDate ? `  year = {${literature.publishDate}},` : '',
      literature.volume ? `  volume = {${literature.volume}},` : '',
      literature.number ? `  number = {${literature.number}},` : '',
      literature.pages ? `  pages = {${literature.pages}},` : '',
      literature.doi ? `  doi = {${literature.doi}},` : '',
      literature.publisher ? `  publisher = {${literature.publisher}},` : '',
      '}',
    ].filter(Boolean).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${literature.title.slice(0, 50).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.bib`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveEdit() {
    if (!literature) return
    setIsSaving(true)
    try {
      // Step 1: Upload new PDF if selected
      let pdfPath = literature.pdfPath
      let pdfFileName = literature.pdfFileName
      if (pdfFile) {
        const uploadResult = await uploadPdf(pdfFile)
        pdfPath = uploadResult.path
        pdfFileName = uploadResult.fileName
      }

      // Step 2: Update literature metadata
      await mutations.update({
        id: literature.id,
        data: {
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
          pdfPath,
          pdfFileName,
        },
      })
      setPdfFile(null)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update literature:', err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setIsEditing(false)
  }

  // ---- Render ----

  return (
    <AnimatePresence>
      {isOpen && literature && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={isEditing ? undefined : onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto
                            theme-bg-card rounded-2xl theme-shadow-card
                            border theme-border-primary pointer-events-auto">
              {/* Header bar */}
              <div className="sticky top-0 z-10 flex items-center justify-between
                              px-6 py-4 border-b theme-border-primary theme-bg-card rounded-t-2xl">
                <h2 className="font-display text-lg font-semibold theme-text-heading truncate pr-4">
                  {isEditing ? t('detail.edit') : literature.title}
                </h2>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Action buttons — only shown when NOT editing */}
                  {!isEditing && (
                    <>
                      {/* Download / Export — visible to all users */}
                      <button
                        onClick={handleExport}
                        title={t('detail.export')}
                        className="rounded-lg p-2 theme-text-muted
                                   hover:theme-bg-hover hover:text-gold-500 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {/* Edit — only for authenticated users with permission */}
                      {isAuthenticated && canModify && (
                        <button
                          onClick={() => setIsEditing(true)}
                          title={t('detail.edit')}
                          className="rounded-lg p-2 theme-text-muted
                                     hover:theme-bg-hover hover:text-gold-500 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {/* Delete — only for authenticated users with permission */}
                      {isAuthenticated && canModify && (
                        <button
                          onClick={handleDelete}
                          title={t('detail.delete')}
                          className="rounded-lg p-2 theme-text-muted
                                     hover:theme-bg-hover hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                  {/* Editing: Save / Cancel */}
                  {isEditing && (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2
                                   font-body text-sm font-semibold text-navy-950
                                   hover:bg-gold-400 transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                        {isSaving ? (t('detail.saving') || 'Saving...') : (t('detail.save') || 'Save')}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-1.5 rounded-lg border theme-border-secondary px-4 py-2
                                   font-body text-sm theme-text-secondary
                                   hover:theme-bg-hover hover:theme-text-primary transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                        {t('detail.cancel') || 'Cancel'}
                      </button>
                    </>
                  )}
                  {/* Close modal */}
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 theme-text-muted
                               hover:theme-bg-hover hover:text-gold-500
                               transition-colors focus:outline-none ml-1"
                    title={t('detail.back') || 'Close'}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {isEditing ? (
                  /* ---- Edit Form ---- */
                  <div className="space-y-5">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="font-body text-sm font-medium theme-text-label">
                        {t('import.pdfTitle') || 'Title'} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                   font-body text-sm theme-text-primary theme-placeholder
                                   theme-border-focus theme-ring-focus transition-colors"
                      />
                    </div>

                    {/* Authors */}
                    <div className="space-y-1.5">
                      <label className="font-body text-sm font-medium theme-text-label">
                        {t('import.pdfAuthors') || 'Authors'}
                      </label>
                      <input
                        type="text"
                        value={editForm.authors}
                        onChange={(e) => setEditForm({ ...editForm, authors: e.target.value })}
                        placeholder="Comma separated"
                        className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                   font-body text-sm theme-text-primary theme-placeholder
                                   theme-border-focus theme-ring-focus transition-colors"
                      />
                    </div>

                    {/* Abstract */}
                    <div className="space-y-1.5">
                      <label className="font-body text-sm font-medium theme-text-label">
                        {t('import.pdfAbstract') || 'Abstract'}
                      </label>
                      <textarea
                        value={editForm.abstract}
                        onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-3
                                   font-body text-sm theme-text-primary theme-placeholder
                                   theme-border-focus theme-ring-focus
                                   resize-y transition-colors"
                      />
                    </div>

                    {/* Two-column fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Keywords */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('import.pdfKeywords') || 'Keywords'}
                        </label>
                        <input
                          type="text"
                          value={editForm.keywords}
                          onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                          placeholder="Comma separated"
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Publish Date */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.published') || 'Publish Date'}
                        </label>
                        <input
                          type="text"
                          value={editForm.publishDate}
                          onChange={(e) => setEditForm({ ...editForm, publishDate: e.target.value })}
                          placeholder="YYYY-MM-DD"
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Journal */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.journal') || 'Journal'}
                        </label>
                        <input
                          type="text"
                          value={editForm.journal}
                          onChange={(e) => setEditForm({ ...editForm, journal: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('import.pdfCategory') || 'Category'}
                        </label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary
                                     theme-border-focus theme-ring-focus transition-colors"
                        >
                          <option value="">{t('import.noCategory') || 'No Category'}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* DOI */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">DOI</label>
                        <input
                          type="text"
                          value={editForm.doi}
                          onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Publisher */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.publisher') || 'Publisher'}
                        </label>
                        <input
                          type="text"
                          value={editForm.publisher}
                          onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Volume */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.volumeIssue') || 'Volume'}
                        </label>
                        <input
                          type="text"
                          value={editForm.volume}
                          onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Number */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.number') || 'Number'}
                        </label>
                        <input
                          type="text"
                          value={editForm.number}
                          onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Pages */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.pages') || 'Pages'}
                        </label>
                        <input
                          type="text"
                          value={editForm.pages}
                          onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>

                      {/* Full-text Link */}
                      <div className="space-y-1.5">
                        <label className="font-body text-sm font-medium theme-text-label">
                          {t('detail.cloudLink') || 'Full-text Link'}
                        </label>
                        <input
                          type="text"
                          value={editForm.cloudLink}
                          onChange={(e) => setEditForm({ ...editForm, cloudLink: e.target.value })}
                          className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                     font-body text-sm theme-text-primary theme-placeholder
                                     theme-border-focus theme-ring-focus transition-colors"
                        />
                      </div>
                    </div>

                    {/* PDF Upload */}
                    <div className="space-y-1.5 mt-2">
                      <label className="font-body text-sm font-medium theme-text-label flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        PDF {t('detail.pdfFile') || 'File'}
                      </label>
                      {literature.pdfPath && !pdfFile && (
                        <p className="font-body text-xs theme-text-muted mb-1">
                          {t('import.currentFile') || 'Current file'}: {literature.pdfFileName || 'document.pdf'}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => document.getElementById('edit-pdf-input')?.click()}
                          className="inline-flex items-center gap-2 rounded-lg border theme-border-secondary
                                     px-4 py-2.5 font-body text-sm theme-text-secondary
                                     hover:theme-bg-hover hover:theme-text-primary transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          {pdfFile ? t('import.replacePdf') || 'Replace PDF' : t('import.uploadPdf') || 'Upload PDF'}
                        </button>
                        <input
                          id="edit-pdf-input"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && file.type === 'application/pdf') {
                              setPdfFile(file)
                            }
                            e.target.value = ''
                          }}
                        />
                        {pdfFile && (
                          <>
                            <span className="font-body text-sm theme-text-primary truncate max-w-[200px]">
                              {pdfFile.name}
                            </span>
                            <span className="font-body text-xs theme-text-muted">
                              {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <button
                              type="button"
                              onClick={() => setPdfFile(null)}
                              className="rounded p-1 theme-text-muted hover:text-red-500 transition-colors"
                              title={t('detail.cancel') || 'Cancel'}
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ---- View Mode: MetadataDisplay ---- */
                  <MetadataDisplay
                    literature={literature}
                    externalLinks={externalLinks}
                    tags={tags}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

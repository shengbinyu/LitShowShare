import { useState, useMemo } from 'react'
import type { Literature, ExternalLink as ExternalLinkType, Tag } from '@/utils/db'
import { Calendar, User, BookOpen, Hash, ExternalLink, FileText, Award, Copy, Quote, Download, Eye, Cloud, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useTags, useTagMutations, addTagToLiterature, removeTagFromLiterature, getPdfUrl } from '@/hooks/useLiterature'
import { useTranslation } from '@/i18n/LanguageContext'

// ============================================================
// Types
// ============================================================

interface MetadataDisplayProps {
  literature: Literature
  externalLinks: ExternalLinkType[]
  /** All tags available in the system. */
  tags?: Tag[]
}

// ============================================================
// MetadataDisplay Component
// ============================================================

/**
 * Displays full literature metadata in a clean card-based layout.
 * Primary metadata (title, authors, journal) on the left,
 * secondary metadata (keywords, abstract, source) on the right,
 * PDF file, cloud link, tags, and external links at the bottom.
 */
export default function MetadataDisplay({ literature, externalLinks, tags: externalTags }: MetadataDisplayProps) {
  const [doiCopied, setDoiCopied] = useState(false)
  const [abstractExpanded, setAbstractExpanded] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const allTags = useTags()
  const tags = externalTags ?? allTags
  const tagMutations = useTagMutations()
  const { t } = useTranslation()

  // Resolve tag IDs to tag objects for this literature
  const literatureTags = useMemo(
    () => tags.filter((tag) => literature.tagIds.includes(tag.id)),
    [tags, literature.tagIds],
  )

  // Autocomplete suggestions for tag input
  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return []
    const input = tagInput.trim().toLowerCase()
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(input) &&
        !literature.tagIds.includes(tag.id),
    )
  }, [tagInput, tags, literature.tagIds])

  async function handleCopyDoi() {
    if (!literature.doi) return
    try {
      await navigator.clipboard.writeText(literature.doi)
      setDoiCopied(true)
      setTimeout(() => setDoiCopied(false), 2000)
    } catch {
      console.warn('Failed to copy DOI to clipboard')
    }
  }

  function doiUrl(doi: string): string {
    if (doi.startsWith('http')) return doi
    return `https://doi.org/${doi}`
  }

  function formatBadge(format: string): string {
    const map: Record<string, string> = { ris: 'RIS', bibtex: 'BibTeX', manual: 'Manual' }
    return map[format] ?? format
  }

  // Tag management handlers
  async function handleRemoveTag(tagId: string) {
    try {
      await removeTagFromLiterature(literature.id, tagId)
    } catch (err) {
      console.error('Failed to remove tag:', err)
    }
  }

  async function handleAddTag(tagId: string) {
    try {
      await addTagToLiterature(literature.id, tagId)
      setTagInput('')
      setShowTagSuggestions(false)
    } catch (err) {
      console.error('Failed to add tag:', err)
    }
  }

  async function handleCreateAndAddTag() {
    if (!tagInput.trim()) return
    try {
      const newTag = await tagMutations.create(tagInput.trim())
      await addTagToLiterature(literature.id, newTag.id)
      setTagInput('')
      setShowTagSuggestions(false)
    } catch (err) {
      console.error('Failed to create tag:', err)
    }
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If there's an exact match suggestion, use it; otherwise create new
      const exactMatch = tagSuggestions.find(
        (tag) => tag.name.toLowerCase() === tagInput.trim().toLowerCase(),
      )
      if (exactMatch) {
        handleAddTag(exactMatch.id)
      } else {
        handleCreateAndAddTag()
      }
    }
  }

  const volParts: string[] = []
  if (literature.volume) volParts.push(`Vol. ${literature.volume}`)
  if (literature.number) volParts.push(`No. ${literature.number}`)
  if (literature.pages) volParts.push(`pp. ${literature.pages}`)
  const volDisplay = volParts.join(', ')

  const isAbstractLong = literature.abstract.length > 300

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ---- Title Section (full width) ---- */}
      <div className="theme-bg-hero border theme-border-primary rounded-xl p-6 theme-shadow-card">
        <h1 className="font-display text-2xl md:text-3xl font-bold theme-text-heading leading-relaxed tracking-tight">
          {literature.title}
        </h1>

        {/* Authors */}
        {literature.authors.length > 0 && (
          <div className="mt-4 flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            <div className="flex flex-wrap gap-1">
              {literature.authors.map((author, i) => (
                <span key={i} className="font-body text-sm theme-text-secondary">
                  {author}{i < literature.authors.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick info row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs theme-text-muted">
          {literature.publishDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {literature.publishDate}
            </span>
          )}
          {literature.journal && (
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              {literature.journal}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            {formatBadge(literature.sourceFormat)}
          </span>
        </div>
      </div>

      {/* ---- Two-column layout ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ---- Left column: publication details ---- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card: Publication Details */}
          <div className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5 space-y-4">
            <h3 className="font-display text-sm uppercase tracking-wider theme-text-label">
              {t('detail.publicationDetails')}
            </h3>

            {/* Journal / Publisher */}
            {(literature.journal || literature.publisher) && (
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 theme-text-muted" />
                <div>
                  <p className="font-body text-xs theme-text-label">{t('detail.journal')}</p>
                  <p className="font-body text-sm theme-text-secondary">
                    {literature.journal || literature.publisher}
                  </p>
                </div>
              </div>
            )}

            {/* Publish date */}
            {literature.publishDate && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 theme-text-muted" />
                <div>
                  <p className="font-body text-xs theme-text-label">{t('detail.published')}</p>
                  <p className="font-body text-sm theme-text-secondary">{literature.publishDate}</p>
                </div>
              </div>
            )}

            {/* Volume / Number / Pages */}
            {volDisplay && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 theme-text-muted" />
                <div>
                  <p className="font-body text-xs theme-text-label">{t('detail.volumeIssue')}</p>
                  <p className="font-body text-sm theme-text-secondary">{volDisplay}</p>
                </div>
              </div>
            )}

            {/* DOI */}
            {literature.doi && (
              <div className="flex items-start gap-3">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-xs theme-text-label">DOI</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={doiUrl(literature.doi)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm theme-text-link hover:text-gold-500
                                 underline underline-offset-2 transition-colors truncate max-w-[70%]"
                    >
                      {literature.doi}
                    </a>
                    <button
                      onClick={handleCopyDoi}
                      title="Copy DOI"
                      className="shrink-0 rounded p-1 theme-text-muted
                                 hover:theme-bg-hover hover:text-gold-500 transition-colors"
                    >
                      {doiCopied ? (
                        <span className="font-body text-xs text-green-500">{t('detail.copied')}</span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Right column: source + keywords + tags ---- */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card: Source */}
          <div className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5 space-y-3">
            <h3 className="font-display text-sm uppercase tracking-wider theme-text-label">
              {t('detail.source')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md theme-bg-tertiary px-3 py-1.5
                               font-body text-xs font-medium theme-text-secondary">
                {formatBadge(literature.sourceFormat)}
              </span>
              {literature.category && (
                <span className="inline-block rounded-md theme-bg-tertiary px-3 py-1.5
                                 font-body text-xs font-medium theme-text-secondary">
                  {literature.category.replace('bibtex-', '')}
                </span>
              )}
            </div>

            {/* Keywords */}
            {literature.keywords.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 theme-text-muted" />
                  <span className="font-body text-xs uppercase tracking-wider theme-text-label">
                    {t('detail.keywords')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {literature.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full theme-bg-tertiary px-2.5 py-1 font-body text-xs theme-text-secondary
                                 border theme-border-primary"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card: Tags */}
          <div className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-gold-500" />
              <h3 className="font-display text-sm uppercase tracking-wider theme-text-label">
                {t('detail.tags')}
              </h3>
            </div>

            {/* Existing tags with remove buttons */}
            {literatureTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {literatureTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full theme-accent-subtle-bg theme-accent-subtle-text
                               border theme-accent-subtle-border px-2.5 py-1 font-body text-xs"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                      title={t('detail.addTag')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input with autocomplete */}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value)
                  setShowTagSuggestions(true)
                }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={t('detail.addTagPlaceholder')}
                className="w-full theme-bg-input border theme-border-primary rounded-lg px-3 py-2 text-sm
                           theme-text-primary theme-placeholder theme-border-focus theme-ring-focus transition-colors"
              />

              {/* Autocomplete suggestions */}
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full theme-bg-card border theme-border-primary rounded-lg shadow-lg overflow-hidden">
                  {tagSuggestions.slice(0, 5).map((tag) => (
                    <button
                      key={tag.id}
                      onMouseDown={() => handleAddTag(tag.id)}
                      className="w-full text-left px-3 py-2 text-sm theme-text-secondary hover:theme-bg-hover transition-colors"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create new tag hint */}
            {tagInput.trim() && !tags.some(
              (tag) => tag.name.toLowerCase() === tagInput.trim().toLowerCase(),
            ) && (
              <button
                onClick={handleCreateAndAddTag}
                className="text-xs theme-accent-subtle-text hover:text-gold-500 transition-colors"
              >
                + {t('detail.addTag')}: &quot;{tagInput.trim()}&quot;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Abstract Section (full width, enhanced) ---- */}
      {literature.abstract && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="theme-bg-card-elevated border theme-border-primary rounded-xl overflow-hidden"
        >
          {/* Abstract header */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            <Quote className="h-4 w-4 text-gold-500" />
            <h3 className="font-display text-base font-medium theme-text-heading">{t('detail.abstract')}</h3>
          </div>

          {/* Abstract content */}
          <div className="px-5 pb-4">
            <div className="relative">
              <p className={`font-body text-sm leading-relaxed theme-text-secondary ${!abstractExpanded && isAbstractLong ? 'line-clamp-6' : ''}`}
                 style={{ whiteSpace: 'pre-line' }}>
                {literature.abstract}
              </p>

              {/* Gradient fade for truncated abstract */}
              {!abstractExpanded && isAbstractLong && (
                <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[var(--bg-card-elevated)] to-transparent" />
              )}
            </div>

            {/* Expand/collapse button */}
            {isAbstractLong && (
              <button
                onClick={() => setAbstractExpanded(!abstractExpanded)}
                className="mt-2 text-xs theme-accent-subtle-text hover:text-gold-500 transition-colors
                           font-medium focus:outline-none"
              >
                {abstractExpanded ? t('detail.showLess') : t('detail.readFull')}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ---- PDF File Section ---- */}
      {literature.pdfPath && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gold-500" />
            <h3 className="font-display text-sm uppercase tracking-wider theme-text-label">
              {t('detail.pdfFile')}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm theme-text-secondary truncate">
                {literature.pdfFileName || 'document.pdf'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getPdfUrl(literature.pdfPath)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg theme-bg-tertiary px-3 py-1.5
                           font-body text-xs font-medium theme-text-secondary
                           hover:theme-bg-hover hover:text-gold-500 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                {t('detail.previewPdf')}
              </a>
              <a
                href={getPdfUrl(literature.pdfPath)}
                download={literature.pdfFileName || 'document.pdf'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5
                           font-body text-xs font-medium text-navy-950
                           hover:bg-gold-400 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                {t('detail.downloadPdf')}
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Cloud Drive Link Section ---- */}
      {literature.cloudLink && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.13 }}
          className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="h-4 w-4 text-gold-500" />
            <h3 className="font-display text-sm uppercase tracking-wider theme-text-label">
              {t('detail.cloudLink')}
            </h3>
          </div>
          <a
            href={literature.cloudLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm theme-text-link hover:text-gold-500 underline underline-offset-2 transition-colors break-all"
          >
            {literature.cloudLink}
          </a>
        </motion.div>
      )}

      {/* ---- External Links section (full width) ---- */}
      {externalLinks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="theme-bg-card-elevated border theme-border-primary rounded-xl p-5"
        >
          <h3 className="font-display text-sm uppercase tracking-wider theme-text-label mb-3">
            {t('detail.externalLinks')} ({externalLinks.length})
          </h3>
          <ul className="divide-y theme-border-primary">
            {externalLinks.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <ExternalLink className="h-4 w-4 shrink-0 theme-text-muted" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-body text-sm
                             theme-text-secondary hover:text-gold-500 transition-colors"
                >
                  {link.label || link.url}
                </a>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    link.isValid ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  title={link.isValid ? 'Valid' : 'Invalid'}
                />
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, Cloud, ChevronDown, ChevronUp, BookOpen, ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { Literature, Category } from '@/utils/db'
import { getPdfUrl } from '@/hooks/useLiterature'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'
import HighlightText from '@/components/HighlightText'

interface LiteratureListItemProps {
  literature: Literature
  category?: Category
}

export default function LiteratureListItem({
  literature,
  category,
}: LiteratureListItemProps) {

  const { isAuthenticated } = useAuthStore()
  const { t } = useTranslation()
  const [previewOpen, setPreviewOpen] = useState(false)
  const stripColor = category?.color ?? '#c9a84c'

  const year = literature.publishDate
    ? new Date(literature.publishDate).getFullYear()
    : ''

  const authorsText = literature.authors.length
    ? literature.authors.join(', ')
    : 'Unknown Author'

  // Build volume/issue/pages display
  const volParts: string[] = []
  if (literature.volume) volParts.push(`Vol. ${literature.volume}`)
  if (literature.number) volParts.push(`No. ${literature.number}`)
  if (literature.pages) volParts.push(`pp. ${literature.pages}`)
  const volDisplay = volParts.join(', ')

  return (
    <div className="rounded-lg border theme-bg-card theme-border-primary hover:theme-border-secondary transition-colors overflow-hidden">
      {/* Main row */}
      <div className="group flex items-center gap-3 px-4 py-3 hover:theme-bg-hover transition-colors">
        {/* Left color strip */}
        <div
          className="w-1 h-8 shrink-0 rounded-full"
          style={{ backgroundColor: stripColor }}
        />

        {/* Title */}
        <Link
          to={`/literature/${literature.id}`}
          className="min-w-0 flex-1 truncate font-body text-sm font-medium theme-text-primary hover:text-gold-500 transition-colors"
        >
          <HighlightText text={literature.title} />
        </Link>

        {/* Authors */}
        <span className="hidden md:block truncate max-w-[200px] theme-text-muted text-xs">
          <HighlightText text={authorsText} />
        </span>

        {/* Year */}
        {year && (
          <span className="shrink-0 theme-text-muted text-xs tabular-nums">
            {year}
          </span>
        )}

        {/* Category badge */}
        {literature.category && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs"
            style={{
              backgroundColor: `${stripColor}15`,
              color: stripColor,
            }}
          >
            {literature.category}
          </span>
        )}

        {/* PDF / Full-text Link buttons — only visible to authenticated users */}
        {isAuthenticated && (literature.pdfPath || literature.cloudLink) && (
          <div className="shrink-0 flex items-center gap-1">
            {literature.pdfPath && (
              <a
                href={getPdfUrl(literature.pdfPath)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md theme-accent-subtle-bg border theme-accent-subtle-border px-2 py-0.5 text-xs theme-accent-subtle-text hover:brightness-110 transition-all"
                onClick={(e) => e.stopPropagation()}
                title="PDF"
              >
                <FileText className="w-3 h-3" />
              </a>
            )}
            {literature.cloudLink && (
              <a
                href={literature.cloudLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md theme-accent-subtle-bg border theme-accent-subtle-border px-2 py-0.5 text-xs theme-accent-subtle-text hover:brightness-110 transition-all"
                onClick={(e) => e.stopPropagation()}
                title="Full-text Link"
              >
                <Cloud className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Preview toggle button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewOpen(!previewOpen) }}
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md
                     theme-text-muted hover:text-gold-500 hover:theme-bg-hover
                     transition-colors focus:outline-none"
          title={previewOpen ? t('card.collapse') : t('card.preview')}
        >
          {previewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Preview panel — expands below the row */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 ml-2 border-t theme-border-primary space-y-2">
              {/* Abstract */}
              {literature.abstract && (
                <p className="text-sm leading-relaxed theme-text-secondary line-clamp-4">
                  <HighlightText text={literature.abstract} />
                </p>
              )}

              {/* Journal & Publisher */}
              {(literature.journal || literature.publisher) && (
                <div className="flex items-start gap-2">
                  <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 theme-text-muted" />
                  <p className="text-xs theme-text-secondary">
                    {literature.journal || literature.publisher}
                    {volDisplay && <span className="theme-text-muted"> — {volDisplay}</span>}
                  </p>
                </div>
              )}

              {/* DOI */}
              {literature.doi && (
                <a
                  href={`https://doi.org/${literature.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs theme-text-link hover:text-gold-500 transition-colors"
                >
                  <ExternalLinkIcon className="w-3 h-3" />
                  DOI: {literature.doi}
                </a>
              )}

              {/* Keywords */}
              {literature.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {literature.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="shrink-0 rounded-full theme-bg-tertiary theme-text-secondary
                                 px-2 py-0.5 text-xs truncate max-w-[8rem]"
                      title={kw}
                    >
                      <HighlightText text={kw} />
                    </span>
                  ))}
                </div>
              )}

              {/* Link to detail page */}
              <Link
                to={`/literature/${literature.id}`}
                className="inline-flex items-center gap-1.5 text-xs theme-text-link hover:text-gold-500 transition-colors"
              >
                <ExternalLinkIcon className="w-3 h-3" />
                {t('card.viewDetails')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

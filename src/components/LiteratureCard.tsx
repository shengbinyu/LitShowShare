import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Calendar, User, ExternalLink, BookOpen, Hash, FileText, Cloud } from 'lucide-react'
import type { Literature, Category, Tag } from '@/utils/db'
import { useTranslation } from '@/i18n/LanguageContext'
import HighlightText from '@/components/HighlightText'

// ============================================================
// Props
// ============================================================

interface LiteratureCardProps {
  literature: Literature
  category?: Category
  /** All tags available in the system, used to resolve tagIds to tag names. */
  tags?: Tag[]
  /** Zero-based index used to compute stagger animation delay. */
  index?: number
}

// ============================================================
// Component
// ============================================================

/**
 * LiteratureCard renders a single literature entry as a styled card.
 * Displays title, authors, date, abstract, keywords, and optional DOI.
 * Left-side color strip reflects the assigned category.
 * Search query matches are highlighted in the text.
 */
export default function LiteratureCard({
  literature,
  category,
  tags = [],
  index = 0,
}: LiteratureCardProps) {
  const { t } = useTranslation()
  // Category color strip: use category color if available, else gold-500
  const stripColor = category?.color ?? '#c9a84c'

  // Format publishDate for display (assume ISO or yyyy-mm-dd)
  const displayDate = literature.publishDate
    ? new Date(literature.publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  // Truncate authors to a readable single line
  const authorsText = literature.authors.length
    ? literature.authors.join(', ')
    : 'Unknown Author'

  // Stagger delay based on index (capped at 0.3s / 6 items)
  const staggerDelay = Math.min(index * 0.05, 0.3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: staggerDelay, ease: 'easeOut' }}
      className="group relative flex border theme-bg-card theme-border-primary rounded-xl overflow-hidden hover:shadow-lg hover:shadow-navy-950/50 hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Left colored strip */}
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: stripColor }}
        aria-hidden="true"
      />

      {/* Card body */}
      <div className="flex-1 p-4 min-w-0">
        {/* Title */}
        <Link
          to={`/literature/${literature.id}`}
          className="block font-display text-lg text-navy-50 hover:text-gold-500 transition-colors leading-snug"
        >
          <BookOpen className="inline-block w-4 h-4 mr-1.5 opacity-50 align-text-bottom" />
          <HighlightText text={literature.title} />
        </Link>

        {/* Authors */}
        <p className="mt-1 theme-text-secondary text-sm truncate" title={authorsText}>
          <User className="inline-block w-3.5 h-3.5 mr-1 opacity-60 align-text-bottom" />
          <HighlightText text={authorsText} />
        </p>

        {/* Date */}
        {displayDate && (
          <p className="mt-1 theme-text-muted text-xs">
            <Calendar className="inline-block w-3 h-3 mr-1 opacity-60 align-text-bottom" />
            {displayDate}
          </p>
        )}

        {/* Abstract */}
        {literature.abstract && (
          <p className="mt-2 theme-text-secondary text-sm line-clamp-3 leading-relaxed">
            <HighlightText text={literature.abstract} />
          </p>
        )}

        {/* Keywords */}
        {literature.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {literature.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full theme-bg-tertiary theme-text-secondary px-2 py-0.5 text-xs"
              >
                <HighlightText text={kw} />
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {literature.tagIds.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Hash className="w-3 h-3 text-gold-400/60 shrink-0" />
            {tags
              .filter((tag) => literature.tagIds.includes(tag.id))
              .map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 text-xs"
                >
                  {tag.name}
                </span>
              ))}
          </div>
        )}

        {/* DOI badge */}
        {literature.doi && (
          <a
            href={`https://doi.org/${literature.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-gold-500/80 hover:text-gold-500 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            DOI: {literature.doi}
          </a>
        )}

        {/* PDF / Cloud Link quick access */}
        {(literature.pdfPath || literature.cloudLink) && (
          <div className="mt-2">
            {literature.pdfPath ? (
              <a
                href={`/${literature.pdfPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-gold-500/10 border border-gold-500/20 px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/20 transition-colors"
              >
                <FileText className="w-3 h-3" />
                {t('card.openPdf')}
              </a>
            ) : literature.cloudLink ? (
              <a
                href={literature.cloudLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-gold-500/10 border border-gold-500/20 px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/20 transition-colors"
              >
                <Cloud className="w-3 h-3" />
                {t('card.openCloudLink')}
              </a>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  )
}

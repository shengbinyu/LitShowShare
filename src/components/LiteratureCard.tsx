import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Calendar, User, ExternalLink, BookOpen, Hash, FileText, Cloud, Lock } from 'lucide-react'
import type { Literature, Category, Tag } from '@/utils/db'
import { useTranslation } from '@/i18n/LanguageContext'
import { getPdfUrl } from '@/hooks/useLiterature'
import { useAuthStore } from '@/store/authStore'
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
 *
 * Layout strategy for equal-height cards in a grid:
 *   - Card root: `h-full flex` (fills the grid track height).
 *   - Body: `flex flex-col` with three regions:
 *       Header (title + meta) — natural height
 *       Middle (abstract)     — `flex-1` to absorb remaining space
 *       Footer (chips + links) — `mt-auto`, pinned to the bottom
 *   - Text overflow is clamped (title=2 lines, abstract=3 lines, chips=1 row)
 *     so visual density stays consistent across cards.
 */
export default function LiteratureCard({
  literature,
  category,
  tags = [],
  index = 0,
}: LiteratureCardProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
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

  // Resolve tagIds to Tag objects once
  const literatureTags = tags.filter((tag) => literature.tagIds.includes(tag.id))

  const hasFooter =
    literature.keywords.length > 0 ||
    literatureTags.length > 0 ||
    Boolean(literature.doi) ||
    Boolean(literature.pdfPath) ||
    Boolean(literature.cloudLink)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: staggerDelay, ease: 'easeOut' }}
      className="group relative flex h-full border theme-bg-card theme-border-primary
                 rounded-xl overflow-hidden theme-shadow-card
                 hover:-translate-y-0.5 hover:theme-border-focus
                 transition-all duration-300
                 dark:hover:shadow-lg dark:hover:shadow-navy-950/50 theme-shadow-card-hover"
    >
      {/* Left colored strip — full height, slightly wider on hover for tactile feedback */}
      <div
        className="w-1 shrink-0 transition-[width] duration-300 group-hover:w-1.5"
        style={{ backgroundColor: stripColor }}
        aria-hidden="true"
      />

      {/* Card body — three-section vertical flex to enforce equal heights */}
      <div className="flex-1 min-w-0 p-4 flex flex-col">
        {/* ===== Header: title + authors + date ===== */}
        <div className="space-y-1">
          {/* Title — clamp to 2 lines so each card header has a consistent height */}
          <Link
            to={`/literature/${literature.id}`}
            className="block font-display text-lg font-semibold leading-snug
                       theme-text-heading hover:text-gold-500 transition-colors
                       line-clamp-2"
            title={literature.title}
          >
            <BookOpen className="inline-block w-4 h-4 mr-1.5 opacity-50 align-text-bottom" />
            <HighlightText text={literature.title} />
          </Link>

          {/* Authors — single-line truncate */}
          <p
            className="theme-text-secondary text-sm truncate flex items-center gap-1.5"
            title={authorsText}
          >
            <User className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span className="truncate">
              <HighlightText text={authorsText} />
            </span>
          </p>

          {/* Date — reserve the row even when empty to keep header height stable */}
          <p className="theme-text-muted text-xs flex items-center gap-1 min-h-[1rem]">
            {displayDate && (
              <>
                <Calendar className="w-3 h-3 opacity-60 shrink-0" />
                <span>{displayDate}</span>
              </>
            )}
          </p>
        </div>

        {/* ===== Middle: abstract — flex-1 absorbs spare vertical space ===== */}
        <div className="flex-1 mt-3 min-h-0">
          {literature.abstract ? (
            <p className="theme-text-secondary text-sm leading-relaxed line-clamp-3">
              <HighlightText text={literature.abstract} />
            </p>
          ) : (
            // Placeholder keeps the abstract region's visual weight consistent
            <p className="theme-text-muted text-sm italic opacity-60">—</p>
          )}
        </div>

        {/* ===== Footer: chips + resource buttons — pinned to bottom via mt-auto ===== */}
        {hasFooter && (
          <div className="mt-4 pt-3 border-t theme-border-primary space-y-2">
            {/* Keywords — single row, overflow clipped */}
            {literature.keywords.length > 0 && (
              <div className="flex flex-nowrap gap-1.5 overflow-hidden max-h-6">
                {literature.keywords.slice(0, 4).map((kw) => (
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

            {/* Tags — single row, overflow clipped */}
            {literatureTags.length > 0 && (
              <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden max-h-6">
                <Hash className="w-3 h-3 theme-accent-subtle-text opacity-60 shrink-0" />
                {literatureTags.slice(0, 4).map((tag) => (
                  <span
                    key={tag.id}
                    className="shrink-0 rounded-full theme-accent-subtle-bg theme-accent-subtle-text
                               border theme-accent-subtle-border px-2 py-0.5 text-xs truncate max-w-[8rem]"
                    title={tag.name}
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
                className="inline-flex items-center gap-1 max-w-full text-xs
                           theme-text-link hover:text-gold-500 transition-colors"
                title={literature.doi}
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">DOI: {literature.doi}</span>
              </a>
            )}

            {/* PDF / Full-text Link quick access */}
            {(literature.pdfPath || literature.cloudLink) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {literature.pdfPath && (
                  isAuthenticated ? (
                    <a
                      href={getPdfUrl(literature.pdfPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md theme-accent-subtle-bg
                                 border theme-accent-subtle-border px-2.5 py-1 text-xs
                                 theme-accent-subtle-text hover:brightness-110 transition-all"
                    >
                      <FileText className="w-3 h-3" />
                      {t('card.openPdf')}
                    </a>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 rounded-md theme-accent-subtle-bg
                                 border theme-accent-subtle-border px-2.5 py-1 text-xs
                                 theme-accent-subtle-text hover:brightness-110 transition-all"
                      title={t('detail.loginToViewPdf')}
                    >
                      <Lock className="w-3 h-3" />
                      {t('card.openPdf')}
                    </Link>
                  )
                )}
                {literature.cloudLink && (
                  isAuthenticated ? (
                    <a
                      href={literature.cloudLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md theme-accent-subtle-bg
                                 border theme-accent-subtle-border px-2.5 py-1 text-xs
                                 theme-accent-subtle-text hover:brightness-110 transition-all"
                    >
                      <Cloud className="w-3 h-3" />
                      {t('card.openCloudLink')}
                    </a>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 rounded-md theme-accent-subtle-bg
                                 border theme-accent-subtle-border px-2.5 py-1 text-xs
                                 theme-accent-subtle-text hover:brightness-110 transition-all"
                      title={t('detail.loginToViewCloudLink')}
                    >
                      <Lock className="w-3 h-3" />
                      {t('card.openCloudLink')}
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

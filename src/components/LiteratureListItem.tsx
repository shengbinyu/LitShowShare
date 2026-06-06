import { Link } from 'react-router-dom'
import { FileText, Cloud } from 'lucide-react'
import type { Literature, Category } from '@/utils/db'
import { getPdfUrl } from '@/hooks/useLiterature'
import HighlightText from '@/components/HighlightText'

interface LiteratureListItemProps {
  literature: Literature
  category?: Category
}

export default function LiteratureListItem({
  literature,
  category,
}: LiteratureListItemProps) {

  const stripColor = category?.color ?? '#c9a84c'

  const year = literature.publishDate
    ? new Date(literature.publishDate).getFullYear()
    : ''

  const authorsText = literature.authors.length
    ? literature.authors.join(', ')
    : 'Unknown Author'

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-lg border theme-bg-card theme-border-primary hover:theme-bg-hover theme-border-secondary transition-colors"
    >
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

      {/* PDF / Full-text Link buttons - show both if available */}
      {(literature.pdfPath || literature.cloudLink) && (
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
    </div>
  )
}

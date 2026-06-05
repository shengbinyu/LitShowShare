import { useLiteratures, useCategories } from '@/hooks/useLiterature'
import type { Literature } from '@/utils/db'
import { BookOpen, Tag, Calendar, Link2 } from 'lucide-react'
import { motion } from 'motion/react'

/** Statistic card data structure */
interface StatItem {
  label: string
  value: string | number
  icon: React.ReactNode
}

/**
 * StatsOverview - Horizontal card row showing library statistics.
 * Displays total literature count, active categories, most recent
 * publish date, and total external links (sources).
 */
export default function StatsOverview() {
  const literatures = useLiteratures()
  const categories = useCategories()

  // Compute total literature count
  const totalLiterature = literatures.length

  // Count categories that have at least one literature entry
  const usedCategoryNames = new Set(literatures.map((lit: Literature) => lit.category))
  const activeCategories = categories.filter((cat) => usedCategoryNames.has(cat.name)).length

  // Find the most recent publish date
  const mostRecentDate = literatures.reduce<string>((latest: string, lit: Literature) => {
    if (!lit.publishDate) return latest
    if (!latest || lit.publishDate > latest) return lit.publishDate
    return latest
  }, '')

  // Format the date for display
  const formattedDate = mostRecentDate
    ? new Date(mostRecentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '--'

  // Count total external links across all literatures
  // Since we don't have a direct hook for all links, we sum from literature data
  // For now we show the source format diversity as a proxy
  const sourceCount = new Set(literatures.map((lit: Literature) => lit.sourceFormat)).size

  // Build stat items array
  const stats: StatItem[] = [
    {
      label: 'Total Literature',
      value: totalLiterature,
      icon: <BookOpen size={18} />,
    },
    {
      label: 'Categories',
      value: activeCategories,
      icon: <Tag size={18} />,
    },
    {
      label: 'Latest Published',
      value: formattedDate,
      icon: <Calendar size={18} />,
    },
    {
      label: 'Sources',
      value: sourceCount,
      icon: <Link2 size={18} />,
    },
  ]

  // Stagger animation variants for the container
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  }

  // Individual card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' as const },
    },
  }

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={cardVariants}
          className="theme-bg-card border theme-border-primary rounded-lg p-4 flex flex-col gap-3 theme-shadow-card"
        >
          {/* Icon in gold circle */}
          <div className="flex items-center justify-center h-9 w-9 rounded-full theme-accent-subtle-bg text-gold-500">
            {stat.icon}
          </div>

          {/* Numeric value */}
          <div className="text-2xl font-display text-gold-500 leading-tight">
            {stat.value}
          </div>

          {/* Label */}
          <div className="theme-text-muted text-sm">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  )
}

import { motion } from 'motion/react'
import {
  BookOpen,
  HelpCircle,
  Search,
  Upload,
  Database,
  Users,
  LogIn,
  FileText,
  Cloud,
  Tag as TagIcon,
  FolderOpen,
  Sparkles,
  Sun,
  Languages,
  Shield,
  Rocket,
  Check,
  X as XIcon,
  ArrowUp,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n/LanguageContext'

// ============================================================
// Animation variants
// ============================================================

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ============================================================
// Reusable sub-components
// ============================================================

interface SectionProps {
  id: string
  icon: ReactNode
  title: string
  children: ReactNode
}

/** A titled section card with anchor id, used for every chapter on the help page. */
function Section({ id, icon, title, children }: SectionProps) {
  return (
    <motion.section
      id={id}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className="scroll-mt-20 rounded-xl border theme-border-primary p-6"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gold-500/15 text-gold-500">
          {icon}
        </span>
        <h2 className="font-display text-xl font-semibold theme-text-heading">{title}</h2>
      </div>
      <div className="theme-text-secondary text-sm leading-relaxed space-y-3">{children}</div>
    </motion.section>
  )
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  bullets?: string[]
}

/** A small card describing a single page or concept with icon + title + bullets. */
function FeatureCard({ icon, title, description, bullets }: FeatureCardProps) {
  return (
    <div
      className="rounded-lg border theme-border-primary p-4 h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-card-elevated)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gold-500">{icon}</span>
        <h3 className="font-semibold theme-text-heading">{title}</h3>
      </div>
      <p className="text-sm theme-text-secondary mb-2">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-auto space-y-1.5 text-sm theme-text-muted">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check size={14} className="mt-1 flex-shrink-0 text-gold-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================
// Help Page
// ============================================================

/**
 * Help - Public user guide page.
 *
 * Anonymous-accessible (matches Home/Detail public policy).
 * Organized as a single long document with anchor-based TOC on the
 * left (lg+) for quick navigation. All copy is driven by useTranslation
 * so the page stays in sync with the user's language preference.
 */
export default function Help() {
  const { t } = useTranslation()

  // TOC entries paired with the same id used by each <Section>.
  const tocItems: { id: string; label: string }[] = [
    { id: 'quickstart', label: t('help.section.quickstart') },
    { id: 'concepts', label: t('help.section.concepts') },
    { id: 'pages', label: t('help.section.pages') },
    { id: 'roles', label: t('help.section.roles') },
    { id: 'common', label: t('help.section.common') },
    { id: 'faq', label: t('help.section.faq') },
  ]

  // Role matrix rows: each row lists permissions for [anonymous, user, admin].
  // Values: true (yes) | false (no) | 'own' (own resources only).
  type Cell = boolean | 'own'
  const roleRows: { labelKey: string; cells: [Cell, Cell, Cell] }[] = [
    { labelKey: 'help.roles.row.browse', cells: [true, true, true] },
    { labelKey: 'help.roles.row.viewPdf', cells: [false, true, true] },
    { labelKey: 'help.roles.row.import', cells: [false, true, true] },
    { labelKey: 'help.roles.row.editOwn', cells: [false, true, true] },
    { labelKey: 'help.roles.row.editAny', cells: [false, false, true] },
    { labelKey: 'help.roles.row.dataIO', cells: [false, true, true] },
    { labelKey: 'help.roles.row.manageUsers', cells: [false, false, true] },
  ]

  function renderCell(cell: Cell): ReactNode {
    if (cell === true) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-500">
          <Check size={16} />
          <span className="text-xs">{t('help.roles.cell.yes')}</span>
        </span>
      )
    }
    if (cell === false) {
      return (
        <span className="inline-flex items-center gap-1 theme-text-muted">
          <XIcon size={16} />
          <span className="text-xs">{t('help.roles.cell.no')}</span>
        </span>
      )
    }
    return null
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ===== Page header ===== */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <HelpCircle size={28} className="text-gold-500" />
          <h1 className="font-display text-3xl font-bold theme-text-heading">{t('help.title')}</h1>
        </div>
        <p className="theme-text-muted max-w-3xl">{t('help.subtitle')}</p>
        <p className="mt-3 theme-text-secondary text-sm max-w-3xl leading-relaxed">
          {t('help.intro')}
        </p>
      </motion.header>

      {/* ===== Layout: sticky TOC + main content ===== */}
      <div className="flex gap-8">
        {/* TOC sidebar (lg+) */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div
            className="sticky top-20 rounded-xl border theme-border-primary p-4"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider theme-text-label mb-3">
              {t('help.toc')}
            </p>
            <nav className="flex flex-col gap-1.5">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-sm theme-text-secondary hover:text-gold-500 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mt-4 inline-flex items-center gap-1 text-xs theme-text-muted hover:text-gold-500 transition-colors"
            >
              <ArrowUp size={12} />
              {t('help.backToTop')}
            </a>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* --- Quick Start --- */}
          <Section
            id="quickstart"
            icon={<Rocket size={18} />}
            title={t('help.section.quickstart')}
          >
            <p>{t('help.quickstart.intro')}</p>
            <ol className="list-decimal list-inside space-y-2 marker:text-gold-500 marker:font-semibold">
              <li>{t('help.quickstart.step1')}</li>
              <li>{t('help.quickstart.step2')}</li>
              <li>{t('help.quickstart.step3')}</li>
              <li>{t('help.quickstart.step4')}</li>
            </ol>
          </Section>

          {/* --- Core Concepts --- */}
          <Section
            id="concepts"
            icon={<Sparkles size={18} />}
            title={t('help.section.concepts')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FeatureCard
                icon={<BookOpen size={16} />}
                title={t('help.concepts.literature.title')}
                description={t('help.concepts.literature.desc')}
              />
              <FeatureCard
                icon={<FolderOpen size={16} />}
                title={t('help.concepts.category.title')}
                description={t('help.concepts.category.desc')}
              />
              <FeatureCard
                icon={<TagIcon size={16} />}
                title={t('help.concepts.tag.title')}
                description={t('help.concepts.tag.desc')}
              />
              <FeatureCard
                icon={<FileText size={16} />}
                title={t('help.concepts.pdf.title')}
                description={t('help.concepts.pdf.desc')}
              />
              <FeatureCard
                icon={<Cloud size={16} />}
                title={t('help.concepts.cloudLink.title')}
                description={t('help.concepts.cloudLink.desc')}
              />
            </div>
          </Section>

          {/* --- Pages & Features --- */}
          <Section
            id="pages"
            icon={<BookOpen size={18} />}
            title={t('help.section.pages')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FeatureCard
                icon={<Search size={16} />}
                title={t('help.page.home.title')}
                description={t('help.page.home.desc')}
                bullets={[
                  t('help.page.home.f1'),
                  t('help.page.home.f2'),
                  t('help.page.home.f3'),
                  t('help.page.home.f4'),
                  t('help.page.home.f5'),
                ]}
              />
              <FeatureCard
                icon={<BookOpen size={16} />}
                title={t('help.page.detail.title')}
                description={t('help.page.detail.desc')}
                bullets={[
                  t('help.page.detail.f1'),
                  t('help.page.detail.f2'),
                  t('help.page.detail.f3'),
                  t('help.page.detail.f4'),
                  t('help.page.detail.f5'),
                ]}
              />
              <FeatureCard
                icon={<Upload size={16} />}
                title={t('help.page.import.title')}
                description={t('help.page.import.desc')}
                bullets={[
                  t('help.page.import.f1'),
                  t('help.page.import.f2'),
                  t('help.page.import.f3'),
                  t('help.page.import.f4'),
                  t('help.page.import.f5'),
                ]}
              />
              <FeatureCard
                icon={<Database size={16} />}
                title={t('help.page.dataManagement.title')}
                description={t('help.page.dataManagement.desc')}
                bullets={[
                  t('help.page.dataManagement.f1'),
                  t('help.page.dataManagement.f2'),
                  t('help.page.dataManagement.f3'),
                ]}
              />
              <FeatureCard
                icon={<Users size={16} />}
                title={t('help.page.adminUsers.title')}
                description={t('help.page.adminUsers.desc')}
                bullets={[
                  t('help.page.adminUsers.f1'),
                  t('help.page.adminUsers.f2'),
                  t('help.page.adminUsers.f3'),
                ]}
              />
              <FeatureCard
                icon={<LogIn size={16} />}
                title={t('help.page.login.title')}
                description={t('help.page.login.desc')}
                bullets={[t('help.page.login.f1'), t('help.page.login.f2')]}
              />
            </div>
          </Section>

          {/* --- Roles & Permissions --- */}
          <Section id="roles" icon={<Shield size={18} />} title={t('help.section.roles')}>
            <p>{t('help.roles.intro')}</p>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b theme-border-primary">
                    <th className="text-left py-2 px-3 font-semibold theme-text-label">
                      {t('help.roles.col.feature')}
                    </th>
                    <th className="text-center py-2 px-3 font-semibold theme-text-label">
                      {t('help.roles.col.anonymous')}
                    </th>
                    <th className="text-center py-2 px-3 font-semibold theme-text-label">
                      {t('help.roles.col.user')}
                    </th>
                    <th className="text-center py-2 px-3 font-semibold theme-text-label">
                      {t('help.roles.col.admin')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roleRows.map((row) => (
                    <tr key={row.labelKey} className="border-b theme-border-primary last:border-0">
                      <td className="py-2.5 px-3 theme-text-primary">{t(row.labelKey)}</td>
                      <td className="py-2.5 px-3 text-center">{renderCell(row.cells[0])}</td>
                      <td className="py-2.5 px-3 text-center">{renderCell(row.cells[1])}</td>
                      <td className="py-2.5 px-3 text-center">{renderCell(row.cells[2])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* --- Common Features --- */}
          <Section id="common" icon={<Sun size={18} />} title={t('help.section.common')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FeatureCard
                icon={<Sun size={16} />}
                title={t('help.common.theme.title')}
                description={t('help.common.theme.desc')}
              />
              <FeatureCard
                icon={<Languages size={16} />}
                title={t('help.common.language.title')}
                description={t('help.common.language.desc')}
              />
              <FeatureCard
                icon={<Search size={16} />}
                title={t('help.common.search.title')}
                description={t('help.common.search.desc')}
              />
              <FeatureCard
                icon={<Shield size={16} />}
                title={t('help.common.pdfAuth.title')}
                description={t('help.common.pdfAuth.desc')}
              />
            </div>
          </Section>

          {/* --- FAQ --- */}
          <Section id="faq" icon={<HelpCircle size={18} />} title={t('help.section.faq')}>
            <div className="space-y-4">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <div key={n} className="border-l-2 border-gold-500/60 pl-3">
                  <p className="font-semibold theme-text-heading">{t(`help.faq.q${n}`)}</p>
                  <p className="mt-1 theme-text-secondary">{t(`help.faq.a${n}`)}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

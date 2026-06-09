import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Download, Upload, FileArchive, ChevronDown, ChevronRight,
  Check, SkipForward, RefreshCw, AlertTriangle, FileText, Link as LinkIcon,
} from 'lucide-react'
import { useCategories, useLiteratures } from '@/hooks/useLiterature'
import { useTranslation } from '@/i18n/LanguageContext'
import { dataApi, type ImportPreviewResult } from '@/utils/api'

// ============================================================
// Types
// ============================================================

type ImportStep = 'idle' | 'preview' | 'confirming' | 'done'

interface DuplicateAction {
  imported: Record<string, unknown>
  existingId: string
  action: 'skip' | 'overwrite'
}

// ============================================================
// Diff comparison component
// ============================================================

function DiffField({ label, existing, incoming }: { label: string; existing: unknown; incoming: unknown }) {
  const isDifferent = JSON.stringify(existing) !== JSON.stringify(incoming)
  return (
    <div className={`rounded-lg border p-3 ${isDifferent ? 'border-amber-500/40 bg-amber-500/5' : 'theme-border-secondary'}`}>
      <p className="text-xs font-medium theme-text-muted mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs theme-text-muted mb-0.5">{/* existing label */}</p>
          <p className={`theme-text-primary break-words ${isDifferent ? 'line-through opacity-60' : ''}`}>
            {formatValue(existing)}
          </p>
        </div>
        <div>
          <p className="text-xs theme-text-muted mb-0.5">{/* incoming label */}</p>
          <p className={`break-words ${isDifferent ? 'text-amber-500 font-medium' : 'theme-text-primary'}`}>
            {formatValue(incoming)}
          </p>
        </div>
      </div>
    </div>
  )
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return '—'
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

function DiffPanel({ imported, existing }: { imported: Record<string, unknown>; existing: Record<string, unknown> }) {
  const { t } = useTranslation()
  const impPdf = !!(imported.hasPdf || imported.pdfPath)
  const extPdf = !!(existing.hasPdf || existing.pdfPath)
  const impLink = !!(imported.cloudLink)
  const extLink = !!(existing.cloudLink)

  return (
    <div className="space-y-2 mt-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold theme-text-muted mb-1">
        <span>{t('data.diff.existing')}</span>
        <span>{t('data.diff.incoming')}</span>
      </div>
      <DiffField label={t('data.diff.title')} existing={existing.title} incoming={imported.title} />
      <DiffField label={t('data.diff.authors')} existing={existing.authors} incoming={imported.authors} />
      <DiffField label={t('data.diff.doi')} existing={existing.doi} incoming={imported.doi} />
      <DiffField label={t('data.diff.journal')} existing={existing.journal} incoming={imported.journal} />

      {/* PDF status - highlighted */}
      <div className={`rounded-lg border p-3 ${impPdf !== extPdf ? 'border-amber-500/40 bg-amber-500/5' : 'theme-border-secondary'}`}>
        <p className="text-xs font-medium theme-text-muted mb-1.5">{t('data.diff.pdf')}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className={extPdf ? 'text-green-500' : 'theme-text-muted'} />
            <span className={extPdf ? 'text-green-500' : 'theme-text-muted'}>
              {extPdf ? t('data.diff.hasPdf') : t('data.diff.noPdf')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText size={14} className={impPdf ? 'text-green-500' : 'theme-text-muted'} />
            <span className={impPdf ? 'text-green-500' : 'theme-text-muted'}>
              {impPdf ? t('data.diff.hasPdf') : t('data.diff.noPdf')}
            </span>
          </div>
        </div>
      </div>

      {/* Cloud link status - highlighted */}
      <div className={`rounded-lg border p-3 ${impLink !== extLink ? 'border-amber-500/40 bg-amber-500/5' : 'theme-border-secondary'}`}>
        <p className="text-xs font-medium theme-text-muted mb-1.5">{t('data.diff.cloudLink')}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <LinkIcon size={14} className={extLink ? 'text-green-500' : 'theme-text-muted'} />
            <span className={extLink ? 'text-green-500' : 'theme-text-muted'}>
              {extLink ? t('data.diff.hasCloudLink') : t('data.diff.noCloudLink')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LinkIcon size={14} className={impLink ? 'text-green-500' : 'theme-text-muted'} />
            <span className={impLink ? 'text-green-500' : 'theme-text-muted'}>
              {impLink ? t('data.diff.hasCloudLink') : t('data.diff.noCloudLink')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DataManagement page
// ============================================================

export default function DataManagement() {
  const categories = useCategories()
  const literatures = useLiteratures()
  const { t } = useTranslation()

  // Export state
  const [exportCategory, setExportCategory] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('idle')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null)
  const [duplicateActions, setDuplicateActions] = useState<Map<number, 'skip' | 'overwrite'>>(new Map())
  const [expandedDuplicates, setExpandedDuplicates] = useState<Set<number>>(new Set())
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Count literatures per category
  const countByCategory = literatures.reduce<Record<string, number>>((acc, lit) => {
    acc[lit.category || ''] = (acc[lit.category || ''] || 0) + 1
    return acc
  }, {})

  // ============================================================
  // Export
  // ============================================================

  async function handleExport() {
    setIsExporting(true)
    setError(null)
    try {
      const blob = await dataApi.exportData(exportCategory || undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.download = `litshowshare-export-${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed'
      if (message.includes('404')) {
        setError(t('data.exportEmpty'))
      } else {
        setError(message)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // ============================================================
  // Import
  // ============================================================

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError(t('data.invalidFile'))
      return
    }
    setImportFile(file)
    setError(null)
    setImportStep('preview')

    try {
      const result = await dataApi.importPreview(file)
      setPreviewData(result)
      // Initialize all duplicates as skip
      const actions = new Map<number, 'skip' | 'overwrite'>()
      result.duplicates.forEach((_, i) => actions.set(i, 'skip'))
      setDuplicateActions(actions)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import preview failed')
      setImportStep('idle')
    }
  }, [t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  function toggleDuplicateExpand(idx: number) {
    setExpandedDuplicates((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function setAllDuplicates(action: 'skip' | 'overwrite') {
    setDuplicateActions((prev) => {
      const next = new Map(prev)
      previewData?.duplicates.forEach((_, i) => next.set(i, action))
      return next
    })
  }

  async function handleConfirmImport() {
    if (!importFile || !previewData) return
    setImportStep('confirming')

    try {
      const duplicates: DuplicateAction[] = previewData.duplicates.map((dup, i) => ({
        imported: dup.imported,
        existingId: (dup.existing as { id?: string }).id ?? '',
        action: duplicateActions.get(i) || 'skip',
      }))

      const result = await dataApi.confirmImport(importFile, {
        newItems: previewData.newItems,
        duplicates,
      })

      setImportResult(result)
      setImportStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setImportStep('preview')
    }
  }

  function resetImport() {
    setImportFile(null)
    setPreviewData(null)
    setDuplicateActions(new Map())
    setExpandedDuplicates(new Set())
    setImportResult(null)
    setImportStep('idle')
    setError(null)
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display font-bold theme-text-heading">{t('data.title')}</h1>
        <p className="mt-2 theme-text-muted">{t('data.description')}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ===== Export Section ===== */}
      <section className="rounded-xl border theme-border-primary p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Download className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold theme-text-heading">{t('data.export')}</h2>
            <p className="text-sm theme-text-muted">{t('data.exportDesc')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-1.5">
              {t('data.exportCategory')}
            </label>
            <select
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value)}
              className="w-full max-w-xs theme-bg-input border theme-border-primary rounded-lg px-3 py-2 text-sm theme-text-primary focus:outline-none theme-ring-focus theme-border-focus"
            >
              <option value="">{t('data.allCategories')} ({literatures.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name} ({countByCategory[cat.name] || 0})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            {isExporting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <FileArchive size={16} />
            )}
            {isExporting ? t('data.exporting') : t('data.exportAll')}
          </button>
        </div>
      </section>

      {/* ===== Import Section ===== */}
      <section className="rounded-xl border theme-border-primary p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
            <Upload className="text-green-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold theme-text-heading">{t('data.import')}</h2>
            <p className="text-sm theme-text-muted">{t('data.importDesc')}</p>
          </div>
        </div>

        {/* Dropzone */}
        {importStep === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              isDragging
                ? 'border-gold-500 bg-gold-500/5'
                : 'theme-border-secondary hover:theme-border-focus'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
            <FileArchive className={`mx-auto mb-3 ${isDragging ? 'text-gold-500' : 'theme-text-muted'}`} size={40} />
            <p className="text-sm theme-text-secondary">{t('data.importDropzone')}</p>
          </div>
        )}

        {/* Preview */}
        {importStep === 'preview' && previewData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium theme-text-heading">
              <h3>{t('data.importPreview')}</h3>
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">
                {t('data.importSummary', { new: previewData.newCount, dup: previewData.duplicateCount })}
              </span>
            </div>

            {/* New items summary */}
            {previewData.newItems.length > 0 && (
              <div className="rounded-lg border theme-border-secondary p-4">
                <h4 className="text-sm font-medium theme-text-heading mb-2">
                  {t('data.newItems')} ({previewData.newItems.length})
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {previewData.newItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm theme-text-secondary">
                      <FileText size={14} className="shrink-0 theme-text-muted" />
                      <span className="truncate">{String(item.title || 'Untitled')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate items */}
            {previewData.duplicates.length > 0 && (
              <div className="rounded-lg border theme-border-secondary p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium theme-text-heading">
                    {t('data.duplicateItems')} ({previewData.duplicates.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAllDuplicates('skip')}
                      className="text-xs px-2.5 py-1 rounded-md border theme-border-secondary theme-text-secondary hover:theme-bg-hover transition-colors"
                    >
                      {t('data.skipAll')}
                    </button>
                    <button
                      onClick={() => setAllDuplicates('overwrite')}
                      className="text-xs px-2.5 py-1 rounded-md border theme-border-secondary theme-text-secondary hover:theme-bg-hover transition-colors"
                    >
                      {t('data.overwriteAll')}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {previewData.duplicates.map((dup, i) => {
                    const isExpanded = expandedDuplicates.has(i)
                    const action = duplicateActions.get(i) || 'skip'
                    const impPdf = !!(dup.imported.hasPdf || dup.imported.pdfPath)
                    const extPdf = !!(dup.existing.hasPdf || (dup.existing as { pdfPath?: string }).pdfPath)
                    const impLink = !!(dup.imported.cloudLink)
                    const extLink = !!(dup.existing.cloudLink)
                    const hasDiff = impPdf !== extPdf || impLink !== extLink

                    return (
                      <div key={i} className="rounded-lg border theme-border-secondary">
                        {/* Duplicate header */}
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <button
                            onClick={() => toggleDuplicateExpand(i)}
                            className="shrink-0 theme-text-muted hover:theme-text-primary transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <span className="flex-1 text-sm theme-text-primary truncate">
                            {String(dup.imported.title || 'Untitled')}
                          </span>
                          {hasDiff && (
                            <span className="shrink-0 px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-500 font-medium">
                              {t('data.diff.clickToCompare')}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setDuplicateActions((prev) => {
                                  const next = new Map(prev)
                                  next.set(i, 'skip')
                                  return next
                                })
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                action === 'skip'
                                  ? 'bg-gray-500/10 theme-text-primary ring-1 ring-gray-500/30'
                                  : 'theme-text-muted hover:theme-bg-hover'
                              }`}
                            >
                              <SkipForward size={12} />
                              {t('data.skip')}
                            </button>
                            <button
                              onClick={() => {
                                setDuplicateActions((prev) => {
                                  const next = new Map(prev)
                                  next.set(i, 'overwrite')
                                  return next
                                })
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                action === 'overwrite'
                                  ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                                  : 'theme-text-muted hover:theme-bg-hover'
                              }`}
                            >
                              <RefreshCw size={12} />
                              {t('data.overwrite')}
                            </button>
                          </div>
                        </div>

                        {/* Expanded diff view */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 border-t theme-border-primary">
                                <DiffPanel imported={dup.imported} existing={dup.existing} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Confirm button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmImport}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                <Check size={16} />
                {t('data.confirmImport')}
              </button>
              <button
                onClick={resetImport}
                className="text-sm theme-text-muted hover:theme-text-primary transition-colors"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Importing */}
        {importStep === 'confirming' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw size={32} className="animate-spin text-gold-500 mb-4" />
            <p className="text-lg font-medium theme-text-heading">{t('data.importing')}</p>
          </div>
        )}

        {/* Import done */}
        {importStep === 'done' && importResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center space-y-4"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <Check className="text-green-500" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold theme-text-heading">{t('data.importSuccess')}</h3>
              <p className="mt-1 text-sm theme-text-muted">
                {t('data.importResult', {
                  created: importResult.created,
                  updated: importResult.updated,
                  skipped: importResult.skipped,
                })}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/"
                className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                {t('data.viewLibrary')}
              </Link>
              <button
                onClick={resetImport}
                className="text-sm theme-text-secondary hover:theme-text-primary transition-colors"
              >
                {t('import.importMore')}
              </button>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  )
}

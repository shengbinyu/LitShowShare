import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  FileDown,
  BookOpen,
  Paperclip,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  ClipboardPaste,
  FileText,
  Cloud,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import FileUploader from '@/components/FileUploader'
import { parseRis } from '@/utils/risParser'
import { parseBibtex } from '@/utils/bibtexParser'
import { importLiteratures, uploadPdf, addLiterature, useCategories } from '@/hooks/useLiterature'
import { useTranslation } from '@/i18n/LanguageContext'
import type { Literature } from '@/utils/db'

// ============================================================
// Types
// ============================================================

type TabKey = 'ris' | 'bibtex' | 'pdf'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ReactNode
}

type ImportPhase = 'upload' | 'preview' | 'success'

interface ParsedData {
  items: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[]
  errors: string[]
}

// ============================================================
// Constants
// ============================================================

const TABS: TabDef[] = [
  { key: 'ris', label: 'RIS', icon: <FileDown className="h-4 w-4" /> },
  { key: 'bibtex', label: 'BibTeX', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'pdf', label: 'PDF', icon: <FileText className="h-4 w-4" /> },
]

// ============================================================
// Component
// ============================================================

export default function Import() {
  const [activeTab, setActiveTab] = useState<TabKey>('ris')
  const [phase, setPhase] = useState<ImportPhase>('upload')
  const [parsed, setParsed] = useState<ParsedData>({ items: [], errors: [] })
  const [, setImportedCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const { t } = useTranslation()

  // PDF-specific state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfAuthors, setPdfAuthors] = useState('')
  const [pdfAbstract, setPdfAbstract] = useState('')
  const [pdfKeywords, setPdfKeywords] = useState('')
  const [pdfCategory, setPdfCategory] = useState('')
  const [pdfCloudLink, setPdfCloudLink] = useState('')
  const categories = useCategories()

  // Import options state
  const [importPdfEnabled, setImportPdfEnabled] = useState(false)
  const [importPdfFile, setImportPdfFile] = useState<File | null>(null)
  const [importCloudLinkEnabled, setImportCloudLinkEnabled] = useState(false)
  const [importCloudLinkValue, setImportCloudLinkValue] = useState('')

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const parseContent = useCallback(
    (content: string) => {
      const result =
        activeTab === 'ris' ? parseRis(content) : parseBibtex(content)
      setParsed({ items: result.results, errors: result.errors })
      setPhase('preview')
    },
    [activeTab],
  )

  const handleFileContent = useCallback(
    (content: string, _filename: string) => parseContent(content),
    [parseContent],
  )

  const handlePasteParse = useCallback(() => {
    if (!pasteText.trim()) return
    parseContent(pasteText)
  }, [pasteText, parseContent])

  const handleImportAll = useCallback(async () => {
    if (parsed.items.length === 0) return
    setIsProcessing(true)
    try {
      // Upload PDF if attachment is enabled
      let pdfPath = ''
      let pdfFileName = ''
      if (importPdfEnabled && importPdfFile) {
        const uploadResult = await uploadPdf(importPdfFile)
        pdfPath = uploadResult.path
        pdfFileName = uploadResult.fileName
      }

      // Attach PDF and cloud link to all imported items if enabled
      const itemsToImport = parsed.items.map((item) => ({
        ...item,
        ...(importPdfEnabled && importPdfFile ? { pdfPath, pdfFileName } : {}),
        ...(importCloudLinkEnabled && importCloudLinkValue.trim()
          ? { cloudLink: importCloudLinkValue.trim() }
          : {}),
      }))

      await importLiteratures(itemsToImport)
      setImportedCount(parsed.items.length)
      setPhase('success')
    } catch {
      // Keep preview state so user can retry
    } finally {
      setIsProcessing(false)
    }
  }, [parsed.items, importPdfEnabled, importPdfFile, importCloudLinkEnabled, importCloudLinkValue])

  // ----------------------------------------------------------
  // PDF Handlers
  // ----------------------------------------------------------

  /** Handle PDF file selection from the custom input, storing the File reference. */
  const handlePdfInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setPdfFile(file)
      }
    },
    [],
  )

  /** Upload PDF to server and save literature metadata. */
  const handleSavePdf = useCallback(async () => {
    if (!pdfFile || !pdfTitle.trim()) return
    setIsProcessing(true)
    try {
      // Step 1: Upload the PDF file to the server
      const { path: pdfPath, fileName: pdfFileName } = await uploadPdf(pdfFile)

      // Step 2: Save the literature record with metadata
      await addLiterature({
        title: pdfTitle.trim(),
        authors: pdfAuthors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        abstract: pdfAbstract.trim(),
        keywords: pdfKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        publishDate: '',
        category: pdfCategory || null,
        doi: '',
        journal: '',
        volume: '',
        number: '',
        pages: '',
        publisher: '',
        sourceFormat: 'manual',
        pdfPath,
        pdfFileName,
        cloudLink: pdfCloudLink.trim(),
        tagIds: [],
      })

      // Step 3: Transition to success phase
      setImportedCount(1)
      setPhase('success')
    } catch {
      // Keep current state so user can retry
    } finally {
      setIsProcessing(false)
    }
  }, [pdfFile, pdfTitle, pdfAuthors, pdfAbstract, pdfKeywords, pdfCategory, pdfCloudLink])

  const handleReset = useCallback(() => {
    setParsed({ items: [], errors: [] })
    setPhase('upload')
    setImportedCount(0)
    setPasteText('')
    // Reset PDF-specific state
    setPdfFile(null)
    setPdfTitle('')
    setPdfAuthors('')
    setPdfAbstract('')
    setPdfKeywords('')
    setPdfCategory('')
    setPdfCloudLink('')
    // Reset import options state
    setImportPdfEnabled(false)
    setImportPdfFile(null)
    setImportCloudLinkEnabled(false)
    setImportCloudLinkValue('')
  }, [])

  // ----------------------------------------------------------
  // Render: Success state
  // ----------------------------------------------------------

  if (phase === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4"
      >
        <CheckCircle2 className="h-14 w-14 text-green-400" />
        {activeTab === 'pdf' ? (
          <h2 className="font-display text-2xl theme-text-primary">
            {t('import.pdfSuccess')}
          </h2>
        ) : (
          <h2 className="font-display text-2xl theme-text-primary">
            {t('import.success')}
          </h2>
        )}
        <p className="font-body theme-text-muted max-w-md">
          {activeTab === 'pdf'
            ? t('import.pdfSuccessDesc')
            : t('import.successDesc')}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5
                       font-body text-sm font-semibold text-navy-950
                       hover:bg-gold-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('import.viewLibrary')}
          </Link>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border theme-border-secondary
                       px-5 py-2.5 font-body text-sm theme-text-secondary
                       hover:theme-border-focus hover:theme-text-primary transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            {t('import.importMore')}
          </button>
        </div>
      </motion.div>
    )
  }

  // ----------------------------------------------------------
  // Render: Main layout
  // ----------------------------------------------------------

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl theme-text-primary tracking-tight">
          {t('import.title')}
        </h1>
        <p className="mt-2 font-body theme-text-muted">
          {t('import.description')}
        </p>
      </div>

      {/* Tab switcher */}
      <nav className="flex gap-6 border-b theme-border-primary" aria-label="Import tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); handleReset() }}
            className={`
              flex items-center gap-2 pb-3 text-sm font-body font-medium transition-colors border-b-2 -mb-px
              ${activeTab === tab.key
                ? 'text-gold-500 border-gold-500'
                : 'theme-text-muted border-transparent hover:theme-text-primary hover:theme-border-focus'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {(activeTab === 'ris' || activeTab === 'bibtex') && (
            <div className="space-y-6">
              <FileUploader
                accept={activeTab === 'ris' ? '.ris,.txt' : '.bib,.txt'}
                label={activeTab === 'ris' ? t('import.uploadRis') : t('import.uploadBibtex')}
                description={activeTab === 'ris' ? t('import.dragRis') : t('import.dragBibtex')}
                onFileContent={handleFileContent}
                isProcessing={isProcessing}
              />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px theme-border-primary" />
                <span className="font-body text-xs theme-text-muted uppercase tracking-wider">
                  {t('import.orPaste')}
                </span>
                <div className="flex-1 h-px theme-border-primary" />
              </div>

              {/* Paste text area */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4 theme-text-muted" />
                  <span className="font-body text-sm theme-text-secondary">
                    {activeTab === 'ris' ? t('import.pasteRis') : t('import.pasteBibtex')}
                  </span>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={activeTab === 'ris'
                    ? 'TY  - JOUR\nAU  - Smith, John\nTI  - Title of the paper\nER  -'
                    : '@article{key,\n  author = {Smith, John},\n  title = {Title},\n  year = {2024}\n}'}
                  rows={6}
                  className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-3
                             font-mono text-sm theme-text-primary theme-placeholder
                             theme-border-focus theme-ring-focus
                             resize-y transition-colors"
                />
                <button
                  onClick={handlePasteParse}
                  disabled={!pasteText.trim()}
                  className="flex items-center gap-2 rounded-lg theme-bg-tertiary
                             px-4 py-2 font-body text-sm font-medium theme-text-secondary
                             hover:theme-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  {t('import.parse')}
                </button>
              </div>

              {/* Preview */}
              {phase === 'preview' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4 font-body text-sm">
                    <span className="theme-text-secondary">
                      {t('import.recordsParsed', { count: parsed.items.length })}
                    </span>
                    {parsed.errors.length > 0 && (
                      <span className="text-red-400">
                        {t('import.errors', { count: parsed.errors.length })}
                      </span>
                    )}
                  </div>

                  {parsed.errors.length > 0 && (
                    <div className="space-y-2">
                      {parsed.errors.map((err, i) => (
                        <div key={i}
                          className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                          <p className="font-body text-sm text-red-300">{err}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {parsed.items.length > 0 && (
                    <div className="divide-y theme-border-primary rounded-lg border theme-border-secondary theme-bg-card">
                      {parsed.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-body text-sm font-medium theme-text-primary">
                              {item.title}
                            </p>
                            <p className="truncate text-xs theme-text-muted">
                              {item.authors.length > 0
                                ? item.authors.slice(0, 3).join(', ') + (item.authors.length > 3 ? ' et al.' : '')
                                : 'Unknown author'}
                            </p>
                          </div>
                          {item.category && (
                            <span className="shrink-0 rounded-full theme-bg-tertiary px-2.5 py-0.5 font-body text-xs theme-text-secondary">
                              {item.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Import Options */}
                  {parsed.items.length > 0 && (
                    <div className="space-y-4 rounded-xl border theme-border-secondary theme-bg-card p-4">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gold-400" />
                        <h3 className="font-body text-sm font-medium theme-text-secondary">
                          {t('import.importOptions')}
                        </h3>
                      </div>

                      {/* PDF attachment option */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={importPdfEnabled}
                            onChange={(e) => setImportPdfEnabled(e.target.checked)}
                            className="rounded theme-border-secondary theme-bg-input text-gold-500 focus:ring-gold-500/50"
                          />
                          <span className="font-body text-sm theme-text-secondary">
                            {t('import.attachPdf')}
                          </span>
                        </label>
                        {importPdfEnabled && (
                          <div
                            onClick={() => document.getElementById('import-pdf-input')?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const file = e.dataTransfer.files[0]
                              if (file && file.type === 'application/pdf') {
                                setImportPdfFile(file)
                              }
                            }}
                            className={`
                              cursor-pointer select-none text-center p-4 rounded-lg
                              border-2 border-dashed transition-colors duration-200
                              ${importPdfFile
                                ? 'border-green-500/50 bg-green-950/20'
                                : 'theme-border-secondary hover:theme-border-secondary'
                              }
                            `}
                          >
                            <input
                              id="import-pdf-input"
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) setImportPdfFile(file)
                              }}
                              className="hidden"
                            />
                            {importPdfFile ? (
                              <div className="flex items-center justify-center gap-2">
                                <FileText className="h-4 w-4 text-green-400" />
                                <span className="font-body text-sm theme-text-primary">{importPdfFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Upload className="h-4 w-4 theme-text-muted" />
                                <span className="font-body text-sm theme-text-secondary">{t('import.uploadPdf')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cloud link option */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={importCloudLinkEnabled}
                            onChange={(e) => setImportCloudLinkEnabled(e.target.checked)}
                            className="rounded theme-border-secondary theme-bg-input text-gold-500 focus:ring-gold-500/50"
                          />
                          <span className="font-body text-sm theme-text-secondary">
                            {t('import.attachCloudLink')}
                          </span>
                        </label>
                        {importCloudLinkEnabled && (
                          <div className="relative">
                            <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-muted" />
                            <input
                              type="text"
                              value={importCloudLinkValue}
                              onChange={(e) => setImportCloudLinkValue(e.target.value)}
                              placeholder={t('import.cloudLinkPlaceholder')}
                              className="w-full rounded-lg border theme-border-secondary theme-bg-input pl-10 pr-4 py-2
                                       font-body text-sm theme-text-primary theme-placeholder
                                       theme-border-focus theme-ring-focus
                                       transition-colors"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {parsed.items.length > 0 && (
                    <button
                      onClick={handleImportAll}
                      disabled={isProcessing}
                      className="flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5
                                 font-body text-sm font-semibold text-navy-950
                                 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                          {t('import.importing')}
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4" />
                          {t('import.importRecords', { count: parsed.items.length })}
                        </>
                      )}
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* PDF tab */}
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              {/* PDF file upload zone */}
              <div className="space-y-4">
                <div
                  onClick={() => document.getElementById('pdf-file-input')?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const file = e.dataTransfer.files[0]
                    if (file && file.type === 'application/pdf') {
                      setPdfFile(file)
                    }
                  }}
                  className={`
                    cursor-pointer select-none text-center p-8 rounded-xl
                    border-2 border-dashed transition-colors duration-200
                    ${pdfFile
                      ? 'border-green-500/50 bg-green-950/20'
                      : 'theme-border-secondary hover:theme-border-secondary'
                    }
                  `}
                >
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfInputChange}
                    className="hidden"
                  />
                  {pdfFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-green-400" />
                      <p className="font-body text-sm font-medium theme-text-primary">{pdfFile.name}</p>
                      <p className="font-body text-xs theme-text-muted">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 theme-text-muted" />
                      <p className="font-body text-sm font-medium theme-text-primary">{t('import.uploadPdf')}</p>
                      <p className="font-body text-xs theme-text-muted">{t('import.dragPdf')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata form - only visible after a PDF file is selected */}
              {pdfFile && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 rounded-xl border theme-border-secondary theme-bg-card p-6"
                >
                  <h3 className="font-display text-lg theme-text-primary">
                    {t('import.metadataForm')}
                  </h3>

                  {/* Title field (required) */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.pdfTitle')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      placeholder={t('import.titlePlaceholder')}
                      className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                 font-body text-sm theme-text-primary theme-placeholder
                                 theme-border-focus theme-ring-focus
                                 transition-colors"
                    />
                  </div>

                  {/* Authors field (comma-separated) */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.pdfAuthors')}
                    </label>
                    <input
                      type="text"
                      value={pdfAuthors}
                      onChange={(e) => setPdfAuthors(e.target.value)}
                      placeholder={t('import.authorsPlaceholder')}
                      className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                 font-body text-sm theme-text-primary theme-placeholder
                                 theme-border-focus theme-ring-focus
                                 transition-colors"
                    />
                  </div>

                  {/* Abstract field */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.pdfAbstract')}
                    </label>
                    <textarea
                      value={pdfAbstract}
                      onChange={(e) => setPdfAbstract(e.target.value)}
                      placeholder={t('import.abstractPlaceholder')}
                      rows={4}
                      className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-3
                                 font-body text-sm theme-text-primary theme-placeholder
                                 theme-border-focus theme-ring-focus
                                 resize-y transition-colors"
                    />
                  </div>

                  {/* Keywords field (comma-separated) */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.pdfKeywords')}
                    </label>
                    <input
                      type="text"
                      value={pdfKeywords}
                      onChange={(e) => setPdfKeywords(e.target.value)}
                      placeholder={t('import.keywordsPlaceholder')}
                      className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                 font-body text-sm theme-text-primary theme-placeholder
                                 theme-border-focus theme-ring-focus
                                 transition-colors"
                    />
                  </div>

                  {/* Category dropdown */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.pdfCategory')}
                    </label>
                    <select
                      value={pdfCategory}
                      onChange={(e) => setPdfCategory(e.target.value)}
                      className="w-full rounded-lg border theme-border-secondary theme-bg-input px-4 py-2.5
                                 font-body text-sm theme-text-primary
                                 theme-border-focus theme-ring-focus
                                 transition-colors"
                    >
                      <option value="">{t('import.noCategory')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cloud drive link field */}
                  <div className="space-y-1.5">
                    <label className="font-body text-sm font-medium theme-text-secondary">
                      {t('import.cloudLink')}
                    </label>
                    <div className="relative">
                      <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-muted" />
                      <input
                        type="text"
                        value={pdfCloudLink}
                        onChange={(e) => setPdfCloudLink(e.target.value)}
                        placeholder={t('import.cloudLinkPlaceholder')}
                        className="w-full rounded-lg border theme-border-secondary theme-bg-input pl-10 pr-4 py-2.5
                                   font-body text-sm theme-text-primary theme-placeholder
                                   theme-border-focus theme-ring-focus
                                   transition-colors"
                      />
                    </div>
                  </div>

                  {/* Save Literature button */}
                  <button
                    onClick={handleSavePdf}
                    disabled={!pdfTitle.trim() || isProcessing}
                    className="flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5
                               font-body text-sm font-semibold text-navy-950
                               hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                        {t('import.saving')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {t('import.saveLiterature')}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

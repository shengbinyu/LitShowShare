import { useCallback, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

// ============================================================
// Props
// ============================================================

interface FileUploaderProps {
  /** Accepted file extensions, e.g. '.ris,.txt' or '.bib,.txt'. */
  accept: string
  /** Heading label displayed inside the drop zone. */
  label: string
  /** Short description below the label. */
  description: string
  /** Callback invoked with the file text content and filename. */
  onFileContent: (content: string, filename: string) => void
  /** When true, shows a processing spinner. */
  isProcessing?: boolean
}

// ============================================================
// Upload states
// ============================================================

type UploadState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

// ============================================================
// Component
// ============================================================

/**
 * FileUploader provides a drag-and-drop zone plus click-to-browse
 * for importing literature files (RIS, BibTeX, etc.).
 * Visual feedback is shown for drag-over, processing, success, and error.
 */
export default function FileUploader({
  accept,
  label,
  description,
  onFileContent,
  isProcessing = false,
}: FileUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [filename, setFilename] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive effective state: processing is controlled by parent
  const effectiveState: UploadState =
    isProcessing && state !== 'error' ? 'processing' : state

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  /** Read the selected File object as text and forward to parent. */
  const processFile = useCallback(
    (file: File) => {
      setFilename(file.name)
      setErrorMsg('')
      setState('processing')

      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        onFileContent(content, file.name)
        // Parent controls isProcessing; we optimistically show success
        // but if isProcessing stays true, the spinner keeps spinning.
        if (!isProcessing) {
          setState('success')
        }
      }
      reader.onerror = () => {
        setErrorMsg('Failed to read file. Please try again.')
        setState('error')
      }
      reader.readAsText(file)
    },
    [onFileContent, isProcessing],
  )

  // Drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('dragover')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState((prev) => (prev === 'dragover' ? 'idle' : prev))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
      else setState('idle')
    },
    [processFile],
  )

  // Click-to-browse
  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input value so the same file can be re-selected
      e.target.value = ''
    },
    [processFile],
  )

  // ----------------------------------------------------------
  // Render helpers
  // ----------------------------------------------------------

  const isDragOver = effectiveState === 'dragover'

  return (
    <motion.div
      animate={isDragOver ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        cursor-pointer select-none text-center p-8 rounded-xl
        border-2 border-dashed transition-colors duration-200
        ${isDragOver
          ? 'border-gold-500 bg-gold-500/5'
          : 'border-navy-600 hover:border-navy-500'
        }
      `}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Idle / Drag-over state */}
      {(effectiveState === 'idle' || effectiveState === 'dragover') && (
        <div className="flex flex-col items-center gap-2">
          <Upload
            className={`w-8 h-8 ${isDragOver ? 'text-gold-500' : 'text-navy-400'}`}
          />
          <p className="text-navy-100 font-medium">{label}</p>
          <p className="text-navy-400 text-sm">{description}</p>
        </div>
      )}

      {/* Processing state */}
      {effectiveState === 'processing' && (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 text-gold-500 animate-pulse" />
          <p className="text-navy-100 font-medium">Processing {filename}...</p>
          {/* Spinning indicator */}
          <div className="mt-1 w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Success state */}
      {effectiveState === 'success' && (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <p className="text-navy-100 font-medium">{filename}</p>
          <p className="text-navy-400 text-sm">File imported successfully</p>
        </div>
      )}

      {/* Error state */}
      {effectiveState === 'error' && (
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-navy-100 font-medium">Import failed</p>
          <p className="text-red-400 text-sm">{errorMsg}</p>
        </div>
      )}
    </motion.div>
  )
}

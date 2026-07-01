import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, AlertCircle, FileImage, Zap, ArrowRight } from 'lucide-react'
import { createSubmission } from '../api/client'
import AppShell from '../components/AppShell'
import { cn } from '../lib/utils'

const MAX_TEXT_BYTES = 50 * 1024 // 50 KB
const MAX_FILES = 8
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function byteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

export default function IntakePage() {
  const navigate = useNavigate()
  const [rawText, setRawText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const textBytes = byteLength(rawText)
  const textOverLimit = textBytes > MAX_TEXT_BYTES

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFileError(null)
    const arr = Array.from(incoming)

    const invalid = arr.filter(
      (f) => !['image/jpeg', 'image/png'].includes(f.type),
    )
    if (invalid.length > 0) {
      setFileError('Only JPEG and PNG files are accepted.')
      return
    }
    const tooBig = arr.filter((f) => f.size > MAX_FILE_BYTES)
    if (tooBig.length > 0) {
      setFileError(`Files must be under 10 MB each.`)
      return
    }
    const next = [...photos, ...arr].slice(0, MAX_FILES)
    if (photos.length + arr.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} photos per submission.`)
    }
    setPhotos(next)
  }, [photos])

  const removeFile = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const submit = async (expressPath: boolean) => {
    if (!rawText.trim()) {
      setSubmitError('Submission text is required.')
      return
    }
    if (textOverLimit) {
      setSubmitError('Text exceeds 50 KB limit. Please shorten it.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const submission = await createSubmission(rawText, expressPath, photos)
      navigate(`/submissions/${submission.id}`)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const textPct = Math.min((textBytes / MAX_TEXT_BYTES) * 100, 100)

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-uw-text">New Submission</h1>
          <p className="text-sm text-uw-muted mt-0.5">
            Paste the property submission text and attach any site photos.
          </p>
        </div>

        <div className="space-y-5">
          {/* Raw text area */}
          <div className="bg-uw-surface border border-uw-border rounded-lg overflow-hidden shadow-uw-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-uw-border">
              <label htmlFor="rawText" className="text-xs font-medium text-uw-muted uppercase tracking-wider">
                Submission Text
              </label>
              <span
                className={cn(
                  'text-2xs tabular',
                  textOverLimit
                    ? 'text-red-400'
                    : textBytes > MAX_TEXT_BYTES * 0.8
                    ? 'text-amber-400'
                    : 'text-uw-muted',
                )}
              >
                {(textBytes / 1024).toFixed(1)} / 50 KB
              </span>
            </div>
            <textarea
              id="rawText"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the broker submission, risk notes, or COPE data here…"
              rows={14}
              className={cn(
                'w-full bg-transparent px-4 py-3 text-sm text-uw-text placeholder:text-uw-border/70 resize-none focus:outline-none font-mono leading-relaxed',
                textOverLimit && 'text-red-300',
              )}
            />
            {/* Byte usage bar */}
            <div className="h-0.5 bg-uw-border">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  textOverLimit
                    ? 'bg-red-500'
                    : textBytes > MAX_TEXT_BYTES * 0.8
                    ? 'bg-amber-500'
                    : 'bg-uw-accent',
                )}
                style={{ width: `${textPct}%` }}
              />
            </div>
          </div>

          {/* Photo drop zone */}
          <div className="bg-uw-surface border border-uw-border rounded-lg shadow-uw-card">
            <div className="px-4 py-3 border-b border-uw-border flex items-center justify-between">
              <span className="text-xs font-medium text-uw-muted uppercase tracking-wider">
                Site Photos (optional)
              </span>
              <span className="text-2xs text-uw-muted tabular">
                {photos.length} / {MAX_FILES}
              </span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'mx-4 my-4 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                isDragging
                  ? 'border-uw-accent bg-uw-accent/10'
                  : 'border-uw-border hover:border-uw-muted',
              )}
            >
              <Upload size={20} className="text-uw-muted" />
              <p className="text-sm text-uw-muted text-center">
                Drop JPEG / PNG files here, or{' '}
                <span className="text-uw-accent">click to browse</span>
              </p>
              <p className="text-2xs text-uw-muted/60">
                Max {MAX_FILES} files · 10 MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="sr-only"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {fileError && (
              <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={13} />
                {fileError}
              </div>
            )}

            {photos.length > 0 && (
              <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {photos.map((f, i) => (
                  <div
                    key={i}
                    className="relative group bg-uw-bg rounded border border-uw-border overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-20 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded p-0.5 text-white hover:text-red-300"
                    >
                      <X size={12} />
                    </button>
                    <div className="flex items-center gap-1 px-1.5 py-1">
                      <FileImage size={10} className="text-uw-muted shrink-0" />
                      <span className="text-2xs text-uw-muted truncate">{f.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <button
              type="button"
              disabled={submitting || textOverLimit || !rawText.trim()}
              onClick={() => submit(false)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded font-medium text-sm border border-uw-border transition-colors',
                'bg-uw-surface text-uw-text hover:bg-uw-border/40',
                (submitting || textOverLimit || !rawText.trim()) &&
                  'opacity-40 cursor-not-allowed',
              )}
            >
              <ArrowRight size={16} />
              Step-by-Step Review
            </button>

            <button
              type="button"
              disabled={submitting || textOverLimit || !rawText.trim()}
              onClick={() => submit(true)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded font-semibold text-sm transition-colors',
                'bg-uw-accent hover:bg-uw-accent-dim text-white',
                (submitting || textOverLimit || !rawText.trim()) &&
                  'opacity-40 cursor-not-allowed',
              )}
            >
              <Zap size={16} />
              Quick Evaluate
              <span className="text-xs text-white/70 font-normal">(express)</span>
            </button>
          </div>

          <p className="text-2xs text-uw-muted text-center">
            Step-by-step lets you review and edit extracted COPE data before scoring.
            Quick Evaluate runs the full pipeline without mid-pipeline review.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

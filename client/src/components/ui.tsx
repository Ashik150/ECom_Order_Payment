import { AlertCircle, LoaderCircle, PackageOpen } from 'lucide-react'
import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle className="animate-spin" size={24} />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="state-panel">
      <PackageOpen size={26} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>
}

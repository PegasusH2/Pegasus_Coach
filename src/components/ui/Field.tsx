import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  suffix?: ReactNode
}

export function Field({ label, suffix, className = '', ...rest }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="flex items-center gap-2 rounded-control border border-bg-border bg-bg-panel px-3 py-2 focus-within:border-pegasus-red">
        <input
          className={`w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted ${className}`}
          {...rest}
        />
        {suffix && <span className="text-xs text-text-muted">{suffix}</span>}
      </div>
    </label>
  )
}

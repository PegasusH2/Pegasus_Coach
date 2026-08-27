import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card border border-bg-border bg-bg-card p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardLabelProps {
  icon?: ReactNode
  children: ReactNode
}

export function CardLabel({ icon, children }: CardLabelProps) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
      {icon}
      <span>{children}</span>
    </div>
  )
}

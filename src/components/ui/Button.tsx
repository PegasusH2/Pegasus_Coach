import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const VARIANTS: Record<string, string> = {
  primary: 'bg-pegasus-red text-white hover:bg-pegasus-redDark',
  secondary: 'bg-bg-panel text-text-primary hover:bg-bg-hover border border-bg-border',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-control px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}

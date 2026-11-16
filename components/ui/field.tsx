import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

type FieldProps = {
  label: React.ReactNode
  htmlFor: string
  hint?: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, hint, required = false, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="px-1 text-[0.8125rem] text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

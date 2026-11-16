'use client'

import { Input } from '@/components/ui/input'
import { maskPhone } from '@/lib/mask'
import { cn } from '@/lib/utils'

type PhoneInputProps = {
  id: string
  name?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  'aria-invalid'?: boolean
  className?: string
}

export function PhoneInput({ id, name, value, onChange, placeholder = '(85) 99999-9999', autoComplete = 'tel', className, ...props }: PhoneInputProps) {
  return (
    <div className={cn('flex h-12 items-center overflow-hidden rounded-[10px] bg-muted focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/30', className)}>
      <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-border/70 px-4 text-sm font-medium" aria-hidden="true">
        <span className="text-base">🇧🇷</span>
        <span>+55</span>
      </span>
      <Input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(maskPhone(event.target.value))}
        placeholder={placeholder}
        className="h-full rounded-none bg-transparent px-4 focus-visible:bg-transparent focus-visible:ring-0"
        {...props}
      />
    </div>
  )
}

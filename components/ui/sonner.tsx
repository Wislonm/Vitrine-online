'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-full !border-border !bg-popover !px-5 !text-popover-foreground !shadow-lg',
        },
      }}
      {...props}
    />
  )
}

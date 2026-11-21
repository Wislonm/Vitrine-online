'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { DnsTestResult } from '@/lib/domain-types'
import { cn } from '@/lib/utils'

export type DnsRecordView = {
  type: string
  name: string
  value: string
  reason?: string
}

export type DnsStatus = 'idle' | 'ok' | 'fail'

async function writeToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(field)
    return copied
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const isMountedRef = useRef(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    }
  }, [])

  async function copy() {
    const success = await writeToClipboard(value)
    if (!isMountedRef.current) return
    if (success) {
      setCopied(true)
      toast.success(`${label} copiado`)
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null
        if (isMountedRef.current) setCopied(false)
      }, 1800)
    } else {
      toast.error('Não foi possível copiar automaticamente')
    }
  }

  return (
    <Button type="button" size="icon-xs" variant="outline" aria-label={`Copiar ${label.toLowerCase()}`} onClick={copy}>
      {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
    </Button>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-2.5 py-1.5 text-sm">{value}</code>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  )
}

const statusLabel: Record<DnsStatus, string> = {
  idle: 'Não testado',
  ok: 'Configurado',
  fail: 'Não encontrado',
}

function StatusBadge({ status }: { status: DnsStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium',
        status === 'ok' && 'bg-sage text-sage-foreground',
        status === 'fail' && 'bg-destructive/10 text-destructive',
        status === 'idle' && 'bg-muted text-muted-foreground',
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

type DnsRecordCardProps = {
  title: string
  description?: string
  records: DnsRecordView[]
  status: DnsStatus
  found?: string[]
}

export function DnsRecordCard({ title, description, records, status, found }: DnsRecordCardProps) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="flex flex-col gap-2">
        {records.map((record, index) => (
          <div key={`${record.type}-${record.name}-${record.value}-${index}`} className="flex flex-col gap-2 rounded-xl bg-muted p-3">
            <div className="grid min-w-0 gap-3 sm:grid-cols-[8.5rem_minmax(0,10rem)_minmax(0,1fr)]">
              <CopyField label="Tipo" value={record.type} />
              <CopyField label="Nome" value={record.name} />
              <CopyField label="Valor" value={record.value} />
            </div>
            {record.reason && <p className="text-xs leading-relaxed text-muted-foreground">{record.reason}</p>}
          </div>
        ))}
      </div>

      {status === 'fail' && (
        <p className="text-xs leading-relaxed text-destructive">
          {found && found.length > 0 ? `Encontrado hoje no DNS: ${found.join(', ')}` : 'Nenhum registro encontrado para este host.'}
        </p>
      )}
    </article>
  )
}

export function DnsTestSummary({ result, connected }: { result: DnsTestResult | null; connected: boolean }) {
  if (!result) return null

  if (!result.ok) {
    return <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">{result.error}</p>
  }

  if (result.allOk) {
    return (
      <p role="status" className="rounded-2xl bg-sage p-4 text-sm leading-relaxed text-sage-foreground">
        DNS verificado: os apontamentos do domínio principal e do www foram encontrados.
        {connected ? ' Use “Verificar e ativar” para concluir.' : ' Agora clique em “Conectar domínio”.'}
      </p>
    )
  }

  return (
    <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
      Falha na verificação: ainda não encontramos todos os apontamentos. Confira os valores no seu registrador e teste novamente; a propagação pode levar de alguns minutos até 48 horas.
    </p>
  )
}

export function statusFromTest(result: DnsTestResult | null, domain: string | null, host: 'apex' | 'www'): { status: DnsStatus; found: string[] } {
  if (!result || !result.ok || result.domain !== domain) return { status: 'idle', found: [] }
  const hostResult = result.results.find((item) => item.host === host)
  if (!hostResult) return { status: 'idle', found: [] }
  return { status: hostResult.ok ? 'ok' : 'fail', found: hostResult.found }
}

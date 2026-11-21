'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Globe, Loader2, RefreshCw, SearchCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  connectCustomDomainAction,
  disconnectCustomDomainAction,
  testCustomDomainDnsAction,
  verifyCustomDomainAction,
} from '@/app/actions/custom-domains'
import { DnsRecordCard, DnsTestSummary, statusFromTest, type DnsRecordView } from '@/components/panel/dns-record-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { DomainHostVerification, StoreDomain } from '@/lib/db/schema'
import type { DnsTestResult } from '@/lib/domain-types'
import { getExpectedDnsRecords, previewCustomDomain } from '@/lib/domain-dns-records'
import { cn } from '@/lib/utils'

type CustomDomainManagerProps = {
  initialDomain: StoreDomain | null
  hasFeature: boolean
  isProduction: boolean
  hasVercelToken: boolean
  onDomainChange?: (domain: StoreDomain | null) => void
}

type Notice = { tone: 'success' | 'error'; text: string }

function DomainStatus({ status, verified }: { status: StoreDomain['status']; verified: boolean }) {
  const label = status === 'active' ? 'Ativo' : status === 'error' ? 'Precisa de atenção' : verified ? 'Verificando DNS' : 'Aguardando DNS'
  return (
    <span className={cn(
      'inline-flex rounded-full px-3 py-1 text-xs font-medium',
      status === 'active' ? 'bg-sage text-sage-foreground' : status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
    )}>
      {label}
    </span>
  )
}

function toRecordViews(check: DomainHostVerification | undefined, fallback: DnsRecordView): DnsRecordView[] {
  if (!check?.dnsRecords.length) return [fallback]
  return check.dnsRecords.map(({ type, name, value, reason }) => ({ type, name, value, reason }))
}

export function CustomDomainManager({ initialDomain, hasFeature, isProduction, hasVercelToken, onDomainChange }: CustomDomainManagerProps) {
  const [domain, setDomain] = useState(initialDomain)
  const [input, setInput] = useState(initialDomain?.domain ?? '')
  const [pending, setPending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [testResult, setTestResult] = useState<DnsTestResult | null>(null)
  const isMountedRef = useRef(false)
  const canManage = isProduction && hasVercelToken
  const busy = pending || testing

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const connectedDomain = domain?.domain ? domain : null
  const typedDomain = useMemo(() => previewCustomDomain(input), [input])
  const typedInvalid = input.trim().length > 0 && !typedDomain
  const typedRecords = useMemo(() => (typedDomain ? getExpectedDnsRecords(typedDomain) : []), [typedDomain])

  async function runTest(target: string) {
    if (!isMountedRef.current) return
    setTesting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await testCustomDomainDnsAction(target)
      if (!isMountedRef.current) return
      setTestResult(result)
      if (!result.ok) setError(result.error)
      else if (result.allOk) toast.success('DNS verificado com sucesso')
      else toast.error('Os apontamentos DNS ainda não foram encontrados')
    } catch {
      if (isMountedRef.current) setError('Não foi possível testar o DNS agora. Tente novamente.')
    } finally {
      if (isMountedRef.current) setTesting(false)
    }
  }

  async function run(action: () => ReturnType<typeof connectCustomDomainAction>) {
    if (!isMountedRef.current) return
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const result = await action()
      if (!isMountedRef.current) return
      if (result.domain !== undefined) {
        setDomain(result.domain)
        onDomainChange?.(result.domain)
      }
      if (result.ok) {
        setNotice({ tone: 'success', text: result.message })
        toast.success(result.message)
        setInput(result.domain?.domain ?? '')
        setTestResult(null)
        setConfirmDisconnect(false)
      } else {
        setError(result.error)
      }
    } catch {
      if (isMountedRef.current) setError('Não foi possível concluir a operação. Tente novamente.')
    } finally {
      if (isMountedRef.current) setPending(false)
    }
  }

  function handleDomainInput(value: string) {
    setInput(value)
    setTestResult(null)
    setError(null)
    setNotice(null)
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (typedDomain && !busy) void runTest(typedDomain)
  }

  const apexCheck = connectedDomain?.verification.apex
  const wwwCheck = connectedDomain?.verification.www
  const isVerified = Boolean(apexCheck?.verified && !apexCheck.misconfigured && wwwCheck?.verified && !wwwCheck.misconfigured)

  const connectedExpected = connectedDomain ? getExpectedDnsRecords(connectedDomain.domain!) : []
  const connectedHosts = connectedDomain
    ? [
        { host: 'apex' as const, title: 'Domínio principal', check: apexCheck, expected: connectedExpected[0] },
        { host: 'www' as const, title: 'Alias www', check: wwwCheck, expected: connectedExpected[1] },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {!hasFeature && (
        <section className="rounded-3xl border border-border bg-muted p-5 sm:p-6" aria-labelledby="domain-plan-title">
          <h2 id="domain-plan-title" className="font-semibold">Domínio personalizado no Pro/Business</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {connectedDomain
              ? 'O acesso pelo domínio está pausado no plano ou período atual. Reative o Pro para voltar a usá-lo ou desconecte o domínio abaixo.'
              : 'Conecte um domínio próprio quando sua loja estiver em um plano com esse recurso habilitado.'}
          </p>
          <Link href="/painel/plano" className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>Ver plano</Link>
        </section>
      )}

      {!isProduction && (
        <p role="status" className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          Você pode testar o DNS aqui, mas conectar o domínio à Vercel só funciona na versão publicada (produção).
        </p>
      )}
      {isProduction && !hasVercelToken && (
        <p role="status" className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          A conexão de domínios está temporariamente indisponível. Tente novamente mais tarde.
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">{error}</p>}
      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn('rounded-2xl p-4 text-sm leading-relaxed', notice.tone === 'success' ? 'bg-sage text-sage-foreground' : 'bg-destructive/10 text-destructive')}
        >
          {notice.text}
        </p>
      )}

      {!connectedDomain && hasFeature && (
        <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-6" aria-labelledby="connect-domain-title">
          <div>
            <h2 id="connect-domain-title" className="font-semibold">Conectar seu domínio</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Informe o domínio principal, por exemplo minhaloja.com.br (sem www). Ele é obrigatório enquanto “Usar domínio próprio” estiver ligado.
            </p>
          </div>

          <Field
            label="Domínio"
            htmlFor="custom-domain"
            required
            error={typedInvalid ? 'Informe um domínio válido, por exemplo minhaloja.com.br.' : undefined}
          >
            <Input
              id="custom-domain"
              value={input}
              onChange={(event) => handleDomainInput(event.target.value)}
              onKeyDown={handleEnter}
              placeholder="minhaloja.com.br"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={253}
              disabled={busy}
              aria-required="true"
              aria-invalid={typedInvalid}
            />
          </Field>

          {typedDomain ? (
            <div className="flex flex-col gap-4" aria-live="polite">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-medium">Passo 1: crie estes apontamentos no DNS do seu domínio</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Acesse o painel DNS do registrador onde comprou {typedDomain}, crie os registros abaixo (use o ícone para copiar cada item) e preserve os registros de e-mail (MX). Depois clique em Testar.
                </p>
              </div>
              {typedRecords.map((record) => {
                const { status, found } = statusFromTest(testResult, typedDomain, record.host)
                return (
                  <DnsRecordCard
                    key={record.host}
                    title={record.host === 'apex' ? 'Domínio principal' : 'Alias www'}
                    description={record.description}
                    records={[{ type: record.type, name: record.name, value: record.value }]}
                    status={status}
                    found={found}
                  />
                )
              })}
              <DnsTestSummary result={testResult} connected={false} />
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
              Digite seu domínio acima para ver os apontamentos que você precisa criar (tipo A para o domínio principal e CNAME para o www).
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={!typedDomain || busy} onClick={() => typedDomain && void runTest(typedDomain)}>
              {testing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}
              Testar
            </Button>
            <Button type="button" disabled={!typedDomain || busy || !canManage} onClick={() => typedDomain && void run(() => connectCustomDomainAction(typedDomain))}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Globe aria-hidden="true" />}
              Conectar domínio
            </Button>
          </div>
        </section>
      )}

      {connectedDomain && (
        <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-6" aria-labelledby="connected-domain-title">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="connected-domain-title" className="break-all font-semibold">{connectedDomain.domain}</h2>
              <p className="mt-1 text-sm text-muted-foreground">www.{connectedDomain.domain} também aponta para esta vitrine.</p>
            </div>
            <DomainStatus status={connectedDomain.status === 'active' && !hasFeature ? 'error' : connectedDomain.status} verified={isVerified} />
          </header>

          {connectedDomain.status === 'active' && hasFeature ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-sage p-4 text-sm text-sage-foreground" role="status">
              <span className="font-medium">Domínio verificado: sua loja já está conectada</span>
              <a className="break-all underline underline-offset-4" href={`https://${connectedDomain.domain}`} target="_blank" rel="noreferrer">https://{connectedDomain.domain}</a>
              <a className="break-all underline underline-offset-4" href={`https://www.${connectedDomain.domain}`} target="_blank" rel="noreferrer">https://www.{connectedDomain.domain} (redireciona para o domínio principal)</a>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-sm font-medium">Crie estes apontamentos no DNS do seu domínio</p>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Acesse o painel DNS do registrador onde comprou o domínio.</li>
                <li>Crie cada registro abaixo (use o ícone para copiar tipo, nome e valor) e preserve os registros de e-mail (MX).</li>
                <li>Clique em “Testar DNS” para conferir os apontamentos e, depois, em “Verificar e ativar” para a Vercel concluir o HTTPS.</li>
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Enquanto isso, o botão “Ver loja” continua usando o endereço da plataforma.</p>
            </div>
          )}

          {connectedDomain.lastError && <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">{connectedDomain.lastError}</p>}

          <div className="flex flex-col gap-4">
            {connectedHosts.map(({ host, title, check, expected }) => {
              const { status, found } = statusFromTest(testResult, connectedDomain.domain, host)
              const vercelOk = Boolean(check?.verified && !check.misconfigured)
              return (
                <DnsRecordCard
                  key={host}
                  title={title}
                  description={vercelOk ? 'Verificado pela Vercel' : undefined}
                  records={toRecordViews(check, { type: expected.type, name: expected.name, value: expected.value })}
                  status={status === 'idle' && vercelOk ? 'ok' : status}
                  found={found}
                />
              )
            })}
          </div>

          <DnsTestSummary result={testResult} connected />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void runTest(connectedDomain.domain!)}>
              {testing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}
              Testar DNS
            </Button>
            <Button type="button" variant="outline" onClick={() => void run(verifyCustomDomainAction)} disabled={busy || !canManage || !hasFeature}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Verificar e ativar
            </Button>
            {confirmDisconnect ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar desconexão do domínio">
                <span className="text-sm text-muted-foreground">A loja deixará de abrir neste domínio.</span>
                <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(false)} disabled={busy}>Cancelar</Button>
                <Button type="button" variant="destructive" onClick={() => void run(disconnectCustomDomainAction)} disabled={busy || !canManage}>
                  {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Confirmar desconexão
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={busy || !canManage}>
                <Trash2 aria-hidden="true" />
                Desconectar
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

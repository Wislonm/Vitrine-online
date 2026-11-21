'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Clipboard, Globe, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { connectCustomDomainAction, disconnectCustomDomainAction, verifyCustomDomainAction } from '@/app/actions/custom-domains'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { DomainHostVerification, StoreDomain } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

type CustomDomainManagerProps = {
  initialDomain: StoreDomain | null
  hasFeature: boolean
  isProduction: boolean
  hasVercelToken: boolean
  onDomainChange?: (domain: StoreDomain | null) => void
}

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

function DnsRecords({ check }: { check: DomainHostVerification | undefined }) {
  if (!check) {
    return <p className="text-sm text-muted-foreground">Os registros DNS ainda estão sendo consultados.</p>
  }
  if (!check.dnsRecords.length) {
    return <p className="text-sm text-muted-foreground">A Vercel não indicou registros DNS adicionais para este host.</p>
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Valor copiado')
    } catch {
      toast.error('Não foi possível copiar automaticamente')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {check.dnsRecords.map((record, index) => (
        <div key={`${record.type}-${record.name}-${record.value}-${index}`} className="grid min-w-0 gap-3 rounded-2xl bg-muted p-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Tipo</span>
            <code className="text-sm font-semibold">{record.type}</code>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Host / nome</span>
            <code className="break-all text-sm">{record.name}</code>
          </div>
          <div className="flex min-w-0 flex-col gap-1 sm:col-start-2">
            <span className="text-xs text-muted-foreground">Valor</span>
            <div className="flex min-w-0 items-start gap-2">
              <code className="min-w-0 flex-1 break-all text-sm">{record.value}</code>
              <Button type="button" size="icon-sm" variant="outline" aria-label={`Copiar valor DNS ${record.type}`} onClick={() => copy(record.value)}>
                <Clipboard aria-hidden="true" />
              </Button>
            </div>
            {record.reason && <p className="text-xs leading-relaxed text-muted-foreground">{record.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CustomDomainManager({ initialDomain, hasFeature, isProduction, hasVercelToken, onDomainChange }: CustomDomainManagerProps) {
  const [domain, setDomain] = useState(initialDomain)
  const [input, setInput] = useState(initialDomain?.domain ?? '')
  const [pending, setPending] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canManage = isProduction && hasVercelToken

  async function run(action: () => ReturnType<typeof connectCustomDomainAction>) {
    setPending(true)
    setError(null)
    try {
      const result = await action()
      if (result.domain !== undefined) {
        setDomain(result.domain)
        onDomainChange?.(result.domain)
      }
      if (result.ok) {
        toast.success(result.message)
        setInput(result.domain?.domain ?? '')
        setConfirmDisconnect(false)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Não foi possível concluir a operação. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(() => connectCustomDomainAction(input))
  }

  const apexCheck = domain?.verification.apex
  const wwwCheck = domain?.verification.www
  const isVerified = Boolean(apexCheck?.verified && !apexCheck.misconfigured && wwwCheck?.verified && !wwwCheck.misconfigured)

  return (
    <div className="flex flex-col gap-6">
      {!hasFeature && (
        <section className="rounded-3xl border border-border bg-muted p-5 sm:p-6" aria-labelledby="domain-plan-title">
          <h2 id="domain-plan-title" className="font-semibold">Domínio personalizado no Pro/Business</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {domain
              ? 'O acesso pelo domínio está pausado no plano ou período atual. Reative o Pro para voltar a usá-lo ou desconecte o domínio abaixo.'
              : 'Conecte um domínio próprio quando sua loja estiver em um plano com esse recurso habilitado.'}
          </p>
          <Link href="/painel/plano" className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>Ver plano</Link>
        </section>
      )}

      {!isProduction && (
        <p role="status" className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          O gerenciamento de domínios fica disponível na versão de produção para proteger o projeto principal.
        </p>
      )}
      {isProduction && !hasVercelToken && (
        <p role="status" className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          A conexão de domínios está temporariamente indisponível. Tente novamente mais tarde.
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">{error}</p>}

      {!domain && hasFeature && (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Conectar seu domínio</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Informe o domínio principal, por exemplo minhaloja.com.br. O acesso com www será configurado automaticamente.</p>
          </div>
          <Field label="Domínio" htmlFor="custom-domain" required>
            <Input
              id="custom-domain"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="minhaloja.com.br"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={253}
              disabled={pending || !canManage}
              aria-describedby="custom-domain-hint"
            />
          </Field>
          <p id="custom-domain-hint" className="text-xs leading-relaxed text-muted-foreground">Digite somente o domínio. Depois mostraremos os registros DNS exatos para configurar no seu provedor.</p>
          <div>
            <Button type="submit" disabled={pending || !canManage || input.trim().length < 3}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Globe aria-hidden="true" />}
              Conectar domínio
            </Button>
          </div>
        </form>
      )}

      {domain && (
        <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-6" aria-labelledby="connected-domain-title">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="connected-domain-title" className="break-all font-semibold">{domain.domain}</h2>
              <p className="mt-1 text-sm text-muted-foreground">www.{domain.domain} também aponta para esta vitrine.</p>
            </div>
            <DomainStatus status={domain.status === 'active' && !hasFeature ? 'error' : domain.status} verified={isVerified} />
          </header>

          {domain.status === 'active' && hasFeature ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-muted p-4 text-sm">
              <span className="font-medium">Sua loja já está conectada</span>
              <a className="break-all underline underline-offset-4" href={`https://${domain.domain}`} target="_blank" rel="noreferrer">https://{domain.domain}</a>
              <a className="break-all text-muted-foreground underline underline-offset-4" href={`https://www.${domain.domain}`} target="_blank" rel="noreferrer">https://www.{domain.domain} (redireciona para o domínio principal)</a>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted p-4">
              <p className="text-sm font-medium">Como configurar o DNS</p>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Acesse o painel DNS do registrador onde comprou o domínio.</li>
                <li>No domínio raiz, crie cada registro A listado e use como IP o valor exibido. Para www, configure o CNAME com o destino mostrado. Se houver TXT de verificação, adicione-o também; preserve os demais registros, especialmente os de e-mail (MX).</li>
                <li>Aguarde a propagação e clique em “Verificar DNS”. Depois da validação, a Vercel provisiona o HTTPS automaticamente.</li>
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Enquanto os registros propagam, o botão “Ver loja” continua usando o endereço da plataforma.</p>
            </div>
          )}

          {domain.lastError && <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">{domain.lastError}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { label: 'Domínio principal', check: apexCheck },
              { label: 'Alias www', check: wwwCheck },
            ].map(({ label, check }) => (
              <div key={label} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {check?.verified && !check.misconfigured ? <Check className="size-4 text-sage" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
                    {check?.verified && !check.misconfigured ? 'Verificado' : 'Aguardando DNS'}
                  </span>
                </div>
                <DnsRecords check={check} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void run(verifyCustomDomainAction)} disabled={pending || !canManage || !hasFeature}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Verificar DNS
            </Button>
            {confirmDisconnect ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar desconexão do domínio">
                <span className="text-sm text-muted-foreground">A loja deixará de abrir neste domínio.</span>
                <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(false)} disabled={pending}>Cancelar</Button>
                <Button type="button" variant="destructive" onClick={() => void run(disconnectCustomDomainAction)} disabled={pending || !canManage}>
                  {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Confirmar desconexão
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={pending || !canManage}>
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

'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, Loader2, PlugZap, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { saveMercadoPagoSettingsAction, testMercadoPagoConnectionAction } from '@/app/actions/admin'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Button } from '@/components/ui/button'
import type { FieldErrors } from '@/lib/validators'

type MercadoPagoSettings = {
  environment: 'test' | 'production'
  publicKey: string
  hasAccessToken: boolean
  hasWebhookSecret: boolean
  updatedAt: string | null
}

export function MercadoPagoSettingsForm({ settings }: { settings: MercadoPagoSettings }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testPending, startTestTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const isConfigured = Boolean(settings.publicKey && settings.hasAccessToken && settings.hasWebhookSecret)

  function testIntegration() {
    setTestMessage(null)
    setTestError(null)
    startTestTransition(async () => {
      const result = await testMercadoPagoConnectionAction()
      if (result.ok) {
        setTestMessage(result.message ?? 'Access Token validado.')
        toast.success('Conexão com o Mercado Pago validada')
      } else {
        setTestError(result.error)
        toast.error(result.error)
      }
    })
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await saveMercadoPagoSettingsAction({
        environment: String(form.get('environment')),
        publicKey: String(form.get('publicKey') ?? ''),
        accessToken,
        webhookSecret,
        clearAccessToken: form.get('clearAccessToken') === 'on',
        clearWebhookSecret: form.get('clearWebhookSecret') === 'on',
      })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      setErrors({})
      setAccessToken('')
      setWebhookSecret('')
      toast.success(result.message ?? 'Configurações salvas')
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-3xl bg-muted p-5 sm:p-8" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Credenciais da aplicação</h2>
          <p className="mt-1 text-sm text-muted-foreground">As chaves privadas nunca são devolvidas ao navegador.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isConfigured ? 'bg-sage/15 text-sage' : 'bg-background text-muted-foreground'}`}>
          {isConfigured ? 'Credenciais cadastradas' : 'Configuração incompleta'}
        </span>
      </div>

      <Field label="Ambiente" htmlFor="environment" hint="Use credenciais de teste antes de mudar para produção.">
        <NativeSelect id="environment" name="environment" defaultValue={settings.environment} className="bg-background">
          <option value="test">Teste</option>
          <option value="production">Produção</option>
        </NativeSelect>
      </Field>

      <Field label="Public Key" htmlFor="publicKey" error={errors.publicKey?.[0]} hint="Chave pública da aplicação Mercado Pago.">
        <Input id="publicKey" name="publicKey" defaultValue={settings.publicKey} autoComplete="off" placeholder="TEST-... ou APP_USR-..." className="bg-background" aria-invalid={!!errors.publicKey} />
      </Field>

      <Field
        label="Access Token"
        htmlFor="accessToken"
        error={errors.accessToken?.[0]}
        hint={settings.hasAccessToken ? 'Token salvo e cifrado. Deixe em branco para manter o atual.' : 'Token privado usado somente no servidor.'}
      >
        <Input id="accessToken" name="accessToken" type="password" autoComplete="new-password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder={settings.hasAccessToken ? 'Já configurado' : 'TEST-... ou APP_USR-...'} className="bg-background" aria-invalid={!!errors.accessToken} />
      </Field>
      {settings.hasAccessToken && (
        <label className="-mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="clearAccessToken" className="size-4 accent-primary" />
          Remover o Access Token salvo
        </label>
      )}

      <Field
        label="Segredo de assinatura do webhook"
        htmlFor="webhookSecret"
        error={errors.webhookSecret?.[0]}
        hint={settings.hasWebhookSecret ? 'Segredo salvo e cifrado. Deixe em branco para manter o atual.' : 'Chave de assinatura configurada para as notificações/webhooks da aplicação Mercado Pago.'}
      >
        <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="new-password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder={settings.hasWebhookSecret ? 'Já configurado' : 'Informe o segredo do webhook'} className="bg-background" aria-invalid={!!errors.webhookSecret} />
      </Field>
      {settings.hasWebhookSecret && (
        <label className="-mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="clearWebhookSecret" className="size-4 accent-primary" />
          Remover o segredo de webhook salvo
        </label>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-background p-4 text-sm leading-relaxed">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-muted-foreground">Access Token e segredo de webhook são cifrados com AES-256-GCM antes de serem gravados no banco. A chave de cifragem é derivada de <code className="rounded bg-muted px-1">BETTER_AUTH_SECRET</code>; mantenha esse segredo estável. Se ele for trocado, será necessário cadastrar novamente as credenciais do Mercado Pago.</p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Integração de checkout ainda não ativa</p>
        <p className="mt-1">Esta tela salva as credenciais e o ambiente. A criação de checkout, validação de pagamentos e processamento de webhooks serão conectados em uma próxima etapa.</p>
      </div>

      <p className="text-xs text-muted-foreground">O teste usa o Access Token salvo e consulta a conta autenticada no Mercado Pago. Salve as alterações antes de testar. Não cria pagamento e não valida a assinatura do webhook.</p>
      {testMessage && <p role="status" className="rounded-2xl bg-sage/15 px-4 py-3 text-sm text-sage">{testMessage}</p>}
      {testError && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{testError}</p>}
      {!settings.hasAccessToken && <p className="text-xs text-muted-foreground">Salve um Access Token para habilitar o teste.</p>}

      {settings.updatedAt && <p className="text-xs text-muted-foreground">Última atualização: {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(settings.updatedAt)) + ' UTC'}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" size="lg" disabled={pending || testPending || !settings.hasAccessToken} onClick={testIntegration}>
          {testPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PlugZap aria-hidden="true" />}
          {testPending ? 'Testando...' : 'Testar integração'}
        </Button>
        <Button type="submit" size="lg" disabled={pending || testPending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {pending ? 'Salvando credenciais...' : 'Salvar configurações'}
        </Button>
      </div>
    </form>
  )
}

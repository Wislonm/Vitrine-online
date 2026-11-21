'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { updateProfileAction } from '@/app/actions/store'
import { setCustomDomainEnabledAction } from '@/app/actions/custom-domains'
import { CustomDomainManager } from '@/components/panel/custom-domain-manager'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { StoreDomain } from '@/lib/db/schema'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { BRAZIL_STATES, formatWhatsappDisplay } from '@/lib/format'
import { slugSchema, type FieldErrors } from '@/lib/validators'

type SlugAvailability = { slug: string; available: boolean; reason?: 'invalid' | 'taken' }

async function fetchSlugAvailability(url: string): Promise<SlugAvailability> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Não foi possível verificar o endereço agora.')
  return response.json() as Promise<SlugAvailability>
}

type ProfileFormProps = {
  baseHost: string
  initialDomain: StoreDomain | null
  hasCustomDomainFeature: boolean
  isProduction: boolean
  hasVercelToken: boolean
  initial: {
    ownerName: string
    name: string
    slug: string
    description: string
    whatsapp: string
    phone: string
    contactEmail: string
    address: string
    city: string
    state: string
    instagram: string
    facebook: string
    tiktok: string
    website: string
  }
}

export function ProfileForm({ initial, initialDomain, baseHost, hasCustomDomainFeature, isProduction, hasVercelToken }: ProfileFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [domainRecord, setDomainRecord] = useState(initialDomain)
  const [useCustomDomain, setUseCustomDomain] = useState(initialDomain?.enabled ?? false)
  const [domainPreferencePending, setDomainPreferencePending] = useState(false)
  const [domainRequiredError, setDomainRequiredError] = useState(false)
  const isMountedRef = useRef(false)
  const domainMissing = useCustomDomain && !domainRecord?.domain
  const [mounted, setMounted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [whatsapp, setWhatsapp] = useState(formatWhatsappDisplay(initial.whatsapp))
  const [slug, setSlug] = useState(initial.slug)
  const [debouncedSlug, setDebouncedSlug] = useState(initial.slug)
  const [formValues, setFormValues] = useState(initial)
  const slugIsValid = slugSchema.safeParse(slug).success
  const shouldCheckSlug = slug !== initial.slug && slugIsValid
  const slugCheckKey = shouldCheckSlug && debouncedSlug === slug
    ? `/api/store/slug-availability?slug=${encodeURIComponent(slug)}`
    : null
  const { data: slugAvailability, isLoading: slugAvailabilityLoading, error: slugAvailabilityError } = useSWR(slugCheckKey, fetchSlugAvailability, { revalidateOnFocus: false })
  const slugCheckPending = shouldCheckSlug && (debouncedSlug !== slug || slugAvailabilityLoading)
  const slugTaken = shouldCheckSlug && slugAvailability?.slug === slug && !slugAvailability.available

  function updateField(field: keyof typeof initial, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  function handleDomainChange(nextDomain: StoreDomain | null) {
    setDomainRecord(nextDomain)
    setUseCustomDomain(nextDomain?.enabled ?? false)
  }

  async function toggleCustomDomain(enabled: boolean) {
    const previous = useCustomDomain
    setUseCustomDomain(enabled)
    if (!isProduction && domainRecord?.domain) return
    if (enabled && !hasCustomDomainFeature) return
    if (!domainRecord && !enabled) return

    setDomainPreferencePending(true)
    try {
      const result = await setCustomDomainEnabledAction(enabled)
      if (!isMountedRef.current) return
      if (!result.ok) {
        setUseCustomDomain(previous)
        toast.error(result.error)
        return
      }
      handleDomainChange(result.domain)
      toast.success(result.message)
    } catch {
      if (isMountedRef.current) {
        setUseCustomDomain(previous)
        toast.error('Não foi possível salvar a preferência de domínio.')
      }
    } finally {
      if (isMountedRef.current) setDomainPreferencePending(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    setMounted(true)
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSlug(slug), 400)
    return () => window.clearTimeout(timeout)
  }, [slug])

  if (!mounted) {
    return <div className="min-h-[42rem]" aria-busy="true" />
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (domainMissing) {
      setDomainRequiredError(true)
      toast.error('Informe e conecte seu domínio próprio ou desligue a opção “Usar domínio próprio”.')
      document.getElementById('dominio')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '')

    startTransition(async () => {
      const result = await updateProfileAction({
        ownerName: value('ownerName'),
        name: value('name'),
        slug,
        description: value('description'),
        whatsapp,
        phone: value('phone'),
        contactEmail: value('contactEmail'),
        address: value('address'),
        city: value('city'),
        state: value('state'),
        instagram: value('instagram'),
        facebook: value('facebook'),
        tiktok: value('tiktok'),
        website: value('website'),
      })
      if (!isMountedRef.current) return
      if (result.ok) {
        setErrors({})
        toast.success(result.message ?? 'Perfil atualizado')
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10" noValidate>
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold">Dados da loja</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome do responsável" htmlFor="ownerName" error={errors.ownerName?.[0]}>
            <Input id="ownerName" name="ownerName" value={formValues.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} aria-invalid={!!errors.ownerName} />
          </Field>
          <Field label="Nome comercial" htmlFor="name" hint="Aparece no cabeçalho da loja." error={errors.name?.[0]}>
            <Input id="name" name="name" value={formValues.name} onChange={(e) => updateField('name', e.target.value)} aria-invalid={!!errors.name} />
          </Field>
        </div>
        {!useCustomDomain && (
          <Field
            label="Endereço da vitrine"
            htmlFor="slug"
            hint="Se você mudar, os links antigos deixam de funcionar."
            error={errors.slug?.[0]}
          >
            <div className="flex items-center rounded-full bg-muted pl-5 focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/30">
              <span className="text-sm text-muted-foreground">{baseHost}/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="bg-transparent pl-1 focus-visible:bg-transparent focus-visible:ring-0"
                maxLength={40}
                aria-invalid={!!errors.slug || slugTaken}
              />
            </div>
            {shouldCheckSlug && <p aria-live="polite" className={`px-1 text-xs ${slugCheckPending ? 'text-muted-foreground' : slugTaken ? 'text-destructive' : slugAvailability?.slug === slug && slugAvailability.available ? 'text-sage' : 'text-muted-foreground'}`}>
              {slugCheckPending ? 'Verificando disponibilidade...' : slugAvailability?.slug === slug ? slugAvailability.available ? 'Este endereço está disponível.' : 'Este endereço já está em uso.' : slugAvailabilityError ? 'Não foi possível verificar agora; tente novamente.' : null}
            </p>}
          </Field>
        )}
        <fieldset id="dominio" className="scroll-mt-24 rounded-2xl border border-border bg-background p-4">
          <legend className="sr-only">Domínio da vitrine</legend>
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="use-custom-domain" className="text-sm font-medium">Usar domínio próprio</label>
              <p id="domain-usage-hint" className="text-xs leading-relaxed text-muted-foreground">
                {hasCustomDomainFeature ? 'Desligado: use o endereço da plataforma. Ligado: informe seu domínio (obrigatório), crie os apontamentos DNS e teste.' : 'Disponível no plano Pro/Business.'}
              </p>
            </div>
            <Switch
              id="use-custom-domain"
              checked={useCustomDomain}
              onCheckedChange={(checked) => void toggleCustomDomain(checked)}
              disabled={domainPreferencePending || (!hasCustomDomainFeature && !useCustomDomain && !domainRecord)}
              aria-label="Usar domínio próprio"
              aria-describedby="domain-usage-hint"
            />
          </div>
        </fieldset>
        {domainRequiredError && domainMissing && (
          <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
            O domínio é obrigatório com “Usar domínio próprio” ligado. Informe o domínio e clique em “Conectar domínio”, ou desligue a opção para usar o endereço da plataforma.
          </p>
        )}
        {!hasCustomDomainFeature && !domainRecord && (
          <Link href="/painel/plano" className="w-fit text-sm font-medium underline underline-offset-4">Ver plano Pro/Business</Link>
        )}
        {useCustomDomain && (
          <div className="scroll-mt-6">
            <CustomDomainManager
              initialDomain={domainRecord}
              hasFeature={hasCustomDomainFeature}
              isProduction={isProduction}
              hasVercelToken={hasVercelToken}
              onDomainChange={handleDomainChange}
            />
          </div>
        )}
        <Field label="Descrição da loja" htmlFor="description" error={errors.description?.[0]}>
          <Textarea id="description" name="description" value={formValues.description} onChange={(e) => updateField('description', e.target.value)} maxLength={400} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold">Contato</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="WhatsApp (recebe os pedidos)"
            htmlFor="whatsapp"
            error={errors.whatsapp?.[0]}
          >
            <PhoneInput
              id="whatsapp"
              value={whatsapp}
              onChange={setWhatsapp}
              aria-invalid={!!errors.whatsapp}
            />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={errors.phone?.[0]}>
            <PhoneInput id="phone" name="phone" value={formValues.phone} onChange={(value) => updateField('phone', value)} />
          </Field>
        </div>
        <Field label="E-mail de contato" htmlFor="contactEmail" error={errors.contactEmail?.[0]}>
          <Input id="contactEmail" name="contactEmail" type="email" value={formValues.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold">Endereço</legend>
        <Field label="Endereço" htmlFor="address" error={errors.address?.[0]}>
          <Input id="address" name="address" value={formValues.address} onChange={(e) => updateField('address', e.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field label="Cidade" htmlFor="city" error={errors.city?.[0]}>
            <Input id="city" name="city" value={formValues.city} onChange={(e) => updateField('city', e.target.value)} />
          </Field>
          <Field label="Estado" htmlFor="state" error={errors.state?.[0]}>
            <NativeSelect id="state" name="state" value={formValues.state} onChange={(e) => updateField('state', e.target.value)}>
              <option value="">--</option>
              {BRAZIL_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-display text-xl font-semibold">Redes sociais</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram" htmlFor="instagram" error={errors.instagram?.[0]}>
            <Input id="instagram" name="instagram" type="url" placeholder="https://instagram.com/sualoja" value={formValues.instagram} onChange={(e) => updateField('instagram', e.target.value)} />
          </Field>
          <Field label="Facebook" htmlFor="facebook" error={errors.facebook?.[0]}>
            <Input id="facebook" name="facebook" type="url" placeholder="https://facebook.com/sualoja" value={formValues.facebook} onChange={(e) => updateField('facebook', e.target.value)} />
          </Field>
          <Field label="TikTok" htmlFor="tiktok" error={errors.tiktok?.[0]}>
            <Input id="tiktok" name="tiktok" type="url" placeholder="https://tiktok.com/@sualoja" value={formValues.tiktok} onChange={(e) => updateField('tiktok', e.target.value)} />
          </Field>
          <Field label="Site" htmlFor="website" error={errors.website?.[0]}>
            <Input id="website" name="website" type="url" placeholder="https://sualoja.com.br" value={formValues.website} onChange={(e) => updateField('website', e.target.value)} />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending || domainPreferencePending || slugCheckPending || Boolean(slugTaken)}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Salvar perfil
        </Button>
        <Button type="button" variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={async () => { await authClient.signOut(); router.push('/login'); router.refresh() }}>
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </div>
    </form>
  )
}

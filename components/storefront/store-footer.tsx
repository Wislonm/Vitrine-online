import { FileText, Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { formatWhatsappDisplay, normalizeWhatsapp } from '@/lib/format'
import { formatBrazilianDocument } from '@/lib/brazil-document'
import type { SocialLinks } from '@/lib/db/schema'

type StoreFooterProps = {
  name: string
  description: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  documentType: string | null
  documentNumber: string | null
  social: SocialLinks
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.7c0-.9.3-1.5 1.6-1.5h1.6V4.5c-.3 0-1.200-.1-2.300-.1-2.300 0-3.900 1.400-3.900 4v2.100H7.900v3h2.600V21h3Z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2h-3.4v13.1a2.9 2.9 0 1 1-2-2.8V9.3a6.3 6.3 0 1 0 5.4 6.3V9.1a8.2 8.2 0 0 0 4.8 1.5V7.2a4.8 4.8 0 0 1-1-.5Z" />
    </svg>
  )
}

export function StoreFooter({ name, description, whatsapp, phone, email, address, city, state, documentType, documentNumber, social }: StoreFooterProps) {
  const location = [address, [city, state].filter(Boolean).join(' - ')].filter(Boolean).join(', ')
  const whatsappNumber = normalizeWhatsapp(whatsapp)

  const contacts = [
    whatsappNumber && {
      key: 'whatsapp',
      icon: <MessageCircle className="size-4" aria-hidden="true" />,
      label: formatWhatsappDisplay(whatsapp),
      href: `https://wa.me/${whatsappNumber}`,
    },
    phone && {
      key: 'phone',
      icon: <Phone className="size-4" aria-hidden="true" />,
      label: phone,
      href: `tel:${phone.replace(/[^\d+]/g, '')}`,
    },
    email && {
      key: 'email',
      icon: <Mail className="size-4" aria-hidden="true" />,
      label: email,
      href: `mailto:${email}`,
    },
    documentType === 'cnpj' && documentNumber && {
      key: 'cnpj',
      icon: <FileText className="size-4" aria-hidden="true" />,
      label: `CNPJ: ${formatBrazilianDocument('cnpj', documentNumber)}`,
      href: null,
    },
    location && {
      key: 'location',
      icon: <MapPin className="size-4" aria-hidden="true" />,
      label: location,
      href: null,
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; href: string | null }[]

  const socials = [
    social.instagram && { key: 'instagram', label: 'Instagram', href: social.instagram, icon: <InstagramIcon /> },
    social.facebook && { key: 'facebook', label: 'Facebook', href: social.facebook, icon: <FacebookIcon /> },
    social.tiktok && { key: 'tiktok', label: 'TikTok', href: social.tiktok, icon: <TikTokIcon /> },
    social.website && { key: 'website', label: 'Site', href: social.website, icon: <Globe className="size-4" aria-hidden="true" /> },
  ].filter(Boolean) as { key: string; label: string; href: string; icon: React.ReactNode }[]

  return (
    <footer className="mt-16 rounded-[2em] bg-primary px-6 py-10 text-primary-foreground sm:px-10">
      <div className="flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold">{name}</p>
          {description && <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{description}</p>}
        </div>

        {contacts.length > 0 && (
          <ul className="flex flex-col gap-3 text-sm">
            {contacts.map((c) => (
              <li key={c.key} className="flex items-start gap-3">
                <span className="mt-0.5 text-primary-foreground/60">{c.icon}</span>
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {socials.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {socials.map((s) => (
            <li key={s.key}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-foreground/10 px-5 text-sm hover:bg-primary-foreground/20"
              >
                {s.icon}
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 border-t border-primary-foreground/15 pt-5 text-xs text-primary-foreground/50">
        Vitrine criada com Ui Sales
      </p>
    </footer>
  )
}

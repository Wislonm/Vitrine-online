import type { PlanDisplayFeature, PlanFeatureIcon, PlanFeatures } from '@/lib/db/schema'

export const PLAN_FEATURE_ICON_NAMES = [
  'store',
  'dashboard',
  'list',
  'cart',
  'message',
  'palette',
  'globe',
  'tag',
  'layers',
  'inventory',
  'search',
  'sparkles',
] as const

export const PLAN_FEATURE_ICON_OPTIONS: { value: PlanFeatureIcon; label: string }[] = [
  { value: 'store', label: 'Loja' },
  { value: 'dashboard', label: 'Painel' },
  { value: 'list', label: 'Lista' },
  { value: 'cart', label: 'Carrinho' },
  { value: 'message', label: 'WhatsApp' },
  { value: 'palette', label: 'Paleta' },
  { value: 'globe', label: 'Domínio' },
  { value: 'tag', label: 'Etiqueta' },
  { value: 'layers', label: 'Variações' },
  { value: 'inventory', label: 'Estoque' },
  { value: 'search', label: 'Busca' },
  { value: 'sparkles', label: 'Destaque' },
]

type DefaultPlanFeature = {
  key: string
  label: string
  icon: PlanFeatureIcon
  trialDefaultEnabled: boolean
  proEnabled: boolean
}

export const DEFAULT_PLAN_FEATURES: DefaultPlanFeature[] = [
  { key: 'public_storefront', label: 'Vitrine pública com link próprio', icon: 'store', trialDefaultEnabled: true, proEnabled: true },
  { key: 'seller_panel', label: 'Painel de gerenciamento da loja', icon: 'dashboard', trialDefaultEnabled: true, proEnabled: true },
  { key: 'categories', label: 'Categorias e filtros de produtos', icon: 'list', trialDefaultEnabled: true, proEnabled: true },
  { key: 'side_cart', label: 'Carrinho e lista de desejos', icon: 'cart', trialDefaultEnabled: true, proEnabled: true },
  { key: 'whatsapp_orders', label: 'Pedidos enviados pelo WhatsApp', icon: 'message', trialDefaultEnabled: true, proEnabled: true },
  { key: 'hero_customization', label: 'Personalização da vitrine e paleta de cores', icon: 'palette', trialDefaultEnabled: true, proEnabled: true },
  { key: 'custom_domain', label: 'Domínio personalizado', icon: 'globe', trialDefaultEnabled: false, proEnabled: true },
  { key: 'product_identifiers', label: 'Cadastro de produtos com oferta, REF e SKU', icon: 'tag', trialDefaultEnabled: false, proEnabled: true },
  { key: 'product_variations', label: 'Até 3 opções por produto e galeria de imagens', icon: 'layers', trialDefaultEnabled: true, proEnabled: true },
  { key: 'inventory', label: 'Controle de estoque e disponibilidade', icon: 'inventory', trialDefaultEnabled: true, proEnabled: true },
  { key: 'search', label: 'Busca, paginação e organização do catálogo', icon: 'search', trialDefaultEnabled: true, proEnabled: true },
]

export function getPlanDisplayFeatures(slug: string, features: PlanFeatures): PlanDisplayFeature[] {
  if (features.displayFeatures !== undefined) return features.displayFeatures

  const legacyFlags = features as unknown as Record<string, unknown>
  return DEFAULT_PLAN_FEATURES.map((feature) => {
    const storedValue = legacyFlags[feature.key]
    return {
      id: feature.key,
      key: feature.key,
      label: feature.label,
      icon: feature.icon,
      enabled: typeof storedValue === 'boolean'
        ? storedValue
        : slug === 'business'
          ? feature.proEnabled
          : feature.trialDefaultEnabled,
      systemKey: feature.key,
    }
  })
}

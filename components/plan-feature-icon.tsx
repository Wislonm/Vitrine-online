import {
  Boxes,
  Check,
  Globe,
  LayoutDashboard,
  Layers,
  List,
  MessageCircle,
  Palette,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  store: Store,
  dashboard: LayoutDashboard,
  list: List,
  cart: ShoppingCart,
  message: MessageCircle,
  palette: Palette,
  globe: Globe,
  tag: Tag,
  layers: Layers,
  inventory: Boxes,
  search: Search,
  sparkles: Sparkles,
}

export function PlanFeatureIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Check
  return <Icon className={className} aria-hidden="true" />
}

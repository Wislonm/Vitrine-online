import type { CSSProperties } from 'react'

export const STORE_THEMES = [
  { id: 'sage', name: 'Sálvia', primary: '#3D5B4B', ring: '#6E8B78', accent: '#EAF1EC', muted: '#F3F6F3', tile: '#E5ECE7', surfaceText: '#26372D' },
  { id: 'plum', name: 'Ameixa', primary: '#66445D', ring: '#92748A', accent: '#F1EAF0', muted: '#F7F3F6', tile: '#EAE1E9', surfaceText: '#3D2B38' },
  { id: 'terracotta', name: 'Terracota', primary: '#874B38', ring: '#B17A64', accent: '#F6ECE7', muted: '#F8F4F1', tile: '#EFE2DB', surfaceText: '#4A2E24' },
  { id: 'olive', name: 'Oliva', primary: '#59603B', ring: '#858B63', accent: '#F0F0E6', muted: '#F6F6F1', tile: '#E8E9DA', surfaceText: '#383B28' },
  { id: 'slate', name: 'Ardósia', primary: '#465766', ring: '#758997', accent: '#EAF0F3', muted: '#F3F6F7', tile: '#E2E9ED', surfaceText: '#293844' },
  { id: 'berry', name: 'Frutas vermelhas', primary: '#733F51', ring: '#A37382', accent: '#F4EAED', muted: '#F8F3F4', tile: '#EDE0E4', surfaceText: '#452832' },
  { id: 'teal', name: 'Petróleo', primary: '#315B57', ring: '#688984', accent: '#E8F0EF', muted: '#F2F6F5', tile: '#DFEAE8', surfaceText: '#24413E' },
  { id: 'cocoa', name: 'Cacau', primary: '#6B4D3E', ring: '#967969', accent: '#F2ECE8', muted: '#F7F4F1', tile: '#EAE1DB', surfaceText: '#443126' },
  { id: 'mauve', name: 'Malva', primary: '#6D536C', ring: '#947D94', accent: '#F1ECF1', muted: '#F7F4F7', tile: '#E8E0E9', surfaceText: '#403242' },
  { id: 'forest', name: 'Floresta', primary: '#3D5547', ring: '#738879', accent: '#EAF0EB', muted: '#F3F6F3', tile: '#E2E9E3', surfaceText: '#29382E' },
  { id: 'copper', name: 'Cobre', primary: '#79503B', ring: '#A27A62', accent: '#F4ECE6', muted: '#F8F4F0', tile: '#ECE2D9', surfaceText: '#493225' },
  { id: 'charcoal', name: 'Grafite', primary: '#4B5157', ring: '#7C858B', accent: '#ECEFF0', muted: '#F4F6F6', tile: '#E4E8E9', surfaceText: '#30363A' },
] as const

export type StoreThemeId = (typeof STORE_THEMES)[number]['id']

export function getStoreThemeStyle(themeId?: string | null): CSSProperties {
  const theme = STORE_THEMES.find((item) => item.id === themeId) ?? STORE_THEMES[0]
  return {
    '--primary': theme.primary,
    '--primary-foreground': '#FFFFFF',
    '--ring': theme.ring,
    '--accent': theme.accent,
    '--accent-foreground': theme.surfaceText,
    '--secondary': theme.accent,
    '--secondary-foreground': theme.surfaceText,
    '--muted': theme.muted,
    '--muted-foreground': '#62676A',
    '--tile': theme.tile,
    '--sage': theme.primary,
    '--sage-foreground': '#FFFFFF',
  } as CSSProperties
}

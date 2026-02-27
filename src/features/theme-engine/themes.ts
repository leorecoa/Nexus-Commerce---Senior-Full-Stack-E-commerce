import { Product } from '@/types'

export interface ProductTheme {
  primary: string
  secondary: string
  accent: string
  backgroundGradient: string
  glow: string
  textContrast: string
}

export const defaultTheme: ProductTheme = {
  primary: '#0f172a',
  secondary: '#1e293b',
  accent: '#22d3ee',
  backgroundGradient:
    'radial-gradient(circle at 18% 18%, rgba(34, 211, 238, 0.3), transparent 48%), radial-gradient(circle at 82% 22%, rgba(59, 130, 246, 0.24), transparent 44%), linear-gradient(155deg, #020617 0%, #0f172a 45%, #1e293b 100%)',
  glow: '34, 211, 238',
  textContrast: '#e2e8f0',
}

const catalogTheme: Record<string, ProductTheme> = {
  smartphone: {
    primary: '#172554',
    secondary: '#1e3a8a',
    accent: '#60a5fa',
    backgroundGradient:
      'radial-gradient(circle at 20% 20%, rgba(96, 165, 250, 0.28), transparent 46%), radial-gradient(circle at 80% 30%, rgba(59, 130, 246, 0.2), transparent 40%), linear-gradient(160deg, #020617 8%, #172554 52%, #1e3a8a 100%)',
    glow: '96, 165, 250',
    textContrast: '#eff6ff',
  },
  laptop: {
    primary: '#1f2937',
    secondary: '#111827',
    accent: '#06b6d4',
    backgroundGradient:
      'radial-gradient(circle at 18% 18%, rgba(6, 182, 212, 0.22), transparent 44%), radial-gradient(circle at 78% 18%, rgba(71, 85, 105, 0.32), transparent 48%), linear-gradient(160deg, #030712 0%, #111827 45%, #1f2937 100%)',
    glow: '6, 182, 212',
    textContrast: '#f8fafc',
  },
  audio: {
    primary: '#3b0764',
    secondary: '#581c87',
    accent: '#c084fc',
    backgroundGradient:
      'radial-gradient(circle at 22% 22%, rgba(192, 132, 252, 0.24), transparent 46%), radial-gradient(circle at 84% 22%, rgba(147, 51, 234, 0.2), transparent 45%), linear-gradient(150deg, #0f172a 5%, #3b0764 55%, #581c87 100%)',
    glow: '192, 132, 252',
    textContrast: '#faf5ff',
  },
  accessory: {
    primary: '#14532d',
    secondary: '#166534',
    accent: '#4ade80',
    backgroundGradient:
      'radial-gradient(circle at 22% 20%, rgba(74, 222, 128, 0.24), transparent 48%), radial-gradient(circle at 76% 20%, rgba(22, 163, 74, 0.24), transparent 45%), linear-gradient(158deg, #052e16 0%, #14532d 50%, #166534 100%)',
    glow: '74, 222, 128',
    textContrast: '#f0fdf4',
  },
}

const isThemeShape = (value: unknown): value is ProductTheme => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.primary === 'string' &&
    typeof candidate.secondary === 'string' &&
    typeof candidate.accent === 'string' &&
    typeof candidate.backgroundGradient === 'string' &&
    typeof candidate.glow === 'string' &&
    typeof candidate.textContrast === 'string'
  )
}

export const resolveProductTheme = (product?: Product | null): ProductTheme => {
  if (!product) {
    return defaultTheme
  }

  if (isThemeShape(product.theme)) {
    return product.theme
  }

  const typeKey = product.type?.toLowerCase() || ''

  if (typeKey.includes('phone')) {
    return catalogTheme.smartphone
  }

  if (typeKey.includes('laptop')) {
    return catalogTheme.laptop
  }

  if (typeKey.includes('audio')) {
    return catalogTheme.audio
  }

  if (typeKey.includes('access')) {
    return catalogTheme.accessory
  }

  return defaultTheme
}

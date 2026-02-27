import { useEffect } from 'react'
import { useThemeEngineStore } from './themeStore'

export const ThemeRuntime = () => {
  const theme = useThemeEngineStore(state => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-gradient', theme.backgroundGradient)
    root.style.setProperty('--theme-glow', theme.glow)
    root.style.setProperty('--theme-text', theme.textContrast)
  }, [theme])

  return null
}

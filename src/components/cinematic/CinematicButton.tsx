import { ButtonHTMLAttributes, MouseEvent } from 'react'

interface CinematicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'accent' | 'ghost' | 'light'
}

export const CinematicButton = ({
  tone = 'accent',
  className = '',
  onMouseMove,
  ...props
}: CinematicButtonProps) => {
  const toneClass = {
    accent: 'bg-[color:var(--theme-accent)] text-slate-950',
    ghost: 'bg-white/10 text-white border border-white/20',
    light: 'bg-white text-slate-900',
  }[tone]

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    target.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    target.style.setProperty('--my', `${event.clientY - rect.top}px`)
    onMouseMove?.(event)
  }

  return (
    <button
      className={`cinematic-button relative rounded-full px-7 py-3 font-semibold tracking-wide ${toneClass} ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
    />
  )
}

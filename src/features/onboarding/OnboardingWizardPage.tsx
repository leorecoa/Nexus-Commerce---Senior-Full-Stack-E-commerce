import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const steps = [
  {
    title: 'Configure sua organização',
    description: 'Defina identidade inicial da operação e tenant.',
  },
  {
    title: 'Publique seu primeiro catálogo',
    description: 'Crie categorias e produtos para abrir vendas.',
  },
  {
    title: 'Ative storytelling e plano',
    description: 'Configure cenas e escolha plano para escalar.',
  },
]

export const OnboardingWizardPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-28 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">
        Guided onboarding
      </p>
      <h1 className="mt-3 text-5xl">Setup Wizard</h1>

      <div className="glass-panel mt-8 rounded-3xl border border-white/15 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">
          Step {step + 1} of {steps.length}
        </p>
        <h2 className="mt-2 text-4xl">{current.title}</h2>
        <p className="mt-3 text-white/70">{current.description}</p>

        <div className="mt-8 flex items-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full ${
                index <= step ? 'bg-[color:var(--theme-accent)]' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>

          {isLast ? (
            <button
              onClick={() => navigate('/admin')}
              className="rounded-full bg-[color:var(--theme-accent)] px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() =>
                setStep(prev => Math.min(steps.length - 1, prev + 1))
              }
              className="rounded-full bg-[color:var(--theme-accent)] px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

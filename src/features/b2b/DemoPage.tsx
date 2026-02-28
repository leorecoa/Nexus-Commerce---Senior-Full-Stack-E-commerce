import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { leadService } from '@/services/supabase/leadService'

export const DemoPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')

  const leadMutation = useMutation({
    mutationFn: () =>
      leadService.createLead({
        name,
        email,
        company,
        message,
        source: 'demo-page',
      }),
    onSuccess: () => {
      setName('')
      setEmail('')
      setCompany('')
      setMessage('')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    leadMutation.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-5xl">Book a Demo</h1>
        <p className="mt-3 text-white/70">
          Conte sobre sua operação e vamos montar sua jornada B2B.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="glass-panel space-y-4 rounded-3xl border border-white/15 p-6"
      >
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Name"
          required
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3"
        />
        <input
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="Business email"
          type="email"
          required
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3"
        />
        <input
          value={company}
          onChange={event => setCompany(event.target.value)}
          placeholder="Company"
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3"
        />
        <textarea
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder="What is your goal?"
          rows={4}
          className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3"
        />

        <button
          type="submit"
          disabled={leadMutation.isPending}
          className="w-full rounded-full bg-[color:var(--theme-accent)] py-3 font-semibold text-slate-900 disabled:opacity-60"
        >
          {leadMutation.isPending ? 'Sending...' : 'Request demo'}
        </button>

        {leadMutation.isSuccess && (
          <p className="text-center text-sm text-emerald-300">
            Lead enviado com sucesso. Retornaremos em breve.
          </p>
        )}
        {leadMutation.error && (
          <p className="text-center text-sm text-red-300">
            {leadMutation.error.message}
          </p>
        )}
      </form>
    </div>
  )
}

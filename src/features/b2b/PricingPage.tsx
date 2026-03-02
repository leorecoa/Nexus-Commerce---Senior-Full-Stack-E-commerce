import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/utils/format'

interface BillingPlan {
  id: string
  name: string
  description: string | null
  price_monthly_cents: number
  trial_days: number
  limits: {
    stores: number
    scenes: number
    products: number
    members: number
  }
}

export const PricingPage = () => {
  const { data: plans = [] } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly_cents', { ascending: true })

      if (error) throw error
      return data as BillingPlan[]
    },
  })

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 text-white">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          B2B SaaS
        </p>
        <h1 className="mt-3 text-6xl">Pricing</h1>
        <p className="mt-4 text-white/70">
          Planos com trial, limites claros e escala por tenant.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map(plan => (
          <article
            key={plan.id}
            className="glass-panel rounded-3xl border border-white/15 p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              {plan.id}
            </p>
            <h2 className="mt-2 text-3xl">{plan.name}</h2>
            <p className="mt-2 text-sm text-white/70">
              {plan.description ?? 'Plano profissional para ecommerce premium.'}
            </p>
            <p className="mt-5 text-4xl">
              {formatPrice(plan.price_monthly_cents / 100)}
              <span className="text-base text-white/60">/month</span>
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
              {plan.trial_days} days trial
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>{plan.limits.stores} stores</li>
              <li>{plan.limits.scenes} scenes</li>
              <li>{plan.limits.products} products</li>
              <li>{plan.limits.members} team members</li>
            </ul>
            <Link
              to="/demo"
              className="mt-6 inline-flex rounded-full bg-[color:var(--theme-accent)] px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Request demo
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}

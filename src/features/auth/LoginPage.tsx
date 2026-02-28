import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { loginSchema, LoginInput } from '@/schemas'
import { authService } from '@/services/supabase/authService'

const container = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.35 },
  },
}

type AuthMode = 'signin' | 'signup'

export const LoginPage = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('')
  const [nameError, setNameError] = useState('')
  const [signupNotice, setSignupNotice] = useState('')

  const title = useMemo(
    () => (mode === 'signin' ? 'Sign in' : 'Create account'),
    [mode]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authService.signIn,
    onSuccess: () => navigate('/'),
  })

  const signupMutation = useMutation({
    mutationFn: authService.signUp,
    onSuccess: () => {
      setSignupNotice(
        'Conta criada. Verifique seu email para confirmar o cadastro.'
      )
      setMode('signin')
    },
  })

  const googleMutation = useMutation({
    mutationFn: authService.signInWithGoogle,
  })

  const onSubmit = (data: LoginInput) => {
    setSignupNotice('')

    if (mode === 'signup') {
      const cleanedName = fullName.trim()
      if (!cleanedName) {
        setNameError('Informe seu nome para criar a conta.')
        return
      }

      setNameError('')
      signupMutation.mutate({ ...data, full_name: cleanedName })
      return
    }

    loginMutation.mutate(data)
  }

  const authPending = loginMutation.isPending || signupMutation.isPending

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 pb-10 pt-24 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-[130px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-900/45 shadow-[0_30px_120px_rgba(15,23,42,0.8)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="relative hidden min-h-[620px] overflow-hidden border-r border-white/10 p-12 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,0.22),transparent_48%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/65">
                CineLaunch Commerce
              </p>
              <h1 className="mt-6 text-7xl leading-[0.9]">
                Craft Luxury Funnels
              </h1>
              <p className="mt-6 max-w-md text-base text-slate-200/90">
                Transforme cada produto em uma campanha cinematografica com
                narrativa visual, performance e seguranca de producao.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <ShieldCheck size={18} className="text-cyan-300" />
                <span className="text-sm text-white/85">
                  Checkout transacional com RLS + RPC
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <Sparkles size={18} className="text-sky-300" />
                <span className="text-sm text-white/85">
                  Tema dinamico e experiencia premium por produto
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <Zap size={18} className="text-indigo-300" />
                <span className="text-sm text-white/85">
                  Arquitetura pronta para escalar como SaaS
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative p-7 sm:p-10 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="glass-panel mx-auto w-full max-w-md rounded-[2rem] p-7"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/55">
              Welcome back
            </p>
            <h2 className="mt-3 text-5xl">{title}</h2>
            <p className="mt-3 text-sm text-white/70">
              Acesse seu workspace e publique campanhas de alto impacto.
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/60 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setNameError('')
                  setSignupNotice('')
                }}
                className={`w-1/2 rounded-full px-3 py-2 text-xs uppercase tracking-[0.16em] transition ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900'
                    : 'text-white/75'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setNameError('')
                  setSignupNotice('')
                }}
                className={`w-1/2 rounded-full px-3 py-2 text-xs uppercase tracking-[0.16em] transition ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900'
                    : 'text-white/75'
                }`}
              >
                Create account
              </button>
            </div>

            <motion.form
              variants={stagger}
              initial="hidden"
              animate="show"
              onSubmit={handleSubmit(onSubmit)}
              className="mt-7 space-y-4"
            >
              {mode === 'signup' && (
                <motion.div variants={item}>
                  <input
                    value={fullName}
                    onChange={event => {
                      setFullName(event.target.value)
                      if (nameError) setNameError('')
                    }}
                    type="text"
                    placeholder="Full name"
                    className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 outline-none transition focus:border-cyan-300/70"
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-red-300">{nameError}</p>
                  )}
                </motion.div>
              )}

              <motion.div variants={item}>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 outline-none transition focus:border-cyan-300/70"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-300">
                    {errors.email.message}
                  </p>
                )}
              </motion.div>

              <motion.div variants={item}>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 outline-none transition focus:border-cyan-300/70"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-300">
                    {errors.password.message}
                  </p>
                )}
              </motion.div>

              <motion.button
                variants={item}
                type="submit"
                disabled={authPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--theme-accent)] py-3 font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-70"
              >
                {authPending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                )}
                {mode === 'signin'
                  ? loginMutation.isPending
                    ? 'Signing in...'
                    : 'Sign in to TechStore'
                  : signupMutation.isPending
                    ? 'Creating account...'
                    : 'Create account'}
              </motion.button>

              {loginMutation.error && mode === 'signin' && (
                <motion.p
                  variants={item}
                  className="text-center text-sm text-red-300"
                >
                  {loginMutation.error.message}
                </motion.p>
              )}

              {signupMutation.error && mode === 'signup' && (
                <motion.p
                  variants={item}
                  className="text-center text-sm text-red-300"
                >
                  {signupMutation.error.message}
                </motion.p>
              )}

              {signupNotice && (
                <motion.p
                  variants={item}
                  className="text-center text-sm text-emerald-300"
                >
                  {signupNotice}
                </motion.p>
              )}
            </motion.form>

            {mode === 'signin' && (
              <motion.button
                variants={item}
                initial="hidden"
                animate="show"
                onClick={() => googleMutation.mutate()}
                disabled={googleMutation.isPending}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 py-3 text-sm text-white/90 transition hover:border-white disabled:opacity-70"
              >
                {googleMutation.isPending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {googleMutation.isPending
                  ? 'Redirecting...'
                  : 'Sign in with Google'}
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

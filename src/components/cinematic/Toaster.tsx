import { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, ToastVariant } from '@/stores/toastStore'

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100',
  error: 'border-rose-300/35 bg-rose-500/15 text-rose-100',
  info: 'border-cyan-300/35 bg-cyan-500/15 text-cyan-100',
}

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertTriangle size={18} />,
  info: <Info size={18} />,
}

export const Toaster = () => {
  const { toasts, removeToast } = useToastStore(state => ({
    toasts: state.toasts,
    removeToast: state.removeToast,
  }))

  useEffect(() => {
    if (!toasts.length) return

    const timers = toasts.map(toast =>
      window.setTimeout(() => {
        removeToast(toast.id)
      }, 3600)
    )

    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
    }
  }, [toasts, removeToast])

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${variantClasses[toast.variant]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2">
                <span className="mt-[2px]">{variantIcon[toast.variant]}</span>
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs opacity-90">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 opacity-80 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

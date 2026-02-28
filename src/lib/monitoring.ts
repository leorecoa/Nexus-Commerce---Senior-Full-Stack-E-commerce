type MonitoringContext = Record<string, unknown>

declare global {
  interface Window {
    Sentry?: {
      init: (options: Record<string, unknown>) => void
      captureException: (error: unknown, context?: MonitoringContext) => void
      captureMessage: (message: string, context?: MonitoringContext) => void
      setTag: (key: string, value: string) => void
    }
    __sentryInitialized?: boolean
  }
}

const SENTRY_SCRIPT_SRC =
  'https://browser.sentry-cdn.com/7.120.3/bundle.tracing.min.js'

const loadSentryScript = () =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${SENTRY_SCRIPT_SRC}"]`
    )
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = SENTRY_SCRIPT_SRC
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Failed to load Sentry browser bundle'))
    document.head.appendChild(script)
  })

export const initMonitoring = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || typeof window === 'undefined' || window.__sentryInitialized) {
    return
  }

  try {
    await loadSentryScript()

    if (!window.Sentry) {
      return
    }

    window.Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
    })

    window.__sentryInitialized = true
  } catch (error) {
    console.error('[monitoring] failed to initialize Sentry', error)
  }
}

export const captureException = (
  error: unknown,
  context?: MonitoringContext
) => {
  if (window.Sentry) {
    window.Sentry.captureException(error, context)
    return
  }

  console.error('[captured-exception]', error, context ?? {})
}

export const captureMessage = (
  message: string,
  context?: MonitoringContext
) => {
  if (window.Sentry) {
    window.Sentry.captureMessage(message, context)
    return
  }

  console.info('[captured-message]', message, context ?? {})
}

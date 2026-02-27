import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { captureException, initMonitoring } from '@/lib/monitoring'

void initMonitoring()

window.addEventListener('error', event => {
  captureException(event.error ?? new Error(event.message), {
    source: 'window.error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', event => {
  captureException(event.reason, {
    source: 'window.unhandledrejection',
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

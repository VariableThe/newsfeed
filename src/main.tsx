import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker only in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const installingWorker = registration.installing
        if (installingWorker?.state === 'installed' && navigator.serviceWorker.controller) {
          // Do not force-reload if there's an active reading session
          if (document.visibilityState !== 'visible') {
            // Could show update notification here
          }
        }
        registration.addEventListener('controllerchange', () => {
          // Reload only if the new SW took control and there are no pending actions
          if (document.visibilityState !== 'visible') {
            window.location.reload()
          }
        })
      })
      .catch((err: unknown) => {
        // SW registration failed; not critical for app shell
        console.error('Service worker registration failed:', err)
      })
  })
}

import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        setShowBanner(false)
      }
    } catch (_) {}
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowBanner(false)
    try {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    } catch (_) {}
  }

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem('pwa-install-dismissed')
      if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true)
      }
    } catch (_) {}
  }, [])

  if (!showBanner || dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Install app</p>
          <p className="text-xs text-gray-500">Use Fee Management like an app on your device.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

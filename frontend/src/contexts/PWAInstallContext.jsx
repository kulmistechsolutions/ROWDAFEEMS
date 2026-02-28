import { createContext, useContext, useState, useEffect } from 'react'

const PWAInstallContext = createContext(null)

export function PWAInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowModal(false)
      setDeferredPrompt(null)
    } else {
      setShowModal(true)
    }
  }

  const isStandalone = () => {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    } catch (_) {
      return false
    }
  }

  return (
    <PWAInstallContext.Provider value={{ deferredPrompt, triggerInstall, showModal, setShowModal, isStandalone: isStandalone() }}>
      {children}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Install app</h3>
            <p className="text-sm text-gray-600">Use Fee Management like an app on your device.</p>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Chrome / Edge (Android or PC):</strong></p>
              <p>Click the <strong>⋮</strong> menu in the address bar → &quot;Install app&quot; or &quot;Add to Home screen&quot;.</p>
              <p className="pt-2"><strong>iPhone / iPad:</strong></p>
              <p>Open in <strong>Safari</strong> → tap the Share button <strong>□↑</strong> → &quot;Add to Home Screen&quot;.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAInstallContext.Provider>
  )
}

export function usePWAInstall() {
  const ctx = useContext(PWAInstallContext)
  return ctx
}

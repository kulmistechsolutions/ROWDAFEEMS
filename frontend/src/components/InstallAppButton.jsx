import { usePWAInstall } from '../contexts/PWAInstallContext'

export default function InstallAppButton({ className = '', showLabel = true }) {
  const { triggerInstall, isStandalone } = usePWAInstall()

  if (!triggerInstall || isStandalone) return null

  return (
    <button
      type="button"
      onClick={triggerInstall}
      className={`flex items-center gap-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ${className}`}
      title="Download / Install app"
    >
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {showLabel && <span className="text-sm font-medium">Install app</span>}
    </button>
  )
}

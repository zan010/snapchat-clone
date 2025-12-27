import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem('installBannerDismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      // Show again after 7 days
      if (now - dismissedDate < 7 * 24 * 60 * 60 * 1000) {
        return
      }
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(isIOSDevice)

    // Show banner after a delay
    const timer = setTimeout(() => {
      setShow(true)
    }, 2000)

    // Listen for install prompt (Android/Chrome)
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShow(false)
      }
      setInstallPrompt(null)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('installBannerDismissed', new Date().toISOString())
    setShow(false)
  }

  if (!show || isInstalled) return null

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <Smartphone size={32} />
        </div>
        <div className="install-banner-text">
          <h3>Install SnapClone</h3>
          {isIOS ? (
            <p>Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong></p>
          ) : (
            <p>Add to your home screen for the full app experience!</p>
          )}
        </div>
        <div className="install-banner-actions">
          {!isIOS && installPrompt && (
            <button className="install-btn" onClick={handleInstall}>
              <Download size={18} />
              Install
            </button>
          )}
          <button className="install-dismiss" onClick={handleDismiss}>
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}


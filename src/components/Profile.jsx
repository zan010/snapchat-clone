import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../App'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Calendar, Award, Copy, Check, Download, Share2, Bell, BellOff } from 'lucide-react'
import { format } from 'date-fns'

export default function Profile() {
  const { userData } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
      if (permission === 'granted') {
        new Notification('🎉 Notifications enabled!', {
          body: 'You\'ll now get notified when friends message you!',
          icon: '/pwa-192x192.svg'
        })
      }
    }
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setInstallPrompt(null)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SnapClone',
          text: 'Join me on SnapClone! Add me: @' + userData?.username,
          url: window.location.origin
        })
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.origin)
      alert('Link copied to clipboard!')
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  const copyUsername = () => {
    navigator.clipboard.writeText(userData?.username || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  if (!userData) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="profile-screen">
      <div className="header" style={{ justifyContent: 'flex-start', gap: '16px' }}>
        <button className="header-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Profile</h1>
      </div>

      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div className="profile-avatar">
          {getInitials(userData.displayName)}
        </div>
        
        <h2 className="profile-name">{userData.displayName}</h2>
        
        <div 
          className="profile-username" 
          onClick={copyUsername}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          @{userData.username}
          {copied ? <Check size={14} color="#34c759" /> : <Copy size={14} />}
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <div className="stat-value">{userData.snapScore || 0}</div>
            <div className="stat-label">Snap Score</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{userData.friends?.length || 0}</div>
            <div className="stat-label">Friends</div>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Account Info</div>
          
          <div className="profile-item">
            <User size={20} />
            <span>{userData.displayName}</span>
          </div>
          
          <div className="profile-item">
            <Mail size={20} />
            <span>{userData.email}</span>
          </div>
          
          <div className="profile-item">
            <Calendar size={20} />
            <span>Joined {userData.createdAt ? format(new Date(userData.createdAt), 'MMMM yyyy') : 'Unknown'}</span>
          </div>
          
          <div className="profile-item">
            <Award size={20} />
            <span>Snap Score: {userData.snapScore || 0}</span>
          </div>
        </div>

        <div className="profile-section" style={{ background: 'rgba(255, 252, 0, 0.1)', border: '1px solid rgba(255, 252, 0, 0.3)' }}>
          <div className="profile-section-title" style={{ color: '#FFFC00' }}>Share Your Username</div>
          <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '12px' }}>
            Tell your friends to add you with this username:
          </p>
          <div 
            style={{ 
              background: '#1a1a1a', 
              padding: '16px', 
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#FFFC00',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={copyUsername}
          >
            @{userData.username}
            {copied ? <Check size={18} color="#34c759" /> : <Copy size={18} />}
          </div>
        </div>

        {/* Notifications */}
        {notifPermission !== 'granted' && (
          <div 
            className="profile-section" 
            style={{ 
              background: 'rgba(255, 149, 0, 0.1)', 
              border: '1px solid rgba(255, 149, 0, 0.3)',
              marginBottom: '16px'
            }}
          >
            <div className="profile-section-title" style={{ color: '#ff9500' }}>
              🔔 Enable Notifications
            </div>
            <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '12px' }}>
              Get notified when friends send you snaps and messages!
            </p>
            <button 
              className="btn btn-primary"
              onClick={requestNotifications}
              style={{ width: '100%' }}
            >
              <Bell size={20} style={{ marginRight: '8px' }} />
              Turn On Notifications
            </button>
          </div>
        )}

        {notifPermission === 'granted' && (
          <div 
            className="profile-section" 
            style={{ 
              background: 'rgba(52, 199, 89, 0.1)', 
              border: '1px solid rgba(52, 199, 89, 0.3)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Bell size={24} color="#34c759" />
            <div>
              <div style={{ fontWeight: '600', color: '#34c759' }}>Notifications On</div>
              <div style={{ fontSize: '13px', color: '#8e8e93' }}>You'll be notified of new messages</div>
            </div>
          </div>
        )}

        {/* Install & Share Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {!isInstalled && installPrompt && (
            <button 
              className="btn btn-primary"
              onClick={handleInstall}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={20} />
              Install App
            </button>
          )}
          <button 
            className="btn btn-secondary"
            onClick={handleShare}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Share2 size={20} />
            Share App
          </button>
        </div>

        {!isInstalled && (
          <div className="profile-section" style={{ background: 'rgba(0, 168, 255, 0.1)', border: '1px solid rgba(0, 168, 255, 0.3)' }}>
            <div className="profile-section-title" style={{ color: '#00a8ff' }}>📱 Install on Your Phone</div>
            <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '8px' }}>
              <strong>iPhone:</strong> Tap <span style={{ color: '#00a8ff' }}>Share</span> → "Add to Home Screen"
            </p>
            <p style={{ fontSize: '14px', color: '#8e8e93' }}>
              <strong>Android:</strong> Tap <span style={{ color: '#00a8ff' }}>⋮ Menu</span> → "Install app"
            </p>
          </div>
        )}

        {isInstalled && (
          <div className="profile-section" style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.3)' }}>
            <div className="profile-section-title" style={{ color: '#34c759' }}>✅ App Installed!</div>
            <p style={{ fontSize: '14px', color: '#8e8e93' }}>
              SnapClone is installed on your device. Enjoy!
            </p>
          </div>
        )}

        <button 
          className="logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  )
}


import { useState } from 'react'
import { ArrowLeft, Palette, User, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Settings({ onClose }) {
  const { themes, currentTheme, setCurrentTheme, avatarColors, avatarColor, setAvatarColor } = useTheme()
  const [activeTab, setActiveTab] = useState('theme')

  return (
    <div className="settings-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Customize</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          <Palette size={18} />
          Themes
        </button>
        <button 
          className={`settings-tab ${activeTab === 'avatar' ? 'active' : ''}`}
          onClick={() => setActiveTab('avatar')}
        >
          <User size={18} />
          Avatar
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'theme' && (
          <div className="theme-grid">
            {Object.entries(themes).map(([key, theme]) => (
              <div 
                key={key}
                className={`theme-option ${currentTheme === key ? 'selected' : ''}`}
                onClick={() => setCurrentTheme(key)}
              >
                <div 
                  className="theme-preview"
                  style={{ background: theme.gradient }}
                >
                  {currentTheme === key && <Check size={24} color="white" />}
                </div>
                <span className="theme-name">{theme.name}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'avatar' && (
          <>
            <div className="avatar-preview-large" style={{ background: avatarColor }}>
              <span>YOU</span>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--snap-text-secondary)', marginBottom: '24px' }}>
              Choose your avatar color
            </p>
            <div className="avatar-grid">
              {avatarColors.map((color, index) => (
                <div 
                  key={index}
                  className={`avatar-option ${avatarColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setAvatarColor(color)}
                >
                  {avatarColor === color && <Check size={20} color="white" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { ArrowLeft, Check } from 'lucide-react'

const SKIN_TONES = [
  '#FFDFC4', '#F0D5BE', '#D1A684', '#C68642', '#8D5524', '#5C3317'
]

const HAIR_COLORS = [
  '#090806', '#2C222B', '#71635A', '#B7A69E', '#D6C4C2', '#CABFB1',
  '#DDA15E', '#A52A2A', '#E63946', '#9B59B6', '#3498DB', '#1ABC9C'
]

const HAIR_STYLES = [
  { id: 'short', name: 'Short', path: 'M12 4C8 4 6 6 6 9c0 1 .5 2 1 2.5V12h10v-.5c.5-.5 1-1.5 1-2.5 0-3-2-5-6-5z' },
  { id: 'medium', name: 'Medium', path: 'M12 3C7 3 5 6 5 10c0 2 1 3 1 3v1h12v-1s1-1 1-3c0-4-2-7-7-7z' },
  { id: 'long', name: 'Long', path: 'M12 3C7 3 5 6 5 10v8h2v-6h10v6h2v-8c0-4-2-7-7-7z' },
  { id: 'curly', name: 'Curly', path: 'M12 3c-4 0-6 2-7 5-1 3 0 5 1 6h12c1-1 2-3 1-6-1-3-3-5-7-5zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z' },
  { id: 'bald', name: 'Bald', path: '' },
  { id: 'spiky', name: 'Spiky', path: 'M12 4l-2-2-1 3-3-1 1 3-3 1 3 1v2h10V9l3-1-3-1 1-3-3 1-1-3z' }
]

const FACE_SHAPES = [
  { id: 'round', name: 'Round', rx: 10, ry: 12 },
  { id: 'oval', name: 'Oval', rx: 9, ry: 13 },
  { id: 'square', name: 'Square', rx: 10, ry: 11 }
]

const EYE_STYLES = [
  { id: 'normal', name: 'Normal' },
  { id: 'big', name: 'Big' },
  { id: 'sleepy', name: 'Sleepy' },
  { id: 'wink', name: 'Wink' }
]

const ACCESSORIES = [
  { id: 'none', name: 'None', emoji: '❌' },
  { id: 'glasses', name: 'Glasses', emoji: '👓' },
  { id: 'sunglasses', name: 'Sunglasses', emoji: '🕶️' },
  { id: 'hat', name: 'Hat', emoji: '🧢' },
  { id: 'headphones', name: 'Headphones', emoji: '🎧' }
]

export default function AvatarCreator({ onClose }) {
  const { user, userData } = useAuth()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('skin')
  
  const [avatar, setAvatar] = useState({
    skinTone: userData?.avatar?.skinTone || SKIN_TONES[0],
    hairColor: userData?.avatar?.hairColor || HAIR_COLORS[0],
    hairStyle: userData?.avatar?.hairStyle || 'short',
    faceShape: userData?.avatar?.faceShape || 'round',
    eyeStyle: userData?.avatar?.eyeStyle || 'normal',
    accessory: userData?.avatar?.accessory || 'none'
  })

  const updateAvatar = (key, value) => {
    setAvatar(prev => ({ ...prev, [key]: value }))
  }

  const saveAvatar = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        avatar: avatar
      })
      onClose()
    } catch (error) {
      console.error('Error saving avatar:', error)
    } finally {
      setSaving(false)
    }
  }

  const renderAvatar = (size = 120) => {
    const face = FACE_SHAPES.find(f => f.id === avatar.faceShape) || FACE_SHAPES[0]
    const hair = HAIR_STYLES.find(h => h.id === avatar.hairStyle)
    
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        {/* Face */}
        <ellipse 
          cx="12" cy="13" 
          rx={face.rx * 0.45} ry={face.ry * 0.45} 
          fill={avatar.skinTone}
        />
        
        {/* Hair */}
        {hair && hair.path && (
          <path d={hair.path} fill={avatar.hairColor} />
        )}
        
        {/* Eyes */}
        {avatar.eyeStyle === 'normal' && (
          <>
            <circle cx="9.5" cy="12" r="1" fill="#333" />
            <circle cx="14.5" cy="12" r="1" fill="#333" />
          </>
        )}
        {avatar.eyeStyle === 'big' && (
          <>
            <circle cx="9.5" cy="12" r="1.5" fill="#333" />
            <circle cx="14.5" cy="12" r="1.5" fill="#333" />
            <circle cx="10" cy="11.5" r="0.4" fill="#fff" />
            <circle cx="15" cy="11.5" r="0.4" fill="#fff" />
          </>
        )}
        {avatar.eyeStyle === 'sleepy' && (
          <>
            <path d="M8 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
            <path d="M13 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
          </>
        )}
        {avatar.eyeStyle === 'wink' && (
          <>
            <circle cx="9.5" cy="12" r="1" fill="#333" />
            <path d="M13 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
          </>
        )}
        
        {/* Mouth */}
        <path d="M10 15.5 Q12 17 14 15.5" stroke="#333" strokeWidth="0.5" fill="none" />
        
        {/* Accessories */}
        {avatar.accessory === 'glasses' && (
          <>
            <circle cx="9" cy="12" r="2.5" stroke="#333" strokeWidth="0.5" fill="none" />
            <circle cx="15" cy="12" r="2.5" stroke="#333" strokeWidth="0.5" fill="none" />
            <path d="M11.5 12h1" stroke="#333" strokeWidth="0.5" />
          </>
        )}
        {avatar.accessory === 'sunglasses' && (
          <>
            <ellipse cx="9" cy="12" rx="2.5" ry="2" fill="#333" />
            <ellipse cx="15" cy="12" rx="2.5" ry="2" fill="#333" />
            <path d="M11.5 12h1" stroke="#333" strokeWidth="0.5" />
          </>
        )}
        {avatar.accessory === 'hat' && (
          <path d="M6 8h12v-2c0-1-2-2-6-2s-6 1-6 2z" fill="#E63946" />
        )}
        {avatar.accessory === 'headphones' && (
          <>
            <path d="M6 10c-1 0-2 1-2 2v2c0 1 1 2 2 2" stroke="#333" strokeWidth="1.5" fill="none" />
            <path d="M18 10c1 0 2 1 2 2v2c0 1-1 2-2 2" stroke="#333" strokeWidth="1.5" fill="none" />
            <path d="M6 10 Q6 5 12 5 Q18 5 18 10" stroke="#333" strokeWidth="1" fill="none" />
          </>
        )}
      </svg>
    )
  }

  const tabs = [
    { id: 'skin', name: '👤 Skin' },
    { id: 'hair', name: '💇 Hair' },
    { id: 'eyes', name: '👁️ Eyes' },
    { id: 'extras', name: '✨ Extras' }
  ]

  return (
    <div className="settings-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Create Avatar</h1>
        <button 
          className="header-btn" 
          onClick={saveAvatar}
          disabled={saving}
          style={{ background: '#FFFC00', color: '#000' }}
        >
          <Check size={20} />
        </button>
      </div>

      {/* Preview */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)'
      }}>
        <div style={{
          width: '140px',
          height: '140px',
          background: '#fff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          {renderAvatar(120)}
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`settings-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="settings-content">
        {tab === 'skin' && (
          <>
            <p style={{ marginBottom: '16px', color: '#888' }}>Choose skin tone:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {SKIN_TONES.map(tone => (
                <button
                  key={tone}
                  onClick={() => updateAvatar('skinTone', tone)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: tone,
                    border: avatar.skinTone === tone ? '3px solid #FFFC00' : '3px solid transparent',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                />
              ))}
            </div>

            <p style={{ marginTop: '24px', marginBottom: '16px', color: '#888' }}>Face shape:</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {FACE_SHAPES.map(shape => (
                <button
                  key={shape.id}
                  onClick={() => updateAvatar('faceShape', shape.id)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: avatar.faceShape === shape.id ? '#FFFC00' : '#1a1a1a',
                    color: avatar.faceShape === shape.id ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {shape.name}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'hair' && (
          <>
            <p style={{ marginBottom: '16px', color: '#888' }}>Hair color:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {HAIR_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => updateAvatar('hairColor', color)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: color,
                    border: avatar.hairColor === color ? '3px solid #FFFC00' : '3px solid transparent',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                />
              ))}
            </div>

            <p style={{ marginBottom: '16px', color: '#888' }}>Hair style:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {HAIR_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => updateAvatar('hairStyle', style.id)}
                  style={{
                    padding: '12px',
                    background: avatar.hairStyle === style.id ? '#FFFC00' : '#1a1a1a',
                    color: avatar.hairStyle === style.id ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'eyes' && (
          <>
            <p style={{ marginBottom: '16px', color: '#888' }}>Eye style:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {EYE_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => updateAvatar('eyeStyle', style.id)}
                  style={{
                    padding: '16px',
                    background: avatar.eyeStyle === style.id ? '#FFFC00' : '#1a1a1a',
                    color: avatar.eyeStyle === style.id ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'extras' && (
          <>
            <p style={{ marginBottom: '16px', color: '#888' }}>Accessories:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {ACCESSORIES.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => updateAvatar('accessory', acc.id)}
                  style={{
                    padding: '16px',
                    background: avatar.accessory === acc.id ? '#FFFC00' : '#1a1a1a',
                    color: avatar.accessory === acc.id ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{acc.emoji}</span>
                  <span>{acc.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


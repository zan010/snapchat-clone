import { useMemo } from 'react'

const HAIR_STYLES = {
  short: 'M12 4C8 4 6 6 6 9c0 1 .5 2 1 2.5V12h10v-.5c.5-.5 1-1.5 1-2.5 0-3-2-5-6-5z',
  medium: 'M12 3C7 3 5 6 5 10c0 2 1 3 1 3v1h12v-1s1-1 1-3c0-4-2-7-7-7z',
  long: 'M12 3C7 3 5 6 5 10v8h2v-6h10v6h2v-8c0-4-2-7-7-7z',
  curly: 'M12 3c-4 0-6 2-7 5-1 3 0 5 1 6h12c1-1 2-3 1-6-1-3-3-5-7-5zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  bald: '',
  spiky: 'M12 4l-2-2-1 3-3-1 1 3-3 1 3 1v2h10V9l3-1-3-1 1-3-3 1-1-3z'
}

const FACE_SHAPES = {
  round: { rx: 10, ry: 12 },
  oval: { rx: 9, ry: 13 },
  square: { rx: 10, ry: 11 }
}

export default function Avatar({ avatar, size = 40, name, showBorder = false, hasStory = false }) {
  const defaultAvatar = {
    skinTone: '#FFDFC4',
    hairColor: '#090806',
    hairStyle: 'short',
    faceShape: 'round',
    eyeStyle: 'normal',
    accessory: 'none'
  }

  const av = avatar || defaultAvatar
  const face = FACE_SHAPES[av.faceShape] || FACE_SHAPES.round
  const hairPath = HAIR_STYLES[av.hairStyle] || ''

  // Generate a color from username if no avatar
  const fallbackColor = useMemo(() => {
    if (!name) return '#FFFC00'
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    return colors[Math.abs(hash) % colors.length]
  }, [name])

  if (!avatar) {
    // Fallback to initials
    const initials = name ? name.charAt(0).toUpperCase() : '?'
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: fallbackColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.45,
          fontWeight: '700',
          color: '#000',
          border: hasStory ? '3px solid #FFFC00' : showBorder ? '2px solid #333' : 'none',
          boxSizing: 'border-box'
        }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: hasStory ? '3px solid #FFFC00' : showBorder ? '2px solid #333' : 'none',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 24 24">
        {/* Face */}
        <ellipse 
          cx="12" cy="13" 
          rx={face.rx * 0.45} ry={face.ry * 0.45} 
          fill={av.skinTone}
        />
        
        {/* Hair */}
        {hairPath && <path d={hairPath} fill={av.hairColor} />}
        
        {/* Eyes */}
        {av.eyeStyle === 'normal' && (
          <>
            <circle cx="9.5" cy="12" r="1" fill="#333" />
            <circle cx="14.5" cy="12" r="1" fill="#333" />
          </>
        )}
        {av.eyeStyle === 'big' && (
          <>
            <circle cx="9.5" cy="12" r="1.5" fill="#333" />
            <circle cx="14.5" cy="12" r="1.5" fill="#333" />
          </>
        )}
        {av.eyeStyle === 'sleepy' && (
          <>
            <path d="M8 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
            <path d="M13 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
          </>
        )}
        {av.eyeStyle === 'wink' && (
          <>
            <circle cx="9.5" cy="12" r="1" fill="#333" />
            <path d="M13 12h3" stroke="#333" strokeWidth="0.5" fill="none" />
          </>
        )}
        
        {/* Mouth */}
        <path d="M10 15.5 Q12 17 14 15.5" stroke="#333" strokeWidth="0.5" fill="none" />
        
        {/* Accessories */}
        {av.accessory === 'glasses' && (
          <>
            <circle cx="9" cy="12" r="2.5" stroke="#333" strokeWidth="0.5" fill="none" />
            <circle cx="15" cy="12" r="2.5" stroke="#333" strokeWidth="0.5" fill="none" />
            <path d="M11.5 12h1" stroke="#333" strokeWidth="0.5" />
          </>
        )}
        {av.accessory === 'sunglasses' && (
          <>
            <ellipse cx="9" cy="12" rx="2.5" ry="2" fill="#333" />
            <ellipse cx="15" cy="12" rx="2.5" ry="2" fill="#333" />
            <path d="M11.5 12h1" stroke="#333" strokeWidth="0.5" />
          </>
        )}
      </svg>
    </div>
  )
}


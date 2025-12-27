import { createContext, useContext, useState, useEffect } from 'react'

const themes = {
  default: {
    name: 'Snapchat Yellow',
    primary: '#FFFC00',
    secondary: '#000000',
    accent: '#00a8ff',
    gradient: 'linear-gradient(135deg, #FFFC00, #ff9500)'
  },
  purple: {
    name: 'Purple Vibes',
    primary: '#af52de',
    secondary: '#1a1a2e',
    accent: '#bf5af2',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  ocean: {
    name: 'Ocean Blue',
    primary: '#00a8ff',
    secondary: '#0a1628',
    accent: '#00d4ff',
    gradient: 'linear-gradient(135deg, #00a8ff, #00d4ff)'
  },
  sunset: {
    name: 'Sunset',
    primary: '#ff6b6b',
    secondary: '#1a1a1a',
    accent: '#ffa502',
    gradient: 'linear-gradient(135deg, #ff6b6b, #ffa502)'
  },
  mint: {
    name: 'Fresh Mint',
    primary: '#00d9a5',
    secondary: '#0d1f1c',
    accent: '#00ffcc',
    gradient: 'linear-gradient(135deg, #00d9a5, #00ffcc)'
  },
  pink: {
    name: 'Pink Dream',
    primary: '#ff2d92',
    secondary: '#1a0a12',
    accent: '#ff69b4',
    gradient: 'linear-gradient(135deg, #ff2d92, #ff69b4)'
  },
  dark: {
    name: 'Midnight Dark',
    primary: '#ffffff',
    secondary: '#000000',
    accent: '#666666',
    gradient: 'linear-gradient(135deg, #333333, #111111)'
  },
  neon: {
    name: 'Neon Glow',
    primary: '#0ff',
    secondary: '#0a0a0a',
    accent: '#f0f',
    gradient: 'linear-gradient(135deg, #0ff, #f0f)'
  }
}

const avatarColors = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
  'linear-gradient(135deg, #ff9a9e, #fecfef)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #ff6b6b, #ffa502)',
  'linear-gradient(135deg, #00d9a5, #00ffcc)',
  'linear-gradient(135deg, #ff2d92, #ff69b4)',
  'linear-gradient(135deg, #0ff, #f0f)'
]

const ThemeContext = createContext()

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('snapclone-theme') || 'default'
  })
  
  const [avatarColor, setAvatarColor] = useState(() => {
    return localStorage.getItem('snapclone-avatar') || avatarColors[0]
  })

  useEffect(() => {
    const theme = themes[currentTheme]
    document.documentElement.style.setProperty('--snap-yellow', theme.primary)
    document.documentElement.style.setProperty('--theme-primary', theme.primary)
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary)
    document.documentElement.style.setProperty('--theme-accent', theme.accent)
    document.documentElement.style.setProperty('--theme-gradient', theme.gradient)
    localStorage.setItem('snapclone-theme', currentTheme)
  }, [currentTheme])

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-gradient', avatarColor)
    localStorage.setItem('snapclone-avatar', avatarColor)
  }, [avatarColor])

  const value = {
    themes,
    currentTheme,
    setCurrentTheme,
    theme: themes[currentTheme],
    avatarColors,
    avatarColor,
    setAvatarColor
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}


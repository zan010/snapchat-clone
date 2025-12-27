import { useState } from 'react'

const filters = [
  { id: 'none', name: '✨', style: {}, desc: 'Normal' },
  { id: 'vintage', name: '📷', style: { filter: 'sepia(0.4) contrast(1.1) brightness(1.1)' }, desc: 'Vintage' },
  { id: 'warm', name: '🌅', style: { filter: 'saturate(1.3) hue-rotate(-10deg) brightness(1.05)' }, desc: 'Warm' },
  { id: 'cool', name: '❄️', style: { filter: 'saturate(0.9) hue-rotate(10deg) brightness(1.05)' }, desc: 'Cool' },
  { id: 'bw', name: '🖤', style: { filter: 'grayscale(1) contrast(1.1)' }, desc: 'B&W' },
  { id: 'dramatic', name: '🎭', style: { filter: 'contrast(1.4) saturate(1.2) brightness(0.95)' }, desc: 'Drama' },
  { id: 'fade', name: '🌫️', style: { filter: 'contrast(0.9) brightness(1.1) saturate(0.8)' }, desc: 'Fade' },
  { id: 'vivid', name: '🌈', style: { filter: 'saturate(1.5) contrast(1.15)' }, desc: 'Vivid' },
  { id: 'noir', name: '🎬', style: { filter: 'grayscale(1) contrast(1.3) brightness(0.9)' }, desc: 'Noir' },
  { id: 'golden', name: '✨', style: { filter: 'sepia(0.2) saturate(1.2) brightness(1.1) hue-rotate(-5deg)' }, desc: 'Golden' },
  { id: 'pink', name: '🌸', style: { filter: 'saturate(1.1) hue-rotate(-20deg) brightness(1.05)' }, desc: 'Pink' },
  { id: 'teal', name: '🌊', style: { filter: 'saturate(1.1) hue-rotate(150deg) brightness(1.05)' }, desc: 'Teal' },
  { id: 'neon', name: '💜', style: { filter: 'saturate(2) contrast(1.2) brightness(1.1) hue-rotate(280deg)' }, desc: 'Neon' },
  { id: 'sunset', name: '🌄', style: { filter: 'saturate(1.4) sepia(0.3) hue-rotate(-15deg) brightness(1.05)' }, desc: 'Sunset' },
  { id: 'forest', name: '🌲', style: { filter: 'saturate(1.2) hue-rotate(60deg) brightness(0.95)' }, desc: 'Forest' },
  { id: 'retro', name: '📺', style: { filter: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(1.3)' }, desc: 'Retro' },
  { id: 'dream', name: '💭', style: { filter: 'blur(0.5px) brightness(1.15) saturate(1.2)' }, desc: 'Dream' },
  { id: 'pop', name: '🎨', style: { filter: 'saturate(2.5) contrast(1.3)' }, desc: 'Pop Art' },
  { id: 'cinema', name: '🎥', style: { filter: 'contrast(1.1) brightness(0.9) saturate(0.85)' }, desc: 'Cinema' },
  { id: 'vhs', name: '📼', style: { filter: 'sepia(0.15) saturate(1.4) contrast(0.9) brightness(1.1)' }, desc: 'VHS' }
]

// Sticker overlays
const stickers = [
  { id: 'none', emoji: '❌' },
  { id: 'hearts', emoji: '💕' },
  { id: 'stars', emoji: '⭐' },
  { id: 'fire', emoji: '🔥' },
  { id: 'sparkle', emoji: '✨' },
  { id: 'rainbow', emoji: '🌈' },
  { id: 'crown', emoji: '👑' },
  { id: 'sunglasses', emoji: '😎' },
  { id: 'party', emoji: '🎉' },
  { id: 'love', emoji: '😍' },
  { id: 'cool', emoji: '😜' },
  { id: 'laugh', emoji: '😂' }
]

export default function CameraFilters({ selectedFilter, onSelectFilter, selectedSticker, onSelectSticker, previewImage }) {
  const [tab, setTab] = useState('filters')
  
  return (
    <div className="filters-container">
      {/* Tab Switcher */}
      <div className="filters-tabs">
        <button 
          className={`filters-tab ${tab === 'filters' ? 'active' : ''}`}
          onClick={() => setTab('filters')}
        >
          🎨 Filters
        </button>
        <button 
          className={`filters-tab ${tab === 'stickers' ? 'active' : ''}`}
          onClick={() => setTab('stickers')}
        >
          😊 Stickers
        </button>
      </div>
      
      {tab === 'filters' ? (
        <div className="filters-scroll">
          {filters.map((filter) => (
            <div 
              key={filter.id}
              className={`filter-item ${selectedFilter === filter.id ? 'selected' : ''}`}
              onClick={() => onSelectFilter(filter.id)}
            >
              <div 
                className="filter-preview"
                style={filter.style}
              >
                {previewImage ? (
                  <img src={previewImage} alt={filter.desc} />
                ) : (
                  <div className="filter-placeholder" />
                )}
                <span className="filter-emoji">{filter.name}</span>
              </div>
              <span className="filter-name">{filter.desc}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="filters-scroll stickers-scroll">
          {stickers.map((sticker) => (
            <div 
              key={sticker.id}
              className={`sticker-item ${selectedSticker === sticker.id ? 'selected' : ''}`}
              onClick={() => onSelectSticker?.(sticker.id)}
            >
              <span className="sticker-emoji">{sticker.emoji}</span>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .filters-container {
          position: absolute;
          bottom: 120px;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(10px);
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 12px 0;
          z-index: 50;
        }
        
        .filters-tabs {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 12px;
        }
        
        .filters-tab {
          flex: 1;
          padding: 8px 16px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 20px;
          color: #888;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filters-tab.active {
          background: var(--accent);
          color: #000;
        }
        
        .filters-scroll {
          display: flex;
          gap: 12px;
          padding: 0 16px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        
        .filters-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .filter-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }
        
        .filter-preview {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #333, #222);
          position: relative;
        }
        
        .filter-item.selected .filter-preview {
          border-color: var(--accent);
          box-shadow: 0 0 12px rgba(255,252,0,0.4);
        }
        
        .filter-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .filter-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, #444, #333);
        }
        
        .filter-emoji {
          position: absolute;
          font-size: 24px;
        }
        
        .filter-name {
          font-size: 11px;
          color: #888;
          text-align: center;
        }
        
        .filter-item.selected .filter-name {
          color: var(--accent);
        }
        
        .stickers-scroll {
          padding: 8px 16px;
        }
        
        .sticker-item {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        
        .sticker-item.selected {
          border-color: var(--accent);
          background: rgba(255,252,0,0.2);
          transform: scale(1.1);
        }
        
        .sticker-emoji {
          font-size: 28px;
        }
      `}</style>
    </div>
  )
}

export { filters, stickers }


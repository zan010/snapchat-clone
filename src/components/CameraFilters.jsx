import { useState } from 'react'

const filters = [
  { id: 'none', name: 'Normal', style: {} },
  { id: 'vintage', name: 'Vintage', style: { filter: 'sepia(0.4) contrast(1.1) brightness(1.1)' } },
  { id: 'warm', name: 'Warm', style: { filter: 'saturate(1.3) hue-rotate(-10deg) brightness(1.05)' } },
  { id: 'cool', name: 'Cool', style: { filter: 'saturate(0.9) hue-rotate(10deg) brightness(1.05)' } },
  { id: 'bw', name: 'B&W', style: { filter: 'grayscale(1) contrast(1.1)' } },
  { id: 'dramatic', name: 'Drama', style: { filter: 'contrast(1.4) saturate(1.2) brightness(0.95)' } },
  { id: 'fade', name: 'Fade', style: { filter: 'contrast(0.9) brightness(1.1) saturate(0.8)' } },
  { id: 'vivid', name: 'Vivid', style: { filter: 'saturate(1.5) contrast(1.15)' } },
  { id: 'noir', name: 'Noir', style: { filter: 'grayscale(1) contrast(1.3) brightness(0.9)' } },
  { id: 'golden', name: 'Golden', style: { filter: 'sepia(0.2) saturate(1.2) brightness(1.1) hue-rotate(-5deg)' } },
  { id: 'pink', name: 'Pink', style: { filter: 'saturate(1.1) hue-rotate(-20deg) brightness(1.05)' } },
  { id: 'teal', name: 'Teal', style: { filter: 'saturate(1.1) hue-rotate(150deg) brightness(1.05)' } }
]

export default function CameraFilters({ selectedFilter, onSelectFilter, previewImage }) {
  return (
    <div className="filters-container">
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
                <img src={previewImage} alt={filter.name} />
              ) : (
                <div className="filter-placeholder" />
              )}
            </div>
            <span className="filter-name">{filter.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { filters }


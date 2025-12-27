import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { ArrowLeft, Grid, List, Trash2, Download, X, Calendar, Image, Video } from 'lucide-react'

export default function Memories({ onClose }) {
  const { user } = useAuth()
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [filter, setFilter] = useState('all') // all, photos, videos

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'memories'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoriesList = []
      snapshot.forEach(doc => {
        memoriesList.push({ id: doc.id, ...doc.data() })
      })
      memoriesList.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      setMemories(memoriesList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const deleteMemory = async (memoryId) => {
    if (!confirm('Delete this memory forever?')) return
    
    try {
      await deleteDoc(doc(db, 'memories', memoryId))
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null)
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
    }
  }

  const downloadMemory = (memory) => {
    const link = document.createElement('a')
    link.href = memory.mediaData
    link.download = `snapclone-memory-${new Date(memory.savedAt).getTime()}.${memory.type === 'video' ? 'mp4' : 'jpg'}`
    link.click()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Group memories by date
  const groupedMemories = memories.reduce((groups, memory) => {
    const date = formatDate(memory.savedAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(memory)
    return groups
  }, {})

  const filteredMemories = memories.filter(m => {
    if (filter === 'photos') return m.type !== 'video'
    if (filter === 'videos') return m.type === 'video'
    return true
  })

  const photoCount = memories.filter(m => m.type !== 'video').length
  const videoCount = memories.filter(m => m.type === 'video').length

  return (
    <div className="memories-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Memories</h1>
        <button 
          className="header-btn"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
        </button>
      </div>

      {/* Stats */}
      <div className="memories-stats">
        <div className="stat">
          <span className="stat-value">{memories.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-value">{photoCount}</span>
          <span className="stat-label">Photos</span>
        </div>
        <div className="stat">
          <span className="stat-value">{videoCount}</span>
          <span className="stat-label">Videos</span>
        </div>
      </div>

      {/* Filters */}
      <div className="memories-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'photos' ? 'active' : ''}`}
          onClick={() => setFilter('photos')}
        >
          <Image size={16} /> Photos
        </button>
        <button 
          className={`filter-btn ${filter === 'videos' ? 'active' : ''}`}
          onClick={() => setFilter('videos')}
        >
          <Video size={16} /> Videos
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="empty-memories">
          <div className="empty-icon">📸</div>
          <h3>No Memories Yet</h3>
          <p>Save your snaps to memories to see them here!</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="memories-grid">
          {filteredMemories.map(memory => (
            <div 
              key={memory.id} 
              className="memory-item"
              onClick={() => setSelectedMemory(memory)}
            >
              {memory.type === 'video' ? (
                <>
                  <video src={memory.mediaData} />
                  <div className="video-badge">▶</div>
                </>
              ) : (
                <img src={memory.mediaData} alt="Memory" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="memories-list">
          {Object.entries(groupedMemories).map(([date, dateMemories]) => (
            <div key={date} className="memory-date-group">
              <div className="date-header">
                <Calendar size={14} />
                {date}
              </div>
              {dateMemories.map(memory => (
                <div 
                  key={memory.id} 
                  className="memory-list-item"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="memory-thumbnail">
                    {memory.type === 'video' ? (
                      <>
                        <video src={memory.mediaData} />
                        <span className="video-badge">▶</span>
                      </>
                    ) : (
                      <img src={memory.mediaData} alt="Memory" />
                    )}
                  </div>
                  <div className="memory-info">
                    <span className="memory-time">{formatTime(memory.savedAt)}</span>
                    {memory.caption && (
                      <span className="memory-caption">{memory.caption}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Memory Viewer */}
      {selectedMemory && (
        <div className="memory-viewer">
          <div className="memory-viewer-header">
            <button onClick={() => setSelectedMemory(null)}>
              <X size={24} />
            </button>
            <span>{formatDate(selectedMemory.savedAt)}</span>
            <div className="memory-actions">
              <button onClick={() => downloadMemory(selectedMemory)}>
                <Download size={20} />
              </button>
              <button onClick={() => deleteMemory(selectedMemory.id)}>
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          <div className="memory-viewer-content">
            {selectedMemory.type === 'video' ? (
              <video 
                src={selectedMemory.mediaData} 
                controls 
                autoPlay 
                playsInline
              />
            ) : (
              <img src={selectedMemory.mediaData} alt="Memory" />
            )}
            
            {selectedMemory.caption && (
              <div className="memory-viewer-caption">
                {selectedMemory.caption}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .memories-screen {
          position: fixed;
          inset: 0;
          background: var(--bg-primary);
          z-index: 100;
          overflow-y: auto;
        }

        .memories-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255,252,0,0.1), rgba(255,149,0,0.1));
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent);
        }

        .stat-label {
          font-size: 12px;
          color: #888;
        }

        .memories-filters {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: none;
          border-radius: 20px;
          color: #888;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn.active {
          background: var(--accent);
          color: #000;
        }

        .empty-memories {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-memories h3 {
          color: #fff;
          margin-bottom: 8px;
        }

        .empty-memories p {
          color: #888;
        }

        .memories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding: 2px;
        }

        .memory-item {
          aspect-ratio: 1;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .memory-item img,
        .memory-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
        }

        .memories-list {
          padding: 16px;
        }

        .memory-date-group {
          margin-bottom: 24px;
        }

        .date-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #888;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .memory-list-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .memory-thumbnail {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        .memory-thumbnail img,
        .memory-thumbnail video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .memory-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .memory-time {
          color: #888;
          font-size: 12px;
        }

        .memory-caption {
          color: #fff;
          font-size: 14px;
          margin-top: 4px;
        }

        .memory-viewer {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 200;
          display: flex;
          flex-direction: column;
        }

        .memory-viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
        }

        .memory-viewer-header button {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
        }

        .memory-viewer-header span {
          color: #fff;
          font-size: 14px;
        }

        .memory-actions {
          display: flex;
          gap: 8px;
        }

        .memory-viewer-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .memory-viewer-content img,
        .memory-viewer-content video {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .memory-viewer-caption {
          position: absolute;
          bottom: 80px;
          left: 0;
          right: 0;
          text-align: center;
          padding: 16px;
          color: #fff;
          font-size: 18px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  )
}


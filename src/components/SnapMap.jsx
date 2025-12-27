import { useState, useEffect } from 'react'
import { doc, updateDoc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, MapPin, Eye, EyeOff, Navigation, RefreshCw } from 'lucide-react'

export default function SnapMap({ onClose }) {
  const { user, userData } = useAuth()
  const [friendLocations, setFriendLocations] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ghostMode, setGhostMode] = useState(userData?.ghostMode || false)
  const [friends, setFriends] = useState({})
  const [error, setError] = useState(null)

  // Fetch friends data
  useEffect(() => {
    if (!userData?.friends?.length) return

    const fetchFriends = async () => {
      const friendsData = {}
      for (const friendId of userData.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId))
        if (friendDoc.exists()) {
          friendsData[friendId] = friendDoc.data()
        }
      }
      setFriends(friendsData)
    }
    fetchFriends()
  }, [userData?.friends])

  // Fetch friend locations
  useEffect(() => {
    if (!userData?.friends?.length) {
      setLoading(false)
      return
    }

    const unsubscribes = userData.friends.map(friendId => {
      return onSnapshot(doc(db, 'locations', friendId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          if (!data.ghostMode) {
            setFriendLocations(prev => {
              const filtered = prev.filter(l => l.id !== friendId)
              return [...filtered, { id: friendId, ...data }]
            })
          }
        }
      })
    })

    setLoading(false)
    return () => unsubscribes.forEach(unsub => unsub())
  }, [userData?.friends])

  // Get my location
  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString(),
          ghostMode: ghostMode
        }
        setMyLocation(location)

        // Save to database
        try {
          await updateDoc(doc(db, 'locations', user.uid), location).catch(async () => {
            // If document doesn't exist, create it
            const { setDoc } = await import('firebase/firestore')
            await setDoc(doc(db, 'locations', user.uid), location)
          })
        } catch (e) {
          console.error('Error updating location:', e)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('Could not get your location. Please enable location services.')
      },
      { enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    updateMyLocation()
  }, [])

  const toggleGhostMode = async () => {
    const newGhostMode = !ghostMode
    setGhostMode(newGhostMode)
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { ghostMode: newGhostMode })
      await updateDoc(doc(db, 'locations', user.uid), { ghostMode: newGhostMode })
    } catch (e) {
      console.error('Error toggling ghost mode:', e)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return 'Yesterday'
  }

  return (
    <div className="snap-map">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Snap Map</h1>
        <button 
          className="header-btn"
          onClick={updateMyLocation}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Ghost Mode Toggle */}
      <div className="ghost-mode-banner" onClick={toggleGhostMode}>
        <div className="ghost-icon">
          {ghostMode ? <EyeOff size={24} /> : <Eye size={24} />}
        </div>
        <div className="ghost-info">
          <span className="ghost-title">
            {ghostMode ? 'Ghost Mode On' : 'Ghost Mode Off'}
          </span>
          <span className="ghost-desc">
            {ghostMode ? 'Your location is hidden' : 'Friends can see your location'}
          </span>
        </div>
        <div className={`ghost-toggle ${ghostMode ? 'active' : ''}`}>
          <div className="ghost-toggle-handle" />
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="map-container">
        <div className="map-placeholder">
          <div className="map-grid">
            {/* Create a grid pattern */}
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="map-cell" />
            ))}
          </div>
          
          {/* My Location */}
          {myLocation && !ghostMode && (
            <div 
              className="map-marker my-marker"
              style={{ left: '50%', top: '50%' }}
            >
              <div className="marker-pulse" />
              <Avatar 
                avatar={userData?.avatar} 
                name={userData?.displayName} 
                size={40}
              />
              <span className="marker-label">You</span>
            </div>
          )}

          {/* Friend Locations */}
          {friendLocations.map((loc, index) => {
            const friend = friends[loc.id]
            if (!friend) return null
            
            // Pseudo-random position for visualization
            const seed = loc.id.charCodeAt(0) + loc.id.charCodeAt(1)
            const left = 20 + (seed % 60)
            const top = 20 + ((seed * 7) % 60)
            
            return (
              <div 
                key={loc.id}
                className="map-marker friend-marker"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <Avatar 
                  avatar={friend.avatar} 
                  name={friend.displayName} 
                  size={36}
                />
                <div className="marker-info">
                  <span className="marker-name">{friend.displayName}</span>
                  <span className="marker-time">{formatTime(loc.updatedAt)}</span>
                </div>
              </div>
            )
          })}

          {/* Center marker */}
          <div className="map-center">
            <Navigation size={24} />
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="map-friends">
        <h3>Friends on the Map</h3>
        {friendLocations.length === 0 ? (
          <p className="no-friends">No friends sharing location right now</p>
        ) : (
          <div className="map-friends-list">
            {friendLocations.map(loc => {
              const friend = friends[loc.id]
              if (!friend) return null
              
              return (
                <div key={loc.id} className="map-friend-item">
                  <Avatar 
                    avatar={friend.avatar} 
                    name={friend.displayName} 
                    size={44}
                  />
                  <div className="friend-info">
                    <span className="friend-name">{friend.displayName}</span>
                    <span className="friend-time">{formatTime(loc.updatedAt)}</span>
                  </div>
                  <MapPin size={18} color="#FFFC00" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="map-error">
          <p>{error}</p>
        </div>
      )}

      <style>{`
        .snap-map {
          position: fixed;
          inset: 0;
          background: var(--bg-primary);
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ghost-mode-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: ${ghostMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 252, 0, 0.1)'};
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
        }

        .ghost-icon {
          color: ${ghostMode ? '#8B5CF6' : 'var(--accent)'};
        }

        .ghost-info {
          flex: 1;
        }

        .ghost-title {
          display: block;
          font-weight: 600;
          color: #fff;
          font-size: 14px;
        }

        .ghost-desc {
          font-size: 12px;
          color: #888;
        }

        .ghost-toggle {
          width: 48px;
          height: 28px;
          border-radius: 14px;
          background: #444;
          padding: 2px;
          transition: all 0.2s;
        }

        .ghost-toggle.active {
          background: #8B5CF6;
        }

        .ghost-toggle-handle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s;
        }

        .ghost-toggle.active .ghost-toggle-handle {
          transform: translateX(20px);
        }

        .map-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .map-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          position: relative;
        }

        .map-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, 1fr);
          width: 100%;
          height: 100%;
          opacity: 0.1;
        }

        .map-cell {
          border: 1px solid rgba(255, 252, 0, 0.3);
        }

        .map-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .my-marker {
          z-index: 20;
        }

        .marker-pulse {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 252, 0, 0.3);
          animation: pulse 2s ease-out infinite;
        }

        .marker-label {
          background: var(--accent);
          color: #000;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .marker-info {
          background: rgba(0, 0, 0, 0.8);
          padding: 4px 8px;
          border-radius: 8px;
          text-align: center;
        }

        .marker-name {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }

        .marker-time {
          font-size: 10px;
          color: #888;
        }

        .map-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: rgba(255, 252, 0, 0.3);
          pointer-events: none;
        }

        .map-friends {
          background: var(--bg-secondary);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 20px;
          max-height: 200px;
          overflow-y: auto;
        }

        .map-friends h3 {
          font-size: 14px;
          color: #888;
          margin-bottom: 12px;
        }

        .no-friends {
          color: #666;
          text-align: center;
          padding: 20px;
        }

        .map-friends-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .map-friend-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .map-friend-item .friend-info {
          flex: 1;
        }

        .map-friend-item .friend-name {
          display: block;
          color: #fff;
          font-weight: 500;
        }

        .map-friend-item .friend-time {
          font-size: 12px;
          color: #888;
        }

        .map-error {
          position: absolute;
          bottom: 220px;
          left: 16px;
          right: 16px;
          background: rgba(255, 59, 48, 0.9);
          padding: 12px;
          border-radius: 12px;
          text-align: center;
        }

        .map-error p {
          color: #fff;
          font-size: 14px;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}


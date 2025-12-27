import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { doc, updateDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, MapPin, Eye, EyeOff, Navigation, RefreshCw, Locate } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom marker icon creator
const createCustomIcon = (color, isMe = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${isMe ? '48px' : '40px'};
        height: ${isMe ? '48px' : '40px'};
        border-radius: 50%;
        background: ${color};
        border: 3px solid ${isMe ? '#FFFC00' : '#fff'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #000;
        font-size: ${isMe ? '18px' : '14px'};
        ${isMe ? 'animation: pulse-marker 2s infinite;' : ''}
      ">
        ${isMe ? '📍' : '👤'}
      </div>
    `,
    iconSize: [isMe ? 48 : 40, isMe ? 48 : 40],
    iconAnchor: [isMe ? 24 : 20, isMe ? 24 : 20],
  })
}

// Component to recenter map
function RecenterMap({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 })
    }
  }, [position, map])
  return null
}

export default function SnapMap({ onClose }) {
  const { user, userData } = useAuth()
  const [friendLocations, setFriendLocations] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]) // Default to London
  const [loading, setLoading] = useState(true)
  const [ghostMode, setGhostMode] = useState(userData?.ghostMode || false)
  const [friends, setFriends] = useState({})
  const [error, setError] = useState(null)
  const [shouldRecenter, setShouldRecenter] = useState(null)

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

    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: new Date().toISOString(),
          ghostMode: ghostMode
        }
        setMyLocation(location)
        setMapCenter([location.lat, location.lng])
        setShouldRecenter([location.lat, location.lng])

        // Save to database
        try {
          await setDoc(doc(db, 'locations', user.uid), location, { merge: true })
        } catch (e) {
          console.error('Error updating location:', e)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        setError('Could not get your location. Please enable location services.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
      if (myLocation) {
        await setDoc(doc(db, 'locations', user.uid), { ...myLocation, ghostMode: newGhostMode }, { merge: true })
      }
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

  const myIcon = createCustomIcon('#FFFC00', true)
  const friendIcon = createCustomIcon('#4ECDC4', false)

  return createPortal(
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

      {/* Real Map */}
      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {shouldRecenter && <RecenterMap position={shouldRecenter} />}
          
          {/* My Location Marker */}
          {myLocation && !ghostMode && (
            <Marker 
              position={[myLocation.lat, myLocation.lng]} 
              icon={myIcon}
            >
              <Popup>
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <strong>📍 You are here</strong>
                  <br />
                  <small>Last updated: Just now</small>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Friend Location Markers */}
          {friendLocations.map(loc => {
            const friend = friends[loc.id]
            if (!friend) return null
            
            return (
              <Marker 
                key={loc.id}
                position={[loc.lat, loc.lng]} 
                icon={friendIcon}
              >
                <Popup>
                  <div style={{ textAlign: 'center', padding: '4px' }}>
                    <strong>{friend.displayName}</strong>
                    <br />
                    <small>{formatTime(loc.updatedAt)}</small>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Center on me button */}
        <button className="center-btn" onClick={() => {
          if (myLocation) {
            setShouldRecenter([myLocation.lat, myLocation.lng])
          } else {
            updateMyLocation()
          }
        }}>
          <Locate size={22} />
        </button>
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
                <div 
                  key={loc.id} 
                  className="map-friend-item"
                  onClick={() => setShouldRecenter([loc.lat, loc.lng])}
                >
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          z-index: 9999;
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

        .leaflet-container {
          background: #1a1a2e;
        }

        .center-btn {
          position: absolute;
          bottom: 20px;
          right: 16px;
          z-index: 1000;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #FFFC00;
          border: none;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
        }

        .center-btn:active {
          transform: scale(0.95);
        }

        .custom-marker {
          background: transparent !important;
          border: none !important;
        }

        @keyframes pulse-marker {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 252, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(255, 252, 0, 0);
          }
        }

        .map-friends {
          background: #1a1a1a;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 20px;
          max-height: 180px;
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
          cursor: pointer;
          transition: background 0.2s;
        }

        .map-friend-item:active {
          background: rgba(255, 255, 255, 0.1);
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
          bottom: 200px;
          left: 16px;
          right: 16px;
          background: rgba(255, 59, 48, 0.9);
          padding: 12px;
          border-radius: 12px;
          text-align: center;
          z-index: 1001;
        }

        .map-error p {
          color: #fff;
          font-size: 14px;
          margin: 0;
        }

        /* Leaflet popup styling */
        .leaflet-popup-content-wrapper {
          background: #1a1a1a;
          color: #fff;
          border-radius: 12px;
        }

        .leaflet-popup-tip {
          background: #1a1a1a;
        }

        .leaflet-popup-content {
          margin: 8px 12px;
        }
      `}</style>
    </div>,
    document.body
  )
}

import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, Heart, MessageCircle, Share2, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react'

export default function Spotlight({ onClose }) {
  const { user } = useAuth()
  const [spotlights, setSpotlights] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState({})
  const [users, setUsers] = useState({})
  const [touchStart, setTouchStart] = useState(null)
  const [showHeart, setShowHeart] = useState(false)
  const containerRef = useRef(null)

  // Fetch public stories as spotlights
  useEffect(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const q = query(
      collection(db, 'stories'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = []
      const userIds = new Set()

      snapshot.forEach(doc => {
        const data = doc.data()
        if (data.createdAt > twentyFourHoursAgo) {
          items.push({ id: doc.id, ...data })
          userIds.add(data.userId)
        }
      })

      // Fetch user data
      const usersData = {}
      for (const userId of userIds) {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          usersData[userId] = userDoc.data()
        }
      }
      setUsers(usersData)
      setSpotlights(items)
    })

    return () => unsubscribe()
  }, [])

  const handleLike = async (spotlight) => {
    if (liked[spotlight.id]) return

    setLiked(prev => ({ ...prev, [spotlight.id]: true }))
    setShowHeart(true)
    setTimeout(() => setShowHeart(false), 1000)

    try {
      await updateDoc(doc(db, 'stories', spotlight.id), {
        likes: arrayUnion(user.uid)
      })
    } catch (error) {
      console.error('Error liking spotlight:', error)
    }
  }

  const goToNext = () => {
    if (currentIndex < spotlights.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY)
  }

  const handleTouchEnd = (e) => {
    if (!touchStart) return

    const diff = touchStart - e.changedTouches[0].clientY

    if (diff > 50) {
      goToNext()
    } else if (diff < -50) {
      goToPrev()
    }

    setTouchStart(null)
  }

  const handleDoubleTap = (spotlight) => {
    handleLike(spotlight)
  }

  const handleShare = async (spotlight) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check this out on SnapClone!',
          text: spotlight.caption || 'Amazing spotlight!',
          url: window.location.origin
        })
      } catch (e) {}
    }
  }

  if (spotlights.length === 0) {
    return (
      <div className="spotlight-screen">
        <div className="header">
          <button className="header-btn" onClick={onClose}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="header-title">Spotlight</h1>
          <div style={{ width: 40 }} />
        </div>
        <div className="empty-spotlight">
          <div className="empty-icon">🌟</div>
          <h3>No Spotlights Yet</h3>
          <p>Be the first to share a story!</p>
        </div>
      </div>
    )
  }

  const currentSpotlight = spotlights[currentIndex]
  const currentUser = users[currentSpotlight?.userId]

  return (
    <div 
      className="spotlight-screen"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content */}
      <div 
        className="spotlight-content"
        onDoubleClick={() => handleDoubleTap(currentSpotlight)}
      >
        {currentSpotlight?.type === 'video' ? (
          <video 
            src={currentSpotlight.imageUrl || currentSpotlight.mediaData}
            autoPlay
            loop
            muted={muted}
            playsInline
          />
        ) : (
          <img 
            src={currentSpotlight?.imageUrl || currentSpotlight?.mediaData} 
            alt="Spotlight"
          />
        )}

        {/* Caption */}
        {currentSpotlight?.caption && (
          <div className="spotlight-caption">
            {currentSpotlight.caption}
          </div>
        )}

        {/* Double tap heart animation */}
        {showHeart && (
          <div className="spotlight-heart-anim">
            <Heart size={100} fill="#ff3b5c" color="#ff3b5c" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="spotlight-header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Spotlight</h1>
        <button className="header-btn" onClick={() => setMuted(!muted)}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* User Info */}
      <div className="spotlight-user">
        <Avatar 
          avatar={currentUser?.avatar}
          name={currentUser?.displayName}
          size={40}
        />
        <div className="spotlight-user-info">
          <span className="spotlight-username">@{currentUser?.username}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="spotlight-actions">
        <button 
          className={`spotlight-action ${liked[currentSpotlight?.id] ? 'liked' : ''}`}
          onClick={() => handleLike(currentSpotlight)}
        >
          <Heart 
            size={28} 
            fill={liked[currentSpotlight?.id] ? '#ff3b5c' : 'none'}
            color={liked[currentSpotlight?.id] ? '#ff3b5c' : '#fff'}
          />
          <span>{(currentSpotlight?.likes?.length || 0) + (liked[currentSpotlight?.id] ? 1 : 0)}</span>
        </button>
        
        <button className="spotlight-action">
          <MessageCircle size={28} />
          <span>Chat</span>
        </button>
        
        <button 
          className="spotlight-action"
          onClick={() => handleShare(currentSpotlight)}
        >
          <Share2 size={28} />
          <span>Share</span>
        </button>
      </div>

      {/* Navigation Hints */}
      <div className="spotlight-nav">
        {currentIndex > 0 && (
          <button className="nav-hint up" onClick={goToPrev}>
            <ChevronUp size={24} />
          </button>
        )}
        {currentIndex < spotlights.length - 1 && (
          <button className="nav-hint down" onClick={goToNext}>
            <ChevronDown size={24} />
          </button>
        )}
      </div>

      {/* Progress indicator */}
      <div className="spotlight-progress">
        <span>{currentIndex + 1} / {spotlights.length}</span>
      </div>

      <style>{`
        .spotlight-screen {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .spotlight-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spotlight-content img,
        .spotlight-content video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spotlight-caption {
          position: absolute;
          bottom: 160px;
          left: 16px;
          right: 80px;
          color: #fff;
          font-size: 15px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          line-height: 1.4;
        }

        .spotlight-heart-anim {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: heartPop 1s ease-out forwards;
        }

        @keyframes heartPop {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(1); }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        .spotlight-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
          z-index: 10;
        }

        .spotlight-user {
          position: absolute;
          bottom: 100px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
        }

        .spotlight-username {
          color: #fff;
          font-weight: 600;
        }

        .spotlight-actions {
          position: absolute;
          bottom: 80px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }

        .spotlight-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .spotlight-action:active {
          transform: scale(0.9);
        }

        .spotlight-action.liked {
          animation: likeScale 0.3s ease;
        }

        @keyframes likeScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        .spotlight-action span {
          font-size: 12px;
        }

        .spotlight-nav {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 10;
        }

        .nav-hint {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .spotlight-progress {
          position: absolute;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          z-index: 10;
        }

        .empty-spotlight {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-spotlight h3 {
          color: #fff;
          margin-bottom: 8px;
        }

        .empty-spotlight p {
          color: #888;
        }
      `}</style>
    </div>
  )
}


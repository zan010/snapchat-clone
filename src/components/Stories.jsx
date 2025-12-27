import { useState, useEffect, useRef } from 'react'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  getDocs,
  orderBy,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { Plus, X, Eye, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react'

export default function Stories({ onCaptureStory }) {
  const { user, userData } = useAuth()
  const [stories, setStories] = useState([])
  const [myStories, setMyStories] = useState([])
  const [viewingStory, setViewingStory] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [friends, setFriends] = useState({})
  const progressInterval = useRef(null)

  // Fetch friend data
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

  // Fetch my stories
  useEffect(() => {
    if (!user) return

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const q = query(
      collection(db, 'stories'),
      where('userId', '==', user.uid),
      where('createdAt', '>', twentyFourHoursAgo)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const myStoriesList = []
      snapshot.forEach(doc => {
        myStoriesList.push({ id: doc.id, ...doc.data() })
      })
      myStoriesList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      setMyStories(myStoriesList)
    })

    return () => unsubscribe()
  }, [user])

  // Fetch friends' stories
  useEffect(() => {
    if (!userData?.friends?.length) return

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const q = query(
      collection(db, 'stories'),
      where('userId', 'in', userData.friends.slice(0, 10)), // Firestore limit
      where('createdAt', '>', twentyFourHoursAgo)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesByUser = {}
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() }
        if (!storiesByUser[data.userId]) {
          storiesByUser[data.userId] = []
        }
        storiesByUser[data.userId].push(data)
      })
      
      // Sort each user's stories by time
      Object.keys(storiesByUser).forEach(userId => {
        storiesByUser[userId].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      })
      
      setStories(storiesByUser)
    })

    return () => unsubscribe()
  }, [userData?.friends])

  const openStory = (userId) => {
    const userStories = userId === user.uid ? myStories : stories[userId]
    if (!userStories?.length) return
    
    setViewingStory({ userId, stories: userStories })
    setCurrentIndex(0)
    setProgress(0)
    startProgress()
  }

  const startProgress = () => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext()
          return 0
        }
        return prev + 2
      })
    }, 100) // 5 seconds per story
  }

  const goToNext = () => {
    if (!viewingStory) return
    
    if (currentIndex < viewingStory.stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
      markAsViewed(viewingStory.stories[currentIndex + 1].id)
    } else {
      closeStory()
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setProgress(0)
    }
  }

  const closeStory = () => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    setViewingStory(null)
    setCurrentIndex(0)
    setProgress(0)
  }

  const markAsViewed = async (storyId) => {
    if (!storyId || !user) return
    try {
      await updateDoc(doc(db, 'stories', storyId), {
        viewedBy: arrayUnion(user.uid)
      })
    } catch (error) {
      console.error('Error marking story as viewed:', error)
    }
  }

  useEffect(() => {
    if (viewingStory && viewingStory.stories[currentIndex]) {
      markAsViewed(viewingStory.stories[currentIndex].id)
    }
  }, [viewingStory, currentIndex])

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const friendsWithStories = Object.keys(stories)
  const hasOwnStory = myStories.length > 0

  return (
    <>
      {/* Stories Bar */}
      <div className="stories-bar">
        {/* Add Story / My Story */}
        <div 
          className="story-item"
          onClick={() => hasOwnStory ? openStory(user.uid) : onCaptureStory?.()}
        >
          <div className={`story-avatar ${hasOwnStory ? 'has-story' : 'add-story'}`}>
            {hasOwnStory ? (
              <Avatar avatar={userData?.avatar} name={userData?.username} size={56} hasStory />
            ) : (
              <div className="add-story-btn">
                <Plus size={24} />
              </div>
            )}
          </div>
          <span className="story-name">
            {hasOwnStory ? 'My Story' : 'Add Story'}
          </span>
          {hasOwnStory && (
            <span className="story-views">
              {myStories.reduce((acc, s) => acc + (s.viewedBy?.length || 0), 0)} 👁️
            </span>
          )}
        </div>

        {/* Friends' Stories */}
        {friendsWithStories.map(userId => {
          const friend = friends[userId]
          if (!friend) return null
          
          return (
            <div 
              key={userId}
              className="story-item"
              onClick={() => openStory(userId)}
            >
              <div className="story-avatar has-story">
                <Avatar avatar={friend.avatar} name={friend.username} size={56} hasStory />
              </div>
              <span className="story-name">{friend.username}</span>
            </div>
          )
        })}
      </div>

      {/* Story Viewer */}
      {viewingStory && (
        <div className="story-viewer">
          {/* Progress bars */}
          <div className="story-progress-container">
            {viewingStory.stories.map((_, i) => (
              <div key={i} className="story-progress-bar">
                <div 
                  className="story-progress-fill"
                  style={{ 
                    width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="story-header">
            <div className="story-user-info">
              <Avatar 
                avatar={viewingStory.userId === user.uid ? userData?.avatar : friends[viewingStory.userId]?.avatar}
                name={viewingStory.userId === user.uid ? userData?.username : friends[viewingStory.userId]?.username}
                size={36}
              />
              <div>
                <span className="story-username">
                  {viewingStory.userId === user.uid ? 'My Story' : friends[viewingStory.userId]?.username}
                </span>
                <span className="story-time">
                  {formatTime(viewingStory.stories[currentIndex]?.createdAt)}
                </span>
              </div>
            </div>
            <button className="story-close" onClick={closeStory}>
              <X size={24} />
            </button>
          </div>

          {/* Story Content */}
          <div className="story-content">
            {viewingStory.stories[currentIndex]?.type === 'video' ? (
              <video 
                src={viewingStory.stories[currentIndex]?.mediaData}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img 
                src={viewingStory.stories[currentIndex]?.mediaData}
                alt="Story"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            
            {/* Caption */}
            {viewingStory.stories[currentIndex]?.caption && (
              <div className="story-caption">
                {viewingStory.stories[currentIndex].caption}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="story-nav">
            <div className="story-nav-left" onClick={goToPrev} />
            <div className="story-nav-right" onClick={goToNext} />
          </div>

          {/* Viewers (only for own stories) */}
          {viewingStory.userId === user.uid && (
            <div className="story-viewers">
              <Eye size={16} />
              <span>{viewingStory.stories[currentIndex]?.viewedBy?.length || 0} viewers</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .stories-bar {
          display: flex;
          gap: 16px;
          padding: 16px;
          overflow-x: auto;
          background: rgba(0,0,0,0.4);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .story-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 70px;
        }

        .story-avatar {
          position: relative;
        }

        .story-avatar.has-story::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid #FFFC00;
        }

        .add-story-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFFC00, #FF9500);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
        }

        .story-name {
          font-size: 11px;
          color: #fff;
          text-align: center;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .story-views {
          font-size: 10px;
          color: #888;
        }

        .story-viewer {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 1000;
        }

        .story-progress-container {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          z-index: 10;
        }

        .story-progress-bar {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
        }

        .story-progress-fill {
          height: 100%;
          background: #fff;
          transition: width 0.1s linear;
        }

        .story-header {
          position: absolute;
          top: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          z-index: 10;
        }

        .story-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .story-username {
          display: block;
          font-weight: 600;
          color: #fff;
          font-size: 14px;
        }

        .story-time {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }

        .story-close {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
        }

        .story-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .story-caption {
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

        .story-nav {
          position: absolute;
          inset: 0;
          display: flex;
          z-index: 5;
        }

        .story-nav-left,
        .story-nav-right {
          flex: 1;
          cursor: pointer;
        }

        .story-viewers {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-size: 14px;
        }
      `}</style>
    </>
  )
}

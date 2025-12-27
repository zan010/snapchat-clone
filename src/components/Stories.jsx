import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { Plus, X, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Memoized story item
const StoryItem = memo(({ storyGroup, onClick, isMine }) => {
  const initials = storyGroup.user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  
  return (
    <div className="story-item" onClick={() => onClick(storyGroup)}>
      <div className={`story-avatar has-story ${isMine ? 'my-story' : ''}`}>
        {initials}
      </div>
      <span className="story-name">
        {isMine ? 'My Story' : storyGroup.user.displayName?.split(' ')[0]}
      </span>
    </div>
  )
})

function Stories({ onAddStory }) {
  const { user, userData } = useAuth()
  const [stories, setStories] = useState([])
  const [myStory, setMyStory] = useState(null)
  const [viewingStory, setViewingStory] = useState(null)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!user) return

    const friendIds = userData?.friends || []
    const allUserIds = [...friendIds, user.uid]
    const now = new Date().toISOString()

    // Batch fetch all stories and user data
    const fetchAllStories = async () => {
      try {
        const storyPromises = allUserIds.map(async (userId) => {
          const storiesSnapshot = await getDocs(query(
            collection(db, 'stories'),
            where('userId', '==', userId),
            where('expiresAt', '>', now)
          ))
          
          if (storiesSnapshot.empty) return null
          
          const userDoc = await getDoc(doc(db, 'users', userId))
          if (!userDoc.exists()) return null
          
          const userStories = storiesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          
          return {
            user: { id: userId, ...userDoc.data() },
            stories: userStories,
            isMine: userId === user.uid
          }
        })

        const results = (await Promise.all(storyPromises)).filter(Boolean)
        
        setMyStory(results.find(r => r.isMine) || null)
        setStories(results.filter(r => !r.isMine))
      } catch (error) {
        console.error('Error fetching stories:', error)
      }
    }

    fetchAllStories()

    // Refresh stories every 30 seconds
    const interval = setInterval(fetchAllStories, 30000)
    return () => clearInterval(interval)
  }, [user, userData?.friends])

  const viewStory = useCallback((storyGroup) => {
    setViewingStory(storyGroup)
    setStoryIndex(0)
    setProgress(0)
  }, [])

  useEffect(() => {
    if (!viewingStory) return

    const duration = 5000
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (storyIndex < viewingStory.stories.length - 1) {
            setStoryIndex(i => i + 1)
            return 0
          } else {
            setViewingStory(null)
            return 0
          }
        }
        return prev + 2 // 5 seconds = 100% at 20ms intervals
      })
    }, 100)

    return () => clearInterval(interval)
  }, [viewingStory, storyIndex])

  const nextStory = useCallback(() => {
    if (storyIndex < viewingStory?.stories.length - 1) {
      setStoryIndex(i => i + 1)
      setProgress(0)
    } else {
      setViewingStory(null)
    }
  }, [storyIndex, viewingStory])

  const prevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1)
      setProgress(0)
    }
  }, [storyIndex])

  const closeStory = useCallback((e) => {
    e.stopPropagation()
    setViewingStory(null)
  }, [])

  const handlePrev = useCallback((e) => {
    e.stopPropagation()
    prevStory()
  }, [prevStory])

  const handleNext = useCallback((e) => {
    e.stopPropagation()
    nextStory()
  }, [nextStory])

  const currentStory = viewingStory?.stories[storyIndex]
  const viewerInitials = useMemo(() => 
    viewingStory?.user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  , [viewingStory])
  
  const myInitials = useMemo(() => 
    userData?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  , [userData?.displayName])

  return (
    <>
      <div className="stories-container">
        {/* Add Story Button */}
        <div className="story-item" onClick={onAddStory}>
          <div className="story-avatar add-story">
            {myStory ? (
              <>
                <span>{myInitials}</span>
                <div className="add-story-badge">
                  <Plus size={12} />
                </div>
              </>
            ) : (
              <Plus size={24} />
            )}
          </div>
          <span className="story-name">{myStory ? 'Add More' : 'Add'}</span>
        </div>

        {/* My Story */}
        {myStory && (
          <StoryItem storyGroup={myStory} onClick={viewStory} isMine />
        )}

        {/* Friends' Stories */}
        {stories.map((storyGroup) => (
          <StoryItem 
            key={storyGroup.user.id}
            storyGroup={storyGroup}
            onClick={viewStory}
          />
        ))}
      </div>

      {/* Story Viewer */}
      {viewingStory && currentStory && (
        <div className="story-viewer" onClick={nextStory}>
          {/* Progress Bars */}
          <div className="story-progress-container">
            {viewingStory.stories.map((_, idx) => (
              <div key={idx} className="story-progress-bar">
                <div 
                  className="story-progress-fill"
                  style={{ 
                    width: idx < storyIndex ? '100%' : 
                           idx === storyIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="story-viewer-header">
            <div className="story-viewer-user">
              <div className="story-viewer-avatar">{viewerInitials}</div>
              <div>
                <div className="story-viewer-name">{viewingStory.user.displayName}</div>
                <div className="story-viewer-time">
                  {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
            <button className="story-close-btn" onClick={closeStory}>
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="story-content">
            <img src={currentStory.imageUrl} alt="Story" loading="lazy" />
            {currentStory.caption && (
              <div className="story-caption">{currentStory.caption}</div>
            )}
          </div>

          {/* Navigation Areas */}
          <div className="story-nav-left" onClick={handlePrev} />
          <div className="story-nav-right" onClick={handleNext} />

          {/* Views */}
          {viewingStory.user.id === user.uid && (
            <div className="story-views">
              <Eye size={16} />
              {currentStory.views?.length || 0} views
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default memo(Stories)


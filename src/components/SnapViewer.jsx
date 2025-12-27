import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { formatDistanceToNow } from 'date-fns'
import { Download, MessageCircle, ChevronUp } from 'lucide-react'
import Avatar from './Avatar'

const REACTIONS = ['❤️', '😂', '🔥', '😮', '😢', '💯']

export default function SnapViewer({ snap, onClose, onReply }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [savedToMemories, setSavedToMemories] = useState(false)
  const [sentReaction, setSentReaction] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const progressRef = useRef(0)
  const intervalRef = useRef(null)
  const SNAP_DURATION = 7000 // 7 seconds

  useEffect(() => {
    // Mark as viewed
    const markViewed = async () => {
      try {
        await updateDoc(doc(db, 'snaps', snap.id), {
          viewed: true,
          viewedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error marking snap as viewed:', error)
      }
    }

    markViewed()
    startTimer()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [snap])

  const startTimer = () => {
    const startTime = Date.now() - (progressRef.current / 100) * SNAP_DURATION
    
    intervalRef.current = setInterval(() => {
      if (isPaused) return
      
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / SNAP_DURATION) * 100, 100)
      progressRef.current = newProgress
      setProgress(newProgress)

      if (elapsed >= SNAP_DURATION) {
        clearInterval(intervalRef.current)
        handleClose()
      }
    }, 50)
  }

  const pauseTimer = () => {
    setIsPaused(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const resumeTimer = () => {
    setIsPaused(false)
    startTimer()
  }

  const handleClose = async () => {
    onClose()
  }

  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
    pauseTimer()
  }

  const handleTouchEnd = (e) => {
    if (!touchStart) {
      resumeTimer()
      return
    }

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }

    const diffY = touchStart.y - touchEnd.y
    const diffX = Math.abs(touchStart.x - touchEnd.x)

    // Swipe up to reply
    if (diffY > 100 && diffX < 50) {
      setShowReply(true)
      setShowReactions(true)
    } else {
      resumeTimer()
    }

    setTouchStart(null)
  }

  const saveToMemories = async () => {
    try {
      await addDoc(collection(db, 'memories'), {
        userId: user.uid,
        mediaData: snap.imageUrl,
        type: 'image',
        caption: snap.caption,
        savedAt: new Date().toISOString(),
        originalSnapId: snap.id
      })
      setSavedToMemories(true)
      setTimeout(() => setSavedToMemories(false), 2000)
    } catch (error) {
      console.error('Error saving to memories:', error)
    }
  }

  const sendReaction = async (emoji) => {
    setSentReaction(emoji)
    setShowReactions(false)
    
    // Send reaction as a chat message
    try {
      const chatId = [user.uid, snap.senderId].sort().join('_')
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        text: `Reacted ${emoji} to your snap`,
        type: 'reaction',
        createdAt: new Date().toISOString(),
        reaction: emoji
      })
    } catch (error) {
      console.error('Error sending reaction:', error)
    }

    setTimeout(() => {
      setSentReaction(null)
      resumeTimer()
    }, 1500)
  }

  const sendReply = async () => {
    if (!replyText.trim()) return

    try {
      const chatId = [user.uid, snap.senderId].sort().join('_')
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        text: replyText,
        type: 'snap-reply',
        createdAt: new Date().toISOString()
      })
      setReplyText('')
      setShowReply(false)
      resumeTimer()
    } catch (error) {
      console.error('Error sending reply:', error)
    }
  }

  return (
    <div 
      className="snap-viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => !showReply && handleClose()}
    >
      <div className="snap-progress">
        <div 
          className="snap-progress-bar" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="snap-viewer-header" onClick={e => e.stopPropagation()}>
        <Avatar name={snap.senderName} size={40} />
        <div className="snap-viewer-info">
          <div className="snap-viewer-name">{snap.senderName}</div>
          <div className="snap-viewer-time">
            {formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      <div className="snap-viewer-content">
        <img src={snap.imageUrl} alt="Snap" />
        {snap.caption && (
          <div className="snap-text-overlay">
            {snap.caption}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="snap-viewer-actions" onClick={e => e.stopPropagation()}>
        <button 
          className="snap-action-btn"
          onClick={saveToMemories}
        >
          <Download size={24} />
          {savedToMemories && <span className="saved-text">Saved!</span>}
        </button>
        
        <div className="swipe-hint">
          <ChevronUp size={20} />
          <span>Swipe up to reply</span>
        </div>
        
        <button 
          className="snap-action-btn"
          onClick={() => setShowReactions(!showReactions)}
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Reaction Picker */}
      {showReactions && (
        <div className="snap-reactions" onClick={e => e.stopPropagation()}>
          {REACTIONS.map(emoji => (
            <button 
              key={emoji}
              className="snap-reaction-btn"
              onClick={() => sendReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {showReply && (
        <div className="snap-reply-container" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Send a reply..."
            autoFocus
            onKeyPress={e => e.key === 'Enter' && sendReply()}
          />
          <button onClick={sendReply} disabled={!replyText.trim()}>
            Send
          </button>
        </div>
      )}

      {/* Sent Reaction Animation */}
      {sentReaction && (
        <div className="sent-reaction">
          <span className="reaction-emoji">{sentReaction}</span>
          <span className="reaction-text">Sent!</span>
        </div>
      )}

      <style>{`
        .snap-viewer-actions {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          pointer-events: none;
        }

        .snap-action-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          position: relative;
        }

        .saved-text {
          position: absolute;
          bottom: -20px;
          font-size: 12px;
          color: var(--accent);
          white-space: nowrap;
        }

        .swipe-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          animation: bounceUp 2s ease-in-out infinite;
        }

        @keyframes bounceUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .snap-reactions {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.8);
          padding: 12px 16px;
          border-radius: 40px;
          animation: scaleIn 0.2s ease-out;
        }

        @keyframes scaleIn {
          from { transform: translateX(-50%) scale(0); opacity: 0; }
          to { transform: translateX(-50%) scale(1); opacity: 1; }
        }

        .snap-reaction-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          font-size: 24px;
          cursor: pointer;
          transition: transform 0.15s;
        }

        .snap-reaction-btn:active {
          transform: scale(1.2);
        }

        .snap-reply-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          gap: 8px;
          padding: 16px;
          background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
        }

        .snap-reply-container input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 24px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 16px;
        }

        .snap-reply-container input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .snap-reply-container button {
          padding: 12px 20px;
          border-radius: 24px;
          border: none;
          background: var(--accent);
          color: #000;
          font-weight: 600;
          cursor: pointer;
        }

        .snap-reply-container button:disabled {
          opacity: 0.5;
        }

        .sent-reaction {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: popIn 1.5s ease-out forwards;
        }

        @keyframes popIn {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          40% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        .reaction-emoji {
          font-size: 80px;
        }

        .reaction-text {
          font-size: 18px;
          color: #fff;
          font-weight: 600;
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}


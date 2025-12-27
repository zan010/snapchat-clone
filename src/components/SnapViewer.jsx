import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { formatDistanceToNow } from 'date-fns'

export default function SnapViewer({ snap, onClose }) {
  const [progress, setProgress] = useState(0)
  const SNAP_DURATION = 5000 // 5 seconds

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

    // Progress timer
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / SNAP_DURATION) * 100, 100)
      setProgress(newProgress)

      if (elapsed >= SNAP_DURATION) {
        clearInterval(interval)
        handleClose()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [snap])

  const handleClose = async () => {
    // Keep the snap for 24 hours so sender can see "Opened" status
    // Then auto-delete via a scheduled function or client-side check
    // For now, just close the viewer - the viewed status is already saved
    onClose()
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  return (
    <div className="snap-viewer" onClick={handleClose}>
      <div className="snap-progress">
        <div 
          className="snap-progress-bar" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="snap-viewer-header">
        <div className="snap-viewer-avatar">
          {getInitials(snap.senderName)}
        </div>
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
    </div>
  )
}


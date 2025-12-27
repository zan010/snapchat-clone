import { useState, useRef, useEffect } from 'react'
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { X, RotateCcw, Send, Image, Check, Flame, Sparkles } from 'lucide-react'
import CameraFilters, { filters, stickers } from './CameraFilters'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const triggerHaptic = async (style = ImpactStyle.Medium) => {
  try { await Haptics.impact({ style }) } catch (e) {}
}

const playSound = (url) => {
  const audio = new Audio(url)
  audio.volume = 0.4
  audio.play().catch(e => {})
}

const SOUNDS = {
  SHUTTER: 'https://assets.mixkit.co/active_storage/sfx/702/702-preview.mp3',
  SENT: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
}

export default function Camera({ onClose, preselectedFriend = null }) {
  const { user, userData } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState('user')
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturedVideo, setCapturedVideo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [captionText, setCaptionText] = useState('')
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState(preselectedFriend ? [preselectedFriend.id] : [])
  const [sending, setSending] = useState(false)
  const [showSendTo, setShowSendTo] = useState(false)
  const [toast, setToast] = useState(null)
  const [mode, setMode] = useState('photo') // 'photo' or 'video'
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [selectedSticker, setSelectedSticker] = useState('none')
  const [showFilters, setShowFilters] = useState(false)
  const isStoryMode = preselectedFriend === 'story'

  // Get sticker emoji
  const getStickerEmoji = () => {
    const sticker = stickers?.find(s => s.id === selectedSticker)
    return sticker?.emoji || null
  }

  // Check and request permissions first
  const checkPermissions = async () => {
    // For iOS Safari, we need to trigger getUserMedia to get the permission prompt
    // The Permissions API doesn't work reliably on all browsers
    
    try {
      // This should trigger the permission prompt on first access
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      // Stop the test stream immediately
      testStream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      console.log('Permission check failed:', error)
      return false
    }
  }

  // Start camera
  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      startCamera()
    }, 100)
    return () => {
      clearTimeout(timer)
      stopCamera()
    }
  }, [facingMode, mode])

  // Fetch friends
  useEffect(() => {
    if (!userData?.friends) return

    const fetchFriends = async () => {
      const friendsData = []
      for (const friendId of userData.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId))
        if (friendDoc.exists()) {
          friendsData.push({ id: friendDoc.id, ...friendDoc.data() })
        }
      }
      setFriends(friendsData)
    }

    fetchFriends()
  }, [userData])

  const [cameraError, setCameraError] = useState(null)

  const startCamera = async () => {
    setCameraError(null)
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera not supported on this browser. Try Chrome or Safari.')
      return
    }

    try {
      // Try with exact facingMode first for better camera selection
      let mediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: mode === 'video'
        })
      } catch (exactError) {
        // Fall back to non-exact facingMode
        console.log('Exact facingMode failed, trying flexible:', exactError)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: mode === 'video'
        })
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
      setCameraError(null)
    } catch (error) {
      console.error('Camera error:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera access in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setCameraError('Camera is in use by another app. Close other apps and try again.')
      } else if (error.name === 'OverconstrainedError') {
        // Try with simpler constraints
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: mode === 'video'
          })
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream
          }
          setStream(simpleStream)
          setCameraError(null)
          return
        } catch (e) {
          setCameraError('Could not start camera. Please try again.')
        }
      } else {
        setCameraError('Could not access camera. Please check permissions.')
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }

  const flipCamera = async () => {
    // Stop current stream first
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    
    // Restart camera with new facing mode
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: newFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: mode === 'video'
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
      setCameraError(null)
    } catch (error) {
      console.log('Flip camera error, trying without exact constraint:', error)
      // Some devices don't support exact facingMode, try without it
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: mode === 'video'
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setStream(mediaStream)
        setCameraError(null)
      } catch (e) {
        console.error('Could not switch camera:', e)
        showToast('Could not switch camera', 'error')
        // Revert to previous facing mode
        setFacingMode(facingMode)
        startCamera()
      }
    }
  }

  // Video recording
  const startRecording = () => {
    if (!stream) return
    
    recordedChunksRef.current = []
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const videoUrl = URL.createObjectURL(blob)
      setCapturedVideo(videoUrl)
      stopCamera()
    }
    
    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start()
    setIsRecording(true)
    setRecordingTime(0)
    
    // Recording timer
    const interval = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) { // Max 60 seconds
          stopRecording()
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    playSound(SOUNDS.SHUTTER)
    triggerHaptic(ImpactStyle.Heavy)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    
    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    
    ctx.drawImage(video, 0, 0)
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageData)
    stopCamera()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setCapturedImage(event.target.result)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setCapturedVideo(null)
    setCaptionText('')
    setShowSendTo(false)
    setSelectedFriends(preselectedFriend ? [preselectedFriend.id] : [])
    setRecordingTime(0)
    startCamera()
  }

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  // Compress image to fit in Firestore (under 1MB)
  const compressImage = (dataUrl, maxWidth = 800) => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = dataUrl
    })
  }

  const sendSnap = async () => {
    if (selectedFriends.length === 0 || (!capturedImage && !capturedVideo)) return
    setSending(true)
    
    triggerHaptic(ImpactStyle.Medium)

    try {
      let mediaUrl = ''
      let mediaType = 'image'
      
      if (capturedVideo) {
        // For video, we'll store a smaller version
        // In production, you'd upload to cloud storage
        mediaUrl = capturedVideo
        mediaType = 'video'
        showToast('Video snaps are preview-only (not saved)', 'info')
      } else {
        // Compress image to store directly in Firestore
        mediaUrl = await compressImage(capturedImage)
        mediaType = 'image'
      }
      
      const imageUrl = mediaUrl

      // Send to each selected friend
      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.id === friendId)
        
        // Calculate and update streak
        const streakId = [user.uid, friendId].sort().join('_')
        const streakRef = doc(db, 'streaks', streakId)
        const streakDoc = await getDoc(streakRef)
        
        let currentStreak = 0
        const now = new Date()
        
        if (streakDoc.exists()) {
          const streakData = streakDoc.data()
          const lastSnapDate = new Date(streakData.lastSnapAt)
          const hoursSinceLastSnap = (now - lastSnapDate) / (1000 * 60 * 60)
          
          if (hoursSinceLastSnap < 24) {
            // Streak continues
            currentStreak = streakData.count
          } else if (hoursSinceLastSnap >= 24 && hoursSinceLastSnap < 48) {
            // Need both users to snap within 24 hours
            // Check if the other user hasn't snapped yet today
            if (streakData.lastSnappedBy !== user.uid) {
              currentStreak = streakData.count + 1
            } else {
              currentStreak = streakData.count
            }
          } else {
            // Streak broken
            currentStreak = 1
          }
          
          await updateDoc(streakRef, {
            count: currentStreak,
            lastSnapAt: now.toISOString(),
            lastSnappedBy: user.uid
          })
        } else {
          // New streak
          currentStreak = 1
          await setDoc(streakRef, {
            users: [user.uid, friendId],
            count: 1,
            lastSnapAt: now.toISOString(),
            lastSnappedBy: user.uid,
            startedAt: now.toISOString()
          })
        }

        // Create snap document
        await addDoc(collection(db, 'snaps'), {
          senderId: user.uid,
          senderName: userData.displayName,
          senderUsername: userData.username,
          recipientId: friendId,
          recipientName: friend?.displayName,
          imageUrl,
          caption: captionText,
          viewed: false,
          streak: currentStreak,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        })

        // Update snap scores
        await updateDoc(doc(db, 'users', user.uid), {
          snapScore: increment(1)
        })
      }

      showToast(`Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`, 'success')
      playSound(SOUNDS.SENT)
      
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Send error:', error)
      showToast('Failed to send snap', 'error')
    } finally {
      setSending(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Post to story
  const postToStory = async () => {
    if (!capturedImage) return
    setSending(true)

    try {
      const imageUrl = await compressImage(capturedImage)
      const now = new Date()
      
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        userName: userData.displayName,
        imageUrl,
        caption: captionText,
        filter: selectedFilter,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        views: []
      })

      showToast('Story posted!', 'success')
      setTimeout(() => onClose(), 1000)
    } catch (error) {
      console.error('Story post error:', error)
      showToast('Failed to post story', 'error')
    } finally {
      setSending(false)
    }
  }

  // Get current filter style
  const getCurrentFilterStyle = () => {
    const filter = filters.find(f => f.id === selectedFilter)
    return filter?.style || {}
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  return (
    <div className="camera-screen">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {!capturedImage && !capturedVideo ? (
        <>
          <div className="camera-preview">
            {cameraError ? (
              <div className="camera-error">
                <div className="camera-error-icon">📷</div>
                <h3>Camera Access Needed</h3>
                <p>{cameraError}</p>
                
                <div className="camera-error-steps">
                  <p><strong>📱 iPhone/iPad (Safari):</strong></p>
                  <p>1. Open <strong>Settings</strong> app</p>
                  <p>2. Scroll down to <strong>Safari</strong></p>
                  <p>3. Tap <strong>Camera</strong> → Select <strong>"Allow"</strong></p>
                  <p>4. Come back and tap "Try Again"</p>
                </div>

                <div className="camera-error-steps" style={{ marginTop: '12px' }}>
                  <p><strong>📱 Android (Chrome):</strong></p>
                  <p>1. Tap the <strong>⋮ menu</strong> → <strong>Settings</strong></p>
                  <p>2. Tap <strong>Site settings</strong> → <strong>Camera</strong></p>
                  <p>3. Make sure it's set to <strong>"Ask first"</strong> or add this site</p>
                </div>

                <div className="camera-error-steps" style={{ marginTop: '12px', background: 'rgba(255, 149, 0, 0.1)' }}>
                  <p><strong>⚠️ Still not working?</strong></p>
                  <p>Try opening this link in Safari (iPhone) or Chrome (Android) instead of in-app browser</p>
                </div>
                
                <button className="btn btn-primary" onClick={startCamera} style={{ marginTop: '16px', width: '100%' }}>
                  🔄 Try Again
                </button>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '12px', width: '100%' }}>
                  📁 Upload Photo Instead
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  ...getCurrentFilterStyle()
                }}
              />
            )}
            
            {/* Filter Button */}
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
              style={{ position: 'absolute', bottom: '180px', right: '16px' }}
            >
              <Sparkles size={24} />
            </button>
            
            {/* Filters */}
            {showFilters && (
              <CameraFilters 
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                selectedSticker={selectedSticker}
                onSelectSticker={setSelectedSticker}
                previewImage={null}
              />
            )}
            
            {/* Sticker Overlay */}
            {selectedSticker !== 'none' && getStickerEmoji() && (
              <div className="sticker-overlay">
                <span className="sticker-display">{getStickerEmoji()}</span>
              </div>
            )}
            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-dot" />
                <span>{recordingTime}s</span>
              </div>
            )}
          </div>

          <div className="camera-top-controls">
            <button className="camera-action-btn" onClick={onClose}>
              <X size={24} />
            </button>
            <button className="camera-action-btn" onClick={flipCamera}>
              <RotateCcw size={24} />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="camera-mode-toggle">
            <button 
              className={`mode-btn ${mode === 'photo' ? 'active' : ''}`}
              onClick={() => setMode('photo')}
            >
              📷 Photo
            </button>
            <button 
              className={`mode-btn ${mode === 'video' ? 'active' : ''}`}
              onClick={() => setMode('video')}
            >
              🎥 Video
            </button>
          </div>

          <div className="camera-controls">
            <button 
              className="camera-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={24} />
            </button>
            
            {mode === 'photo' ? (
              <button className="capture-btn" onClick={capturePhoto} />
            ) : (
              <button 
                className={`capture-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
              />
            )}
            
            <div style={{ width: 48 }} />
          </div>
        </>
      ) : (
        <>
          <div className="snap-preview">
            {capturedVideo ? (
              <video 
                src={capturedVideo} 
                autoPlay 
                loop 
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <img src={capturedImage} alt="Captured" />
            )}
            {captionText && (
              <div className="snap-text-overlay">
                {captionText}
              </div>
            )}
          </div>

          <div className="camera-top-controls">
            <button className="camera-action-btn" onClick={retakePhoto}>
              <X size={24} />
            </button>
          </div>

          {!showSendTo ? (
            <>
              <input
                type="text"
                className="snap-text-input"
                placeholder="Add a caption..."
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                maxLength={100}
              />
              <div className="camera-controls">
                <div style={{ width: 48 }} />
                <button 
                  className="capture-btn" 
                  style={{ background: '#00a8ff' }}
                  onClick={() => setShowSendTo(true)}
                >
                  <Send size={28} color="white" style={{ marginLeft: 4 }} />
                </button>
                <div style={{ width: 48 }} />
              </div>
            </>
          ) : (
            <div className="send-controls">
              <div className="send-to-list">
                {friends.length === 0 ? (
                  <div className="empty-state" style={{ padding: '16px' }}>
                    <p>Add friends to send snaps!</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`send-to-item ${selectedFriends.includes(friend.id) ? 'selected' : ''}`}
                      onClick={() => toggleFriend(friend.id)}
                    >
                      <div className="friend-avatar">
                        {getInitials(friend.displayName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="friend-name">{friend.displayName}</div>
                      </div>
                      {selectedFriends.includes(friend.id) && (
                        <Check size={20} />
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {isStoryMode ? (
                <button
                  className="send-btn story-btn"
                  onClick={postToStory}
                  disabled={sending}
                  style={{ background: 'var(--theme-gradient)' }}
                >
                  <Sparkles size={20} />
                  {sending ? 'Posting...' : 'Post to Story'}
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={sendSnap}
                  disabled={selectedFriends.length === 0 || sending}
                >
                  <Send size={20} />
                  {sending ? 'Sending...' : `Send to ${selectedFriends.length || ''} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}


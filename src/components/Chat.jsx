import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { 
  collection, query, onSnapshot, addDoc, orderBy, 
  doc, updateDoc, limit, setDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { ArrowLeft, Send, Camera, Phone, Video, Mic, Square, Play, Search, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Extended reactions list
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '💯', '🙏', '💀', '👀', '🎉']

// Memoized message component
const ChatMessage = memo(({ msg, isOwn, onDoubleClick, showReactions, onAddReaction }) => {
  const reactions = REACTIONS
  
  return (
    <div 
      className={`chat-message ${isOwn ? 'sent' : 'received'}`}
      onDoubleClick={() => onDoubleClick(msg.id)}
    >
      <div className="chat-bubble">
        {msg.type === 'voice' ? (
          <div className="voice-message">
            <button 
              className="voice-play-btn"
              onClick={() => new Audio(msg.audioUrl).play()}
            >
              <Play size={16} />
            </button>
            <div className="voice-waveform">
              {msg.waveform?.map((h, i) => (
                <div key={i} className="voice-bar" style={{ height: `${h}%` }} />
              )) || [...Array(12)].map((_, i) => (
                <div key={i} className="voice-bar" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
            <span className="voice-duration">{msg.duration}s</span>
          </div>
        ) : (
          msg.text
        )}
        {msg.reaction && (
          <div className="message-reaction">{msg.reaction}</div>
        )}
      </div>
      <div className="chat-time">
        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
        {isOwn && msg.read && <span className="read-receipt"> ✓✓</span>}
      </div>
      
      {showReactions && (
        <div className="reaction-picker">
          {reactions.map((emoji) => (
            <button 
              key={emoji}
              className="reaction-btn"
              onClick={() => onAddReaction(msg.id, emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

function Chat({ friend, onClose, onOpenCamera, onStartCall }) {
  const { user, userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0)
  const [showReactions, setShowReactions] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [friendTyping, setFriendTyping] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const typingTimeoutRef = useRef(null)

  const chatId = useMemo(() => [user.uid, friend.id].sort().join('_'), [user.uid, friend.id])
  const initials = useMemo(() => 
    friend.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  , [friend.displayName])

  useEffect(() => {
    // Listen to messages
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = []
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() })
      })
      setMessages(msgs)
      
      // Mark messages as read
      msgs.forEach(async (msg) => {
        if (msg.senderId !== user.uid && !msg.read) {
          try {
            await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
              read: true
            })
          } catch (e) {}
        }
      })
    }, (error) => {
      console.log('Messages query error:', error)
    })

    return () => unsubscribe()
  }, [chatId, user.uid])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return
    const messageText = newMessage.trim()
    setNewMessage('') // Clear immediately for responsiveness
    setSending(true)

    try {
      const now = new Date().toISOString()
      
      // Send message and update chat metadata in parallel
      await Promise.all([
        addDoc(collection(db, 'chats', chatId, 'messages'), {
          text: messageText,
          senderId: user.uid,
          senderName: userData.displayName,
          recipientId: friend.id,
          createdAt: now,
          read: false
        }),
        updateDoc(doc(db, 'chats', chatId), {
          lastMessage: messageText,
          lastMessageAt: now,
          lastSenderId: user.uid
        }).catch(() => 
          setDoc(doc(db, 'chats', chatId), {
            participants: [user.uid, friend.id],
            lastMessage: messageText,
            lastMessageAt: now,
            lastSenderId: user.uid
          })
        )
      ])
    } catch (error) {
      console.error('Send message error:', error)
      setNewMessage(messageText) // Restore on error
    } finally {
      setSending(false)
    }
  }, [newMessage, sending, chatId, user.uid, userData.displayName, friend.id])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Voice message recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          await sendVoiceMessage(reader.result)
        }
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecordingVoice(true)
      setVoiceRecordingTime(0)
      
      const interval = setInterval(() => {
        setVoiceRecordingTime(prev => prev + 1)
      }, 1000)
      
      mediaRecorderRef.current.intervalId = interval
    } catch (error) {
      console.error('Error starting voice recording:', error)
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      clearInterval(mediaRecorderRef.current.intervalId)
      mediaRecorderRef.current.stop()
      setIsRecordingVoice(false)
    }
  }

  const sendVoiceMessage = async (audioData) => {
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'voice',
        audioUrl: audioData,
        duration: voiceRecordingTime,
        senderId: user.uid,
        senderName: userData.displayName,
        recipientId: friend.id,
        createdAt: new Date().toISOString(),
        read: false
      })
    } catch (error) {
      console.error('Error sending voice message:', error)
    }
  }

  // Message reactions
  const addReaction = useCallback(async (messageId, emoji) => {
    setShowReactions(null)
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        reaction: emoji,
        reactionBy: user.uid
      })
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }, [chatId, user.uid])

  const handleShowReactions = useCallback((msgId) => {
    setShowReactions(prev => prev === msgId ? null : msgId)
  }, [])

  // Typing indicator (debounced)
  const handleTyping = useCallback(() => {
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'chats', chatId), {
        [`typing_${user.uid}`]: false
      }).catch(() => {})
    }, 2000)
  }, [chatId, user.uid])

  const handleVoiceCall = useCallback(() => onStartCall(friend, false), [onStartCall, friend])
  const handleVideoCall = useCallback(() => onStartCall(friend, true), [onStartCall, friend])
  const handleCamera = useCallback(() => onOpenCamera(friend), [onOpenCamera, friend])

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-info">
          <div className="chat-header-avatar">{initials}</div>
          <div>
            <div className="chat-header-name">{friend.displayName}</div>
            <div className="chat-header-username">@{friend.username}</div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="header-btn" onClick={() => setShowSearch(!showSearch)}>
            <Search size={20} />
          </button>
          <button className="header-btn" onClick={handleVoiceCall}>
            <Phone size={20} />
          </button>
          <button className="header-btn" onClick={handleVideoCall}>
            <Video size={20} />
          </button>
          <button className="header-btn" onClick={handleCamera}>
            <Camera size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="chat-search-bar">
          <Search size={18} color="#888" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <div className="chat-messages">
        {(() => {
          const filteredMessages = searchQuery
            ? messages.filter(msg => 
                msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : messages

          if (filteredMessages.length === 0) {
            return (
              <div className="chat-empty">
                {searchQuery ? (
                  <>
                    <p>No messages found</p>
                    <p>Try a different search term</p>
                  </>
                ) : (
                  <>
                    <p>No messages yet</p>
                    <p>Say hi to {friend.displayName}! 👋</p>
                  </>
                )}
              </div>
            )
          }

          return filteredMessages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === user.uid}
              onDoubleClick={handleShowReactions}
              showReactions={showReactions === msg.id}
              onAddReaction={addReaction}
            />
          ))
        })()}
        
        {friendTyping && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
            <span>{friend.displayName} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {isRecordingVoice ? (
          <div className="voice-recording-ui">
            <div className="recording-indicator-inline">
              <div className="recording-dot" />
              <span>{voiceRecordingTime}s</span>
            </div>
            <button className="voice-stop-btn" onClick={stopVoiceRecording}>
              <Square size={20} />
            </button>
          </div>
        ) : (
          <>
            <button className="voice-record-btn" onClick={startVoiceRecording}>
              <Mic size={20} />
            </button>
            <input
              type="text"
              className="chat-input"
              placeholder="Send a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              maxLength={500}
            />
            <button 
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Send size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(Chat)


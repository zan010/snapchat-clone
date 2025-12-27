import { useState, useEffect, useRef } from 'react'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, Send, Image, Users, Settings, Plus, X, Camera, Check } from 'lucide-react'

export default function GroupChat({ group, onClose, onOpenCamera }) {
  const { user, userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [members, setMembers] = useState({})
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch group messages
  useEffect(() => {
    if (!group?.id) return

    const q = query(
      collection(db, 'groupMessages'),
      where('groupId', '==', group.id),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = []
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() })
      })
      setMessages(msgs)
      scrollToBottom()
    })

    return () => unsubscribe()
  }, [group?.id])

  // Fetch member data
  useEffect(() => {
    if (!group?.members?.length) return

    const fetchMembers = async () => {
      const membersData = {}
      for (const memberId of group.members) {
        const memberDoc = await getDoc(doc(db, 'users', memberId))
        if (memberDoc.exists()) {
          membersData[memberId] = memberDoc.data()
        }
      }
      setMembers(membersData)
    }
    fetchMembers()
  }, [group?.members])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await addDoc(collection(db, 'groupMessages'), {
        groupId: group.id,
        senderId: user.uid,
        senderName: userData.displayName,
        text: newMessage.trim(),
        createdAt: new Date().toISOString(),
        type: 'text'
      })

      // Update group's last message
      await updateDoc(doc(db, 'groups', group.id), {
        lastMessage: newMessage.trim(),
        lastMessageAt: new Date().toISOString(),
        lastMessageBy: user.uid
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  return (
    <div className="chat-screen group-chat">
      {/* Header */}
      <div className="chat-header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        
        <div className="chat-header-info" onClick={() => setShowMembers(true)}>
          <div className="group-avatar">
            {group.emoji || '👥'}
          </div>
          <div>
            <h2>{group.name}</h2>
            <span className="member-count">{group.members?.length} members</span>
          </div>
        </div>

        <button className="header-btn" onClick={() => setShowMembers(true)}>
          <Users size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="message-date-group">
            <div className="date-divider">
              <span>{date}</span>
            </div>
            
            {dateMessages.map((msg, idx) => {
              const isOwn = msg.senderId === user.uid
              const showAvatar = !isOwn && (
                idx === 0 || dateMessages[idx - 1]?.senderId !== msg.senderId
              )
              
              return (
                <div 
                  key={msg.id} 
                  className={`chat-message ${isOwn ? 'sent' : 'received'}`}
                >
                  {!isOwn && showAvatar && (
                    <div className="message-avatar">
                      <Avatar 
                        avatar={members[msg.senderId]?.avatar}
                        name={msg.senderName}
                        size={28}
                      />
                    </div>
                  )}
                  {!isOwn && !showAvatar && <div className="message-avatar-placeholder" />}
                  
                  <div className="chat-bubble-container">
                    {!isOwn && showAvatar && (
                      <span className="sender-name">{msg.senderName}</span>
                    )}
                    <div className="chat-bubble">
                      {msg.type === 'image' ? (
                        <img src={msg.imageUrl} alt="Shared" />
                      ) : (
                        <p>{msg.text}</p>
                      )}
                      <span className="message-time">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input-container" onSubmit={sendMessage}>
        <button 
          type="button" 
          className="chat-action-btn"
          onClick={() => onOpenCamera?.()}
        >
          <Camera size={20} />
        </button>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
          className="chat-input"
        />
        
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
        >
          <Send size={20} />
        </button>
      </form>

      {/* Members Panel */}
      {showMembers && (
        <div className="members-panel">
          <div className="members-header">
            <button onClick={() => setShowMembers(false)}>
              <X size={20} />
            </button>
            <h3>Group Members</h3>
            <div style={{ width: 40 }} />
          </div>
          
          <div className="members-list">
            {group.members?.map(memberId => {
              const member = members[memberId]
              const isAdmin = group.admins?.includes(memberId)
              
              return (
                <div key={memberId} className="member-item">
                  <Avatar 
                    avatar={member?.avatar}
                    name={member?.displayName}
                    size={44}
                  />
                  <div className="member-info">
                    <span className="member-name">
                      {member?.displayName || 'Loading...'}
                      {memberId === user.uid && ' (You)'}
                    </span>
                    <span className="member-username">@{member?.username}</span>
                  </div>
                  {isAdmin && <span className="admin-badge">Admin</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        .group-chat .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .group-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #FF9500);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .member-count {
          font-size: 12px;
          color: #888;
        }

        .message-avatar {
          margin-right: 8px;
          flex-shrink: 0;
        }

        .message-avatar-placeholder {
          width: 36px;
          flex-shrink: 0;
        }

        .sender-name {
          display: block;
          font-size: 11px;
          color: #888;
          margin-bottom: 4px;
          margin-left: 4px;
        }

        .chat-bubble-container {
          display: flex;
          flex-direction: column;
        }

        .date-divider {
          text-align: center;
          padding: 16px 0;
        }

        .date-divider span {
          background: rgba(255,255,255,0.1);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          color: #888;
        }

        .members-panel {
          position: absolute;
          inset: 0;
          background: var(--bg-primary);
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .members-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .members-header button {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 8px;
        }

        .members-header h3 {
          color: #fff;
        }

        .members-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          display: block;
          color: #fff;
          font-weight: 500;
        }

        .member-username {
          font-size: 13px;
          color: #888;
        }

        .admin-badge {
          background: var(--accent);
          color: #000;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}


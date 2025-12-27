import { useState, useEffect, useCallback, memo } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { Settings, Flame, MessageCircle, Sparkles, Send, Users, Plus } from 'lucide-react'
import Stories from './Stories'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import StreakWidget from './StreakWidget'

// Best friend emojis based on interaction level
const getBestFriendEmoji = (streak) => {
  if (streak >= 100) return '💯'
  if (streak >= 50) return '🔥'
  if (streak >= 30) return '⭐'
  if (streak >= 14) return '💛'
  if (streak >= 7) return '💕'
  return null
}

// Memoized conversation item for better performance
const ConversationItem = memo(({ conv, onConversationClick, currentUserId }) => {
  const bfEmoji = getBestFriendEmoji(conv.streak)
  const initials = conv.friend.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const hasUnread = conv.unreadSnaps?.length > 0
  const hasSentSnap = conv.sentSnaps?.length > 0
  const lastSentSnap = conv.sentSnaps?.[0]
  
  // Determine status display
  const getStatusDisplay = () => {
    // Priority 1: Received unread snap
    if (hasUnread) {
      return {
        className: 'new-snap',
        icon: <div className="snap-status-icon received">📥</div>,
        text: 'Tap to view',
        statusText: 'New Snap'
      }
    }
    
    // Priority 2: Sent snap status
    if (hasSentSnap) {
      if (lastSentSnap.viewed) {
        return {
          className: 'snap-opened',
          icon: <div className="snap-status-icon opened">📭</div>,
          text: 'Opened',
          statusText: null
        }
      } else {
        return {
          className: 'snap-delivered',
          icon: <div className="snap-status-icon delivered">📬</div>,
          text: 'Delivered',
          statusText: null
        }
      }
    }
    
    // Priority 3: Chat message
    if (conv.chat?.lastMessage) {
      const isSent = conv.chat.lastSenderId === currentUserId
      return {
        className: '',
        icon: isSent ? <Send size={12} /> : <MessageCircle size={12} />,
        text: conv.chat.lastMessage.slice(0, 22) + (conv.chat.lastMessage.length > 22 ? '...' : ''),
        statusText: null
      }
    }
    
    // Default
    return {
      className: '',
      icon: <MessageCircle size={12} />,
      text: 'Tap to chat',
      statusText: null
    }
  }
  
  const status = getStatusDisplay()
  
  return (
    <div 
      className="friend-item"
      onClick={() => onConversationClick(conv)}
    >
      <div className={`friend-avatar ${hasUnread ? 'has-snap' : ''}`}>
        {initials}
      </div>
      
      <div className="friend-info">
        <div className="friend-name">
          {conv.friend.displayName}
          {bfEmoji && <span className="bf-emoji">{bfEmoji}</span>}
        </div>
        <div className={`friend-status ${status.className}`}>
          {status.icon}
          <span>{status.text}</span>
          {status.statusText && <span className="status-badge">{status.statusText}</span>}
        </div>
      </div>

      {conv.streak > 0 && (
        <div className="friend-streak">
          <Flame size={16} className="flame-icon" />
          {conv.streak}
        </div>
      )}
    </div>
  )
})

function ChatList({ onViewSnap, onOpenChat, onOpenSettings, onOpenGroup, onCreateGroup, onAddStory, onOpenCamera }) {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch groups
  useEffect(() => {
    if (!user) return

    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    )

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsList = []
      snapshot.forEach(doc => {
        groupsList.push({ id: doc.id, ...doc.data() })
      })
      groupsList.sort((a, b) => {
        const aTime = a.lastMessageAt || a.createdAt || '1970-01-01'
        const bTime = b.lastMessageAt || b.createdAt || '1970-01-01'
        return new Date(bTime) - new Date(aTime)
      })
      setGroups(groupsList)
    })

    return () => unsubscribe()
  }, [user])

  // Optimized data fetching with parallel requests
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([])
      setLoading(false)
      return
    }

    // If no friends yet, show empty but don't error
    if (!userData?.friends?.length) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      // Fetch all data in parallel for each friend
      const promises = userData.friends.map(async (friendId) => {
        try {
          const [friendDoc, chatDoc, streakDoc] = await Promise.all([
            getDoc(doc(db, 'users', friendId)),
            getDoc(doc(db, 'chats', [user.uid, friendId].sort().join('_'))),
            getDoc(doc(db, 'streaks', [user.uid, friendId].sort().join('_')))
          ])

          if (!friendDoc.exists()) return null

          // Fetch snaps separately to avoid index issues
          let unreadSnaps = []
          let sentSnaps = []
          
          try {
            const receivedSnapsSnapshot = await getDocs(query(
              collection(db, 'snaps'),
              where('recipientId', '==', user.uid),
              where('senderId', '==', friendId),
              where('viewed', '==', false)
            ))
            unreadSnaps = receivedSnapsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          } catch (e) {
            console.log('Skipping unread snaps query')
          }

          try {
            const sentSnapsSnapshot = await getDocs(query(
              collection(db, 'snaps'),
              where('senderId', '==', user.uid),
              where('recipientId', '==', friendId)
            ))
            // Get most recent sent snap
            const sorted = sentSnapsSnapshot.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            sentSnaps = sorted.slice(0, 1)
          } catch (e) {
            console.log('Skipping sent snaps query')
          }

          return {
            odId: friendId,
            friend: { id: friendDoc.id, ...friendDoc.data() },
            chat: chatDoc.exists() ? chatDoc.data() : null,
            streak: streakDoc.exists() ? streakDoc.data().count : 0,
            unreadSnaps,
            sentSnaps
          }
        } catch (err) {
          console.error('Error fetching friend data:', friendId, err)
          return null
        }
      })

      const results = await Promise.all(promises)
      const convos = results.filter(Boolean)

      // Sort: friends with unread snaps first, then by last activity
      convos.sort((a, b) => {
        // Unread snaps come first
        if (a.unreadSnaps?.length && !b.unreadSnaps?.length) return -1
        if (!a.unreadSnaps?.length && b.unreadSnaps?.length) return 1
        
        // Then by last activity
        const aTime = a.chat?.lastMessageAt || a.sentSnaps?.[0]?.createdAt || '1970-01-01'
        const bTime = b.chat?.lastMessageAt || b.sentSnaps?.[0]?.createdAt || '1970-01-01'
        return new Date(bTime) - new Date(aTime)
      })

      setConversations(convos)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [user, userData?.friends])

  // Refetch when friends list changes
  useEffect(() => {
    fetchConversations()
  }, [userData?.friends?.length, fetchConversations])

  useEffect(() => {
    if (!user) return

    // Debounced listener for snap updates (both sent and received)
    let timeoutId = null
    
    // Listen for received snaps
    const receivedSnapsQuery = query(
      collection(db, 'snaps'),
      where('recipientId', '==', user.uid)
    )

    // Listen for sent snaps (to see when they're opened)
    const sentSnapsQuery = query(
      collection(db, 'snaps'),
      where('senderId', '==', user.uid)
    )

    const handleUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(fetchConversations, 500)
    }

    const unsub1 = onSnapshot(receivedSnapsQuery, handleUpdate)
    const unsub2 = onSnapshot(sentSnapsQuery, handleUpdate)

    return () => {
      unsub1()
      unsub2()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user, fetchConversations])

  const handleConversationClick = useCallback((conv) => {
    if (conv.unreadSnaps && conv.unreadSnaps.length > 0) {
      onViewSnap(conv.unreadSnaps[0])
    } else {
      onOpenChat(conv.friend)
    }
  }, [onViewSnap, onOpenChat])

  // Memoized header buttons
  const handleProfile = useCallback(() => navigate('/profile'), [navigate])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="chat-list">
      <div className="header">
        <div style={{ width: 40 }} />
        <h1 className="header-title">SnapClone</h1>
        <button className="header-btn" onClick={handleProfile}>
          <Settings size={20} />
        </button>
      </div>

      {/* Stories */}
      <Stories onCaptureStory={onAddStory} />

      {/* Streak Widget */}
      <StreakWidget onOpenCamera={onOpenCamera} />

      {/* Groups Section */}
      {groups.length > 0 && (
        <div className="friends-list" style={{ marginBottom: 0, paddingBottom: 0 }}>
          <div className="section-header" style={{ marginBottom: '8px' }}>
            <Users size={16} />
            <span>Groups</span>
            <button 
              className="create-group-btn"
              onClick={onCreateGroup}
              style={{ marginLeft: 'auto' }}
            >
              <Plus size={16} />
            </button>
          </div>
          {groups.map((group) => (
            <div 
              key={group.id}
              className="friend-item group-item"
              onClick={() => onOpenGroup(group)}
            >
              <div className="group-avatar-icon">
                {group.emoji || '👥'}
              </div>
              <div className="friend-info">
                <div className="friend-name">{group.name}</div>
                <div className="friend-status">
                  <span>{group.members?.length} members</span>
                  {group.lastMessage && (
                    <span> • {group.lastMessage.slice(0, 20)}...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {conversations.length === 0 && groups.length === 0 ? (
        <div className="empty-state">
          <MessageCircle size={64} />
          <h3>No friends yet</h3>
          <p>Add friends to start chatting and snapping!</p>
        </div>
      ) : conversations.length > 0 && (
        <div className="friends-list">
          <div className="section-header">
            <Sparkles size={16} />
            <span>Chats</span>
          </div>
          {conversations.map((conv) => (
            <ConversationItem 
              key={conv.friend.id}
              conv={conv}
              onConversationClick={handleConversationClick}
              currentUserId={user.uid}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(ChatList)

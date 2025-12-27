import { useState, useEffect } from 'react'
import { 
  collection, query, where, getDocs, addDoc, deleteDoc, doc, 
  updateDoc, arrayUnion, onSnapshot, getDoc 
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { Search, UserPlus, Check, X, Clock, Flame, Users } from 'lucide-react'

export default function FriendsList() {
  const { user, userData } = useAuth()
  const [tab, setTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [friendRequests, setFriendRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [streaks, setStreaks] = useState({})
  const [toast, setToast] = useState(null)

  // Fetch friend requests
  useEffect(() => {
    if (!user) return

    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = []
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() })
      })
      setFriendRequests(requests)
    })

    return () => unsubscribe()
  }, [user])

  // Fetch sent requests
  useEffect(() => {
    if (!user) return

    const sentQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', user.uid),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(sentQuery, (snapshot) => {
      const requests = []
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() })
      })
      setSentRequests(requests)
    })

    return () => unsubscribe()
  }, [user])

  // Fetch friends
  useEffect(() => {
    if (!userData?.friends) {
      setFriends([])
      return
    }

    const fetchFriends = async () => {
      const friendsData = []
      for (const friendId of userData.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId))
        if (friendDoc.exists()) {
          friendsData.push({ id: friendDoc.id, ...friendDoc.data() })
          
          // Fetch streak
          const streakId = [user.uid, friendId].sort().join('_')
          const streakDoc = await getDoc(doc(db, 'streaks', streakId))
          if (streakDoc.exists()) {
            setStreaks(prev => ({ ...prev, [friendId]: streakDoc.data().count }))
          }
        }
      }
      setFriends(friendsData)
    }

    fetchFriends()
  }, [userData, user])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)

    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('usernameLower', '==', searchQuery.toLowerCase().trim())
      )
      const snapshot = await getDocs(usersQuery)
      
      const results = []
      snapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          results.push({ id: doc.id, ...doc.data() })
        }
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (toUser) => {
    try {
      // Check if already friends
      if (userData?.friends?.includes(toUser.id)) {
        showToast('Already friends!', 'error')
        return
      }

      // Check if request already sent
      const existingQuery = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', user.uid),
        where('toUserId', '==', toUser.id),
        where('status', '==', 'pending')
      )
      const existingSnapshot = await getDocs(existingQuery)
      
      if (!existingSnapshot.empty) {
        showToast('Request already sent!', 'error')
        return
      }

      // Check if they already sent us a request
      const reverseQuery = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', toUser.id),
        where('toUserId', '==', user.uid),
        where('status', '==', 'pending')
      )
      const reverseSnapshot = await getDocs(reverseQuery)
      
      if (!reverseSnapshot.empty) {
        // Auto-accept their request
        await acceptRequest(reverseSnapshot.docs[0].id, toUser.id)
        return
      }

      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        fromUsername: userData.username,
        fromDisplayName: userData.displayName,
        toUserId: toUser.id,
        toUsername: toUser.username,
        status: 'pending',
        createdAt: new Date().toISOString()
      })

      showToast('Friend request sent!', 'success')
    } catch (error) {
      console.error('Send request error:', error)
      showToast('Failed to send request', 'error')
    }
  }

  const acceptRequest = async (requestId, fromUserId) => {
    try {
      // Add to both users' friends arrays
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(fromUserId)
      })
      
      await updateDoc(doc(db, 'users', fromUserId), {
        friends: arrayUnion(user.uid)
      })

      // Delete the request
      await deleteDoc(doc(db, 'friendRequests', requestId))

      showToast('Friend added!', 'success')
    } catch (error) {
      console.error('Accept error:', error)
      showToast('Failed to accept request', 'error')
    }
  }

  const declineRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId))
      showToast('Request declined', 'success')
    } catch (error) {
      console.error('Decline error:', error)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const isRequestPending = (userId) => {
    return sentRequests.some(r => r.toUserId === userId)
  }

  const isFriend = (userId) => {
    return userData?.friends?.includes(userId)
  }

  return (
    <div className="friends-screen">
      <div className="header">
        <h1 className="header-title">Friends</h1>
      </div>

      <div className="add-friend-section">
        <div className="search-wrapper">
          <Search />
          <input
            type="text"
            className="search-input"
            placeholder="Search by username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {searchQuery && (
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '12px' }}
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            {searchResults.map((result) => (
              <div key={result.id} className="user-result">
                <div className="friend-avatar">
                  {getInitials(result.displayName)}
                </div>
                <div className="user-result-info">
                  <div className="user-result-name">{result.displayName}</div>
                  <div className="user-result-username">@{result.username}</div>
                </div>
                <button 
                  className={`add-btn ${isRequestPending(result.id) || isFriend(result.id) ? 'pending-btn' : ''}`}
                  onClick={() => sendFriendRequest(result)}
                  disabled={isRequestPending(result.id) || isFriend(result.id)}
                >
                  {isFriend(result.id) ? 'Friends' : isRequestPending(result.id) ? 'Pending' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="empty-state" style={{ paddingTop: '24px' }}>
            <p>No users found with that username</p>
          </div>
        )}
      </div>

      {friendRequests.length > 0 && (
        <div className="requests-section">
          <div className="section-title">Friend Requests ({friendRequests.length})</div>
          {friendRequests.map((request) => (
            <div key={request.id} className="request-item">
              <div className="friend-avatar">
                {getInitials(request.fromDisplayName)}
              </div>
              <div className="friend-info" style={{ flex: 1 }}>
                <div className="friend-name">{request.fromDisplayName}</div>
                <div className="friend-status">@{request.fromUsername}</div>
              </div>
              <div className="request-actions">
                <button 
                  className="accept-btn"
                  onClick={() => acceptRequest(request.id, request.fromUserId)}
                >
                  <Check size={18} />
                </button>
                <button 
                  className="decline-btn"
                  onClick={() => declineRequest(request.id)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="friends-list">
        <div className="section-title">My Friends ({friends.length})</div>
        
        {friends.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No friends yet</h3>
            <p>Search for friends by their username above</p>
          </div>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="friend-item">
              <div className="friend-avatar">
                {getInitials(friend.displayName)}
              </div>
              <div className="friend-info">
                <div className="friend-name">{friend.displayName}</div>
                <div className="friend-status">@{friend.username}</div>
              </div>
              {streaks[friend.id] > 0 && (
                <div className="friend-streak">
                  <Flame size={16} />
                  {streaks[friend.id]}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}


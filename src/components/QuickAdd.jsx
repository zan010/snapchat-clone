import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, limit, doc, getDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { UserPlus, X, Check, Users, RefreshCw } from 'lucide-react'

export default function QuickAdd({ onClose }) {
  const { user, userData } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sentRequests, setSentRequests] = useState([])

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const suggestionsList = []
      const addedIds = new Set([user.uid, ...(userData?.friends || [])])

      // Strategy 1: Get friends of friends (mutual friends)
      if (userData?.friends?.length > 0) {
        for (const friendId of userData.friends.slice(0, 5)) {
          const friendDoc = await getDoc(doc(db, 'users', friendId))
          if (friendDoc.exists()) {
            const friendData = friendDoc.data()
            if (friendData.friends) {
              for (const mutualId of friendData.friends.slice(0, 10)) {
                if (!addedIds.has(mutualId)) {
                  const mutualDoc = await getDoc(doc(db, 'users', mutualId))
                  if (mutualDoc.exists()) {
                    suggestionsList.push({
                      id: mutualDoc.id,
                      ...mutualDoc.data(),
                      reason: `Friends with ${friendData.displayName}`,
                      mutualFriend: friendData.displayName
                    })
                    addedIds.add(mutualId)
                  }
                }
              }
            }
          }
        }
      }

      // Strategy 2: Get random recent users if not enough suggestions
      if (suggestionsList.length < 10) {
        const usersQuery = query(
          collection(db, 'users'),
          limit(20)
        )
        const snapshot = await getDocs(usersQuery)
        
        snapshot.forEach(docSnapshot => {
          if (!addedIds.has(docSnapshot.id)) {
            suggestionsList.push({
              id: docSnapshot.id,
              ...docSnapshot.data(),
              reason: 'New on SnapClone'
            })
            addedIds.add(docSnapshot.id)
          }
        })
      }

      // Shuffle and limit
      setSuggestions(suggestionsList.sort(() => Math.random() - 0.5).slice(0, 15))
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendRequest = async (toUser) => {
    if (sentRequests.includes(toUser.id)) return

    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: user.uid,
        fromUsername: userData.username,
        fromDisplayName: userData.displayName,
        toUserId: toUser.id,
        toUsername: toUser.username,
        status: 'pending',
        createdAt: new Date().toISOString()
      })

      setSentRequests(prev => [...prev, toUser.id])
    } catch (error) {
      console.error('Error sending request:', error)
    }
  }

  const dismissSuggestion = (userId) => {
    setSuggestions(prev => prev.filter(s => s.id !== userId))
  }

  return (
    <div className="quick-add-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <X size={20} />
        </button>
        <h1 className="header-title">Quick Add</h1>
        <button className="header-btn" onClick={fetchSuggestions}>
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="quick-add-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="empty-quick-add">
            <Users size={48} />
            <h3>No Suggestions</h3>
            <p>We couldn't find any friend suggestions right now.</p>
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map(suggestion => (
              <div key={suggestion.id} className="suggestion-item">
                <Avatar 
                  avatar={suggestion.avatar}
                  name={suggestion.displayName}
                  size={50}
                />
                <div className="suggestion-info">
                  <span className="suggestion-name">{suggestion.displayName}</span>
                  <span className="suggestion-username">@{suggestion.username}</span>
                  <span className="suggestion-reason">
                    {suggestion.mutualFriend ? (
                      <>
                        <Users size={12} />
                        {suggestion.reason}
                      </>
                    ) : suggestion.reason}
                  </span>
                </div>
                <div className="suggestion-actions">
                  {sentRequests.includes(suggestion.id) ? (
                    <button className="suggestion-btn sent" disabled>
                      <Check size={18} />
                      Sent
                    </button>
                  ) : (
                    <>
                      <button 
                        className="suggestion-btn dismiss"
                        onClick={() => dismissSuggestion(suggestion.id)}
                      >
                        <X size={18} />
                      </button>
                      <button 
                        className="suggestion-btn add"
                        onClick={() => sendRequest(suggestion)}
                      >
                        <UserPlus size={18} />
                        Add
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .quick-add-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }

        .quick-add-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .empty-quick-add {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px;
          color: #888;
        }

        .empty-quick-add h3 {
          color: #fff;
          margin: 16px 0 8px;
        }

        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 16px;
          animation: fadeInFast 0.2s ease;
        }

        .suggestion-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .suggestion-name {
          color: #fff;
          font-weight: 600;
          font-size: 15px;
        }

        .suggestion-username {
          color: #888;
          font-size: 13px;
        }

        .suggestion-reason {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--accent);
          font-size: 11px;
          margin-top: 4px;
        }

        .suggestion-actions {
          display: flex;
          gap: 8px;
        }

        .suggestion-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border-radius: 20px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-btn.add {
          background: var(--accent);
          color: #000;
        }

        .suggestion-btn.add:active {
          transform: scale(0.95);
        }

        .suggestion-btn.dismiss {
          background: rgba(255, 59, 48, 0.2);
          color: #ff3b30;
          padding: 8px 10px;
        }

        .suggestion-btn.sent {
          background: rgba(52, 199, 89, 0.2);
          color: #34c759;
        }

        @keyframes fadeInFast {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, Heart, Flame, Star, Trophy, Crown } from 'lucide-react'

const BEST_FRIEND_TIERS = [
  { min: 100, emoji: '💛', label: 'Super BFF', color: '#FFD700' },
  { min: 50, emoji: '❤️', label: 'BFF', color: '#FF3B5C' },
  { min: 30, emoji: '💕', label: 'Besties', color: '#FF69B4' },
  { min: 14, emoji: '⭐', label: 'Close Friend', color: '#FFA500' },
  { min: 7, emoji: '🔥', label: 'Snapping', color: '#FF6B35' },
  { min: 0, emoji: '👋', label: 'New Friend', color: '#888' }
]

export default function BestFriends({ onClose }) {
  const { user, userData } = useAuth()
  const [bestFriends, setBestFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.friends?.length) {
      setLoading(false)
      return
    }

    fetchBestFriends()
  }, [userData?.friends])

  const fetchBestFriends = async () => {
    try {
      const friendsWithData = []

      for (const friendId of userData.friends) {
        // Get friend data
        const friendDoc = await getDoc(doc(db, 'users', friendId))
        if (!friendDoc.exists()) continue

        const friendData = friendDoc.data()

        // Get streak
        const streakId = [user.uid, friendId].sort().join('_')
        const streakDoc = await getDoc(doc(db, 'streaks', streakId))
        const streak = streakDoc.exists() ? streakDoc.data().count : 0

        // Get snap count (sent + received)
        const sentSnapsQuery = query(
          collection(db, 'snaps'),
          where('senderId', '==', user.uid),
          where('recipientId', '==', friendId)
        )
        const receivedSnapsQuery = query(
          collection(db, 'snaps'),
          where('senderId', '==', friendId),
          where('recipientId', '==', user.uid)
        )

        const [sentSnaps, receivedSnaps] = await Promise.all([
          getDocs(sentSnapsQuery),
          getDocs(receivedSnapsQuery)
        ])

        const totalSnaps = sentSnaps.size + receivedSnaps.size

        // Get tier
        const tier = BEST_FRIEND_TIERS.find(t => streak >= t.min) || BEST_FRIEND_TIERS[BEST_FRIEND_TIERS.length - 1]

        friendsWithData.push({
          id: friendId,
          ...friendData,
          streak,
          totalSnaps,
          tier
        })
      }

      // Sort by streak (descending)
      friendsWithData.sort((a, b) => b.streak - a.streak)

      setBestFriends(friendsWithData)
    } catch (error) {
      console.error('Error fetching best friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrophyIcon = (index) => {
    if (index === 0) return <Crown size={20} color="#FFD700" />
    if (index === 1) return <Trophy size={18} color="#C0C0C0" />
    if (index === 2) return <Trophy size={16} color="#CD7F32" />
    return null
  }

  return createPortal(
    <div className="best-friends-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Best Friends</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Stats Summary */}
      <div className="bf-stats">
        <div className="bf-stat">
          <Heart size={24} color="#FF3B5C" />
          <span className="bf-stat-value">{bestFriends.length}</span>
          <span className="bf-stat-label">Friends</span>
        </div>
        <div className="bf-stat">
          <Flame size={24} color="#FF6B35" />
          <span className="bf-stat-value">
            {bestFriends.reduce((acc, f) => acc + f.streak, 0)}
          </span>
          <span className="bf-stat-label">Total Streaks</span>
        </div>
        <div className="bf-stat">
          <Star size={24} color="#FFD700" />
          <span className="bf-stat-value">
            {bestFriends.filter(f => f.streak >= 30).length}
          </span>
          <span className="bf-stat-label">Besties</span>
        </div>
      </div>

      {/* Tier Legend */}
      <div className="bf-tiers">
        {BEST_FRIEND_TIERS.slice(0, 4).map((tier, i) => (
          <div key={i} className="bf-tier-item">
            <span className="bf-tier-emoji">{tier.emoji}</span>
            <span className="bf-tier-label">{tier.min}+ days</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : bestFriends.length === 0 ? (
        <div className="empty-bf">
          <Heart size={64} />
          <h3>No Best Friends Yet</h3>
          <p>Start snapping with friends to build streaks!</p>
        </div>
      ) : (
        <div className="bf-list">
          {bestFriends.map((friend, index) => (
            <div 
              key={friend.id} 
              className={`bf-item ${index < 3 ? 'top-bf' : ''}`}
            >
              <div className="bf-rank">
                {getTrophyIcon(index) || <span>#{index + 1}</span>}
              </div>
              <Avatar 
                avatar={friend.avatar}
                name={friend.displayName}
                size={50}
              />
              <div className="bf-info">
                <div className="bf-name">
                  {friend.displayName}
                  <span className="bf-tier-badge" style={{ color: friend.tier.color }}>
                    {friend.tier.emoji}
                  </span>
                </div>
                <div className="bf-username">@{friend.username}</div>
                <div className="bf-tier-name" style={{ color: friend.tier.color }}>
                  {friend.tier.label}
                </div>
              </div>
              <div className="bf-streak">
                <Flame size={20} color="#FF6B35" />
                <span>{friend.streak}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .best-friends-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .bf-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255,59,92,0.1), rgba(255,107,53,0.1));
        }

        .bf-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .bf-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
        }

        .bf-stat-label {
          font-size: 11px;
          color: #888;
        }

        .bf-tiers {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .bf-tier-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .bf-tier-emoji {
          font-size: 16px;
        }

        .bf-tier-label {
          font-size: 11px;
          color: #888;
        }

        .empty-bf {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .empty-bf h3 {
          color: #fff;
          margin: 16px 0 8px;
        }

        .bf-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .bf-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--bg-secondary);
          border-radius: 16px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .bf-item.top-bf {
          background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,53,0.1));
          border: 1px solid rgba(255,215,0,0.2);
        }

        .bf-rank {
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
          font-weight: 600;
          font-size: 14px;
        }

        .bf-info {
          flex: 1;
        }

        .bf-name {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fff;
          font-weight: 600;
          font-size: 15px;
        }

        .bf-tier-badge {
          font-size: 14px;
        }

        .bf-username {
          font-size: 13px;
          color: #888;
        }

        .bf-tier-name {
          font-size: 11px;
          font-weight: 500;
          margin-top: 2px;
        }

        .bf-streak {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(255,107,53,0.2);
          border-radius: 20px;
        }

        .bf-streak span {
          color: #FF6B35;
          font-weight: 700;
          font-size: 16px;
        }
      `}</style>
    </div>,
    document.body
  )
}


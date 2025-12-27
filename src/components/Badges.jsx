import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { ArrowLeft, Trophy, Flame, Camera, Users, Star, Zap, Crown, Heart, MessageCircle, Award } from 'lucide-react'

// Badge definitions
const BADGES = [
  {
    id: 'first_snap',
    name: 'First Snap!',
    description: 'Send your first snap',
    emoji: '📸',
    icon: Camera,
    color: '#FFFC00',
    check: (stats) => stats.snapsSent >= 1
  },
  {
    id: 'snapper_10',
    name: 'Snapper',
    description: 'Send 10 snaps',
    emoji: '🤳',
    icon: Camera,
    color: '#FF9500',
    check: (stats) => stats.snapsSent >= 10
  },
  {
    id: 'snapper_100',
    name: 'Super Snapper',
    description: 'Send 100 snaps',
    emoji: '⭐',
    icon: Star,
    color: '#FFD700',
    check: (stats) => stats.snapsSent >= 100
  },
  {
    id: 'streak_3',
    name: 'Streak Starter',
    description: 'Get a 3-day streak',
    emoji: '🔥',
    icon: Flame,
    color: '#FF6B35',
    check: (stats) => stats.maxStreak >= 3
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Get a 7-day streak',
    emoji: '💪',
    icon: Flame,
    color: '#FF3B5C',
    check: (stats) => stats.maxStreak >= 7
  },
  {
    id: 'streak_30',
    name: 'Streak Master',
    description: 'Get a 30-day streak',
    emoji: '👑',
    icon: Crown,
    color: '#FFD700',
    check: (stats) => stats.maxStreak >= 30
  },
  {
    id: 'streak_100',
    name: 'Streak Legend',
    description: 'Get a 100-day streak',
    emoji: '💯',
    icon: Trophy,
    color: '#8B5CF6',
    check: (stats) => stats.maxStreak >= 100
  },
  {
    id: 'social_5',
    name: 'Social',
    description: 'Add 5 friends',
    emoji: '👋',
    icon: Users,
    color: '#4ECDC4',
    check: (stats) => stats.friendsCount >= 5
  },
  {
    id: 'social_20',
    name: 'Popular',
    description: 'Add 20 friends',
    emoji: '🌟',
    icon: Users,
    color: '#45B7D1',
    check: (stats) => stats.friendsCount >= 20
  },
  {
    id: 'story_teller',
    name: 'Story Teller',
    description: 'Post 10 stories',
    emoji: '📖',
    icon: Heart,
    color: '#FF69B4',
    check: (stats) => stats.storiesPosted >= 10
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    description: 'Send 50 chat messages',
    emoji: '💬',
    icon: MessageCircle,
    color: '#00C853',
    check: (stats) => stats.messagesSent >= 50
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join SnapClone',
    emoji: '🚀',
    icon: Zap,
    color: '#667EEA',
    check: () => true // Everyone gets this
  }
]

export default function Badges({ onClose }) {
  const { user, userData } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch snaps sent
      const snapsQuery = query(
        collection(db, 'snaps'),
        where('senderId', '==', user.uid)
      )
      const snapsSnapshot = await getDocs(snapsQuery)
      
      // Fetch stories posted
      const storiesQuery = query(
        collection(db, 'stories'),
        where('userId', '==', user.uid)
      )
      const storiesSnapshot = await getDocs(storiesQuery)

      // Fetch max streak
      let maxStreak = 0
      if (userData?.friends) {
        for (const friendId of userData.friends) {
          const streakId = [user.uid, friendId].sort().join('_')
          const streakDoc = await getDoc(doc(db, 'streaks', streakId))
          if (streakDoc.exists()) {
            maxStreak = Math.max(maxStreak, streakDoc.data().count || 0)
          }
        }
      }

      setStats({
        snapsSent: snapsSnapshot.size,
        storiesPosted: storiesSnapshot.size,
        friendsCount: userData?.friends?.length || 0,
        maxStreak,
        messagesSent: userData?.snapScore || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const earnedBadges = stats ? BADGES.filter(badge => badge.check(stats)) : []
  const lockedBadges = stats ? BADGES.filter(badge => !badge.check(stats)) : []

  return (
    <div className="badges-screen">
      <div className="header">
        <button className="header-btn" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">Badges</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Stats Summary */}
      <div className="badges-stats">
        <div className="badge-stat">
          <Trophy size={24} color="#FFD700" />
          <span className="badge-stat-value">{earnedBadges.length}</span>
          <span className="badge-stat-label">Earned</span>
        </div>
        <div className="badge-stat">
          <Award size={24} color="#888" />
          <span className="badge-stat-value">{lockedBadges.length}</span>
          <span className="badge-stat-label">Locked</span>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="badges-content">
          {/* Earned Badges */}
          <div className="badges-section">
            <h3 className="badges-section-title">
              <Trophy size={16} /> Earned Badges
            </h3>
            <div className="badges-grid">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="badge-item earned">
                  <div 
                    className="badge-icon"
                    style={{ background: `${badge.color}30`, borderColor: badge.color }}
                  >
                    <span className="badge-emoji">{badge.emoji}</span>
                  </div>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-desc">{badge.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Locked Badges */}
          {lockedBadges.length > 0 && (
            <div className="badges-section">
              <h3 className="badges-section-title">
                <Award size={16} /> Locked
              </h3>
              <div className="badges-grid">
                {lockedBadges.map(badge => (
                  <div key={badge.id} className="badge-item locked">
                    <div className="badge-icon">
                      <span className="badge-emoji">🔒</span>
                    </div>
                    <span className="badge-name">{badge.name}</span>
                    <span className="badge-desc">{badge.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .badges-screen {
          position: fixed;
          inset: 0;
          background: var(--bg-primary);
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .badges-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,53,0.05));
        }

        .badge-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .badge-stat-value {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
        }

        .badge-stat-label {
          font-size: 12px;
          color: #888;
        }

        .badges-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .badges-section {
          margin-bottom: 24px;
        }

        .badges-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #888;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .badges-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .badge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px 8px;
          background: var(--bg-secondary);
          border-radius: 16px;
          transition: all 0.2s;
        }

        .badge-item.earned {
          background: rgba(255,215,0,0.05);
        }

        .badge-item.locked {
          opacity: 0.5;
        }

        .badge-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          border: 2px solid #444;
          margin-bottom: 8px;
        }

        .badge-item.earned .badge-icon {
          animation: shimmer 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .badge-emoji {
          font-size: 28px;
        }

        .badge-name {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .badge-desc {
          font-size: 10px;
          color: #888;
          line-height: 1.3;
        }
      `}</style>
    </div>
  )
}


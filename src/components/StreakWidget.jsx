import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { Flame, Clock, AlertTriangle } from 'lucide-react'

export default function StreakWidget({ onOpenCamera }) {
  const { user, userData } = useAuth()
  const [streaks, setStreaks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.friends?.length) {
      setLoading(false)
      return
    }

    fetchStreaks()
  }, [userData?.friends])

  const fetchStreaks = async () => {
    try {
      const now = new Date()
      const streakData = []

      for (const friendId of userData.friends) {
        const streakId = [user.uid, friendId].sort().join('_')
        const streakDoc = await getDoc(doc(db, 'streaks', streakId))
        
        if (streakDoc.exists()) {
          const data = streakDoc.data()
          const lastSnapTime = new Date(data.lastSnapAt)
          const hoursSinceSnap = (now - lastSnapTime) / (1000 * 60 * 60)
          
          // Only show active streaks (3+) that haven't expired
          if (data.count >= 3 && hoursSinceSnap < 24) {
            const friendDoc = await getDoc(doc(db, 'users', friendId))
            const friendName = friendDoc.exists() ? friendDoc.data().displayName : 'Friend'
            
            streakData.push({
              friendId,
              friendName,
              count: data.count,
              hoursLeft: Math.max(0, Math.floor(24 - hoursSinceSnap)),
              urgent: hoursSinceSnap >= 20,
              needsSnap: data.lastSnappedBy !== user.uid
            })
          }
        }
      }

      // Sort by urgency and count
      streakData.sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
        if (a.needsSnap !== b.needsSnap) return a.needsSnap ? -1 : 1
        return b.count - a.count
      })

      setStreaks(streakData)
    } catch (error) {
      console.error('Error fetching streaks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || streaks.length === 0) return null

  const urgentStreaks = streaks.filter(s => s.urgent)
  const totalStreakDays = streaks.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="streak-widget">
      {/* Summary */}
      <div className="streak-summary">
        <div className="streak-total">
          <Flame size={28} color="#FF6B35" />
          <div>
            <span className="streak-total-number">{totalStreakDays}</span>
            <span className="streak-total-label">Total Streak Days</span>
          </div>
        </div>
        
        {urgentStreaks.length > 0 && (
          <div className="streak-warning" onClick={onOpenCamera}>
            <AlertTriangle size={16} />
            <span>{urgentStreaks.length} expiring soon!</span>
          </div>
        )}
      </div>

      {/* Urgent Streaks */}
      {urgentStreaks.length > 0 && (
        <div className="streak-urgent-list">
          {urgentStreaks.slice(0, 3).map(streak => (
            <div 
              key={streak.friendId} 
              className="streak-urgent-item"
              onClick={onOpenCamera}
            >
              <div className="streak-urgent-info">
                <Flame size={16} color="#FF6B35" />
                <span className="streak-count">{streak.count}</span>
                <span className="streak-name">{streak.friendName}</span>
              </div>
              <div className="streak-time-left">
                <Clock size={12} />
                <span>{streak.hoursLeft}h left</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .streak-widget {
          background: linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,59,92,0.1));
          border: 1px solid rgba(255,107,53,0.3);
          border-radius: 16px;
          margin: 12px 16px;
          padding: 14px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .streak-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .streak-total {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .streak-total-number {
          font-size: 28px;
          font-weight: 800;
          color: #FF6B35;
          display: block;
          line-height: 1;
        }

        .streak-total-label {
          font-size: 11px;
          color: #888;
          display: block;
        }

        .streak-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255,59,48,0.2);
          border-radius: 20px;
          color: #ff3b30;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .streak-urgent-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,107,53,0.2);
        }

        .streak-urgent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(255,59,48,0.1);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .streak-urgent-item:active {
          transform: scale(0.98);
          background: rgba(255,59,48,0.2);
        }

        .streak-urgent-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .streak-count {
          font-weight: 700;
          color: #FF6B35;
          font-size: 16px;
        }

        .streak-name {
          color: #fff;
          font-size: 14px;
        }

        .streak-time-left {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #ff3b30;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}


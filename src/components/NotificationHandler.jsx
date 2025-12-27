import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'

export default function NotificationHandler() {
  const { user, userData } = useAuth()
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [streakWarnings, setStreakWarnings] = useState([])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Wait a bit before asking for permission
      const timer = setTimeout(() => {
        Notification.requestPermission().then((perm) => {
          setPermission(perm)
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for new messages
  useEffect(() => {
    if (!user || permission !== 'granted') return

    // Listen for new snaps
    const snapsQuery = query(
      collection(db, 'snaps'),
      where('recipientId', '==', user.uid),
      where('viewed', '==', false)
    )

    let initialLoad = true
    const unsubSnaps = onSnapshot(snapsQuery, (snapshot) => {
      if (initialLoad) {
        initialLoad = false
        return
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const snap = change.doc.data()
          showNotification(
            `📸 New Snap from ${snap.senderName}`,
            'Tap to view before it disappears!',
            snap.senderName
          )
        }
      })
    })

    return () => unsubSnaps()
  }, [user, permission])

  // Listen for new chat messages
  useEffect(() => {
    if (!user || !userData?.friends || permission !== 'granted') return

    const unsubscribes = []

    userData.friends.forEach((friendId) => {
      const chatId = [user.uid, friendId].sort().join('_')
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('recipientId', '==', user.uid),
        where('read', '==', false)
      )

      let initialLoad = true
      const unsub = onSnapshot(messagesQuery, (snapshot) => {
        if (initialLoad) {
          initialLoad = false
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = change.doc.data()
            // Only notify if app is not focused
            if (document.hidden) {
              showNotification(
                `💬 ${msg.senderName}`,
                msg.text.slice(0, 50) + (msg.text.length > 50 ? '...' : ''),
                msg.senderName
              )
            }
          }
        })
      })

      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach((unsub) => unsub())
  }, [user, userData, permission])

  // Check for streak warnings every hour
  useEffect(() => {
    if (!user || !userData?.friends || permission !== 'granted') return

    const checkStreaks = async () => {
      const warnings = []
      const now = new Date()

      for (const friendId of userData.friends) {
        const streakId = [user.uid, friendId].sort().join('_')
        
        try {
          const streakDoc = await getDoc(doc(db, 'streaks', streakId))
          if (!streakDoc.exists()) continue

          const streakData = streakDoc.data()
          if (streakData.count < 3) continue // Only warn for streaks 3+

          const lastSnapTime = new Date(streakData.lastSnapAt)
          const hoursSinceSnap = (now - lastSnapTime) / (1000 * 60 * 60)

          // Warn if streak is about to expire (20-24 hours)
          if (hoursSinceSnap >= 20 && hoursSinceSnap < 24) {
            const friendDoc = await getDoc(doc(db, 'users', friendId))
            const friendName = friendDoc.exists() ? friendDoc.data().displayName : 'A friend'
            
            // Only warn if we were not the last one to snap
            if (streakData.lastSnappedBy !== user.uid) {
              warnings.push({
                friendId,
                friendName,
                streak: streakData.count,
                hoursLeft: Math.floor(24 - hoursSinceSnap)
              })
            }
          }
        } catch (e) {
          console.error('Streak check error:', e)
        }
      }

      // Show notifications for expiring streaks
      warnings.forEach(warning => {
        showNotification(
          `⏰ Streak about to expire!`,
          `${warning.streak}🔥 streak with ${warning.friendName} expires in ${warning.hoursLeft}h! Send a snap now!`,
          `streak-${warning.friendId}`
        )
      })

      setStreakWarnings(warnings)
    }

    // Check immediately
    checkStreaks()

    // Check every hour
    const interval = setInterval(checkStreaks, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user, userData?.friends, permission])

  const showNotification = (title, body, tag) => {
    if (permission !== 'granted') return

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // Play sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6gjX1zfYaOmJ+djHx0eYONmJqXjX9xc3+IkpaWkod8dHl/h46TlI+If3d4fIOKj5GNhnx4eH2EiY2Oi4R7eHl9goeLjImDeXh5fIGGiYmGgHt4en6ChomHg395eXt/g4aHhoF8eXl7f4OGhoN/e3l6fIGEhYN/fHp6e36Bg4SBfnt6ent/goOCf3x6ent+gYKBfnx6enx+gIGAf3x6e3x+f4B/fXx7e3x+f39+fXx7fH1+fn5+fXx8fH1+fn59fXx8fX1+fn19fHx9fX5+fX18fH19fn59fXx9fX1+fn19fH19fX5+fX18fX19fn59fXx9fX1+fn19fX19fX5+fX19fX19fX59fX19fX19fn19fX19fX1+fX19fX19fX19fX19fX19fX19fX19fX19')
      audio.volume = 0.3
      audio.play().catch(() => {})
    } catch (e) {}

    // Show notification
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      tag, // Prevents duplicate notifications from same person
      renotify: true,
      requireInteraction: false,
      silent: false
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto close after 4 seconds
    setTimeout(() => notification.close(), 4000)
  }

  return null // This component doesn't render anything
}


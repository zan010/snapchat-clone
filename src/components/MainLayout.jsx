import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, Users, Camera } from 'lucide-react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import ChatList from './ChatList'
import FriendsList from './FriendsList'
import Profile from './Profile'
import CameraScreen from './Camera'
import SnapViewer from './SnapViewer'
import Chat from './Chat'
import NotificationHandler from './NotificationHandler'
import Settings from './Settings'
import VideoCall from './VideoCall'
import InstallBanner from './InstallBanner'

export default function MainLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showCamera, setShowCamera] = useState(false)
  const [viewingSnap, setViewingSnap] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [cameraRecipient, setCameraRecipient] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return

    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    )

    const unsubscribe = onSnapshot(callsQuery, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const callData = change.doc.data()
          // Get caller info
          const callerDoc = await getDoc(doc(db, 'users', callData.callerId))
          if (callerDoc.exists()) {
            setIncomingCall({
              id: change.doc.id,
              ...callData,
              caller: { id: callerDoc.id, ...callerDoc.data() }
            })
          }
        }
      })
    })

    return () => unsubscribe()
  }, [user])

  const handleStartCall = (friend, isVideo) => {
    setActiveCall({ friend, isVideo, isIncoming: false })
  }

  const handleAnswerCall = () => {
    if (incomingCall) {
      setActiveCall({
        friend: incomingCall.caller,
        isVideo: incomingCall.isVideo,
        isIncoming: true
      })
      setIncomingCall(null)
    }
  }

  const handleDeclineCall = async () => {
    if (incomingCall) {
      const { updateDoc, doc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' })
      setIncomingCall(null)
    }
  }

  const currentTab = location.pathname === '/friends' ? 'friends' 
    : location.pathname === '/profile' ? 'profile' 
    : 'chat'

  const handleOpenCamera = (friend = null) => {
    setCameraRecipient(friend)
    setShowCamera(true)
  }

  const handleCloseCamera = () => {
    setShowCamera(false)
    setCameraRecipient(null)
  }

  return (
    <div className="main-layout">
      <NotificationHandler />
      <InstallBanner />
      <div className="content">
        <Routes>
          <Route path="/" element={
            <ChatList 
              onViewSnap={setViewingSnap} 
              onOpenChat={setActiveChat}
              onOpenSettings={() => setShowSettings(true)}
              onAddStory={() => {
                setCameraRecipient('story')
                setShowCamera(true)
              }}
            />
          } />
          <Route path="/friends" element={<FriendsList />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>

      <nav className="bottom-nav">
        <button 
          className={`nav-btn ${currentTab === 'chat' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <MessageCircle />
          <span>Chat</span>
        </button>
        
        <button 
          className="nav-btn-camera"
          onClick={() => handleOpenCamera()}
        >
          <Camera />
        </button>
        
        <button 
          className={`nav-btn ${currentTab === 'friends' ? 'active' : ''}`}
          onClick={() => navigate('/friends')}
        >
          <Users />
          <span>Friends</span>
        </button>
      </nav>

      {showCamera && (
        <CameraScreen 
          onClose={handleCloseCamera} 
          preselectedFriend={cameraRecipient}
        />
      )}

      {viewingSnap && (
        <SnapViewer snap={viewingSnap} onClose={() => setViewingSnap(null)} />
      )}

      {activeChat && (
        <Chat 
          friend={activeChat} 
          onClose={() => setActiveChat(null)}
          onOpenCamera={(friend) => {
            setActiveChat(null)
            handleOpenCamera(friend)
          }}
          onStartCall={(friend, isVideo) => {
            setActiveChat(null)
            handleStartCall(friend, isVideo)
          }}
        />
      )}

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Active Call */}
      {activeCall && (
        <VideoCall
          friend={activeCall.friend}
          isVideo={activeCall.isVideo}
          isIncoming={activeCall.isIncoming}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !activeCall && (
        <div className="incoming-call-modal">
          <div className="incoming-call-content">
            <div className="incoming-call-avatar">
              {incomingCall.callerName?.charAt(0) || '?'}
            </div>
            <h2 className="incoming-call-name">{incomingCall.callerName}</h2>
            <p className="incoming-call-type">
              {incomingCall.isVideo ? '📹 Video Call' : '📞 Voice Call'}
            </p>
            <div className="incoming-call-buttons">
              <button className="call-btn decline" onClick={handleDeclineCall}>
                Decline
              </button>
              <button className="call-btn accept" onClick={handleAnswerCall}>
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

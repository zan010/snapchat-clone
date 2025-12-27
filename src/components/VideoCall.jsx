import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, RotateCcw } from 'lucide-react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export default function VideoCall({ friend, isVideo, isIncoming, onClose }) {
  const { user, userData } = useAuth()
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(!isVideo)
  const [callDuration, setCallDuration] = useState(0)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const callDocRef = useRef(null)

  const callId = [user.uid, friend.id].sort().join('_call_')

  useEffect(() => {
    if (isIncoming) {
      // Answer incoming call
      answerCall()
    } else {
      // Start outgoing call
      startCall()
    }

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    let interval
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])

  const getMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { facingMode: 'user' } : false,
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (error) {
      console.error('Error getting media:', error)
      setCallStatus('error')
      return null
    }
  }

  const startCall = async () => {
    const stream = await getMediaStream()
    if (!stream) return

    // Create peer connection
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS)
    const pc = peerConnectionRef.current

    // Add local stream
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
      setCallStatus('connected')
    }

    // Create call document
    callDocRef.current = doc(db, 'calls', callId)
    
    // Collect ICE candidates
    const offerCandidates = []
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        offerCandidates.push(event.candidate.toJSON())
        updateDoc(callDocRef.current, { offerCandidates })
      }
    }

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Save to Firestore
    await setDoc(callDocRef.current, {
      callerId: user.uid,
      callerName: userData.displayName,
      receiverId: friend.id,
      receiverName: friend.displayName,
      isVideo,
      offer: { type: offer.type, sdp: offer.sdp },
      offerCandidates: [],
      status: 'calling',
      createdAt: new Date().toISOString()
    })

    // Listen for answer
    const unsubscribe = onSnapshot(callDocRef.current, (snapshot) => {
      const data = snapshot.data()
      if (!data) return

      if (data.answer && !pc.currentRemoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }

      if (data.answerCandidates) {
        data.answerCandidates.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate))
        })
      }

      if (data.status === 'declined' || data.status === 'ended') {
        cleanup()
        onClose()
      }
    })

    // Timeout for no answer
    setTimeout(() => {
      if (callStatus === 'calling') {
        cleanup()
        onClose()
      }
    }, 30000)
  }

  const answerCall = async () => {
    const stream = await getMediaStream()
    if (!stream) return

    callDocRef.current = doc(db, 'calls', callId)

    // Get call data
    const unsubscribe = onSnapshot(callDocRef.current, async (snapshot) => {
      const data = snapshot.data()
      if (!data) return

      if (data.offer && !peerConnectionRef.current) {
        // Create peer connection
        peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS)
        const pc = peerConnectionRef.current

        // Add local stream
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream)
        })

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
          }
          setCallStatus('connected')
        }

        // Collect ICE candidates
        const answerCandidates = []
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            answerCandidates.push(event.candidate.toJSON())
            updateDoc(callDocRef.current, { answerCandidates })
          }
        }

        // Set remote description and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Add offer candidates
        if (data.offerCandidates) {
          data.offerCandidates.forEach(candidate => {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
          })
        }

        // Save answer
        await updateDoc(callDocRef.current, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        })
      }

      if (data.status === 'ended') {
        cleanup()
        onClose()
      }
    })
  }

  const acceptCall = () => {
    setCallStatus('connecting')
    answerCall()
  }

  const declineCall = async () => {
    if (callDocRef.current) {
      await updateDoc(callDocRef.current, { status: 'declined' })
    }
    cleanup()
    onClose()
  }

  const endCall = async () => {
    if (callDocRef.current) {
      await updateDoc(callDocRef.current, { status: 'ended' })
    }
    cleanup()
    onClose()
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  return (
    <div className="call-screen">
      {/* Remote Video (Full Screen) */}
      {isVideo && callStatus === 'connected' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="remote-video"
        />
      )}

      {/* Local Video (Picture in Picture) */}
      {isVideo && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="local-video"
        />
      )}

      {/* Audio-only background */}
      {!isVideo && (
        <div className="call-audio-bg">
          <div className="call-avatar-large">
            {getInitials(friend.displayName)}
          </div>
        </div>
      )}

      {/* Hidden audio element for audio calls */}
      {!isVideo && (
        <audio ref={remoteVideoRef} autoPlay />
      )}

      {/* Call Info Overlay */}
      <div className="call-overlay">
        <div className="call-info">
          <h2 className="call-name">{friend.displayName}</h2>
          <p className="call-status-text">
            {callStatus === 'incoming' && (isVideo ? 'Incoming video call...' : 'Incoming voice call...')}
            {callStatus === 'calling' && 'Calling...'}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && formatDuration(callDuration)}
            {callStatus === 'error' && 'Could not connect'}
          </p>
        </div>

        {/* Incoming Call Buttons */}
        {callStatus === 'incoming' && (
          <div className="call-incoming-buttons">
            <button className="call-btn decline" onClick={declineCall}>
              <PhoneOff size={28} />
            </button>
            <button className="call-btn accept" onClick={acceptCall}>
              {isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </div>
        )}

        {/* In-Call Controls */}
        {(callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'connected') && (
          <div className="call-controls">
            <button 
              className={`call-control-btn ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            {isVideo && (
              <button 
                className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            )}
            
            <button className="call-btn end" onClick={endCall}>
              <PhoneOff size={28} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


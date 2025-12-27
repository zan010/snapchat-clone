import { useState, useEffect } from 'react'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../App'
import Avatar from './Avatar'
import { ArrowLeft, Check, Users } from 'lucide-react'

const GROUP_EMOJIS = ['👥', '🎉', '🔥', '💬', '🎮', '⚽', '🎵', '📚', '💼', '🏠', '❤️', '🌟']

export default function CreateGroup({ onClose, onGroupCreated }) {
  const { user, userData } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('👥')
  const [friends, setFriends] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(1) // 1: name, 2: members

  // Fetch friends
  useEffect(() => {
    if (!userData?.friends?.length) return

    const fetchFriends = async () => {
      const friendsData = []
      for (const friendId of userData.friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId))
        if (friendDoc.exists()) {
          friendsData.push({ id: friendDoc.id, ...friendDoc.data() })
        }
      }
      setFriends(friendsData)
    }
    fetchFriends()
  }, [userData?.friends])

  const toggleMember = (friendId) => {
    setSelectedMembers(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return
    
    setCreating(true)
    try {
      const groupData = {
        name: groupName.trim(),
        emoji: selectedEmoji,
        members: [user.uid, ...selectedMembers],
        admins: [user.uid],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        lastMessage: null,
        lastMessageAt: null
      }

      const docRef = await addDoc(collection(db, 'groups'), groupData)
      
      onGroupCreated?.({ id: docRef.id, ...groupData })
      onClose()
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="create-group-screen">
      <div className="header">
        <button className="header-btn" onClick={step === 1 ? onClose : () => setStep(1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="header-title">
          {step === 1 ? 'New Group' : 'Add Members'}
        </h1>
        {step === 1 ? (
          <button 
            className="header-btn"
            onClick={() => setStep(2)}
            disabled={!groupName.trim()}
            style={{ 
              opacity: groupName.trim() ? 1 : 0.5,
              color: 'var(--accent)'
            }}
          >
            Next
          </button>
        ) : (
          <button 
            className="header-btn"
            onClick={createGroup}
            disabled={selectedMembers.length === 0 || creating}
            style={{ 
              opacity: selectedMembers.length > 0 ? 1 : 0.5,
              color: 'var(--accent)'
            }}
          >
            {creating ? '...' : 'Create'}
          </button>
        )}
      </div>

      {step === 1 ? (
        <div className="create-group-content">
          {/* Group Preview */}
          <div className="group-preview">
            <div className="group-emoji-preview">
              {selectedEmoji}
            </div>
            <p className="group-name-preview">
              {groupName || 'Group name'}
            </p>
          </div>

          {/* Group Name Input */}
          <div className="input-section">
            <label>Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              maxLength={30}
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div className="input-section">
            <label>Group Icon</label>
            <div className="emoji-grid">
              {GROUP_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="create-group-content">
          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="selected-members">
              <p>{selectedMembers.length} selected</p>
              <div className="selected-avatars">
                {selectedMembers.slice(0, 5).map(memberId => {
                  const friend = friends.find(f => f.id === memberId)
                  return (
                    <Avatar 
                      key={memberId}
                      avatar={friend?.avatar}
                      name={friend?.displayName}
                      size={32}
                    />
                  )
                })}
                {selectedMembers.length > 5 && (
                  <span className="more-count">+{selectedMembers.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="friends-select-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Add friends first to create a group!</p>
              </div>
            ) : (
              friends.map(friend => (
                <div 
                  key={friend.id}
                  className={`friend-select-item ${selectedMembers.includes(friend.id) ? 'selected' : ''}`}
                  onClick={() => toggleMember(friend.id)}
                >
                  <Avatar 
                    avatar={friend.avatar}
                    name={friend.displayName}
                    size={44}
                  />
                  <div className="friend-info">
                    <span className="friend-name">{friend.displayName}</span>
                    <span className="friend-username">@{friend.username}</span>
                  </div>
                  <div className={`select-checkbox ${selectedMembers.includes(friend.id) ? 'checked' : ''}`}>
                    {selectedMembers.includes(friend.id) && <Check size={14} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .create-group-screen {
          position: fixed;
          inset: 0;
          background: var(--bg-primary);
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .create-group-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .group-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0;
          margin-bottom: 24px;
        }

        .group-emoji-preview {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #FF9500);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          margin-bottom: 16px;
          box-shadow: 0 8px 32px rgba(255,252,0,0.3);
        }

        .group-name-preview {
          font-size: 20px;
          font-weight: 600;
          color: ${groupName ? '#fff' : '#666'};
        }

        .input-section {
          margin-bottom: 24px;
        }

        .input-section label {
          display: block;
          font-size: 13px;
          color: #888;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .input-section input {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .input-section input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }

        .emoji-btn {
          width: 100%;
          aspect-ratio: 1;
          border: none;
          background: var(--bg-secondary);
          border-radius: 12px;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .emoji-btn.selected {
          background: var(--accent);
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(255,252,0,0.3);
        }

        .selected-members {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .selected-members p {
          color: var(--accent);
          font-weight: 500;
        }

        .selected-avatars {
          display: flex;
          gap: -8px;
        }

        .selected-avatars > * {
          margin-left: -8px;
          border: 2px solid var(--bg-secondary);
        }

        .more-count {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          margin-left: -8px;
        }

        .friends-select-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .friend-select-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .friend-select-item.selected {
          background: rgba(255,252,0,0.1);
          border: 1px solid var(--accent);
        }

        .friend-info {
          flex: 1;
        }

        .friend-name {
          display: block;
          color: #fff;
          font-weight: 500;
        }

        .friend-username {
          font-size: 13px;
          color: #888;
        }

        .select-checkbox {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #444;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .select-checkbox.checked {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}


import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { Ghost } from 'lucide-react'

export default function Signup() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if username is taken
      const usernameQuery = query(
        collection(db, 'users'),
        where('usernameLower', '==', username.toLowerCase())
      )
      const usernameSnapshot = await getDocs(usernameQuery)
      
      if (!usernameSnapshot.empty) {
        setError('Username is already taken')
        setLoading(false)
        return
      }

      // Create auth user
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        username,
        usernameLower: username.toLowerCase(),
        email,
        createdAt: new Date().toISOString(),
        friends: [],
        snapScore: 0
      })

      navigate('/')
    } catch (err) {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already in use')
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else {
        setError('Failed to create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <Ghost />
      </div>
      
      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">Join SnapClone and connect with friends</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <div className="input-group">
          <label>Display Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Choose a unique username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            required
            minLength={3}
            maxLength={20}
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')}>Sign In</button>
      </p>
    </div>
  )
}


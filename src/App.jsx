import { useState, useEffect, createContext, useContext, Component } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login'
import Signup from './components/Signup'
import MainLayout from './components/MainLayout'

// Error Boundary for catching crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          background: '#000', 
          color: '#fff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2 style={{ color: '#FFFC00', marginBottom: '16px' }}>Something went wrong</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              background: '#FFFC00',
              color: '#000',
              border: 'none',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Loading spinner component
const LoadingSpinner = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
  </div>
)

// Auth Context
const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        
        // Listen to user data
        const userRef = doc(db, 'users', firebaseUser.uid)
        const unsubUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData({ id: doc.id, ...doc.data() })
          }
          setLoading(false)
        })
        
        return () => unsubUser()
      } else {
        setUser(null)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value = {
    user,
    userData,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }
  
  return !user ? children : <Navigate to="/" />
}

function App() {
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    // Small delay to ensure WebView is ready
    const timer = setTimeout(() => setAppReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!appReady) {
    return <LoadingSpinner />
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <ThemeProvider>
          <AuthProvider>
            <div className="app">
              <Routes>
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                <Route path="/signup" element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                } />
                <Route path="/*" element={
                  <PrivateRoute>
                    <MainLayout />
                  </PrivateRoute>
                } />
              </Routes>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App


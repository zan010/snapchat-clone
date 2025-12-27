import { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login'
import Signup from './components/Signup'
import MainLayout from './components/MainLayout'

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
  return (
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
  )
}

export default App


import { useState, useEffect, createContext, useContext, lazy, Suspense, memo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ThemeProvider } from './context/ThemeContext'

// Lazy load components for better performance
const Login = lazy(() => import('./components/Login'))
const Signup = lazy(() => import('./components/Signup'))
const MainLayout = lazy(() => import('./components/MainLayout'))

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
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="app">
            <Suspense fallback={<LoadingSpinner />}>
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
            </Suspense>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App


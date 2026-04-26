import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import Header from './components/Header'
import TabBar from './components/TabBar'
import { useGameStore } from './store/gameStore'
import { authApi } from './api'

// Route-level code splitting — each page fetched only when navigated to
const HomePage = lazy(() => import('./pages/HomePage'))
const GamePage = lazy(() => import('./pages/GamePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cyber-bg">
      <span className="font-pixel text-[10px] neon-text-blue loading-text">LOADING</span>
    </div>
  )
}

function App() {
  const { user, token, setUser, setIsMobile } = useGameStore()
  const location = useLocation()
  const isUniverse = location.pathname === '/'

  useEffect(() => {
    if (token && !user) {
      authApi.me()
        .then((u) => setUser(u, token))
        .catch(() => setUser(null, null))
    }
  }, [token, user, setUser])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handle = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [setIsMobile])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cyber-bg relative">
        {isUniverse ? (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </Suspense>
        ) : (
          <div className="relative flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pb-20 md:pb-0">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/game/:gameId" element={<GamePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Suspense>
            </main>
            <TabBar />
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App

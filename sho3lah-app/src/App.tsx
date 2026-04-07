import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { ThemeProvider } from 'styled-components'
import { theme } from './styles/theme'
import { GlobalStyles } from './styles/GlobalStyles'

// Pages
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import GamePlay from './pages/GamePlay'
import Profile from './pages/Profile'
import IQTest from './pages/IQTest'
import Leaderboard from './pages/Leaderboard'
import Auth from './pages/Auth'
import Analytics from './pages/Analytics'
import Goals from './pages/Goals'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/games" element={<Games />} />
                <Route path="/game/:gameId" element={<GamePlay />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/iq-test" element={<IQTest />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/goals" element={<Goals />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App

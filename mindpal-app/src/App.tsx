import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { store } from './store/store';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import GamePlay from './pages/GamePlay';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Goals from './pages/Goals';
import Leaderboard from './pages/Leaderboard';
import IQTest from './pages/IQTest';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<Layout />}>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/games" element={<Games />} />
                <Route path="/game/:gameId" element={<GamePlay />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/iq-test" element={<IQTest />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;

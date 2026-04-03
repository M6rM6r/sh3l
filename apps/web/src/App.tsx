// Ygy - Unified Brain Training Platform
// Combined entry point for Arabic (Sho3lah) and English (MindPal)

import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { GlobalStyles } from './styles/GlobalStyles';
import { theme } from './styles/theme';
import { useAppSelector } from './store/hooks';
import LanguageSwitcher from './components/LanguageSwitcher';

// Lazy load pages
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Insights = lazy(() => import('./pages/Insights'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard'));
const GameContainer = lazy(() => import('./components/GameContainer'));
const AchievementNotification = lazy(() => import('./components/AchievementNotification'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Onboarding = lazy(() => import('./components/Onboarding'));
const IQTest = lazy(() => import('./components/IQTest'));

import type { GameType, UserStats } from './types';
import { getUserStats, saveUserStats } from './utils/storage';
import { updateStreakOnGameComplete, checkAndUnlockAchievements, getStreakData } from './utils/achievements';
import { audioManager } from './utils/audio';

function App() {
  const [userStats, setUserStats] = useState<UserStats>(getUserStats());
  const [streakData, setStreakData] = useState(getStreakData());
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('ygy_onboarded');
  });
  const [showProfile, setShowProfile] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const { language } = useAppSelector((state) => state.settings);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    saveUserStats(userStats);
  }, [userStats]);

  const handleStartGame = (game: GameType) => {
    setCurrentGame(game);
    audioManager.playClick();
  };

  const handleGameComplete = (score: number, _accuracy: number) => {
    if (currentGame) {
      const today = new Date().toISOString().split('T')[0];
      const newStats = { ...userStats };

      if (!newStats.gameStats[currentGame]) {
        newStats.gameStats[currentGame] = { highScore: 0, totalPlays: 0, totalScore: 0 };
      }

      const gameStats = newStats.gameStats[currentGame];
      gameStats.totalPlays += 1;
      gameStats.totalScore += score;
      if (score > gameStats.highScore) {
        gameStats.highScore = score;
      }

      // Update daily stats
      if (!newStats.dailyStats[today]) {
        newStats.dailyStats[today] = { gamesPlayed: 0, totalScore: 0, timeSpent: 0 };
      }
      newStats.dailyStats[today].gamesPlayed += 1;
      newStats.dailyStats[today].totalScore += score;

      // Update streak
      const streakResult = updateStreakOnGameComplete();
      setStreakData(streakResult.streakData);

      if (streakResult.newAchievements.length > 0) {
        setNewAchievement(streakResult.newAchievements[0]);
        audioManager.playAchievement();
      }

      setUserStats(newStats);
      setCurrentGame(null);
    }
  };

  const handleCloseOnboarding = () => {
    localStorage.setItem('ygy_onboarded', 'true');
    setShowOnboarding(false);
  };

  const handleCloseAchievement = () => {
    setNewAchievement(null);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard userStats={userStats} onStartGame={handleStartGame} />} />
              <Route path="/analytics" element={<Analytics userStats={userStats} />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/iq-test" element={<IQTest />} />
              <Route path="/game/:gameId" element={<GameContainer currentGame={currentGame} onGameComplete={handleGameComplete} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>

          {showOnboarding && <Onboarding onComplete={handleCloseOnboarding} />}
          {newAchievement && (
            <AchievementNotification
              achievement={newAchievement}
              onClose={handleCloseAchievement}
            />
          )}
          {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
          
          <LanguageSwitcher />
        </Router>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;

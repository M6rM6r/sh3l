import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Lazy load pages for bundle optimization
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
const LanguageSwitcher = lazy(() => import('./components/LanguageSwitcher'));

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

  // Initialize language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('ygy_language');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLang;
    }
  }, []);

  useEffect(() => {
    saveUserStats(userStats);
  }, [userStats]);

  const handleStartGame = (game: GameType) => {
    setCurrentGame(game);
  };

  const handleGameComplete = (score: number, _accuracy: number) => {
    if (currentGame) {
      const today = new Date().toISOString().split('T')[0];
      const newStats = { ...userStats };

      // Update game-specific stats
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
        newStats.dailyStats[today] = { gamesPlayed: 0, totalScore: 0, accuracy: 0 };
      }
      newStats.dailyStats[today].gamesPlayed += 1;
      newStats.dailyStats[today].totalScore += score;

      // Update cognitive area stats
      const areaMap: Record<GameType, keyof typeof newStats.cognitiveAreas> = {
        memory: 'memory',
        speed: 'speed',
        attention: 'attention',
        flexibility: 'flexibility',
        problemSolving: 'problemSolving',
        math: 'problemSolving',
        reaction: 'speed',
        word: 'memory',
        visual: 'attention',
        spatial: 'problemSolving',
        memorySequence: 'memory'
      };

      const area = areaMap[currentGame];
      const currentAreaScore = newStats.cognitiveAreas[area].score;
      newStats.cognitiveAreas[area].score = Math.min(100, currentAreaScore + (score / 100));
      newStats.cognitiveAreas[area].gamesPlayed += 1;

      setUserStats(newStats);

      // Update streak
      const updatedStreak = updateStreakOnGameComplete(score);
      setStreakData(updatedStreak);

      // Check for achievements
      const unlocked = checkAndUnlockAchievements();
      if (unlocked.length > 0) {
        // Show first new achievement
        setNewAchievement(unlocked[0]);
        audioManager.playAchievement();
      }
    }

    setCurrentGame(null);
  };

  const handleIQTestComplete = (_score: number, stats: Partial<UserStats>) => {
    const newStats = { ...userStats, ...stats };
    setUserStats(newStats);
    saveUserStats(newStats);
  };

  const handleBackToDashboard = () => {
    setCurrentGame(null);
  };

  const handleViewProfile = () => {
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('lumosity_onboarded', 'true');
  };

  // If onboarding is needed, show it
  if (showOnboarding) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <div className="app">
          <Suspense fallback={<div className="loading-screen">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    userStats={userStats}
                    streakData={streakData}
                    onStartGame={handleStartGame}
                    onViewProfile={handleViewProfile}
                  />
                }
              />
              <Route
                path="/game/:gameType"
                element={
                  <GameContainer
                    gameType={currentGame || 'memory'}
                    onComplete={handleGameComplete}
                    onExit={handleBackToDashboard}
                  />
                }
              />
              <Route
                path="/insights"
                element={
                  <Insights
                    userStats={userStats}
                    streakData={streakData}
                  />
                }
              />
              <Route path="/analytics" element={<Analytics userStats={userStats} />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/iq-test" element={<IQTest onComplete={handleIQTestComplete} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>

          {newAchievement && (
            <AchievementNotification
              achievement={newAchievement}
              onClose={() => setNewAchievement(null)}
            />
          )}
          {showProfile && <UserProfile onClose={handleCloseProfile} />}
          
          <LanguageSwitcher />
        </div>
      </Router>
    </I18nextProvider>
  );
};

export default App;

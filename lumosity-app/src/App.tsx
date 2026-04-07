import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import { LandingSkeleton, PageSkeleton } from './components/Skeletons';
import PageTransition from './components/PageTransition';

// Lazy load pages for bundle optimization
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
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
const Support = lazy(() => import('./pages/Support'));
const Settings = lazy(() => import('./pages/Settings'));

import type { GameType, UserStats } from './types';
import { getUserStats, saveUserStats } from './utils/storage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import { updateStreakOnGameComplete, checkAndUnlockAchievements, getStreakData } from './utils/achievements';
import { audioManager } from './utils/audio';
import { useEngagement } from './hooks/useEngagement';

function GameRouteWrapper({
  onComplete,
  onExit,
}: {
  onComplete: (score: number, accuracy: number) => void;
  onExit: () => void;
}) {
  const { gameType } = useParams<{ gameType: string }>();
  return (
    <GameContainer
      gameType={(gameType as GameType) || 'memory'}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  // Login requirement removed - allow direct access to games
  return children;
}

function App() {
  const [userStats, setUserStats] = useState<UserStats>(getUserStats());
  const [streakData, setStreakData] = useState(getStreakData());
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const showOnboarding = false; // Skip onboarding, go straight to games

  // Engagement tracking — streaks, notifications, comebacks
  useEngagement();

  // Apply dark theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

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

      const gameStats = newStats.gameStats[currentGame]!;
      gameStats.totalPlays += 1;
      gameStats.totalScore += score;
      if (score > gameStats.highScore) {
        gameStats.highScore = score;
      }

      // Update daily stats
      if (!newStats.dailyStats[today]) {
        newStats.dailyStats[today] = { date: today, gamesPlayed: 0, totalScore: 0, accuracy: 0 };
      }
      newStats.dailyStats[today].gamesPlayed += 1;
      newStats.dailyStats[today].totalScore += score;

      // Update cognitive area stats
      const areaMap: Partial<Record<GameType, keyof typeof newStats.cognitiveAreas>> = {
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

      const area = areaMap[currentGame] ?? 'memory';
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

  const handleResetProgress = () => {
    const resetStats = getUserStats();
    const resetStreak = getStreakData();
    setUserStats(resetStats);
    setStreakData(resetStreak);
    setCurrentGame(null);
    setNewAchievement(null);
  };

  // Onboarding skipped - go straight to games

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <div className="app">
          <ErrorBoundary>
            <Suspense fallback={<LandingSkeleton />}>
            <Routes>
              <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/onboarding" element={<PageTransition><OnboardingPage /></PageTransition>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <PageTransition>
                    <Dashboard
                      userStats={userStats}
                      streakData={streakData}
                      onStartGame={handleStartGame}
                      onViewProfile={handleViewProfile}
                    />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/game/:gameType"
                element={
                    <GameRouteWrapper
                      onComplete={handleGameComplete}
                      onExit={handleBackToDashboard}
                    />
                }
              />
              <Route
                path="/insights"
                element={
                  <ProtectedRoute>
                    <PageTransition>
                    <Insights
                      userStats={userStats}
                      streakData={streakData}
                      onBack={handleBackToDashboard}
                    />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <PageTransition><Analytics userStats={userStats} /></PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <PageTransition><LeaderboardPage /></PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route path="/iq-test"
                element={<PageTransition><IQTest onComplete={handleIQTestComplete} onExit={handleBackToDashboard} /></PageTransition>}
              />
              <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <PageTransition><Support /></PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            {newAchievement && (
              <AchievementNotification
                achievementId={newAchievement}
                onClose={() => setNewAchievement(null)}
              />
            )}
            {showProfile && (
              <UserProfile
                onClose={handleCloseProfile}
                onResetProgress={handleResetProgress}
              />
            )}
            <LanguageSwitcher />
            <OfflineIndicator />
            <InstallPrompt />
          </Suspense>
          </ErrorBoundary>
        </div>
      </Router>
    </I18nextProvider>
  );
};

export default App;



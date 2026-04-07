import React, { useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GameType, UserStats } from '../types';
import type { StreakData } from '../utils/achievements';
import DailyWorkoutCard from '../components/DailyWorkoutCard';
import GamePreviewCard from '../components/GamePreviewCard';
import { getDailyWorkout, getWorkoutProgress } from '../utils/workout';
import { BrainIcon, MemoryIcon, SpeedIcon, FocusIcon, CognitiveIcon } from '../components/BrainIcons';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import LanguageSwitcher from '../components/LanguageSwitcher';
import CognitivePatternAnalysis from '../components/CognitivePatternAnalysis';
import FocusSession from '../components/FocusSession';
import GoalSetting from '../components/GoalSetting';
import EfficiencyOptimization from '../components/EfficiencyOptimization';

interface DashboardProps {
  userStats: UserStats;
  streakData: StreakData;
  onStartGame: (game: GameType) => void;
  onViewProfile: () => void;
}

const Dashboard: React.FC<DashboardProps> = memo(({ userStats, streakData, onStartGame, onViewProfile }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const games = useMemo(() => [
    { id: 'memory' as GameType, name: t('games.memory'), icon: MemoryIcon, color: '#ab47bc', area: t('cognitive.memory') },
    { id: 'speed' as GameType, name: t('games.speed'), icon: SpeedIcon, color: '#43a047', area: t('cognitive.speed') },
    { id: 'attention' as GameType, name: t('games.attention'), icon: FocusIcon, color: '#1e88e5', area: t('cognitive.attention') },
    { id: 'flexibility' as GameType, name: t('games.flexibility'), icon: CognitiveIcon, color: '#fb8c00', area: t('cognitive.flexibility') },
    { id: 'problemSolving' as GameType, name: t('games.problemSolving'), icon: BrainIcon, color: '#00acc1', area: t('cognitive.problemSolving') },
    { id: 'math' as GameType, name: t('games.math'), icon: CognitiveIcon, color: '#e91e63', area: t('cognitive.problemSolving') },
    { id: 'reaction' as GameType, name: t('games.reaction'), icon: SpeedIcon, color: '#03a9f4', area: t('cognitive.speed') },
    { id: 'word' as GameType, name: t('games.word'), icon: MemoryIcon, color: '#9c27b0', area: t('cognitive.memory') },
    { id: 'visual' as GameType, name: t('games.visual'), icon: FocusIcon, color: '#ff9800', area: t('cognitive.attention') },
    { id: 'spatial' as GameType, name: t('games.spatial'), icon: BrainIcon, color: '#607d8b', area: t('cognitive.problemSolving') }
  ], [t]);

  const iqTestGame = useMemo(() => ({
    id: 'iq-test' as GameType,
    name: 'IQ Assessment',
    icon: BrainIcon,
    color: '#ff5722',
    area: 'Intelligence Assessment'
  }), []);

  // Voice commands
  const voiceCommands = [
    { command: 'start memory game', action: () => handleStartGame('memory') },
    { command: 'start speed game', action: () => handleStartGame('speed') },
    { command: 'start attention game', action: () => handleStartGame('attention') },
    { command: 'start flexibility game', action: () => handleStartGame('flexibility') },
    { command: 'start problem solving game', action: () => handleStartGame('problemSolving') },
    { command: 'view insights', action: () => navigate('/insights') },
    { command: 'view analytics', action: () => navigate('/analytics') },
    { command: 'view leaderboard', action: () => navigate('/leaderboard') },
    { command: 'view profile', action: onViewProfile },
  ];

  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceAssistant({
    commands: voiceCommands,
    continuous: false
  });

  const today = new Date().toISOString().split('T')[0];
  const todayStats = userStats.dailyStats[today] || { gamesPlayed: 0, totalScore: 0 };

  // Get daily workout
  const dailyWorkout = getDailyWorkout(userStats);
  const workoutProgress = getWorkoutProgress();

  const getLpiScore = () => {
    const areas = Object.values(userStats.cognitiveAreas);
    const totalScore = areas.reduce((sum, area) => sum + area.score, 0);
    return Math.round(totalScore / 5);
  };

  const handleStartGame = (game: GameType) => {
    onStartGame(game);
    navigate(`/game/${game}`);
  };

  const handleViewInsights = () => {
    navigate('/insights');
  };

  return (
    <div className="dashboard">
      <nav className="nav">
        <Link to="/" className="logo">Ygy</Link>
        <div className="nav-links">
          {streakData.currentStreak > 0 && (
            <div className="streak-display">
              <span className="flame">🔥</span>
              <span>{streakData.currentStreak} day streak</span>
            </div>
          )}
          <LanguageSwitcher />
          {isSupported && (
            <button
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? t('voice.listening') : 'Start voice control'}
            >
              🎤
            </button>
          )}
          <button className="profile-btn" onClick={onViewProfile} title={t('profile.title')}>👤</button>
          <span className="lpi-score">LPI: {getLpiScore()}</span>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>{t('dashboard.welcome')}</h1>
          <p>{t('dashboard.subtitle')}</p>
          {isListening && transcript && (
            <div className="voice-transcript">
              {t('dashboard.voice.transcript', { text: transcript })}
            </div>
          )}
        </div>

        <DailyWorkoutCard
          workout={dailyWorkout}
          progress={workoutProgress}
          userStats={userStats}
          onStartGame={handleStartGame}
        />

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{todayStats.gamesPlayed}</div>
            <div className="stat-label">Games Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{todayStats.totalScore}</div>
            <div className="stat-label">Today's Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{getLpiScore()}</div>
            <div className="stat-label">LPI Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{streakData.totalGamesPlayed}</div>
            <div className="stat-label">Total Games</div>
          </div>
        </div>

        <div className="cognitive-areas">
          <div className="cognitive-header">
            <h2>Your Cognitive Profile</h2>
            <button className="view-insights-btn" onClick={handleViewInsights}>
              📊 View Insights
            </button>
          </div>
          <div className="areas-chart">
            {Object.entries(userStats.cognitiveAreas).map(([area, data]) => (
              <div key={area} className="area-bar">
                <div className="area-info">
                  <span className="area-name">{area.charAt(0).toUpperCase() + area.slice(1)}</span>
                  <span className="area-score">{Math.round(data.score)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${data.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="strategic-planning">
          <h2>Strategic Development Plan</h2>
          <div className="planning-grid">
            <div className="planning-card">
              <div className="planning-icon">🎯</div>
              <h3>Current Focus</h3>
              <p>Memory Enhancement</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: '75%'}}></div>
              </div>
              <span className="progress-text">75% Complete</span>
            </div>
            <div className="planning-card">
              <div className="planning-icon">📈</div>
              <h3>Next Milestone</h3>
              <p>Problem Solving Mastery</p>
              <div className="milestone-target">Target: 90 LPI</div>
            </div>
            <div className="planning-card">
              <div className="planning-icon">⚡</div>
              <h3>Efficiency Metric</h3>
              <p>Avg. Session Time</p>
              <div className="metric-value">12.5 min</div>
              <span className="metric-trend">↑ 8% improvement</span>
            </div>
          </div>
        </div>

        <CognitivePatternAnalysis userStats={userStats} />

        <FocusSession onSessionComplete={(_duration, _gamesPlayed) => {
          // Session completed - analytics could be sent here
        }} />

        <GoalSetting
          userStats={userStats}
          onGoalSet={(_goal) => {
            // Goal set - could save to backend here
          }}
        />

        <EfficiencyOptimization userStats={userStats} />

        <div className="games-section">
          <h2>Choose Your Training</h2>
          <div className="games-grid">
            <GamePreviewCard
              key="iq-test"
              game={iqTestGame}
              highScore={userStats.iq || 0}
              totalPlays={userStats.iq ? 1 : 0}
              onClick={() => navigate('/iq-test')}
            />
            {games.map(game => (
              <GamePreviewCard
                key={game.id}
                game={game}
                highScore={userStats.gameStats[game.id]?.highScore || 0}
                totalPlays={userStats.gameStats[game.id]?.totalPlays || 0}
                onClick={() => onStartGame(game.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;



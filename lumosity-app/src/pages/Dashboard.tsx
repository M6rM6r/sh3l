import React, { useMemo, memo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import { toggleTheme } from '../store/slices/themeSlice';
import type { RootState } from '../store/store';
import type { GameType, NewGameType, UserStats } from '../types';
import type { StreakData } from '../utils/achievements';
import DailyWorkoutCard from '../components/DailyWorkoutCard';
import GamePreviewCard from '../components/GamePreviewCard';
import { getDailyWorkout, getWorkoutProgress } from '../utils/workout';
import { BrainIcon, MemoryIcon, SpeedIcon, FocusIcon, CognitiveIcon } from '../components/BrainIcons';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { audioManager } from '../utils/audio';
import { burstFromElement } from '../utils/particles';
import FocusSession from '../components/FocusSession';
import GoalSetting from '../components/GoalSetting';
import EfficiencyOptimization from '../components/EfficiencyOptimization';

type Category = 'all' | 'memory' | 'speed' | 'logic' | 'math' | 'focus' | 'language';

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all',      label: 'All Games', emoji: '🎮' },
  { id: 'memory',   label: 'Memory',    emoji: '🧠' },
  { id: 'speed',    label: 'Speed',     emoji: '⚡' },
  { id: 'logic',    label: 'Logic',     emoji: '🧩' },
  { id: 'math',     label: 'Math',      emoji: '➕' },
  { id: 'focus',    label: 'Focus',     emoji: '🎯' },
  { id: 'language', label: 'Language',  emoji: '📝' },
];

const ARCADE_GAMES: { id: NewGameType; name: string; emoji: string; color: string; category: Category }[] = [
  { id: 'memory_match',       name: 'Memory Match',       emoji: '🃏', color: '#ab47bc', category: 'memory'   },
  { id: 'number_sequence',    name: 'Number Sequence',    emoji: '🔢', color: '#1e88e5', category: 'logic'    },
  { id: 'pipe_connection',    name: 'Pipe Connection',    emoji: '🔧', color: '#43a047', category: 'logic'    },
  { id: 'pattern_recognition',name: 'Pattern Match',      emoji: '🔷', color: '#00acc1', category: 'logic'    },
  { id: 'logic_grid',         name: 'Logic Grid',         emoji: '🧩', color: '#e91e63', category: 'logic'    },
  { id: 'code_breaker',       name: 'Code Breaker',       emoji: '💻', color: '#ff5722', category: 'logic'    },
  { id: 'tower_of_hanoi',     name: 'Tower of Hanoi',     emoji: '🗼', color: '#795548', category: 'logic'    },
  { id: 'color_harmony',      name: 'Color Harmony',      emoji: '🎨', color: '#e91e63', category: 'focus'    },
  { id: 'math_marathon',      name: 'Math Marathon',      emoji: '🔢', color: '#3f51b5', category: 'math'     },
  { id: 'shape_shifter',      name: 'Shape Shifter',      emoji: '⬡',  color: '#009688', category: 'focus'    },
  { id: 'rhythm_blocks',      name: 'Rhythm Blocks',      emoji: '🥁', color: '#ff4081', category: 'focus'    },
  { id: 'maze_runner',        name: 'Maze Runner',        emoji: '🌀', color: '#ff9800', category: 'speed'    },
  { id: 'bubble_sort',        name: 'Bubble Sort',        emoji: '🫧', color: '#29b6f6', category: 'logic'    },
  { id: 'quick_reflexes',     name: 'Quick Reflexes',     emoji: '⚡', color: '#ffd600', category: 'speed'    },
  { id: 'chess',              name: 'Chess',              emoji: '♟', color: '#7c6f9f', category: 'logic'    },
  { id: 'voice_command',      name: 'Voice Stroop',       emoji: '🎙', color: '#f43f5e', category: 'focus'    },
  { id: 'voice_math',         name: 'Voice Math',         emoji: '🔊', color: '#0ea5e9', category: 'math'     },
  { id: 'voice_memory',       name: 'Voice Memory',       emoji: '🗣', color: '#8b5cf6', category: 'memory'   },
  { id: 'voice_spelling',     name: 'Voice Spelling',     emoji: '📢', color: '#10b981', category: 'language' },
];

interface DashboardProps {
  userStats: UserStats;
  streakData: StreakData;
  onStartGame: (game: GameType) => void;
  onViewProfile: () => void;
}

const Dashboard: React.FC<DashboardProps> = memo(({ userStats, streakData, onStartGame, onViewProfile }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.theme.theme);
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [isAmbient, setIsAmbient] = useState(() => audioManager.isAmbientEnabled);
  const [activeTool, setActiveTool] = useState<'focus' | 'goals' | 'optimize'>('focus');

  const toggleAmbient = useCallback(() => {
    audioManager.initAudio();
    const next = audioManager.toggleAmbient();
    setIsAmbient(next);
  }, []);

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

  const today = new Date().toISOString().split('T')[0];
  const todayStats = userStats.dailyStats[today] || { gamesPlayed: 0, totalScore: 0 };

  // Get daily workout
  const dailyWorkout = getDailyWorkout(userStats);
  const workoutProgress = getWorkoutProgress();

  const getLpiScore = () => {
    const areas = Object.values(userStats.cognitiveAreas) as Array<UserStats['cognitiveAreas'][keyof UserStats['cognitiveAreas']]>;
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
          <button className="theme-toggle" onClick={() => dispatch(toggleTheme())} title={t('dashboard.theme.toggle')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className={`ambient-btn${isAmbient ? ' active' : ''}`}
            onClick={toggleAmbient}
            title={isAmbient ? 'Pause music' : 'Play ambient music'}
          >🎵</button>
          <Link to="/analytics" className="nav-dash-link" title="Analytics">📊 Analytics</Link>
          <Link to="/leaderboard" className="nav-dash-link" title="Leaderboard">🏆 Leaderboard</Link>
          <Link to="/support" className="nav-dash-link" title="Support">💬 Support</Link>
          <button className="profile-btn" onClick={onViewProfile} title={t('profile.title')}>👤</button>
          <span className="lpi-score">LPI: {getLpiScore()}</span>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>{t('dashboard.welcome')}</h1>
          <p>{t('dashboard.subtitle')}</p>
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
          <div className="stat-card stat-card--link" onClick={handleViewInsights}>
            <div className="stat-value">💡</div>
            <div className="stat-label">View Insights</div>
          </div>
        </div>

        <div className="arcade-category-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`arcade-tab${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="games-section">
          <h2 className="section-title">Classic Training</h2>
          <div className="games-grid">
            {(activeCategory === 'all' || activeCategory === 'memory' || activeCategory === 'logic') && (
              <GamePreviewCard
                key="iq-test"
                game={iqTestGame}
                highScore={userStats.iq || 0}
                totalPlays={userStats.iq ? 1 : 0}
                onClick={() => navigate('/iq-test')}
              />
            )}
            {games
              .filter(game => {
                if (activeCategory === 'all') return true;
                const catMap: Record<string, Category> = {
                  memory: 'memory', memorySequence: 'memory', word: 'language',
                  speed: 'speed', reaction: 'speed',
                  attention: 'focus', flexibility: 'focus', visual: 'focus',
                  problemSolving: 'logic', spatial: 'logic', math: 'math',
                };
                return catMap[game.id] === activeCategory;
              })
              .map(game => (
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

        <div className="games-section arcade-section">
          <h2 className="section-title">⚡ Arcade Games</h2>
          <div className="arcade-games-grid">
            {ARCADE_GAMES
              .filter(g => activeCategory === 'all' || g.category === activeCategory)
              .map((game, i) => (
                <button
                  key={game.id}
                  className="arcade-game-tile"
                  style={{ '--tile-color': game.color, '--tile-i': i } as React.CSSProperties}
                  onClick={(e) => {
                    audioManager.initAudio();
                    audioManager.playCardSelect();
                    burstFromElement(e.currentTarget, game.color);
                    handleStartGame(game.id as GameType);
                  }}
                  onMouseEnter={() => { audioManager.initAudio(); audioManager.playButtonHover(); }}
                >
                  <span className="tile-emoji">{game.emoji}</span>
                  <span className="tile-name">{game.name}</span>
                </button>
              ))}
          </div>
        </div>

        <section className="training-tools-section">
          <h2 className="section-title">🛠️ Training Tools</h2>
          <div className="training-tools-tabs">
            <button
              className={`training-tab${activeTool === 'focus' ? ' active' : ''}`}
              onClick={() => setActiveTool('focus')}
            >⏱ Focus Timer</button>
            <button
              className={`training-tab${activeTool === 'goals' ? ' active' : ''}`}
              onClick={() => setActiveTool('goals')}
            >🎯 Set Goals</button>
            <button
              className={`training-tab${activeTool === 'optimize' ? ' active' : ''}`}
              onClick={() => setActiveTool('optimize')}
            >⚡ Optimize</button>
          </div>
          <div className="training-tools-panel">
            {activeTool === 'focus' && (
              <FocusSession
                onSessionComplete={(_duration, _games) => {
                  // session complete — future: record in userStats
                }}
              />
            )}
            {activeTool === 'goals' && (
              <GoalSetting
                userStats={userStats}
                onGoalSet={(_goal) => {
                  // goal saved — future: persist via API
                }}
              />
            )}
            {activeTool === 'optimize' && (
              <EfficiencyOptimization userStats={userStats} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
});

export default Dashboard;

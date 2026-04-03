import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserStats, GameType } from '../types';
import type { StreakData } from '../utils/achievements';
import ProgressChart from '../components/ProgressChart';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface InsightsProps {
  userStats: UserStats;
  streakData: StreakData;
  onBack: () => void;
}

const Insights: React.FC<InsightsProps> = ({ userStats, streakData }) => {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<'cognitive' | 'daily' | 'games'>('cognitive');
  // Calculate insights
  const insights = useMemo(() => {
    const gameEntries = Object.entries(userStats.gameStats);
    const totalGames = gameEntries.reduce((sum, [, stats]) => sum + stats.totalPlays, 0);
    const totalScore = gameEntries.reduce((sum, [, stats]) => sum + stats.totalScore, 0);
    
    // Best performing area
    const areaScores = Object.entries(userStats.cognitiveAreas).map(([area, data]) => ({
      area,
      score: data.score,
      gamesPlayed: data.gamesPlayed
    }));
    const bestArea = areaScores.sort((a, b) => b.score - a.score)[0];
    const weakestArea = areaScores.sort((a, b) => a.score - b.score)[0];
    
    // Recent activity (last 7 days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    const weeklyActivity = last7Days.map(date => ({
      date,
      games: userStats.dailyStats[date]?.gamesPlayed || 0
    }));
    
    // Best game
    const bestGame = gameEntries.sort(([, a], [, b]) => b.highScore - a.highScore)[0];
    
    return {
      totalGames,
      totalScore,
      bestArea,
      weakestArea,
      weeklyActivity,
      bestGame: bestGame ? { type: bestGame[0] as GameType, ...bestGame[1] } : null,
      averageScore: totalGames > 0 ? Math.round(totalScore / totalGames) : 0,
      lpiScore: Math.round(areaScores.reduce((sum, a) => sum + a.score, 0) / 5)
    };
  }, [userStats]);

  const getAreaName = (area: string) => {
    return area.charAt(0).toUpperCase() + area.slice(1);
  };

  const getGameName = (type: GameType) => {
    const names: Record<GameType, string> = {
      memory: 'Memory Matrix',
      speed: 'Speed Match',
      attention: 'Train of Thought',
      flexibility: 'Color Match',
      problemSolving: 'Pattern Recall',
      math: 'Chalkboard Challenge',
      reaction: 'Fish Food Frenzy',
      word: 'Word Bubble',
      visual: 'Lost in Migration',
      spatial: 'Rotation Recall',
      memorySequence: 'Memory Sequence'
    };
    return names[type] || type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Calculate max for chart scaling
  const maxDailyGames = Math.max(...insights.weeklyActivity.map(d => d.games), 1);

  return (
    <div className="insights-page">
      <nav className="nav">
        <Link to="/" className="logo">
          Lumosity<span>Clone</span>
        </Link>
        <ul className="nav-links">
          <li><Link to="/">{t('nav.home')}</Link></li>
          <li><Link to="/dashboard">{t('nav.dashboard')}</Link></li>
          <li><Link to="/insights" className="active">{t('nav.insights')}</Link></li>
          <li><Link to="/analytics">{t('nav.analytics')}</Link></li>
          <li><Link to="/leaderboard">{t('nav.leaderboard')}</Link></li>
          <li><LanguageSwitcher /></li>
        </ul>
      </nav>

      <div className="insights-content">
        <h1>{t('nav.insights')}</h1>
        <p className="insights-subtitle">Track your brain training journey and see how you've improved</p>

        {/* Overview Stats */}
        <div className="insights-overview">
          <div className="insight-card large">
            <div className="insight-value">{insights.lpiScore}</div>
            <div className="insight-label">LPI Score</div>
            <div className="insight-desc">Lumosity Performance Index</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{insights.totalGames}</div>
            <div className="insight-label">Games Played</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{insights.totalScore.toLocaleString()}</div>
            <div className="insight-label">Total Score</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{insights.averageScore}</div>
            <div className="insight-label">Avg Score</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{streakData.currentStreak}</div>
            <div className="insight-label">Day Streak</div>
          </div>
        </div>

        {/* Progress Charts */}
        <div className="insights-section">
          <h2>Your Progress</h2>
          <div className="chart-controls">
            <button
              className={`chart-btn ${chartType === 'cognitive' ? 'active' : ''}`}
              onClick={() => setChartType('cognitive')}
            >
              Cognitive Areas
            </button>
            <button
              className={`chart-btn ${chartType === 'daily' ? 'active' : ''}`}
              onClick={() => setChartType('daily')}
            >
              Daily Activity
            </button>
            <button
              className={`chart-btn ${chartType === 'games' ? 'active' : ''}`}
              onClick={() => setChartType('games')}
            >
              Game Performance
            </button>
          </div>
          <ProgressChart userStats={userStats} type={chartType} />
        </div>

        {/* Weekly Activity Chart */}
        <div className="insights-section">
          <h2>Last 7 Days Activity</h2>
          <div className="activity-chart">
            {insights.weeklyActivity.map((day) => (
              <div key={day.date} className="activity-bar-container">
                <div 
                  className="activity-bar" 
                  style={{
                    '--bar-height': `${(day.games / maxDailyGames) * 100}%`
                  } as React.CSSProperties}
                  data-active={day.games > 0}
                />
                <div className="activity-label">{formatDate(day.date)}</div>
                <div className="activity-value">{day.games}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive Areas Radar */}
        <div className="insights-section">
          <h2>Cognitive Profile</h2>
          <div className="cognitive-comparison">
            <div className="cognitive-stat highlight">
              <div className="cognitive-stat-icon">🏆</div>
              <div>
                <div className="cognitive-stat-label">Strongest Area</div>
                <div className="cognitive-stat-value">{insights.bestArea ? getAreaName(insights.bestArea.area) : '-'}</div>
                <div className="cognitive-stat-score">{insights.bestArea ? Math.round(insights.bestArea.score) : 0} LPI</div>
              </div>
            </div>
            <div className="cognitive-stat">
              <div className="cognitive-stat-icon">📈</div>
              <div>
                <div className="cognitive-stat-label">Focus Area</div>
                <div className="cognitive-stat-value">{insights.weakestArea ? getAreaName(insights.weakestArea.area) : '-'}</div>
                <div className="cognitive-stat-score">{insights.weakestArea ? Math.round(insights.weakestArea.score) : 0} LPI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Game */}
        {insights.bestGame && (
          <div className="insights-section">
            <h2>Your Best Performance</h2>
            <div className="best-game-card">
              <div className="best-game-icon">🏅</div>
              <div className="best-game-info">
                <div className="best-game-name">{getGameName(insights.bestGame.type)}</div>
                <div className="best-game-score">High Score: {insights.bestGame.highScore}</div>
                <div className="best-game-plays">Played {insights.bestGame.totalPlays} times</div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="insights-section tips">
          <h2>💡 Training Tips</h2>
          <ul className="tips-list">
            <li>Train daily to maintain your {streakData.currentStreak}-day streak</li>
            <li>Focus on {insights.weakestArea ? getAreaName(insights.weakestArea.area) : 'all areas'} to balance your cognitive profile</li>
            <li>Try playing at the same time each day to build a habit</li>
            <li>Your LPI score improves with consistent practice</li>
          </ul>
        </div>

        {/* Export Data */}
        <div className="insights-section">
          <button 
            className="btn-outline"
            onClick={() => {
              const data = JSON.stringify({ userStats, streakData }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'lumosity-data.json';
              a.click();
            }}
          >
            📥 Export My Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Insights;

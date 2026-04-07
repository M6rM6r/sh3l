import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BrainIcon, CognitiveIcon, SpeedIcon, MemoryIcon, FocusIcon } from './BrainIcons';
import { apiService } from '../services/api';
import type { AnalyticsData } from '../services/api';
import type { RootState } from '../store/store';
import { useYgyWebSocket } from '../hooks/useYgyWebSocket';
import { getUserStats } from '../utils/storage';

const PROFILE_LABELS: Record<string, string> = {
  memory: 'Memory',
  speed: 'Speed',
  attention: 'Attention',
  flexibility: 'Flexibility',
  problem_solving: 'Problem Solving',
};

export const RealTimeAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const userId = useSelector((state: RootState) => state.user.id);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const { lastMessage, readyState } = useYgyWebSocket(userId);

  // Initial fetch on mount / timeframe change
  useEffect(() => {
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe, userId]);

  // Apply live WebSocket updates to the displayed data
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'analytics_update' && lastMessage.payload) {
      setAnalyticsData(prev => prev ? { ...prev, ...(lastMessage.payload as Partial<AnalyticsData>) } : prev);
    }
    if (lastMessage.type === 'leaderboard_update' && lastMessage.payload) {
      setAnalyticsData(prev => {
        if (!prev) return prev;
        const stats = lastMessage.payload as { totalUsers?: number; totalGames?: number; avgScore?: number };
        return { ...prev, globalStats: { ...prev.globalStats, ...stats } };
      });
    }
  }, [lastMessage]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const mockData = apiService.generateMockAnalytics();
      let realData: Partial<AnalyticsData> = {};

      // Build gamePerformance from real localStorage stats
      const localStats = getUserStats();
      const localGamePerformance = (Object.entries(localStats.gameStats) as Array<[string, NonNullable<(typeof localStats.gameStats)[keyof typeof localStats.gameStats]>]>)
        .filter(([, s]) => s && s.totalPlays > 0)
        .map(([game, s]) => ({
          game: game.replace(/([A-Z])/g, ' $1').trim().slice(0, 14),
          avgScore: s.totalPlays > 0 ? Math.round(s.totalScore / s.totalPlays) : 0,
          plays: s.totalPlays,
        }));
      if (localGamePerformance.length > 0) {
        realData.gamePerformance = localGamePerformance;
      }

      const globalRes = await Promise.allSettled([apiService.getGlobalStatsFromApi()]);
      if (globalRes[0].status === 'fulfilled') {
        const g = globalRes[0].value;
        realData.globalStats = {
          totalUsers: g.total_users,
          totalGames: g.total_games_played,
          avgScore: Math.round(g.average_accuracy),
        };
      }

      if (userId && localStorage.getItem('authToken')) {
        const summaryRes = await Promise.allSettled([apiService.getAnalyticsSummary()]);
        if (summaryRes[0].status === 'fulfilled') {
          const s = summaryRes[0].value;
          const profile = s.cognitive_profile as Record<string, number>;
          realData.cognitiveAreas = Object.entries(profile).map(([key, score]) => ({
            area: PROFILE_LABELS[key] ?? key,
            score: Math.round(Number(score)),
            improvement: Math.round(s.improvement_trend > 0 ? s.improvement_trend : 5),
          }));
          const weekly = s.weekly_activity ?? [];
          realData.dailyActivity = weekly.map((w) => ({
            date: w.date.slice(0, 10),
            games: w.games,
            score: w.score,
          }));
        }
      }

      const finalData: AnalyticsData = {
        dailyActivity: realData.dailyActivity?.length ? realData.dailyActivity : mockData.dailyActivity,
        cognitiveAreas: realData.cognitiveAreas?.length ? realData.cognitiveAreas : mockData.cognitiveAreas,
        gamePerformance: realData.gamePerformance?.length ? realData.gamePerformance : (import.meta.env.DEV ? mockData.gamePerformance : []),
        globalStats: realData.globalStats || mockData.globalStats,
      };

      setAnalyticsData(finalData);
    } catch {
      // Silently fall back to mock data on error
      setAnalyticsData(apiService.generateMockAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const getAreaIcon = (area: string) => {
    switch (area.toLowerCase()) {
      case 'memory': return MemoryIcon;
      case 'speed': return SpeedIcon;
      case 'attention': return FocusIcon;
      case 'flexibility': return CognitiveIcon;
      case 'problem solving': return BrainIcon;
      default: return BrainIcon;
    }
  };

  const getAreaColor = (area: string) => {
    switch (area.toLowerCase()) {
      case 'memory': return '#ab47bc';
      case 'speed': return '#43a047';
      case 'attention': return '#1e88e5';
      case 'flexibility': return '#fb8c00';
      case 'problem solving': return '#00acc1';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>{t('analytics.loading')}</p>
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="analytics-error">{t('analytics.error')}</div>;
  }

  return (
    <div className="real-time-analytics">
      <div className="analytics-header">
        <h2>
          {t('analytics.title')}
          <span
            className={`ws-status-dot${readyState === WebSocket.OPEN ? ' ws-live' : ''}`}
            title={readyState === WebSocket.OPEN ? 'Live' : 'Connecting…'}
          />
        </h2>
        <div className="timeframe-selector">
          {(['7d', '30d', '90d'] as const).map(timeframe => (
            <button
              key={timeframe}
              className={`timeframe-btn ${selectedTimeframe === timeframe ? 'active' : ''}`}
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="global-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{analyticsData.globalStats.totalUsers.toLocaleString()}</div>
            <div className="stat-label">{t('analytics.activeUsers')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-value">{analyticsData.globalStats.totalGames.toLocaleString()}</div>
            <div className="stat-label">{t('analytics.gamesPlayed')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{analyticsData.globalStats.avgScore.toLocaleString()}</div>
            <div className="stat-label">{t('analytics.avgScore')}</div>
          </div>
        </div>
      </div>

      <div className="analytics-chart">
        <h3>{t('analytics.dailyActivity')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analyticsData.dailyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="games" stroke="#4fc3f7" strokeWidth={2} />
            <Line type="monotone" dataKey="score" stroke="#81d4fa" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="cognitive-areas-grid">
        {analyticsData.cognitiveAreas.map(area => {
          const IconComponent = getAreaIcon(area.area);
          return (
            <div key={area.area} className="cognitive-area-card">
              <div className="area-header">
                <IconComponent size={32} animated />
                <div className="area-info">
                  <h4>{area.area}</h4>
                  <span className="improvement">+{area.improvement}% {t('analytics.improvement')}</span>
                </div>
              </div>
              <div className="area-score">
                <div className="score-bar">
                  <div
                    className="score-fill"
                    style={{
                      width: `${area.score}%`,
                      backgroundColor: getAreaColor(area.area)
                    }}
                  ></div>
                </div>
                <span className="score-value">{area.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="analytics-chart">
        <h3>{t('analytics.gamePerformance')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData.gamePerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="game" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avgScore" fill="#4fc3f7" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};



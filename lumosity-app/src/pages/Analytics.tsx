import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { RealTimeAnalytics } from '../components/RealTimeAnalytics';
import LanguageSwitcher from '../components/LanguageSwitcher';
import type { UserStats } from '../types';

interface AnalyticsProps {
  userStats: UserStats;
}

type DateRange = '7d' | '30d' | 'all';

const Analytics: React.FC<AnalyticsProps> = ({ userStats }) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  // Build daily score trend from dailyStats
  const scoreTrend = useMemo(() => {
    const entries = (Object.entries(userStats.dailyStats) as Array<[string, UserStats['dailyStats'][string]]>)
      .sort(([a], [b]) => a.localeCompare(b));
    const sliced = dateRange === '7d' ? entries.slice(-7)
      : dateRange === '30d' ? entries.slice(-30)
      : entries;
    return sliced.map(([date, day]) => ({
      date: date.slice(5), // MM-DD
      score: day.totalScore || 0,
      games: day.gamesPlayed || 0,
    }));
  }, [userStats.dailyStats, dateRange]);

  // Cognitive radar data
  const radarData = useMemo(() =>
    (Object.entries(userStats.cognitiveAreas) as Array<[string, UserStats['cognitiveAreas'][keyof UserStats['cognitiveAreas']]]>).map(([area, data]) => ({
      subject: area.charAt(0).toUpperCase() + area.slice(1),
      score: Math.round(data.score),
      fullMark: 100,
    })),
  [userStats.cognitiveAreas]);

  // Game frequency bar chart
  const gameFrequency = useMemo(() =>
    (Object.entries(userStats.gameStats) as Array<[string, NonNullable<(typeof userStats.gameStats)[keyof typeof userStats.gameStats]>]>)
      .map(([game, stats]) => ({
        game: game.replace(/([A-Z])/g, ' $1').trim().slice(0, 12),
        plays: stats.totalPlays,
        best: stats.highScore,
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10),
  [userStats.gameStats]);

  // Summary cards
  const gameStats = Object.values(userStats.gameStats).filter(Boolean) as NonNullable<(typeof userStats.gameStats)[keyof typeof userStats.gameStats]>[];
  const totalGames = gameStats.reduce((s, g) => s + g.totalPlays, 0);
  const totalScore = gameStats.reduce((s, g) => s + g.totalScore, 0);
  const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
  const bestGame = (Object.entries(userStats.gameStats) as Array<[string, NonNullable<(typeof userStats.gameStats)[keyof typeof userStats.gameStats]>]>).sort(([, a], [, b]) => b.highScore - a.highScore)[0];
  const predictedScore = scoreTrend.length >= 3
    ? Math.max(0, Math.round(scoreTrend[scoreTrend.length - 1].score * 1.05))
    : avgScore;

  const chartColor = '#4fc3f7';
  const gridColor = 'rgba(255,255,255,0.08)';
  const textColor = 'rgba(255,255,255,0.6)';

  return (
    <div className="analytics-page">
      <nav className="nav">
        <Link to="/" className="logo">Ygy<span>.</span></Link>
        <ul className="nav-links">
          <li><Link to="/">{t('nav.home')}</Link></li>
          <li><Link to="/dashboard">{t('nav.dashboard')}</Link></li>
          <li><Link to="/insights">{t('nav.insights')}</Link></li>
          <li><Link to="/analytics" className="active">{t('nav.analytics')}</Link></li>
          <li><LanguageSwitcher /></li>
        </ul>
      </nav>

      <div className="analytics-content">
        <div className="analytics-header">
          <h1>{t('nav.analytics')}</h1>
          <div className="date-range-tabs">
            {(['7d', '30d', 'all'] as DateRange[]).map(r => (
              <button
                key={r}
                className={`range-tab${dateRange === r ? ' active' : ''}`}
                onClick={() => setDateRange(r)}
              >
                {r === '7d' ? t('analytics.last7days') : r === '30d' ? t('analytics.last30days') : 'All time'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="analytics-summary-grid">
          <div className="analytics-stat-card">
            <span className="stat-card-label">{t('analytics.totalSessions')}</span>
            <span className="stat-card-value">{totalGames}</span>
          </div>
          <div className="analytics-stat-card">
            <span className="stat-card-label">{t('analytics.bestScore')}</span>
            <span className="stat-card-value">{bestGame ? bestGame[1].highScore : 0}</span>
          </div>
          <div className="analytics-stat-card">
            <span className="stat-card-label">Avg Score</span>
            <span className="stat-card-value">{avgScore}</span>
          </div>
          <div className="analytics-stat-card">
            <span className="stat-card-label">{t('analytics.predictedScore')}</span>
            <span className="stat-card-value predicted">{predictedScore}</span>
          </div>
        </div>

        {/* Score trend */}
        <div className="analytics-chart-card">
          <h3>{t('analytics.scoreTrend')}</h3>
          {scoreTrend.length === 0 ? (
            <p className="no-data">{t('analytics.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 11 }} />
                <YAxis tick={{ fill: textColor, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ color: textColor }} />
                <Line type="monotone" dataKey="score" stroke={chartColor} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="analytics-two-col">
          {/* Cognitive radar */}
          <div className="analytics-chart-card">
            <h3>{t('analytics.cognitiveBreakdown')}</h3>
            {radarData.length === 0 ? (
              <p className="no-data">{t('analytics.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: textColor, fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke={chartColor} fill={chartColor} fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Game frequency */}
          <div className="analytics-chart-card">
            <h3>{t('analytics.gameFrequency')}</h3>
            {gameFrequency.length === 0 ? (
              <p className="no-data">{t('analytics.noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gameFrequency} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: textColor, fontSize: 11 }} />
                  <YAxis type="category" dataKey="game" tick={{ fill: textColor, fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <Bar dataKey="plays" fill={chartColor} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Real-time section */}
        <div className="analytics-realtime">
          <h3>{t('analytics.realtime')}</h3>
          <RealTimeAnalytics />
        </div>
      </div>
    </div>
  );
};

export default Analytics;



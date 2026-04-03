import React, { useMemo } from 'react';
import type { UserStats } from '../types';

interface EfficiencyOptimizationProps {
  userStats: UserStats;
}

const EfficiencyOptimization: React.FC<EfficiencyOptimizationProps> = ({ userStats }) => {

  const optimizationInsights = useMemo(() => {
    const recentGames = Object.values(userStats.dailyStats).slice(-14); // Last 2 weeks
    const totalGames = recentGames.length;
    const avgGamesPerDay = totalGames / 14;

    // Calculate session patterns
    const gameTimes = recentGames.map(day => day.gamesPlayed || 0);
    const avgSessionSize = gameTimes.reduce((a, b) => a + b, 0) / Math.max(1, gameTimes.length);

    // Calculate peak performance times (simple heuristic)
    const peakHours = [9, 10, 11, 14, 15, 16, 19, 20, 21]; // Common productive hours

    // Calculate cognitive load balance
    const areas = Object.entries(userStats.cognitiveAreas);
    const areaScores = areas.map(([, data]) => data.score);
    const avgScore = areaScores.reduce((a, b) => a + b, 0) / areaScores.length;
    const balanceVariance = areaScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / areaScores.length;

    // Generate recommendations
    const recommendations = [];

    if (avgGamesPerDay < 3) {
      recommendations.push({
        type: 'frequency',
        priority: 'high',
        title: 'Increase Training Frequency',
        description: `You're playing ${avgGamesPerDay.toFixed(1)} games/day. Aim for 5-7 games daily for optimal progress.`,
        action: 'Schedule daily training sessions'
      });
    }

    if (avgSessionSize > 8) {
      recommendations.push({
        type: 'session',
        priority: 'medium',
        title: 'Optimize Session Length',
        description: 'Longer sessions may reduce focus. Try shorter, more frequent sessions.',
        action: 'Break training into 15-20 minute sessions'
      });
    }

    if (balanceVariance > 100) {
      const weakestArea = areas.reduce((weakest, [, data]) =>
        data.score < weakest[1].score ? [weakest[0], data] : weakest
      );
      recommendations.push({
        type: 'balance',
        priority: 'high',
        title: 'Address Cognitive Imbalance',
        description: `${weakestArea[0]} is significantly behind. Focus on this area for balanced development.`,
        action: `Prioritize ${weakestArea[0]} training`
      });
    }

    // Time-based recommendations
    const currentHour = new Date().getHours();
    const isPeakTime = peakHours.includes(currentHour);
    if (!isPeakTime && currentHour >= 6 && currentHour <= 22) {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        title: 'Consider Training Timing',
        description: 'Peak cognitive performance typically occurs during standard work hours.',
        action: 'Schedule important training during 9-11 AM or 2-4 PM'
      });
    }

    // Difficulty optimization
    const recentScores = recentGames.slice(-7).map(day => day.totalScore || 0);
    const scoreTrend = recentScores.length > 1 ?
      recentScores[recentScores.length - 1] - recentScores[0] : 0;

    if (Math.abs(scoreTrend) < 50) {
      recommendations.push({
        type: 'difficulty',
        priority: 'medium',
        title: 'Adjust Difficulty Level',
        description: 'Your scores are plateauing. Consider increasing difficulty for continued growth.',
        action: 'Increase game difficulty settings'
      });
    }

    return {
      avgGamesPerDay: avgGamesPerDay.toFixed(1),
      avgSessionSize: Math.round(avgSessionSize),
      balanceScore: Math.max(0, 100 - Math.sqrt(balanceVariance)),
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      })
    };
  }, [userStats]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e53935';
      case 'medium': return '#fb8c00';
      case 'low': return '#43a047';
      default: return '#666';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="efficiency-optimization">
      <h3>⚡ Efficiency Optimization</h3>

      <div className="efficiency-metrics">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-title">Daily Frequency</div>
          <div className="metric-value">{optimizationInsights.avgGamesPerDay}</div>
          <div className="metric-subtitle">games/day</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-title">Session Size</div>
          <div className="metric-value">{optimizationInsights.avgSessionSize}</div>
          <div className="metric-subtitle">games/session</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⚖️</div>
          <div className="metric-title">Balance Score</div>
          <div className="metric-value">{Math.round(optimizationInsights.balanceScore)}</div>
          <div className="metric-subtitle">/100</div>
        </div>
      </div>

      <div className="optimization-recommendations">
        <h4>🎯 Strategic Recommendations</h4>
        <div className="recommendations-list">
          {optimizationInsights.recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="recommendation-header">
                <div className="priority-indicator">
                  <span className="priority-icon">{getPriorityIcon(rec.priority)}</span>
                  <span className="priority-label" style={{ color: getPriorityColor(rec.priority) }}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <div className="recommendation-type">{rec.type}</div>
              </div>

              <h5 className="recommendation-title">{rec.title}</h5>
              <p className="recommendation-description">{rec.description}</p>
              <div className="recommendation-action">
                <strong>Action:</strong> {rec.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="efficiency-tips">
        <h4>💡 Efficiency Tips</h4>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h5>Focus Strategy</h5>
            <p>Concentrate on 1-2 cognitive areas per session for maximum improvement.</p>
          </div>

          <div className="tip-card">
            <div className="tip-icon">⏰</div>
            <h5>Timing Matters</h5>
            <p>Train during peak cognitive hours (9-11 AM, 2-4 PM) for better results.</p>
          </div>

          <div className="tip-card">
            <div className="tip-icon">📈</div>
            <h5>Progressive Difficulty</h5>
            <p>Increase difficulty gradually as you improve to maintain optimal challenge.</p>
          </div>

          <div className="tip-card">
            <div className="tip-icon">🔄</div>
            <h5>Consistent Routine</h5>
            <p>Daily practice with consistent timing yields better long-term results.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyOptimization;
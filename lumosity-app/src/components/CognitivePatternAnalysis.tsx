import React, { useMemo } from 'react';
import type { UserStats } from '../types';

interface CognitivePatternAnalysisProps {
  userStats: UserStats;
}

const CognitivePatternAnalysis: React.FC<CognitivePatternAnalysisProps> = ({ userStats }) => {

  const patternAnalysis = useMemo(() => {
    const areas = Object.entries(userStats.cognitiveAreas);

    // Calculate improvement trends
    const recentGames = userStats.dailyStats;
    const recentDates = Object.keys(recentGames).sort().slice(-7); // Last 7 days
    const recentScores = recentDates.map(date => recentGames[date]?.totalScore || 0);

    // Calculate trend (simple linear regression slope)
    const trend = recentScores.length > 1 ?
      recentScores.reduce((acc, score, i) => acc + score * i, 0) /
      recentScores.reduce((acc, _, i) => acc + i * i, 0) : 0;

    // Identify strengths and weaknesses
    const strengths = areas.filter(([, data]) => data.score > 70).map(([area]) => area);
    const weaknesses = areas.filter(([, data]) => data.score < 50).map(([area]) => area);

    // Calculate consistency (coefficient of variation)
    const scores = areas.map(([, data]) => data.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const consistency = Math.sqrt(variance) / mean;

    // Predict next milestone
    const currentLPI = areas.reduce((sum, [, data]) => sum + data.score, 0) / areas.length;
    const predictedLPI = Math.min(100, currentLPI + (trend * 0.1));

    return {
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      trendValue: Math.abs(trend),
      strengths,
      weaknesses,
      consistency: 1 - consistency, // Convert to consistency score (0-1)
      currentLPI: Math.round(currentLPI),
      predictedLPI: Math.round(predictedLPI),
      recommendedFocus: weaknesses.length > 0 ? weaknesses[0] :
                        strengths.length === 0 ? 'balanced' : 'mastery'
    };
  }, [userStats]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getConsistencyColor = (consistency: number) => {
    if (consistency > 0.8) return '#43a047';
    if (consistency > 0.6) return '#fb8c00';
    return '#e53935';
  };

  return (
    <div className="cognitive-pattern-analysis">
      <h3>🧠 Cognitive Pattern Analysis</h3>

      <div className="pattern-grid">
        <div className="pattern-card">
          <div className="pattern-icon">📊</div>
          <h4>Performance Trend</h4>
          <div className="trend-display">
            <span className="trend-icon">{getTrendIcon(patternAnalysis.trend)}</span>
            <span className="trend-text">{patternAnalysis.trend}</span>
            {patternAnalysis.trendValue > 0 && (
              <span className="trend-value">({patternAnalysis.trendValue.toFixed(1)} pts/day)</span>
            )}
          </div>
        </div>

        <div className="pattern-card">
          <div className="pattern-icon">🎯</div>
          <h4>Current LPI</h4>
          <div className="lpi-display">
            <div className="lpi-value">{patternAnalysis.currentLPI}</div>
            <div className="lpi-target">Target: {patternAnalysis.predictedLPI}</div>
          </div>
        </div>

        <div className="pattern-card">
          <div className="pattern-icon">⚖️</div>
          <h4>Consistency Score</h4>
          <div className="consistency-bar">
            <div
              className="consistency-fill"
              style={{
                width: `${patternAnalysis.consistency * 100}%`,
                backgroundColor: getConsistencyColor(patternAnalysis.consistency)
              }}
            ></div>
          </div>
          <span className="consistency-text">
            {Math.round(patternAnalysis.consistency * 100)}% consistent
          </span>
        </div>

        <div className="pattern-card">
          <div className="pattern-icon">🎯</div>
          <h4>Strategic Focus</h4>
          <div className="focus-area">
            {patternAnalysis.recommendedFocus === 'balanced' ? (
              <span>Balanced Development</span>
            ) : patternAnalysis.recommendedFocus === 'mastery' ? (
              <span>Mastery Enhancement</span>
            ) : (
              <span>Improve {patternAnalysis.recommendedFocus}</span>
            )}
          </div>
        </div>
      </div>

      <div className="insights-section">
        <h4>🔍 Key Insights</h4>
        <div className="insights-list">
          {patternAnalysis.strengths.length > 0 && (
            <div className="insight-item">
              <span className="insight-icon">💪</span>
              <span>Strengths: {patternAnalysis.strengths.join(', ')}</span>
            </div>
          )}
          {patternAnalysis.weaknesses.length > 0 && (
            <div className="insight-item">
              <span className="insight-icon">🎯</span>
              <span>Growth Areas: {patternAnalysis.weaknesses.join(', ')}</span>
            </div>
          )}
          <div className="insight-item">
            <span className="insight-icon">📈</span>
            <span>Predicted LPI in 30 days: {patternAnalysis.predictedLPI}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitivePatternAnalysis;
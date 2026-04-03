import React, { useState, useMemo } from 'react';
import type { UserStats } from '../types';

interface GoalSettingProps {
  userStats: UserStats;
  onGoalSet: (goal: Goal) => void;
}

interface Goal {
  id: string;
  type: 'lpi' | 'games' | 'streak' | 'area';
  target: number;
  area?: string;
  deadline: Date;
  createdAt: Date;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ userStats, onGoalSet }) => {
  const [selectedType, setSelectedType] = useState<Goal['type']>('lpi');
  const [targetValue, setTargetValue] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [deadline, setDeadline] = useState('');

  const currentMetrics = useMemo(() => {
    const areas = Object.entries(userStats.cognitiveAreas);
    const totalLPI = areas.reduce((sum, [, data]) => sum + data.score, 0) / areas.length;

    return {
      currentLPI: Math.round(totalLPI),
      totalGames: Object.values(userStats.gameStats).reduce((sum, game) => sum + game.totalPlays, 0),
      currentStreak: 0, // This would need to be calculated from daily stats or stored separately
      areas: areas.map(([area, data]) => ({
        name: area,
        score: Math.round(data.score),
        level: Math.floor(data.score / 20) + 1
      }))
    };
  }, [userStats]);

  const goalPredictions = useMemo(() => {
    const daysUntilDeadline = deadline ? Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 30;

    // Simple predictive model based on recent performance
    const recentGames = Object.values(userStats.dailyStats).slice(-7);
    const avgDailyScore = recentGames.length > 0 ?
      recentGames.reduce((sum, day) => sum + (day.totalScore || 0), 0) / recentGames.length : 0;

    const predictedImprovement = avgDailyScore * daysUntilDeadline * 0.1; // Conservative estimate

    return {
      daysUntilDeadline,
      predictedLPI: Math.min(100, currentMetrics.currentLPI + predictedImprovement),
      requiredDailyGames: Math.max(1, Math.ceil((parseInt(targetValue) || 0) / daysUntilDeadline)),
      feasibility: predictedImprovement > (parseInt(targetValue) || 0) * 0.5 ? 'achievable' : 'challenging'
    };
  }, [userStats, deadline, targetValue, currentMetrics.currentLPI]);

  const handleSetGoal = () => {
    if (!targetValue || !deadline) return;

    const goal: Goal = {
      id: Date.now().toString(),
      type: selectedType,
      target: parseInt(targetValue),
      area: selectedType === 'area' ? selectedArea : undefined,
      deadline: new Date(deadline),
      createdAt: new Date()
    };

    onGoalSet(goal);
    // Reset form
    setTargetValue('');
    setDeadline('');
    setSelectedArea('');
  };

  const getGoalSuggestions = () => {
    const suggestions = [];

    if (currentMetrics.currentLPI < 70) {
      suggestions.push({
        type: 'lpi' as const,
        target: Math.min(100, currentMetrics.currentLPI + 15),
        description: `Reach LPI ${Math.min(100, currentMetrics.currentLPI + 15)}`
      });
    }

    if (currentMetrics.totalGames < 100) {
      suggestions.push({
        type: 'games' as const,
        target: Math.min(200, currentMetrics.totalGames + 50),
        description: `Play ${Math.min(200, currentMetrics.totalGames + 50)} total games`
      });
    }

    const weakestArea = currentMetrics.areas.reduce((weakest, area) =>
      area.score < weakest.score ? area : weakest
    );

    if (weakestArea.score < 60) {
      suggestions.push({
        type: 'area' as const,
        target: Math.min(100, weakestArea.score + 20),
        area: weakestArea.name,
        description: `Improve ${weakestArea.name} to ${Math.min(100, weakestArea.score + 20)}`
      });
    }

    return suggestions;
  };

  return (
    <div className="goal-setting">
      <h3>🎯 Advanced Goal Setting</h3>

      <div className="current-metrics">
        <h4>Current Performance</h4>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">LPI Score</span>
            <span className="metric-value">{currentMetrics.currentLPI}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Total Games</span>
            <span className="metric-value">{currentMetrics.totalGames}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Current Streak</span>
            <span className="metric-value">{currentMetrics.currentStreak}</span>
          </div>
        </div>
      </div>

      <div className="goal-form">
        <h4>Set New Goal</h4>

        <div className="form-row">
          <label>Goal Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as Goal['type'])}
          >
            <option value="lpi">LPI Score</option>
            <option value="games">Total Games</option>
            <option value="streak">Streak Days</option>
            <option value="area">Specific Area</option>
          </select>
        </div>

        {selectedType === 'area' && (
          <div className="form-row">
            <label>Cognitive Area:</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="">Select area...</option>
              {currentMetrics.areas.map(area => (
                <option key={area.name} value={area.name}>
                  {area.name} (Current: {area.score})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-row">
          <label>Target Value:</label>
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={`Enter target ${selectedType}`}
          />
        </div>

        <div className="form-row">
          <label>Deadline:</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />
        </div>

        {deadline && targetValue && (
          <div className="prediction-panel">
            <h5>🎯 Goal Prediction</h5>
            <div className="prediction-details">
              <div className="prediction-item">
                <span>Days to deadline:</span>
                <span>{goalPredictions.daysUntilDeadline}</span>
              </div>
              <div className="prediction-item">
                <span>Predicted LPI:</span>
                <span>{goalPredictions.predictedLPI}</span>
              </div>
              <div className="prediction-item">
                <span>Daily games needed:</span>
                <span>{goalPredictions.requiredDailyGames}</span>
              </div>
              <div className="prediction-item">
                <span>Feasibility:</span>
                <span className={`feasibility-${goalPredictions.feasibility}`}>
                  {goalPredictions.feasibility}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          className="set-goal-btn"
          onClick={handleSetGoal}
          disabled={!targetValue || !deadline}
        >
          🚀 Set Strategic Goal
        </button>
      </div>

      <div className="goal-suggestions">
        <h4>💡 Smart Suggestions</h4>
        <div className="suggestions-list">
          {getGoalSuggestions().map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-btn"
              onClick={() => {
                setSelectedType(suggestion.type);
                setTargetValue(suggestion.target.toString());
                if (suggestion.area) setSelectedArea(suggestion.area);
              }}
            >
              <span className="suggestion-text">{suggestion.description}</span>
              <span className="suggestion-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoalSetting;
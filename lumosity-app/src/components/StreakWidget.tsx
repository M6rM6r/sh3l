import React from 'react';
import { getDueGames, getWeaknessGames } from '../utils/spacedRepetition';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ygy_stats';

interface DayActivity {
  date: string;
  count: number;
}

function getLast7Days(): DayActivity[] {
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const daily = stats.dailyStats || {};
  const days: DayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: daily[key]?.gamesPlayed || 0 });
  }
  return days;
}

function getStreak(): number {
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return stats.currentStreak || 0;
}

function getTodayCount(): number {
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const today = new Date().toISOString().slice(0, 10);
  return stats.dailyStats?.[today]?.gamesPlayed || 0;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const StreakWidget: React.FC = () => {
  const streak = getStreak();
  const todayCount = getTodayCount();
  const last7 = getLast7Days();
  const dueGames = getDueGames().slice(0, 3);
  const weakGames = getWeaknessGames(2);
  const dailyGoal = 3;
  const progress = Math.min(100, (todayCount / dailyGoal) * 100);

  return (
    <div className="streak-widget">
      <div className="streak-header">
        <div className="streak-fire">
          <span className="streak-number">{streak}</span>
          <span className="streak-label">🔥 day streak</span>
        </div>
        <div className="streak-progress-ring">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={progress >= 100 ? '#22c55e' : '#6366f1'}
              strokeWidth="4"
              strokeDasharray={`${progress * 1.257} 125.7`}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className="streak-goal-text">{todayCount}/{dailyGoal}</span>
        </div>
      </div>

      <div className="streak-heatmap">
        {last7.map((day, i) => (
          <div key={day.date} className="streak-day">
            <div
              className="streak-dot"
              style={{
                background: day.count === 0
                  ? 'rgba(255,255,255,0.08)'
                  : day.count < 3
                    ? 'rgba(99,102,241,0.5)'
                    : '#6366f1',
              }}
            />
            <span className="streak-day-label">{DAY_LABELS[(new Date(day.date).getDay())]}</span>
          </div>
        ))}
      </div>

      {dueGames.length > 0 && (
        <div className="streak-due">
          <span className="streak-due-label">Review due:</span>
          {dueGames.map(g => (
            <Link key={g} to={`/game/${g}`} className="streak-due-chip">{g.replace(/_/g, ' ')}</Link>
          ))}
        </div>
      )}

      {weakGames.length > 0 && (
        <div className="streak-weak">
          <span className="streak-due-label">Needs work:</span>
          {weakGames.map(g => (
            <Link key={g} to={`/game/${g}`} className="streak-due-chip streak-weak-chip">{g.replace(/_/g, ' ')}</Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StreakWidget;

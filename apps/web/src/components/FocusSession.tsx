import React, { useState, useEffect, useCallback } from 'react';

interface FocusSessionProps {
  onSessionComplete: (duration: number, gamesPlayed: number) => void;
}

const FocusSession: React.FC<FocusSessionProps> = ({ onSessionComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [sessionType, setSessionType] = useState<'pomodoro' | 'deep-focus' | 'intensive'>('pomodoro');

  const sessionConfigs = {
    pomodoro: { duration: 25 * 60, name: 'Pomodoro Focus', description: '25min focused training' },
    'deep-focus': { duration: 50 * 60, name: 'Deep Focus', description: '50min intensive session' },
    intensive: { duration: 90 * 60, name: 'Intensive Training', description: '90min comprehensive workout' }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setIsActive(false);
            onSessionComplete(sessionConfigs[sessionType].duration - time, gamesPlayed);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeRemaining, sessionType, gamesPlayed, onSessionComplete]);

  const startSession = useCallback(() => {
    setIsActive(true);
    setTimeRemaining(sessionConfigs[sessionType].duration);
    setGamesPlayed(0);
  }, [sessionType]);

  const pauseSession = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetSession = useCallback(() => {
    setIsActive(false);
    setTimeRemaining(sessionConfigs[sessionType].duration);
    setGamesPlayed(0);
  }, [sessionType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((sessionConfigs[sessionType].duration - timeRemaining) / sessionConfigs[sessionType].duration) * 100;
  };

  return (
    <div className="focus-session">
      <h3>🎯 Focus Session Management</h3>

      <div className="session-config">
        <div className="session-types">
          {Object.entries(sessionConfigs).map(([key, config]) => (
            <button
              key={key}
              className={`session-type-btn ${sessionType === key ? 'active' : ''}`}
              onClick={() => setSessionType(key as typeof sessionType)}
              disabled={isActive}
            >
              <div className="session-name">{config.name}</div>
              <div className="session-desc">{config.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="session-timer">
        <div className="timer-display">
          <div className="time-remaining">{formatTime(timeRemaining)}</div>
          <div className="session-progress">
            <div
              className="progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <div className="session-stats">
            <span>Games: {gamesPlayed}</span>
            <span>Session: {sessionConfigs[sessionType].name}</span>
          </div>
        </div>

        <div className="timer-controls">
          {!isActive ? (
            <button className="start-btn" onClick={startSession}>
              ▶️ Start Session
            </button>
          ) : (
            <button className="pause-btn" onClick={pauseSession}>
              ⏸️ Pause
            </button>
          )}
          <button className="reset-btn" onClick={resetSession}>
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="session-guidance">
        <h4>Strategic Guidelines</h4>
        <div className="guidance-tips">
          <div className="tip">
            <span className="tip-icon">🎯</span>
            <span>Focus on one cognitive area per session for maximum efficiency</span>
          </div>
          <div className="tip">
            <span className="tip-icon">⚡</span>
            <span>Maintain consistent performance - quality over quantity</span>
          </div>
          <div className="tip">
            <span className="tip-icon">📊</span>
            <span>Track your progress and adjust difficulty strategically</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusSession;


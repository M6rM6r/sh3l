import React, { useState, useEffect, useCallback } from 'react';
import { audioManager } from '../../utils/audio';

interface LevelUpAnimationProps {
  newLevel: number;
  rewards: {
    coins?: number;
    xp?: number;
    items?: string[];
  };
  onComplete: () => void;
}

export const LevelUpAnimation: React.FC<LevelUpAnimationProps> = ({
  newLevel,
  rewards,
  onComplete
}) => {
  const [stage, setStage] = useState<'intro' | 'counting' | 'rewards' | 'complete'>('intro');
  const [displayLevel, setDisplayLevel] = useState(newLevel - 1);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [confetti, setConfetti] = useState<Array<{id: number, x: number, y: number, color: string, rotation: number}>>([]);

  useEffect(() => {
    audioManager.playGameOver(); // Reuse celebratory sound
    generateConfetti();
    
    // Animation sequence
    const timer1 = setTimeout(() => setStage('counting'), 500);
    const timer2 = setTimeout(() => {
      setDisplayLevel(newLevel);
      setStage('rewards');
    }, 2000);
    const timer3 = setTimeout(() => {
      if (rewards.coins) {
        animateCoins(rewards.coins);
      }
    }, 2500);
    const timer4 = setTimeout(() => setStage('complete'), 4500);
    const timer5 = setTimeout(() => onComplete(), 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [newLevel, rewards, onComplete]);

  const generateConfetti = () => {
    const colors = ['#4fc3f7', '#81d4fa', '#ffeb3b', '#ff9800', '#e91e63', '#9c27b0', '#00e676'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360
    }));
    setConfetti(pieces);
  };

  const animateCoins = (targetCoins: number) => {
    const duration = 1500;
    const steps = 30;
    const increment = targetCoins / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCoins) {
        setDisplayCoins(targetCoins);
        clearInterval(timer);
      } else {
        setDisplayCoins(Math.floor(current));
      }
    }, duration / steps);
  };

  return (
    <div className="level-up-overlay" onClick={stage === 'complete' ? onComplete : undefined}>
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}

      <div className="level-up-content">
        {/* Stage 1: Level Up Text */}
        {stage === 'intro' && (
          <div className="level-up-text-intro">
            <span className="level-up-label">LEVEL UP!</span>
          </div>
        )}

        {/* Stage 2: Level Counter */}
        {(stage === 'counting' || stage === 'rewards' || stage === 'complete') && (
          <div className="level-display">
            <div className="level-badge">
              <div className="level-number">{displayLevel}</div>
              <div className="level-label">LEVEL</div>
            </div>
            
            {stage !== 'counting' && (
              <div className="level-glow-ring" />
            )}
          </div>
        )}

        {/* Stage 3: Rewards */}
        {(stage === 'rewards' || stage === 'complete') && (
          <div className="level-rewards">
            <h3>Rewards Unlocked!</h3>
            <div className="rewards-list">
              {rewards.coins && (
                <div className="reward-item coins">
                  <span className="reward-icon">🪙</span>
                  <span className="reward-value">+{displayCoins}</span>
                  <span className="reward-label">Coins</span>
                </div>
              )}
              {rewards.xp && (
                <div className="reward-item xp">
                  <span className="reward-icon">✨</span>
                  <span className="reward-value">+{rewards.xp}</span>
                  <span className="reward-label">Bonus XP</span>
                </div>
              )}
              {rewards.items?.map((item, idx) => (
                <div key={idx} className="reward-item item">
                  <span className="reward-icon">🎁</span>
                  <span className="reward-value">{item}</span>
                  <span className="reward-label">Unlocked</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue hint */}
        {stage === 'complete' && (
          <div className="continue-hint">Tap to continue</div>
        )}
      </div>

      <style>{`
        .level-up-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 22, 40, 0.95);
          backdrop-filter: blur(10px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confetti-fall linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .level-up-content {
          text-align: center;
          animation: content-scale 0.5s ease-out;
        }

        @keyframes content-scale {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .level-up-text-intro {
          animation: text-bounce 0.6s ease-out;
        }

        .level-up-label {
          font-size: 48px;
          font-weight: 900;
          background: linear-gradient(135deg, #ffd700, #ffeb3b, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-transform: uppercase;
          letter-spacing: 8px;
          text-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
        }

        @keyframes text-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .level-display {
          position: relative;
          margin: 40px 0;
        }

        .level-badge {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 0 60px rgba(255, 215, 0, 0.6),
            inset 0 -10px 40px rgba(0, 0, 0, 0.3),
            inset 0 10px 40px rgba(255, 255, 255, 0.3);
          animation: badge-pulse 2s ease-in-out infinite;
        }

        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .level-number {
          font-size: 80px;
          font-weight: 900;
          color: #0a1628;
          line-height: 1;
        }

        .level-label {
          font-size: 18px;
          font-weight: 700;
          color: #0a1628;
          letter-spacing: 4px;
        }

        .level-glow-ring {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          border: 4px solid transparent;
          background: linear-gradient(90deg, #ffd700, #ff8c00, #ffd700) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ring-rotate 3s linear infinite;
        }

        @keyframes ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .level-rewards {
          animation: slide-up 0.5s ease-out;
        }

        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .level-rewards h3 {
          font-size: 24px;
          color: #fff;
          margin-bottom: 20px;
        }

        .rewards-list {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .reward-item {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: reward-pop 0.5s ease-out;
        }

        @keyframes reward-pop {
          0% { transform: scale(0); }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .reward-icon {
          font-size: 32px;
        }

        .reward-value {
          font-size: 28px;
          font-weight: 700;
          color: #ffd700;
        }

        .reward-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .continue-hint {
          margin-top: 40px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// XP Progress Bar Component
interface XPProgressBarProps {
  currentXP: number;
  xpToNext: number;
  currentLevel: number;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  currentXP,
  xpToNext,
  currentLevel,
  showLevel = true,
  size = 'md'
}) => {
  const progress = Math.min(100, Math.max(0, (currentXP / xpToNext) * 100));
  
  const sizeClasses = {
    sm: { height: '6px', level: '18px' },
    md: { height: '10px', level: '24px' },
    lg: { height: '16px', level: '32px' }
  };

  return (
    <div className="xp-progress-container">
      {showLevel && (
        <div className="xp-level-badge" style={{ fontSize: sizeClasses[size].level }}>
          LVL {currentLevel}
        </div>
      )}
      
      <div className="xp-bar-wrapper" style={{ height: sizeClasses[size].height }}>
        <div className="xp-bar-bg">
          <div 
            className="xp-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="xp-text">
          {currentXP.toLocaleString()} / {xpToNext.toLocaleString()} XP
        </div>
      </div>

      <style>{`
        .xp-progress-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .xp-level-badge {
          background: linear-gradient(135deg, #4fc3f7, #1565c0);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
        }

        .xp-bar-wrapper {
          flex: 1;
          position: relative;
        }

        .xp-bar-bg {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          overflow: hidden;
          height: 100%;
        }

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4fc3f7, #81d4fa, #4fc3f7);
          background-size: 200% 100%;
          border-radius: 100px;
          transition: width 0.5s ease-out;
          animation: shimmer 2s infinite;
          box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .xp-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

// Gamification Stats Card
interface GamificationStatsProps {
  level: number;
  totalXP: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
}

export const GamificationStats: React.FC<GamificationStatsProps> = ({
  level,
  totalXP,
  coins,
  currentStreak,
  longestStreak
}) => {
  return (
    <div className="gamification-stats">
      <div className="stat-box level">
        <div className="stat-icon">🏆</div>
        <div className="stat-value">{level}</div>
        <div className="stat-label">Level</div>
      </div>
      
      <div className="stat-box xp">
        <div className="stat-icon">✨</div>
        <div className="stat-value">{totalXP.toLocaleString()}</div>
        <div className="stat-label">Total XP</div>
      </div>
      
      <div className="stat-box coins">
        <div className="stat-icon">🪙</div>
        <div className="stat-value">{coins.toLocaleString()}</div>
        <div className="stat-label">Coins</div>
      </div>
      
      <div className="stat-box streak">
        <div className="stat-icon">🔥</div>
        <div className="stat-value">{currentStreak}</div>
        <div className="stat-label">Day Streak</div>
        {currentStreak === longestStreak && currentStreak > 0 && (
          <div className="streak-record">Record!</div>
        )}
      </div>

      <style>{`
        .gamification-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 600px) {
          .gamification-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-box {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          border: 1px solid var(--border);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }

        .stat-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .stat-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }

        .streak-record {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

// Streak Calendar Component
interface StreakCalendarProps {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate?: string;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  currentStreak,
  longestStreak,
  lastPlayedDate
}) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1; // Convert to 0-6 (Mon-Sun)

  return (
    <div className="streak-calendar">
      <div className="streak-header">
        <div className="streak-flame">
          <span className="flame-icon">🔥</span>
          <span className="streak-count">{currentStreak}</span>
        </div>
        <div className="streak-info">
          <div className="streak-title">Day Streak</div>
          <div className="streak-subtitle">
            {currentStreak >= longestStreak ? 'Personal best!' : `${longestStreak - currentStreak} days to beat record`}
          </div>
        </div>
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          const isToday = index === adjustedToday;
          const isCompleted = index < adjustedToday || (isToday && lastPlayedDate === new Date().toISOString().split('T')[0]);
          const isFuture = index > adjustedToday;

          return (
            <div 
              key={index}
              className={`calendar-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
            >
              <span className="day-letter">{day}</span>
              {isCompleted && <span className="day-check">✓</span>}
              {isToday && !isCompleted && <span className="day-dot" />}
            </div>
          );
        })}
      </div>

      <style>{`
        .streak-calendar {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(238, 90, 36, 0.15));
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(255, 107, 107, 0.3);
        }

        .streak-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .streak-flame {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .flame-icon {
          font-size: 32px;
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .streak-count {
          font-size: 36px;
          font-weight: 800;
          color: #ff6b6b;
        }

        .streak-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .streak-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .calendar-day {
          aspect-ratio: 1;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }

        .calendar-day.completed {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          border-color: transparent;
        }

        .calendar-day.today {
          border-color: #ff6b6b;
          border-width: 2px;
        }

        .calendar-day.future {
          opacity: 0.5;
        }

        .day-letter {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .day-check {
          font-size: 14px;
          color: white;
          margin-top: 2px;
        }

        .day-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff6b6b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

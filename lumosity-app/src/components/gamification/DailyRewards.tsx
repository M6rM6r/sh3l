import React, { useState, useEffect } from 'react';
import { apiService } from '../../utils/api';
import { useToastHelpers } from '../Toast';

interface DailyReward {
  day_number: number;
  reward_type: 'coins' | 'xp' | 'item';
  reward_amount?: number;
  item_name?: string;
  is_claimed: boolean;
  can_claim: boolean;
  is_today: boolean;
}

interface DailyRewardsCalendarProps {
  currentStreak: number;
  onClaim: (reward: any) => void;
}

export const DailyRewardsCalendar: React.FC<DailyRewardsCalendarProps> = ({
  currentStreak,
  onClaim
}) => {
  const [rewards, setRewards] = useState<DailyReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [claimingDay, setClaimingDay] = useState<number | null>(null);
  const { success, error } = useToastHelpers();

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const response = await apiService.get('/gamification/daily-rewards');
      setRewards(response.data);
    } catch (err) {
      console.error('Failed to load daily rewards:', err);
    }
  };

  const handleClaim = async (day: number) => {
    const reward = rewards.find(r => r.day_number === day);
    if (!reward || !reward.can_claim) return;

    setClaimingDay(day);
    setIsLoading(true);

    try {
      const response = await apiService.post('/gamification/daily-rewards/claim');
      
      if (response.data.success) {
        const { reward_type, reward_amount, item_name, new_balance, current_streak } = response.data;
        
        let rewardText = '';
        if (reward_type === 'coins') rewardText = `${reward_amount} coins`;
        else if (reward_type === 'xp') rewardText = `${reward_amount} XP`;
        else if (reward_type === 'item') rewardText = item_name || 'Mystery Item';
        
        success('Reward Claimed!', `You got ${rewardText}`);
        onClaim(response.data);
        loadRewards();
      }
    } catch (err: any) {
      error('Claim Failed', err.response?.data?.detail || 'Already claimed today');
    } finally {
      setIsLoading(false);
      setClaimingDay(null);
    }
  };

  const getWeekNumber = (day: number) => Math.ceil(day / 7);

  const weeks = [1, 2, 3, 4];

  return (
    <div className="daily-rewards-container">
      <div className="rewards-header">
        <div className="rewards-title-section">
          <h2>Daily Rewards</h2>
          <p>Play every day to earn bonus rewards!</p>
        </div>
        <div className="streak-display">
          <div className="streak-flame">🔥</div>
          <div className="streak-info">
            <span className="streak-count">{currentStreak}</span>
            <span className="streak-label">Day Streak</span>
          </div>
        </div>
      </div>

      <div className="weeks-container">
        {weeks.map(week => (
          <div key={week} className="week-section">
            <div className="week-header">
              <span className="week-label">Week {week}</span>
              <div className="week-divider" />
            </div>
            
            <div className="week-days">
              {rewards
                .filter(r => getWeekNumber(r.day_number) === week)
                .map(reward => (
                  <div
                    key={reward.day_number}
                    className={`reward-day ${reward.is_claimed ? 'claimed' : ''} ${reward.is_today ? 'today' : ''} ${reward.can_claim ? 'claimable' : ''}`}
                    onClick={() => reward.can_claim && handleClaim(reward.day_number)}
                  >
                    <div className="day-number">Day {reward.day_number}</div>
                    
                    <div className="reward-content">
                      {reward.reward_type === 'coins' && (
                        <>
                          <span className="reward-emoji">🪙</span>
                          <span className="reward-value">{reward.reward_amount}</span>
                        </>
                      )}
                      {reward.reward_type === 'xp' && (
                        <>
                          <span className="reward-emoji">✨</span>
                          <span className="reward-value">{reward.reward_amount} XP</span>
                        </>
                      )}
                      {reward.reward_type === 'item' && (
                        <>
                          <span className="reward-emoji">🎁</span>
                          <span className="reward-value">{reward.item_name || 'Item'}</span>
                        </>
                      )}
                    </div>

                    <div className="day-status">
                      {reward.is_claimed ? (
                        <span className="claimed-check">✓ Claimed</span>
                      ) : reward.can_claim ? (
                        <button 
                          className="claim-btn"
                          disabled={isLoading && claimingDay === reward.day_number}
                        >
                          {claimingDay === reward.day_number ? 'Claiming...' : 'Claim'}
                        </button>
                      ) : reward.is_today ? (
                        <span className="today-label">Play today!</span>
                      ) : (
                        <span className="locked-label">🔒</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rewards-footer">
        <div className="bonus-info">
          <span className="bonus-icon">🎯</span>
          <span>Day 7, 14, 21, 28: Special items!</span>
        </div>
        <div className="bonus-info">
          <span className="bonus-icon">🔥</span>
          <span>Maintain streak for bigger rewards</span>
        </div>
      </div>

      <style>{`
        .daily-rewards-container {
          padding: 24px;
          max-width: 900px;
          margin: 0 auto;
        }

        .rewards-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .rewards-title-section h2 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px;
        }

        .rewards-title-section p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }

        .streak-display {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #ff6b6b20, #ee5a2420);
          border: 2px solid #ff6b6b40;
          border-radius: 16px;
          padding: 16px 24px;
        }

        .streak-flame {
          font-size: 36px;
          animation: flicker 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .streak-info {
          display: flex;
          flex-direction: column;
        }

        .streak-count {
          font-size: 32px;
          font-weight: 800;
          color: #ff6b6b;
          line-height: 1;
        }

        .streak-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .weeks-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .week-section {
          background: var(--bg-card);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid var(--border);
        }

        .week-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .week-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .week-divider {
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .week-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }

        @media (max-width: 768px) {
          .week-days {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 480px) {
          .week-days {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .reward-day {
          background: var(--bg-elevated);
          border-radius: 16px;
          padding: 16px 12px;
          text-align: center;
          border: 2px solid transparent;
          transition: all 0.2s;
          cursor: default;
        }

        .reward-day:not(.claimed):not(.today):hover {
          transform: translateY(-2px);
        }

        .reward-day.claimed {
          background: #22c55e20;
          border-color: #22c55e40;
          opacity: 0.7;
        }

        .reward-day.today {
          background: linear-gradient(135deg, #ff6b6b20, #ee5a2420);
          border-color: #ff6b6b;
          box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
        }

        .reward-day.claimable {
          cursor: pointer;
          animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
          50% { box-shadow: 0 0 20px 4px rgba(255, 107, 107, 0.2); }
        }

        .day-number {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .reward-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 12px;
        }

        .reward-emoji {
          font-size: 28px;
        }

        .reward-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .day-status {
          min-height: 28px;
        }

        .claimed-check {
          font-size: 12px;
          font-weight: 600;
          color: #22c55e;
        }

        .claim-btn {
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .claim-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        .claim-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .today-label {
          font-size: 11px;
          font-weight: 600;
          color: #ff6b6b;
        }

        .locked-label {
          font-size: 16px;
          opacity: 0.5;
        }

        .rewards-footer {
          display: flex;
          gap: 24px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 600px) {
          .rewards-footer {
            flex-direction: column;
            gap: 12px;
          }
        }

        .bonus-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .bonus-icon {
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useToastHelpers } from './Toast';
import { LevelUpAnimation, XPProgressBar, GamificationStats, StreakCalendar } from './gamification/LevelUpAnimation';
import { Shop } from './gamification/Shop';
import { DailyRewardsCalendar } from './gamification/DailyRewards';
import { apiService } from '../services/api';
import { Modal } from './UI';

interface GamificationProfile {
  user_id: number;
  username: string;
  current_xp: number;
  total_xp_earned: number;
  current_level: number;
  xp_to_next_level: number;
  level_progress_percent: number;
  coins: number;
  total_coins_earned: number;
  longest_streak: number;
  current_streak: number;
  games_played_today: number;
}

type TabType = 'overview' | 'shop' | 'rewards' | 'inventory' | 'leaderboard';

export const GamificationDashboard: React.FC = () => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; rewards: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success } = useToastHelpers();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiService.get('/gamification/profile');
      setProfile(response.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = (newBalance: number) => {
    if (profile) {
      setProfile({ ...profile, coins: newBalance });
    }
  };

  const handleRewardClaim = (reward: any) => {
    if (profile) {
      const newCoins = reward.new_balance || profile.coins;
      setProfile({ 
        ...profile, 
        coins: newCoins,
        current_streak: reward.current_streak || profile.current_streak
      });
    }
  };

  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
    setLevelUpData(null);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'shop', label: 'Shop', icon: '🛒' },
    { id: 'rewards', label: 'Daily Rewards', icon: '🎁' },
    { id: 'inventory', label: 'Inventory', icon: '🎒' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }
  ];

  if (isLoading) {
    return (
      <div className="gamification-loading">
        <div className="loading-spinner" />
        <p>Loading your progress...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="gamification-error">
        <p>Failed to load gamification data</p>
        <button onClick={loadProfile}>Retry</button>
      </div>
    );
  }

  return (
    <div className="gamification-dashboard">
      {/* Level Up Animation */}
      {showLevelUp && levelUpData && (
        <LevelUpAnimation
          newLevel={levelUpData.level}
          rewards={levelUpData.rewards}
          onComplete={handleLevelUpComplete}
        />
      )}

      {/* Header */}
      <div className="gamification-header">
        <div className="header-content">
          <h1>Your Progress</h1>
          <XPProgressBar
            currentXP={profile.current_xp}
            xpToNext={profile.xp_to_next_level}
            currentLevel={profile.current_level}
            size="lg"
          />
        </div>
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="stat-icon">🪙</span>
            <span className="stat-value">{profile.coins.toLocaleString()}</span>
          </div>
          <div className="quick-stat">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{profile.current_streak} days</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="gamification-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="gamification-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <GamificationStats
              level={profile.current_level}
              totalXP={profile.total_xp_earned}
              coins={profile.coins}
              currentStreak={profile.current_streak}
              longestStreak={profile.longest_streak}
            />
            
            <div className="overview-sections">
              <div className="section-card">
                <h3>🔥 Streak</h3>
                <StreakCalendar
                  currentStreak={profile.current_streak}
                  longestStreak={profile.longest_streak}
                />
              </div>
              
              <div className="section-card">
                <h3>📈 Recent Activity</h3>
                <div className="activity-placeholder">
                  <p>Keep playing to see your activity!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <Shop
            userCoins={profile.coins}
            userLevel={profile.current_level}
            onPurchase={handlePurchase}
          />
        )}

        {activeTab === 'rewards' && (
          <DailyRewardsCalendar
            currentStreak={profile.current_streak}
            onClaim={handleRewardClaim}
          />
        )}

        {activeTab === 'inventory' && (
          <div className="inventory-tab">
            <h2>Your Inventory</h2>
            <p>Items you've purchased will appear here</p>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-tab">
            <h2>Global Leaderboard</h2>
            <p>Compete with players worldwide</p>
          </div>
        )}
      </div>

      <style>{`
        .gamification-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .gamification-loading,
        .gamification-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--bg-elevated);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .gamification-header {
          background: linear-gradient(135deg, var(--bg-card), var(--bg-elevated));
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 24px;
          border: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        @media (max-width: 768px) {
          .gamification-header {
            flex-direction: column;
            align-items: stretch;
          }
        }

        .header-content {
          flex: 1;
        }

        .header-content h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
        }

        .quick-stats {
          display: flex;
          gap: 16px;
        }

        .quick-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-elevated);
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .quick-stat .stat-icon {
          font-size: 24px;
        }

        .quick-stat .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .gamification-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--bg-card);
          border: 2px solid var(--border);
          border-radius: 12px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .tab-btn.active {
          background: var(--accent-bg);
          border-color: var(--accent);
          color: var(--accent);
        }

        .tab-icon {
          font-size: 18px;
        }

        .gamification-content {
          min-height: 400px;
        }

        .overview-tab {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .overview-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .section-card {
          background: var(--bg-card);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid var(--border);
        }

        .section-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
        }

        .activity-placeholder {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        .inventory-tab,
        .leaderboard-tab {
          background: var(--bg-card);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          border: 1px solid var(--border);
        }

        .inventory-tab h2,
        .leaderboard-tab h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 12px;
        }

        .inventory-tab p,
        .leaderboard-tab p {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

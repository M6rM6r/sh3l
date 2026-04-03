import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUnlockedAchievements, achievements, resetAchievements } from '../utils/achievements';
import { getStreakData } from '../utils/achievements';

interface UserProfileProps {
  onClose: () => void;
  onResetProgress: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose, onResetProgress }) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'stats' | 'settings'>('achievements');
  const { t } = useTranslation();
  const unlockedIds = getUnlockedAchievements();
  const streakData = getStreakData();

  const unlockedAchievements = achievements.filter(a => unlockedIds.includes(a.id));
  const lockedAchievements = achievements.filter(a => !unlockedIds.includes(a.id));

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <div className="profile-header">
          <h2>{t('profile.title')}</h2>
          <button className="profile-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-tabs">
          <button 
            className={`profile-tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            🏆 {t('profile.achievements')}
          </button>
          <button 
            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 {t('profile.stats')}
          </button>
          <button 
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ {t('profile.settings')}
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'achievements' && (
            <div className="achievements-list">
              <h3>{t('profile.unlocked')} ({unlockedAchievements.length}/{achievements.length})</h3>
              {unlockedAchievements.length > 0 ? (
                <div className="achievement-grid">
                  {unlockedAchievements.map(ach => (
                    <div key={ach.id} className="achievement-badge unlocked">
                      <div className="badge-icon">{ach.icon}</div>
                      <div className="badge-name">{ach.name}</div>
                      <div className="badge-desc">{ach.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No achievements unlocked yet. Keep playing!</p>
              )}

              {lockedAchievements.length > 0 && (
                <>
                  <h3>{t('profile.locked')}</h3>
                  <div className="achievement-grid locked">
                    {lockedAchievements.map(ach => (
                      <div key={ach.id} className="achievement-badge locked">
                        <div className="badge-icon">🔒</div>
                        <div className="badge-name">{ach.name}</div>
                        <div className="badge-desc">{ach.description}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="stats-list">
              <div className="stat-row">
                <span>Current Streak</span>
                <span className="stat-highlight">{streakData.currentStreak} days 🔥</span>
              </div>
              <div className="stat-row">
                <span>Best Streak</span>
                <span className="stat-highlight">{streakData.bestStreak} days</span>
              </div>
              <div className="stat-row">
                <span>Total Games Played</span>
                <span>{streakData.totalGamesPlayed}</span>
              </div>
              <div className="stat-row">
                <span>Total Score</span>
                <span>{streakData.totalScore.toLocaleString()}</span>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-list">
              <div className="setting-item">
                <span>Reset All Progress</span>
                <button 
                  className="reset-btn"
                  onClick={() => {
                    if (confirm('Are you sure? This will delete all your progress!')) {
                      localStorage.clear();
                      resetAchievements();
                      onResetProgress();
                      onClose();
                    }
                  }}
                >
                  Reset
                </button>
              </div>
              <div className="setting-item">
                <span>Version</span>
                <span>1.0.0</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

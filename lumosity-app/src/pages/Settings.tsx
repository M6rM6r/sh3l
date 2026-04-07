import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { audioManager } from '../utils/audio';

const VERSION = '2.4.0';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  // Audio & Haptics
  const [masterVolume, setMasterVolume] = useState(() => {
    const saved = localStorage.getItem('ygy-master-volume');
    return saved ? Number(saved) : 80;
  });
  const [ambientEnabled, setAmbientEnabled] = useState(() => audioManager.isAmbientEnabled);
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('ygy-haptic') !== 'false';
  });

  // Training Preferences
  const [defaultDifficulty, setDefaultDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => {
    return (localStorage.getItem('ygy-difficulty') as 'easy' | 'medium' | 'hard') || 'medium';
  });
  const [dailyGoal, setDailyGoal] = useState(() => {
    return Number(localStorage.getItem('ygy-daily-goal')) || 5;
  });

  // Display
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('ygy-reduced-motion') === 'true';
  });
  const [compactCards, setCompactCards] = useState(() => {
    return localStorage.getItem('ygy-compact-cards') === 'true';
  });

  // Collapsed sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleVolumeChange = (val: number) => {
    setMasterVolume(val);
    localStorage.setItem('ygy-master-volume', String(val));
  };

  const handleAmbientToggle = () => {
    audioManager.initAudio();
    const next = audioManager.toggleAmbient();
    setAmbientEnabled(next);
  };

  const handleHapticToggle = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    localStorage.setItem('ygy-haptic', String(next));
  };

  const handleDifficultyChange = (d: 'easy' | 'medium' | 'hard') => {
    setDefaultDifficulty(d);
    localStorage.setItem('ygy-difficulty', d);
  };

  const handleDailyGoalChange = (g: number) => {
    setDailyGoal(g);
    localStorage.setItem('ygy-daily-goal', String(g));
  };

  const handleReducedMotionToggle = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    localStorage.setItem('ygy-reduced-motion', String(next));
    document.documentElement.classList.toggle('reduced-motion', next);
  };

  const handleCompactCardsToggle = () => {
    const next = !compactCards;
    setCompactCards(next);
    localStorage.setItem('ygy-compact-cards', String(next));
  };

  const handleExportData = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ygy') || key?.startsWith('persist:')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ygy-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearGameHistory = () => {
    if (confirm('Clear all game history? Your settings will be kept.')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('gameStats') || key.includes('dailyStats') || key.includes('streak'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const renderSectionHeader = (key: string, emoji: string, title: string) => (
    <button
      className="settings-section-toggle"
      onClick={() => toggleSection(key)}
      aria-expanded={!collapsed[key]}
    >
      <span>{emoji} {title}</span>
      <span className={`settings-chevron${collapsed[key] ? ' collapsed' : ''}`}>▾</span>
    </button>
  );

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)} aria-label="Go back">← Back</button>
        <h1>Settings</h1>
      </header>

      <div className="settings-sections">
        {/* Language */}
        <section className="settings-section">
          {renderSectionHeader('lang', '🌐', 'Language')}
          {!collapsed['lang'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Display Language</span>
                <LanguageSwitcher />
              </div>
            </div>
          )}
        </section>

        {/* Audio & Haptics */}
        <section className="settings-section">
          {renderSectionHeader('audio', '🔊', 'Audio & Haptics')}
          {!collapsed['audio'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Master Volume</span>
                <div className="settings-slider-group">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={masterVolume}
                    onChange={e => handleVolumeChange(Number(e.target.value))}
                    className="settings-slider"
                    aria-label="Master volume"
                  />
                  <span className="settings-slider-value">{masterVolume}%</span>
                </div>
              </div>
              <div className="settings-row">
                <span>Ambient Music</span>
                <button
                  className={`settings-toggle${ambientEnabled ? ' active' : ''}`}
                  onClick={handleAmbientToggle}
                  role="switch"
                  aria-checked={ambientEnabled}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
              <div className="settings-row">
                <span>Haptic Feedback</span>
                <button
                  className={`settings-toggle${hapticEnabled ? ' active' : ''}`}
                  onClick={handleHapticToggle}
                  role="switch"
                  aria-checked={hapticEnabled}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Training Preferences */}
        <section className="settings-section">
          {renderSectionHeader('training', '🎯', 'Training Preferences')}
          {!collapsed['training'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Default Difficulty</span>
                <div className="settings-pill-group">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      className={`settings-pill${defaultDifficulty === d ? ' active' : ''}`}
                      onClick={() => handleDifficultyChange(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span>Daily Goal</span>
                <div className="settings-pill-group">
                  {[3, 5, 10].map(g => (
                    <button
                      key={g}
                      className={`settings-pill${dailyGoal === g ? ' active' : ''}`}
                      onClick={() => handleDailyGoalChange(g)}
                    >
                      {g} games
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Display */}
        <section className="settings-section">
          {renderSectionHeader('display', '🎨', 'Display')}
          {!collapsed['display'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Reduced Motion</span>
                <button
                  className={`settings-toggle${reducedMotion ? ' active' : ''}`}
                  onClick={handleReducedMotionToggle}
                  role="switch"
                  aria-checked={reducedMotion}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
              <div className="settings-row">
                <span>Compact Cards</span>
                <button
                  className={`settings-toggle${compactCards ? ' active' : ''}`}
                  onClick={handleCompactCardsToggle}
                  role="switch"
                  aria-checked={compactCards}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="settings-section">
          {renderSectionHeader('notif', '🔔', 'Notifications')}
          {!collapsed['notif'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Push Notifications</span>
                <button
                  className="settings-btn-secondary"
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission();
                    }
                  }}
                >
                  {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                    ? '✅ Enabled'
                    : 'Enable'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Data & Privacy */}
        <section className="settings-section">
          {renderSectionHeader('data', '🔒', 'Data & Privacy')}
          {!collapsed['data'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Logged in as</span>
                <span className="settings-value">{user?.username || 'Guest'}</span>
              </div>
              <div className="settings-row">
                <span>Export My Data</span>
                <button className="settings-btn-secondary" onClick={handleExportData}>
                  📥 Export JSON
                </button>
              </div>
              <div className="settings-row">
                <span>Clear Game History</span>
                <button className="settings-btn-danger" onClick={handleClearGameHistory}>
                  Clear History
                </button>
              </div>
              <div className="settings-row">
                <span>Clear All Data</span>
                <button
                  className="settings-btn-danger"
                  onClick={() => {
                    if (confirm('Clear ALL local data? This cannot be undone.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  Reset Everything
                </button>
              </div>
            </div>
          )}
        </section>

        {/* About */}
        <section className="settings-section">
          {renderSectionHeader('about', 'ℹ️', 'About')}
          {!collapsed['about'] && (
            <div className="settings-section-body">
              <div className="settings-row">
                <span>Version</span>
                <span className="settings-value">{VERSION}</span>
              </div>
              <div className="settings-row">
                <span>Support</span>
                <button className="settings-btn-secondary" onClick={() => navigate('/support')}>
                  💬 Get Help
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;

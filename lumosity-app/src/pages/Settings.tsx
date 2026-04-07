import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Settings</h1>
      </header>

      <div className="settings-sections">
        {/* Language */}
        <section className="settings-section">
          <h2>Language</h2>
          <div className="settings-row">
            <span>Display Language</span>
            <LanguageSwitcher />
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <h2>Notifications</h2>
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
        </section>

        {/* Account */}
        <section className="settings-section">
          <h2>Account</h2>
          <div className="settings-row">
            <span>Logged in as</span>
            <span className="settings-value">{user?.username || 'Guest'}</span>
          </div>
          <div className="settings-row">
            <span>Data</span>
            <button
              className="settings-btn-danger"
              onClick={() => {
                if (confirm('Clear all local data? This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              Clear Local Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;

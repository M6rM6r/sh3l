import React from 'react';
import { useTranslation } from 'react-i18next';

interface PauseOverlayProps {
  onResume: () => void;
  onQuit: () => void;
  score: number;
  timeLeft: number;
}

const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume, onQuit, score, timeLeft }) => {
  const { t } = useTranslation();
  return (
    <div className="pause-overlay">
      <div className="pause-modal">
        <h2>{t('pause.title')}</h2>
        
        <div className="pause-stats">
          <div className="pause-stat">
            <span className="pause-stat-label">{t('pause.currentScore')}</span>
            <span className="pause-stat-value">{score}</span>
          </div>
          <div className="pause-stat">
            <span className="pause-stat-label">{t('pause.timeRemaining')}</span>
            <span className="pause-stat-value">{timeLeft}s</span>
          </div>
        </div>

        <div className="pause-actions">
          <button className="pause-btn primary" onClick={onResume}>
            {t('pause.resume')}
          </button>
          <button className="pause-btn secondary" onClick={onQuit}>
            {t('pause.quit')}
          </button>
        </div>

        <div className="pause-tip">
          {t('pause.tip')}
        </div>
      </div>
    </div>
  );
};

export default PauseOverlay;



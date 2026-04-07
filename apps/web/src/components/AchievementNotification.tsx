import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { achievements } from '../utils/achievements';

interface AchievementNotificationProps {
  achievementId: string;
  onClose: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievementId, 
  onClose 
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  
  const achievement = achievements.find(a => a.id === achievementId);
  
  if (!achievement) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`achievement-toast ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="achievement-icon">{achievement.icon}</div>
      <div className="achievement-content">
        <div className="achievement-title">{t('achievements.unlocked')}</div>
        <div className="achievement-name">{achievement.name}</div>
        <div className="achievement-desc">{achievement.description}</div>
      </div>
      <button className="achievement-close" onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}>✕</button>
    </div>
  );
};

export default AchievementNotification;



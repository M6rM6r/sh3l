import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const steps = [
    {
      title: t('onboarding.welcome'),
      subtitle: t('onboarding.subtitle'),
      content: (
        <div className="onboarding-welcome">
          <div className="welcome-icon">🧠</div>
          <p>{t('onboarding.content')}</p>
          <ul className="benefits-list">
            <li>🎯 {t('onboarding.benefits.memory')}</li>
            <li>⚡ {t('onboarding.benefits.speed')}</li>
            <li>🔧 {t('onboarding.benefits.flexibility')}</li>
            <li>📈 {t('onboarding.benefits.progress')}</li>
          </ul>
        </div>
      )
    },
    {
      title: t('onboarding.areas.title'),
      subtitle: t('onboarding.areas.subtitle'),
      content: (
        <div className="onboarding-areas">
          <div className="areas-grid-onboard">
            <div className="area-item">
              <span className="area-icon">🧠</span>
              <span className="area-name">{t('onboarding.areas.memory.name')}</span>
              <span className="area-desc">{t('onboarding.areas.memory.desc')}</span>
            </div>
            <div className="area-item">
              <span className="area-icon">⚡</span>
              <span className="area-name">{t('onboarding.areas.speed.name')}</span>
              <span className="area-desc">{t('onboarding.areas.speed.desc')}</span>
            </div>
            <div className="area-item">
              <span className="area-icon">🎯</span>
              <span className="area-name">{t('onboarding.areas.attention.name')}</span>
              <span className="area-desc">{t('onboarding.areas.attention.desc')}</span>
            </div>
            <div className="area-item">
              <span className="area-icon">🔄</span>
              <span className="area-name">{t('onboarding.areas.flexibility.name')}</span>
              <span className="area-desc">{t('onboarding.areas.flexibility.desc')}</span>
            </div>
            <div className="area-item">
              <span className="area-icon">🔷</span>
              <span className="area-name">{t('onboarding.areas.problemSolving.name')}</span>
              <span className="area-desc">{t('onboarding.areas.problemSolving.desc')}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('onboarding.games.title'),
      subtitle: t('onboarding.games.subtitle'),
      content: (
        <div className="onboarding-games">
          <div className="games-demo">
            <p>{t('onboarding.games.desc')}</p>
            <div className="game-examples">
              <div className="game-example">
                <span className="game-icon">🧩</span>
                <span>{t('games.memory')}</span>
              </div>
              <div className="game-example">
                <span className="game-icon">⚡</span>
                <span>{t('games.speed')}</span>
              </div>
              <div className="game-example">
                <span className="game-icon">🎯</span>
                <span>{t('games.attention')}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Start?',
      subtitle: 'Your brain training journey begins now',
      content: (
        <div className="onboarding-ready">
          <div className="ready-icon">🚀</div>
          <p>You're all set! Start with today's workout or explore our games.</p>
          <div className="ready-features">
            <span>✓ 10 brain games</span>
            <span>✓ Sound effects</span>
            <span>✓ Achievements</span>
            <span>✓ Progress tracking</span>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('lumosity_onboarded', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('lumosity_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`progress-dot ${i === step ? 'active' : i < step ? 'completed' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-content">
          <h2>{steps[step].title}</h2>
          <p className="subtitle">{steps[step].subtitle}</p>
          {steps[step].content}
        </div>

        <div className="onboarding-actions">
          <button className="btn-skip" onClick={handleSkip}>
            {t('common.skip')}
          </button>
          <button className="btn-primary" onClick={handleNext}>
            {step === steps.length - 1 ? t('onboarding.getStarted') : t('common.next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

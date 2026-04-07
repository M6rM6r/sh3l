import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OldGameType } from '../types';
import { tutorialContent } from '../utils/tutorial';

interface TutorialOverlayProps {
  gameType: OldGameType;
  onStartPractice: () => void;
  onStartGame: () => void;
  onSkip: () => void;
}

const TutorialAnimation: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'pattern') {
    return (
      <div className="tutorial-animation pattern-demo">
        <div className="mini-grid">
          {[...Array(9)].map((_, i) => (
            <div key={i} className={`mini-tile ${i === 1 || i === 4 ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    );
  }
  
  if (type === 'cards') {
    return (
      <div className="tutorial-animation cards-demo">
        <div className="mini-card">
          <span className="mini-shape">🔷</span>
          <span className="card-label">PREVIOUS</span>
        </div>
        <div className="mini-card current">
          <span className="mini-shape">🔷</span>
          <span className="card-label">CURRENT</span>
        </div>
      </div>
    );
  }
  
  if (type === 'dots') {
    return (
      <div className="tutorial-animation dots-demo">
        <div className="target-indicator-mini">
          <span>Target:</span>
          <div className="target-dot target-dot-blue" />
        </div>
        <div className="falling-dots">
          <div className="fall-dot fall-dot-blue" />
          <div className="fall-dot fall-dot-red" />
        </div>
      </div>
    );
  }
  
  if (type === 'stroop') {
    return (
      <div className="tutorial-animation stroop-demo">
        <div className="stroop-example stroop-example-red">
          BLUE
        </div>
        <div className="stroop-question">Does the MEANING match the INK?</div>
      </div>
    );
  }
  
  if (type === 'sequence') {
    return (
      <div className="tutorial-animation sequence-demo">
        <div className="mini-pattern-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`mini-pattern-btn ${i === 1 ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    );
  }
  
  return null;
};

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ 
  gameType, 
  onStartPractice, 
  onStartGame, 
  onSkip 
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const content = tutorialContent[gameType];
  const step = content.steps[currentStep];

  const handleNext = () => {
    if (currentStep < content.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === content.steps.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-skip" onClick={onSkip}>{t('tutorial.skip')}</button>
        
        <div className="tutorial-header">
          <h2>{content.name}</h2>
          <p>{content.description}</p>
        </div>

        <div className="tutorial-content">
          <div className="tutorial-step-number">
            {t('tutorial.step')} {currentStep + 1} {t('tutorial.of')} {content.steps.length}
          </div>
          
          <TutorialAnimation type={step.animation || ''} />
          
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </div>

        <div className="tutorial-progress">
          {content.steps.map((_, i: number) => (
            <div 
              key={i} 
              className={`progress-dot ${i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        <div className="tutorial-navigation">
          <button 
            className="tutorial-btn secondary" 
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            {t('tutorial.previous')}
          </button>
          
          {isLastStep ? (
            <div className="tutorial-actions">
              <button className="tutorial-btn practice" onClick={onStartPractice}>
                {t('tutorial.tryPractice')}
              </button>
              <button className="tutorial-btn primary" onClick={onStartGame}>
                {t('tutorial.startGame')}
              </button>
            </div>
          ) : (
            <button className="tutorial-btn primary" onClick={handleNext}>
              {t('tutorial.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;

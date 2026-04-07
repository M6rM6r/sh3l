import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameType } from '../types';
import { audioManager } from '../utils/audio';
import { burstFromElement } from '../utils/particles';

interface GamePreviewCardProps {
  game: {
    id: GameType;
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string; animated?: boolean }>;
    color: string;
    area: string;
  };
  highScore: number;
  totalPlays: number;
  onClick: () => void;
}

const GamePreviewCard: React.FC<GamePreviewCardProps> = ({ 
  game, 
  highScore, 
  totalPlays, 
  onClick 
}) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    audioManager.initAudio();
    audioManager.playCardSelect();
    if (cardRef.current) burstFromElement(cardRef.current, game.color);
    onClick();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    audioManager.initAudio();
    audioManager.playButtonHover();
  };

  const getDifficultyLabel = () => {
    if (highScore === 0) return t('gamePreview.difficulty.notPlayed');
    if (highScore < 300) return t('gamePreview.difficulty.beginner');
    if (highScore < 600) return t('gamePreview.difficulty.intermediate');
    if (highScore < 1000) return t('gamePreview.difficulty.advanced');
    return t('gamePreview.difficulty.expert');
  };

  return (
    <div 
      ref={cardRef}
      className={`game-preview-card ${isHovered ? 'hovered' : ''} ${isFlipped ? 'flipped' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsFlipped(false);
      }}
      onClick={handleClick}
      style={{
        '--card-color': game.color,
        '--card-color-light': `${game.color}20`,
        '--card-color-lighter': `${game.color}30`,
        '--card-color-lightest': `${game.color}10`
      } as React.CSSProperties}
    >
      <div className="card-inner">
        {/* Front of card */}
        <div className="card-front">
          <div className="card-header">
            <div className="card-icon">
              <game.icon size={24} animated={isHovered} />
            </div>
            <div className="card-area-badge">
              {game.area}
            </div>
          </div>
          
          <h3 className="card-name">{game.name}</h3>
          
          <div className="card-stats">
            <div className="card-stat">
              <span className="stat-label">{t('gamePreview.stats.bestScore')}</span>
              <span className="stat-value">
                {highScore > 0 ? highScore.toLocaleString() : '-'}
              </span>
            </div>
            <div className="card-stat">
              <span className="stat-label">{t('gamePreview.stats.timesPlayed')}</span>
              <span className="stat-value">{totalPlays}</span>
            </div>
          </div>

          <div className="card-difficulty">
            {getDifficultyLabel()}
          </div>

          <button 
            className="card-flip-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(true);
            }}
          >
            {t('gamePreview.buttons.moreInfo')}
          </button>
        </div>

        {/* Back of card */}
        <div className="card-back">
          <h4>{game.name}</h4>
          <p className="card-description">
            {t('gamePreview.description', { area: game.area.toLowerCase() })}
          </p>
          
          <div className="card-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">🧠</span>
              <span>{t('gamePreview.benefits.improves', { area: game.area })}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">⏱️</span>
              <span>{t('gamePreview.benefits.duration')}</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🎯</span>
              <span>{t('gamePreview.benefits.skillBuilding')}</span>
            </div>
          </div>

          <button 
            className="card-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {t('gamePreview.buttons.playNow')}
          </button>

          <button 
            className="card-flip-back"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(false);
            }}
          >
            {t('gamePreview.buttons.back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePreviewCard;

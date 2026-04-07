import React from 'react';
import { Link } from 'react-router-dom';
import type { GameType } from '../types';
import { Tooltip } from './UI';

interface GameCardProps {
  id: GameType;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  difficulty?: number;
  isLocked?: boolean;
  isNew?: boolean;
  highScore?: number;
  lastPlayed?: string;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  name,
  description,
  icon,
  color,
  category,
  difficulty = 1,
  isLocked = false,
  isNew = false,
  highScore,
  lastPlayed,
  onClick,
}) => {
  const difficultyDots = Array.from({ length: 5 }, (_, i) => (
    <span 
      key={i} 
      className={`difficulty-dot ${i < difficulty ? 'active' : ''}`}
    />
  ));

  return (
    <Tooltip content={description || `Play ${name}`}>
      <div 
        className={`game-card ${isLocked ? 'game-card-locked' : ''}`}
        onClick={!isLocked ? onClick : undefined}
        style={{ '--game-color': color } as React.CSSProperties}
      >
        {isNew && (
          <div className="game-card-badge new">
            <span>NEW</span>
          </div>
        )}
        
        <div className="game-card-header">
          <div 
            className="game-preview-icon"
            style={{ 
              background: `linear-gradient(135deg, ${color}20, ${color}40)`,
              boxShadow: `0 4px 20px ${color}30`
            }}
          >
            {icon}
          </div>
          
          <div className="game-card-meta">
            <span className="game-category">{category}</span>
            <div className="difficulty-indicator">
              {difficultyDots}
            </div>
          </div>
        </div>

        <div className="game-card-body">
          <h3 className="game-title">{name}</h3>
          {description && (
            <p className="game-description">{description}</p>
          )}
        </div>

        <div className="game-card-footer">
          {highScore !== undefined && (
            <div className="game-stat">
              <span className="stat-label">Best</span>
              <span className="stat-value">{highScore.toLocaleString()}</span>
            </div>
          )}
          {lastPlayed && (
            <div className="game-stat">
              <span className="stat-label">Last</span>
              <span className="stat-value">{lastPlayed}</span>
            </div>
          )}
          {isLocked && (
            <div className="game-stat locked">
              <span className="stat-value">🔒 Locked</span>
            </div>
          )}
        </div>

        <div 
          className="game-card-glow"
          style={{ background: `radial-gradient(circle at 50% 0%, ${color}30, transparent 70%)` }}
        />
      </div>
    </Tooltip>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
}) => {
  return (
    <div className="glass-card stat-card">
      <div className="stat-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-value">{value}</span>
        {change !== undefined && (
          <span className={`stat-card-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
};

interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  name,
  description,
  icon,
  unlocked,
  unlockedAt,
  rarity = 'common',
}) => {
  const rarityColors = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
  };

  return (
    <Tooltip content={description}>
      <div className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}>
        <div 
          className="achievement-icon"
          style={{ 
            background: unlocked 
              ? `linear-gradient(135deg, ${rarityColors[rarity]}20, ${rarityColors[rarity]}40)` 
              : 'var(--bg-elevated)',
            borderColor: unlocked ? rarityColors[rarity] : 'var(--border)',
          }}
        >
          {unlocked ? icon : '🔒'}
        </div>
        <span className="achievement-name">{name}</span>
        {unlocked && unlockedAt && (
          <span className="achievement-date">{unlockedAt}</span>
        )}
      </div>
    </Tooltip>
  );
};

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring" />
          <div className="spinner-ring" />
          <div className="spinner-ring" />
        </div>
        <p className="loading-message">{message}</p>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

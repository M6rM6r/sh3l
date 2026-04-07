import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserStats } from '../types';
import type { DailyWorkout, WorkoutProgress } from '../utils/workout';
import { getWorkoutCompletion } from '../utils/workout';

const gameIcons: Record<string, string> = {
  memory: '🧠',
  speed: '⚡',
  attention: '👁️',
  flexibility: '🔄',
  problemSolving: '🧩',
  math: '🔢',
  reaction: '⚡',
  word: '📝',
  visual: '👁️',
  spatial: '🔲',
  memorySequence: '🔢'
};

const gameNames: Record<string, string> = {
  memory: 'Memory Game',
  speed: 'Speed Challenge',
  attention: 'Attention Test',
  flexibility: 'Flexibility Exercise',
  problemSolving: 'Problem Solving',
  math: 'Math Challenge',
  reaction: 'Reaction Time',
  word: 'Word Game',
  visual: 'Visual Challenge',
  spatial: 'Spatial Reasoning',
  memorySequence: 'Memory Sequence'
};

interface DailyWorkoutProps {
  workout: DailyWorkout;
  progress: WorkoutProgress;
  userStats: UserStats;
  onStartGame: (game: any) => void;
}

const DailyWorkoutCard: React.FC<DailyWorkoutProps> = ({ 
  workout, 
  progress, 
  userStats,
  onStartGame 
}) => {
  const { t } = useTranslation();
  const completion = getWorkoutCompletion(userStats);
  const nextGame = workout.games.find(g => !progress.completedGames.includes(g.gameType));
  
  return (
    <div className="daily-workout-card">
      <div className="workout-header">
        <div>
          <h2>{t('dashboard.games.title')}</h2>
          <p className="workout-focus">Focus: {t(`cognitive.${workout.focusArea.toLowerCase()}`)} • {workout.totalEstimatedTime / 60} min</p>
        </div>
        <div className="workout-progress">
          <div className="progress-circle">
            <span className="progress-text">{completion.percentage}%</span>
          </div>
        </div>
      </div>

      <div className="workout-games">
        {workout.games.map((game, index) => {
          const isCompleted = progress.completedGames.includes(game.gameType);
          const isNext = nextGame?.gameType === game.gameType;
          
          return (
            <div 
              key={game.gameType}
              className={`workout-game-item ${isCompleted ? 'completed' : ''} ${isNext ? 'next' : ''}`}
              onClick={() => !isCompleted && onStartGame(game.gameType)}
            >
              <div className="game-number">{index + 1}</div>
              <div className="game-icon">{gameIcons[game.gameType]}</div>
              <div className="game-info">
                <div className="game-name">{gameNames[game.gameType]}</div>
                <div className="game-reason">{game.reason}</div>
              </div>
              <div className="game-status">
                {isCompleted ? (
                  <span className="status-check">✓</span>
                ) : (
                  <button className="play-mini-btn">Play</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {progress.isComplete ? (
        <div className="workout-complete">
          <div className="complete-icon">🎉</div>
          <div className="complete-text">Workout Complete!</div>
          <div className="complete-score">Total Score: {progress.totalScore}</div>
        </div>
      ) : nextGame ? (
        <button 
          className="start-workout-btn"
          onClick={() => onStartGame(nextGame.gameType)}
        >
          Continue Workout
        </button>
      ) : (
        <button 
          className="start-workout-btn"
          onClick={() => onStartGame(workout.games[0].gameType)}
        >
          Start Workout
        </button>
      )}
    </div>
  );
};

export default DailyWorkoutCard;

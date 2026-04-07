import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface MemoryMatrixProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const GRID_SIZE = 5;
const INITIAL_PATTERN_LENGTH = 3;
const GAME_DURATION = 60;

const MemoryMatrix: React.FC<MemoryMatrixProps> = memo(({ 
  onComplete, 
  isPractice: _isPractice,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [showingPattern, setShowingPattern] = useState(false);
  const [gameState, setGameState] = useState<'waiting' | 'showing' | 'input' | 'gameover'>('waiting');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const generatePattern = useCallback((length: number) => {
    const newPattern: number[] = [];
    for (let i = 0; i < length; i++) {
      newPattern.push(Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE)));
    }
    return newPattern;
  }, []);

  const startRound = useCallback(() => {
    const patternLength = INITIAL_PATTERN_LENGTH + Math.floor((level - 1) / 2);
    const newPattern = generatePattern(patternLength);
    setPattern(newPattern);
    setUserPattern([]);
    setShowingPattern(true);
    setGameState('showing');
    
    setTimeout(() => {
      setShowingPattern(false);
      setGameState('input');
    }, 1500 + patternLength * 400);
  }, [level, generatePattern]);

  // Start game immediately
  useEffect(() => {
    if (gameState === 'waiting') {
      startRound();
    }
  }, [gameState, startRound]);

  // Report score and time changes
  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  // Pause handling - stop timers when paused
  useEffect(() => {
    if (isPaused) {
      // Clear all timers when paused
      return;
    }
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) return; // Pause timer
    
    if (gameState === 'showing' || gameState === 'input') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState === 'gameover') {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameState, score, correct, total, onComplete]);

  const handleTileClick = (index: number) => {
    if (gameState !== 'input' || showingPattern) return;

    audioManager.playTilePress();
    const newUserPattern = [...userPattern, index];
    setUserPattern(newUserPattern);

    const currentIndex = newUserPattern.length - 1;
    if (pattern[currentIndex] !== index) {
      // Wrong tile
      audioManager.playWrong();
      setTotal(prev => prev + 1);
      setGameState('gameover');
      return;
    }

    if (newUserPattern.length === pattern.length) {
      // Completed pattern correctly
      audioManager.playCorrect();
      setCorrect(prev => prev + 1);
      setTotal(prev => prev + 1);
      setScore(prev => prev + pattern.length * 10 + Math.floor(timeLeft / 2));
      setLevel(prev => prev + 1);
      setGameState('waiting');
    }
  };

  const renderGrid = () => {
    const tiles = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const isActive = showingPattern && pattern.includes(i);
      const isClicked = userPattern.includes(i) && !showingPattern;
      const row = Math.floor(i / GRID_SIZE) + 1;
      const col = (i % GRID_SIZE) + 1;
      
      tiles.push(
        <button
          key={i}
          className={`memory-tile ${isActive ? 'active' : ''} ${isClicked ? 'clicked' : ''}`}
          onClick={() => handleTileClick(i)}
          aria-label={`Row ${row}, Column ${col}${isActive ? ', Active' : ''}`}
          aria-pressed={isClicked}
          disabled={showingPattern || gameState === 'gameover'}
          tabIndex={0}
        />
      );
    }
    return tiles;
  };

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Game Over!</h2>
        <div className="final-score" aria-label={`Final score: ${score}`}>Score: {score}</div>
        <div className="final-stats" aria-label={`Level reached: ${level}`}>Level Reached: {level}</div>
      </div>
    );
  }

  return (
    <div className="memory-matrix" role="application" aria-label="Memory Matrix game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      <div className="game-instructions" role="alert" aria-live="assertive">
        {showingPattern ? 'Watch the pattern...' : gameState === 'input' ? 'Repeat the pattern!' : 'Get ready...'}
      </div>
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {renderGrid()}
      </div>
    </div>
  );
});

export default MemoryMatrix;



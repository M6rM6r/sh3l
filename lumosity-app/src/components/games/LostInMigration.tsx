import React, { useState, useEffect, useCallback } from 'react';

interface LostInMigrationProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const GAME_DURATION = 60;
const DIRECTIONS = ['←', '↑', '→', '↓'];

interface Bird {
  id: number;
  x: number;
  y: number;
  direction: string;
  isTarget: boolean;
  color: string;
}

const LostInMigration: React.FC<LostInMigrationProps> = ({ 
  onComplete, 
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  const generateBirds = useCallback(() => {
    const numBirds = Math.min(3 + Math.floor(level / 2), 8);
    const targetDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const targetIndex = Math.floor(Math.random() * numBirds);
    
    const newBirds: Bird[] = [];
    for (let i = 0; i < numBirds; i++) {
      const isTarget = i === targetIndex;
      newBirds.push({
        id: i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        direction: isTarget ? targetDir : DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
        isTarget: false,
        color: isTarget ? '#4fc3f7' : '#fff'
      });
    }
    
    setBirds(newBirds);
  }, [level]);

  useEffect(() => {
    if (!gameOver && !isPaused) {
      generateBirds();
    }
  }, [generateBirds, gameOver, isPaused]);

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (isPaused || gameOver) return;
    
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver) {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameOver, score, correct, total, onComplete]);

  const handleBirdClick = (bird: Bird) => {
    if (gameOver || isPaused) return;

    // Find the bird that has a different direction
    const directions = birds.map(b => b.direction);
    const directionCounts: Record<string, number> = {};
    directions.forEach(d => directionCounts[d] = (directionCounts[d] || 0) + 1);
    
    // Find the direction that appears least (the odd one out)
    const oddDirection = Object.entries(directionCounts).sort((a, b) => a[1] - b[1])[0][0];
    const isCorrect = bird.direction === oddDirection;

    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 15 + level * 2);
      setLevel(prev => prev + 1);
    } else {
      setTotal(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
    }
    
    generateBirds();
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Great Focus!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Level Reached: {level}<br/>
          Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%
        </div>
      </div>
    );
  }

  return (
    <div className="lost-in-migration">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="game-instructions">
        Find the bird facing a DIFFERENT direction!
      </div>

      <div className="sky-container">
        {birds.map((bird) => (
          <div
            key={bird.id}
            className="bird-target"
            style={{
              left: `${bird.x}%`,
              top: `${bird.y}%`
            }}
            onClick={() => handleBirdClick(bird)}
          >
            <span className="bird-icon" style={{ color: bird.color }}>🐦</span>
            <span className="bird-direction">{bird.direction}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LostInMigration;

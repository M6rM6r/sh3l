import React, { useState, useEffect, useCallback } from 'react';

interface FishFoodFrenzyProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const GAME_DURATION = 60;
const FISH_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94'];

interface Fish {
  id: number;
  x: number;
  y: number;
  color: string;
  direction: number;
  speed: number;
  points: number;
}

const FishFoodFrenzy: React.FC<FishFoodFrenzyProps> = ({ 
  onComplete, 
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [fish, setFish] = useState<Fish[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [nextId, setNextId] = useState(0);
  const [clicked, setClicked] = useState<number | null>(null);

  const spawnFish = useCallback(() => {
    const id = nextId;
    setNextId(prev => prev + 1);
    
    const newFish: Fish = {
      id,
      x: Math.random() * 80 + 10,
      y: 110,
      color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: Math.random() * 2 + 1,
      points: Math.floor(Math.random() * 3) + 1
    };
    
    setFish(prev => [...prev, newFish]);
  }, [nextId]);

  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const spawner = setInterval(spawnFish, 1500);
    return () => clearInterval(spawner);
  }, [spawnFish, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const mover = setInterval(() => {
      setFish(prev => prev
        .map(f => ({
          ...f,
          y: f.y - f.speed,
          x: f.x + Math.sin(f.y / 20) * 0.5
        }))
        .filter(f => f.y > -20)
      );
    }, 50);
    
    return () => clearInterval(mover);
  }, [gameOver, isPaused]);

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
      onComplete(score, 100);
    }
  }, [gameOver, score, onComplete]);

  const handleFishClick = (f: Fish) => {
    if (gameOver || isPaused) return;
    
    setClicked(f.id);
    setTimeout(() => setClicked(null), 200);
    
    setScore(prev => prev + f.points * 10);
    setFish(prev => prev.filter(fish => fish.id !== f.id));
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Great Fishing!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Fish Caught: {Math.floor(score / 10)}</div>
      </div>
    );
  }

  return (
    <div className="fish-food-frenzy">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="ocean-container">
        {fish.map(f => (
          <div
            key={f.id}
            className={`fish ${clicked === f.id ? 'caught' : ''}`}
            style={{
              left: `${f.x}%`,
              bottom: `${f.y}%`,
              backgroundColor: f.color
            }}
            onClick={() => handleFishClick(f)}
          >
            <span className="fish-emoji">🐟</span>
            <span className="fish-points">+{f.points * 10}</span>
          </div>
        ))}
      </div>

      <div className="game-instructions">
        Click the fish as they swim up! Faster fish = more points!
      </div>
    </div>
  );
};

export default FishFoodFrenzy;

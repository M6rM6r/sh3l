import React, { useState, useEffect, useCallback } from 'react';

interface TrainOfThoughtProps {
  onComplete: (score: number, accuracy: number) => void;
}

const COLORS = [
  { name: 'Red', value: '#ef5350' },
  { name: 'Blue', value: '#4fc3f7' },
  { name: 'Green', value: '#66bb6a' },
  { name: 'Yellow', value: '#ffee58' },
  { name: 'Purple', value: '#ab47bc' }
];
const GAME_DURATION = 60;

interface Dot {
  id: number;
  color: string;
  x: number;
  y: number;
  targetColor: string;
}

const TrainOfThought: React.FC<TrainOfThoughtProps> = ({ onComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [dots, setDots] = useState<Dot[]>([]);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextId, setNextId] = useState(0);

  const spawnDot = useCallback(() => {
    const colorObj = COLORS[Math.floor(Math.random() * COLORS.length)];
    const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)].value;
    
    const newDot: Dot = {
      id: nextId,
      color: colorObj.value,
      x: Math.random() * 80 + 10,
      y: -10,
      targetColor
    };
    
    setDots(prev => [...prev, newDot]);
    setNextId(prev => prev + 1);
  }, [nextId]);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
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
  }, [timeLeft, gameOver]);

  useEffect(() => {
    if (!gameOver) {
      const spawner = setInterval(spawnDot, 2000);
      return () => clearInterval(spawner);
    }
  }, [spawnDot, gameOver]);

  useEffect(() => {
    if (!gameOver) {
      const mover = setInterval(() => {
        setDots(prev => prev
          .map(dot => ({ ...dot, y: dot.y + 2 }))
          .filter(dot => dot.y < 100)
        );
      }, 100);
      return () => clearInterval(mover);
    }
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameOver, score, correct, total, onComplete]);

  const handleDotClick = (dot: Dot) => {
    const isCorrect = dot.color === dot.targetColor;
    
    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 15);
    }
    setTotal(prev => prev + 1);
    
    setDots(prev => prev.filter(d => d.id !== dot.id));
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Time's Up!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%
        </div>
      </div>
    );
  }

  const currentTarget = dots[0]?.targetColor || COLORS[0].value;

  return (
    <div className="train-of-thought">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      
      <div className="target-indicator">
        <div className="target-label">Click dots of this color:</div>
        <div 
          className="target-color" 
          style={{ backgroundColor: currentTarget }}
        />
      </div>

      <div className="game-instructions">
        Click only the dots that match the target color!
      </div>

      <div className="dots-container">
        {dots.map(dot => (
          <div
            key={dot.id}
            className="dot"
            style={{
              backgroundColor: dot.color,
              left: `${dot.x}%`,
              top: `${dot.y}%`
            }}
            onClick={() => handleDotClick(dot)}
          />
        ))}
      </div>
    </div>
  );
};

export default TrainOfThought;

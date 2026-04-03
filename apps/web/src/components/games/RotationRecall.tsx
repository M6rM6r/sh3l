import React, { useState, useEffect, useCallback } from 'react';

interface RotationRecallProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const SHAPES = ['🔷', '🔶', '⬡', '⭕', '🔺'];
const ROTATIONS = [0, 90, 180, 270];
const GAME_DURATION = 60;

const RotationRecall: React.FC<RotationRecallProps> = ({ 
  onComplete, 
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentShape, setCurrentShape] = useState('');
  const [targetRotation, setTargetRotation] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [showingOriginal, setShowingOriginal] = useState(true);

  const generateRound = useCallback(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
    
    // Generate wrong options
    const wrongOptions = ROTATIONS.filter(r => r !== rotation).slice(0, 3);
    const allOptions = [rotation, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentShape(shape);
    setTargetRotation(rotation);
    setOptions(allOptions);
    setShowingOriginal(true);
    
    // Show original for 1.5 seconds then hide
    setTimeout(() => {
      setShowingOriginal(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (!gameOver && !isPaused) {
      generateRound();
    }
  }, [generateRound, gameOver, isPaused]);

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

  const handleGuess = (rotation: number) => {
    if (showingOriginal || gameOver || isPaused) return;

    const isCorrect = rotation === targetRotation;
    
    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 15 + level);
      setLevel(prev => prev + 1);
    } else {
      setTotal(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
    }
    
    generateRound();
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Great Spatial Awareness!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Correct: {correct}/{total}<br/>
          Level Reached: {level}
        </div>
      </div>
    );
  }

  return (
    <div className="rotation-recall">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="rotation-display">
        {showingOriginal ? (
          <div className="shape-preview">
            <div 
              className="preview-shape"
              style={{ transform: `rotate(${targetRotation}deg)` }}
            >
              {currentShape}
            </div>
            <div className="preview-label">Remember this!</div>
          </div>
        ) : (
          <div className="rotation-options">
            <div className="options-label">Which rotation matches?</div>
            <div className="rotation-grid">
              {options.map((rotation, i) => (
                <button
                  key={i}
                  className="rotation-option"
                  onClick={() => handleGuess(rotation)}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  {currentShape}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RotationRecall;

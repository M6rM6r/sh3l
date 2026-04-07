import React, { useState, useEffect, useCallback } from 'react';

interface SpeedMatchProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const SHAPES = ['🔷', '🔶', '⬡', '⭕', '🔺', '⬛'];
const COLORS = ['#4fc3f7', '#ab47bc', '#43a047', '#fb8c00', '#ef5350', '#26a69a'];
const GAME_DURATION = 60;

interface Card {
  shape: string;
  color: string;
}

const SpeedMatch: React.FC<SpeedMatchProps> = ({ 
  onComplete, 
  isPractice: _isPractice,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [previousCard, setPreviousCard] = useState<Card | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const generateCard = useCallback((): Card => {
    return {
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
  }, []);

  const nextCard = useCallback(() => {
    setPreviousCard(currentCard);
    setCurrentCard(generateCard());
  }, [currentCard, generateCard]);

  useEffect(() => {
    // Initialize with two cards
    setPreviousCard(generateCard());
    setCurrentCard(generateCard());
  }, [generateCard]);

  // Report score and time changes
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

  const handleMatch = (isMatch: boolean) => {
    if (!previousCard || !currentCard || gameOver) return;

    const isActuallyMatch = previousCard.shape === currentCard.shape;
    const isCorrect = isMatch === isActuallyMatch;

    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setStreak(prev => prev + 1);
      setScore(prev => prev + 10 + streak * 2);
    } else {
      setStreak(0);
    }
    setTotal(prev => prev + 1);
    nextCard();
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Time's Up!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%<br/>
          Best Streak: {streak}
        </div>
      </div>
    );
  }

  return (
    <div className="speed-match">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Streak: {streak}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      
      <div className="speed-match-cards">
        {previousCard && (
          <div className="card previous">
            <div className="card-label">PREVIOUS</div>
            <div className="card-content" style={{ color: previousCard.color }}>
              {previousCard.shape}
            </div>
          </div>
        )}
        {currentCard && (
          <div className="card current">
            <div className="card-label">CURRENT</div>
            <div className="card-content" style={{ color: currentCard.color }}>
              {currentCard.shape}
            </div>
          </div>
        )}
      </div>

      <div className="game-instructions">
        Do these shapes match? (Ignore color)
      </div>

      <div className="speed-match-controls">
        <button className="match-btn no" onClick={() => handleMatch(false)}>
          ✕ No Match
        </button>
        <button className="match-btn yes" onClick={() => handleMatch(true)}>
          ✓ Match
        </button>
      </div>
    </div>
  );
};

export default SpeedMatch;



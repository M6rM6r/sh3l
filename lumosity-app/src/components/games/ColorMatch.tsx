import React, { useState, useEffect, useCallback } from 'react';

interface ColorMatchProps {
  onComplete: (score: number, accuracy: number) => void;
}

const COLOR_NAMES = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];
const COLOR_VALUES = ['#ef5350', '#4fc3f7', '#66bb6a', '#ffee58', '#ab47bc'];
const GAME_DURATION = 60;

const ColorMatch: React.FC<ColorMatchProps> = ({ onComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [wordText, setWordText] = useState('');
  const [wordColor, setWordColor] = useState('');
  const [meaningMatches, setMeaningMatches] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const generateRound = useCallback(() => {
    const textIndex = Math.floor(Math.random() * COLOR_NAMES.length);
    const shouldMatch = Math.random() > 0.5;
    
    const finalColorIndex = shouldMatch ? textIndex : 
      (textIndex + 1 + Math.floor(Math.random() * (COLOR_NAMES.length - 1))) % COLOR_NAMES.length;
    
    setWordText(COLOR_NAMES[textIndex]);
    setWordColor(COLOR_VALUES[finalColorIndex]);
    setMeaningMatches(textIndex === finalColorIndex);
  }, []);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

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
    if (gameOver) {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameOver, score, correct, total, onComplete]);

  const handleAnswer = (saysMeaning: boolean) => {
    const isCorrect = saysMeaning === meaningMatches;
    
    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 10);
    }
    setTotal(prev => prev + 1);
    
    generateRound();
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

  return (
    <div className="color-match">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      
      <div className="game-instructions">
        Does the word's MEANING match the INK COLOR?
      </div>

      <div className="stroop-word" style={{ color: wordColor }}>
        {wordText}
      </div>

      <div className="color-match-controls">
        <button className="match-btn no" onClick={() => handleAnswer(false)}>
          ✕ No
        </button>
        <button className="match-btn yes" onClick={() => handleAnswer(true)}>
          ✓ Yes
        </button>
      </div>
    </div>
  );
};

export default ColorMatch;



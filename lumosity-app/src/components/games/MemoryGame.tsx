import React, { useState, useEffect, useCallback } from 'react';
import { useAdaptiveDifficulty } from '../../hooks/useAdaptiveDifficulty';

interface MemoryGameProps {
  onComplete: (score: number, accuracy: number) => void;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ onComplete }) => {
  const { difficulty: adaptiveDiff, reportResult } = useAdaptiveDifficulty('memory');
  const [difficulty, setDifficulty] = useState({ level: 1 });

  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

  // Seed initial difficulty from adaptive hook once loaded
  useEffect(() => {
    if (adaptiveDiff && adaptiveDiff > 1) {
      setDifficulty({ level: Math.min(Math.round(adaptiveDiff), 10) });
    }
  }, [adaptiveDiff]);

  const generateSequence = useCallback(() => {
    const newSequence = [];
    for (let i = 0; i < difficulty.level + 2; i++) {
      newSequence.push(Math.floor(Math.random() * colors.length));
    }
    return newSequence;
  }, [difficulty.level]);

  const startGame = () => {
    const newSequence = generateSequence();
    setSequence(newSequence);
    setUserSequence([]);
    setCurrentStep(0);
    setGameStarted(true);
    setShowingSequence(true);

    // Show sequence
    newSequence.forEach((colorIndex, index) => {
      setTimeout(() => {
        const button = document.getElementById(`color-${colorIndex}`);
        if (button) {
          button.classList.add('active');
          setTimeout(() => button.classList.remove('active'), 500);
        }
        if (index === newSequence.length - 1) {
          setTimeout(() => setShowingSequence(false), 500);
        }
      }, index * 600);
    });
  };

  const handleColorClick = (colorIndex: number) => {
    if (showingSequence || !gameStarted) return;

    const newUserSequence = [...userSequence, colorIndex];
    setUserSequence(newUserSequence);

    const isCorrect = sequence[currentStep] === colorIndex;

    if (!isCorrect) {
      // Game over
      const accuracy = (userSequence.length / sequence.length) * 100;
      const score = userSequence.length * 10;
      reportResult(score, accuracy);
      onComplete(score, accuracy);
      setGameStarted(false);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      // Level complete - increase difficulty for next round
      setDifficulty(prev => ({ level: prev.level + 1 }));

      // Next level
      setTimeout(() => {
        const newSequence = generateSequence();
        setSequence(newSequence);
        setUserSequence([]);
        setCurrentStep(0);
        setShowingSequence(true);

        newSequence.forEach((colorIndex, index) => {
          setTimeout(() => {
            const button = document.getElementById(`color-${colorIndex}`);
            if (button) {
              button.classList.add('active');
              setTimeout(() => button.classList.remove('active'), 500);
            }
            if (index === newSequence.length - 1) {
              setTimeout(() => setShowingSequence(false), 500);
            }
          }, index * 600);
        });
      }, 1000);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  useEffect(() => {
    if (!gameStarted) {
      startGame();
    }
  }, [gameStarted, startGame]);

  return (
    <div className="memory-game">
      <h2>Memory Challenge</h2>
      <div className="score-display">
        Level: {difficulty.level}
      </div>
      <div className="color-grid">
        {colors.map((color, index) => (
          <button
            key={color}
            id={`color-${index}`}
            className={`color-button ${color}`}
            onClick={() => handleColorClick(index)}
            disabled={showingSequence}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      {showingSequence && <div className="instruction">Watch the sequence...</div>}
      {!showingSequence && gameStarted && <div className="instruction">Repeat the sequence!</div>}
    </div>
  );
};

export default MemoryGame;


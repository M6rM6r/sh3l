import React, { useState, useEffect, useCallback } from 'react';

interface PatternRecallProps {
  onComplete: (score: number, accuracy: number) => void;
}

const GAME_DURATION = 60;
const INITIAL_SEQUENCE_LENGTH = 3;

const PatternRecall: React.FC<PatternRecallProps> = ({ onComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [level, setLevel] = useState(1);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const generateSequence = useCallback((length: number) => {
    const newSeq: number[] = [];
    for (let i = 0; i < length; i++) {
      newSeq.push(Math.floor(Math.random() * 4));
    }
    return newSeq;
  }, []);

  const playSequence = useCallback(async (seq: number[]) => {
    setShowingSequence(true);
    for (let i = 0; i < seq.length; i++) {
      setActiveButton(seq[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
      setActiveButton(null);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    setShowingSequence(false);
  }, []);

  const startRound = useCallback(() => {
    const seqLength = INITIAL_SEQUENCE_LENGTH + Math.floor((level - 1) / 2);
    const newSequence = generateSequence(seqLength);
    setSequence(newSequence);
    setUserSequence([]);
    playSequence(newSequence);
  }, [level, generateSequence, playSequence]);

  useEffect(() => {
    if (!gameOver) {
      startRound();
    }
  }, [startRound, gameOver]);

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

  const handleButtonClick = (index: number) => {
    if (showingSequence || gameOver) return;

    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);

    const currentIndex = newUserSequence.length - 1;
    
    if (sequence[currentIndex] !== index) {
      // Wrong button
      setTotal(prev => prev + 1);
      setGameOver(true);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      // Completed sequence correctly
      setCorrect(prev => prev + 1);
      setTotal(prev => prev + 1);
      setScore(prev => prev + sequence.length * 10 + Math.floor(timeLeft / 3));
      setLevel(prev => prev + 1);
    }
  };

  const buttonColors = ['#ef5350', '#4fc3f7', '#66bb6a', '#ffee58'];

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Game Over!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Level Reached: {level}</div>
      </div>
    );
  }

  return (
    <div className="pattern-recall">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      
      <div className="game-instructions">
        {showingSequence ? 'Watch the pattern...' : 'Repeat the pattern!'}
      </div>

      <div className="pattern-grid">
        {buttonColors.map((color, index) => (
          <button
            key={index}
            className={`pattern-button ${activeButton === index ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handleButtonClick(index)}
            disabled={showingSequence}
          />
        ))}
      </div>
    </div>
  );
};

export default PatternRecall;

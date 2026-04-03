import React, { useState, useEffect, useCallback } from 'react';

interface WordBubbleProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const WORDS = [
  'apple', 'banana', 'cherry', 'grape', 'lemon', 'mango', 'orange', 'peach', 'pear', 'plum',
  'blue', 'green', 'red', 'yellow', 'purple', 'pink', 'black', 'white', 'brown', 'gray',
  'happy', 'sunny', 'bright', 'swift', 'calm', 'brave', 'smart', 'quick', 'kind', 'warm',
  'dog', 'cat', 'bird', 'fish', 'lion', 'bear', 'wolf', 'fox', 'deer', 'duck'
];

const GAME_DURATION = 60;
const SHOW_TIME = 2000;

const WordBubble: React.FC<WordBubbleProps> = ({ 
  onComplete, 
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentWord, setCurrentWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showingWord, setShowingWord] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const getRandomWord = useCallback(() => {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }, []);

  const nextRound = useCallback(() => {
    const word = getRandomWord();
    setCurrentWord(word);
    setShowingWord(true);
    setUserInput('');
    
    setTimeout(() => {
      setShowingWord(false);
    }, SHOW_TIME);
  }, [getRandomWord]);

  useEffect(() => {
    nextRound();
  }, [nextRound]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || showingWord || gameOver) return;

    const isCorrect = userInput.toLowerCase().trim() === currentWord.toLowerCase();
    
    if (isCorrect) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 20);
    }
    setTotal(prev => prev + 1);
    
    nextRound();
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Great Memory!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Words Remembered: {correct}/{total}<br/>
          Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%
        </div>
      </div>
    );
  }

  return (
    <div className="word-bubble">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="word-display-area">
        {showingWord ? (
          <div className="word-bubble-show">{currentWord}</div>
        ) : (
          <form onSubmit={handleSubmit} className="word-input-form">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="word-input"
              placeholder="Type the word..."
              autoFocus
            />
            <button type="submit" className="word-submit">Submit</button>
          </form>
        )}
      </div>

      <div className="game-instructions">
        {showingWord ? 'Remember this word!' : 'Type the word you saw'}
      </div>
    </div>
  );
};

export default WordBubble;

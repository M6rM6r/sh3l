import { useState, useEffect } from 'react';
import './WordScramble.css';

interface WordScrambleProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

const words = [
  'BRAIN', 'SMART', 'THINK', 'LEARN', 'MEMORY', 'FOCUS', 'LOGIC', 'PUZZLE',
  'GENIUS', 'WISDOM', 'KNOWLEDGE', 'MINDFUL', 'CREATIVE', 'SOLUTION', 'STRATEGY',
  'CHALLENGE', 'COGNITIVE', 'INTELLIGENCE', 'UNDERSTAND', 'CONCENTRATION'
];

export function WordScramble({ onComplete, onBack }: WordScrambleProps) {
  const [level, setLevel] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    startNewRound();
  }, [level]);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, gameOver]);

  const startNewRound = () => {
    const availableWords = words.filter(w => w.length <= 6 + level);
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    setCurrentWord(word);
    setScrambledWord(scrambleWord(word));
    setUserInput('');
    setFeedback(null);
  };

  const scrambleWord = (word: string): string => {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const scrambled = arr.join('');
    return scrambled === word ? scrambleWord(word) : scrambled;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (userInput.toUpperCase() === currentWord) {
      setFeedback('correct');
      const newScore = score + level * 50 + timeLeft * 5;
      setScore(newScore);
      setTimeout(() => {
        setLevel(level + 1);
        setTimeLeft(Math.max(30 - level * 2, 10));
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
      }, 1000);
    }
  };

  const handleSkip = () => {
    startNewRound();
    setScore(Math.max(0, score - 25));
  };

  const endGame = () => {
    setGameOver(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setTimeout(() => onComplete(score, level, duration), 1500);
  };

  return (
    <div className="ws-container">
      <div className="ws-content">
        <div className="ws-header">
          <button className="ws-back-btn" onClick={onBack}>
            ← Back
          </button>
          <h1 className="ws-title">📝 Word Scramble</h1>
          <div className="ws-spacer"></div>
        </div>

        <div className="ws-stats">
          <div className="ws-stat-card">
            Level: {level}
          </div>
          <div className="ws-stat-card">
            Score: {score}
          </div>
          <div className={`ws-stat-card ws-stat-card-timer ${timeLeft < 10 ? 'ws-stat-card-timer-warning' : ''}`}>
            Time: {timeLeft}s
          </div>
        </div>

        {!gameOver ? (
          <div className="ws-game-area">
            <p className="ws-instruction">
              Unscramble this word:
            </p>
            <div className="ws-scrambled-word">
              {scrambledWord}
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                autoFocus
                disabled={feedback !== null}
                className={`ws-input ${feedback === 'correct' ? 'ws-input-correct' : feedback === 'wrong' ? 'ws-input-wrong' : ''}`}
              />

              <div className="ws-button-row">
                <button
                  type="submit"
                  disabled={!userInput || feedback !== null}
                  className="ws-submit-btn"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={feedback !== null}
                  className="ws-skip-btn"
                >
                  Skip (-25)
                </button>
              </div>
            </form>

            {feedback === 'correct' && (
              <div className="ws-feedback ws-feedback-correct">
                ✓ Correct!
              </div>
            )}

            {feedback === 'wrong' && (
              <div className="ws-feedback ws-feedback-wrong">
                ✗ Try again!
              </div>
            )}
          </div>
        ) : (
          <div className="ws-game-over">
            <div className="ws-game-over-icon">⏰</div>
            <h2 className="ws-game-over-title">
              Time's Up!
            </h2>
            <p className="ws-game-over-score">Final Score: {score}</p>
          </div>
        )}
      </div>
    </div>
  );
}



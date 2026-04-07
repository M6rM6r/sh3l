import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface StroopChallengeProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const COLORS = [
  { name: 'RED', color: '#ef4444', bgClass: 'red' },
  { name: 'BLUE', color: '#3b82f6', bgClass: 'blue' },
  { name: 'GREEN', color: '#22c55e', bgClass: 'green' },
  { name: 'YELLOW', color: '#eab308', bgClass: 'yellow' },
  { name: 'PURPLE', color: '#8b5cf6', bgClass: 'purple' },
  { name: 'ORANGE', color: '#f97316', bgClass: 'orange' },
];

const GAME_DURATION = 60;

const StroopChallenge: React.FC<StroopChallengeProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [currentWord, setCurrentWord] = useState<{ name: string; color: string; isCongruent: boolean } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [wordStartTime, setWordStartTime] = useState<number>(0);

  const generateWord = useCallback(() => {
    const isCongruent = Math.random() > (0.3 + level * 0.1); // Higher levels = more incongruent
    const wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    let displayColor;
    if (isCongruent) {
      displayColor = wordColor;
    } else {
      // Pick a different color
      const otherColors = COLORS.filter(c => c.name !== wordColor.name);
      displayColor = otherColors[Math.floor(Math.random() * otherColors.length)];
    }
    
    setCurrentWord({
      name: wordColor.name,
      color: displayColor.color,
      isCongruent
    });
    setWordStartTime(Date.now());
    setFeedback(null);
  }, [level]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setTotal(0);
    setLevel(1);
    setStreak(0);
    setReactionTimes([]);
    generateWord();
  };

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState === 'gameover') {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameState, score, correct, total, onComplete]);

  const handleColorSelect = (selectedColorName: string) => {
    if (!currentWord || feedback) return;
    
    const reactionTime = Date.now() - wordStartTime;
    setReactionTimes(prev => [...prev, reactionTime]);
    
    const isCorrect = selectedColorName === currentWord.name;
    setTotal(prev => prev + 1);
    
    if (isCorrect) {
      audioManager.playCorrect();
      setCorrect(prev => prev + 1);
      setFeedback('correct');
      
      // Calculate score with streak bonus
      const basePoints = 10;
      const streakBonus = Math.min(streak, 10) * 2;
      const speedBonus = Math.max(0, 10 - Math.floor(reactionTime / 100));
      const incongruentBonus = currentWord.isCongruent ? 0 : 5;
      
      setScore(prev => prev + basePoints + streakBonus + speedBonus + incongruentBonus);
      setStreak(prev => prev + 1);
      
      // Level up every 10 correct answers
      if ((correct + 1) % 10 === 0) {
        setLevel(prev => Math.min(5, prev + 1));
      }
    } else {
      audioManager.playWrong();
      setFeedback('wrong');
      setStreak(0);
    }
    
    // Generate next word after delay
    setTimeout(() => {
      generateWord();
    }, isCorrect ? 500 : 1000);
  };

  const getAverageReactionTime = () => {
    if (reactionTimes.length === 0) return 0;
    return Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
  };

  const getInterferenceScore = () => {
    const congruentTimes = reactionTimes.filter((_, i) => {
      // We would need to track this - for now return average
      return true;
    });
    return getAverageReactionTime();
  };

  if (gameState === 'intro') {
    return (
      <div className="stroop-intro" role="alert" aria-live="polite">
        <h2>Stroop Challenge</h2>
        <p>Test your cognitive flexibility and impulse control.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>A word will appear in a colored font</li>
            <li>Click the button matching the <strong>INK COLOR</strong>, not the word</li>
            <li>For example: If "RED" appears in blue ink, click BLUE</li>
            <li>Go as fast as you can while staying accurate!</li>
          </ul>
        </div>
        <button className="start-button" onClick={startGame}>
          Start Challenge
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Challenge Complete!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
        <div className="final-stats">Correct Answers: {correct} / {total}</div>
        <div className="final-stats">Avg Reaction Time: {getAverageReactionTime()}ms</div>
        <div className="final-stats">Longest Streak: {streak}</div>
        <div className="stroop-insights">
          <h4>Cognitive Insights:</h4>
          <p>
            The Stroop Effect measures your ability to inhibit automatic responses.
            {getAverageReactionTime() > 800 
              ? " Take time to focus - accuracy over speed!" 
              : " Excellent cognitive control!"}
          </p>
        </div>
        <button className="restart-button" onClick={() => setGameState('intro')}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="stroop-challenge" role="application" aria-label="Stroop Challenge game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
        <span>Streak: {streak}🔥</span>
      </div>

      <div className="stroop-display">
        {currentWord && (
          <>
            <div 
              className={`stroop-word ${feedback || ''}`}
              style={{ color: currentWord.color }}
              aria-label={`Word: ${currentWord.name}, Color: ${COLORS.find(c => c.color === currentWord?.color)?.name}`}
            >
              {currentWord.name}
            </div>
            
            {feedback && (
              <div className={`stroop-feedback ${feedback}`} role="alert" aria-live="assertive">
                {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong! The ink color was ' + COLORS.find(c => c.color === currentWord?.color)?.name}
              </div>
            )}
          </>
        )}
      </div>

      <div className="stroop-instruction">
        <p>Select the <strong>INK COLOR</strong> (not the word)</p>
      </div>

      <div className="color-buttons-grid">
        {COLORS.map((color) => (
          <button
            key={color.name}
            className={`color-button ${color.bgClass}`}
            style={{ backgroundColor: color.color }}
            onClick={() => handleColorSelect(color.name)}
            disabled={!!feedback}
            aria-label={`Color: ${color.name}`}
          >
            {color.name}
          </button>
        ))}
      </div>

      <div className="stroop-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((GAME_DURATION - timeLeft) / GAME_DURATION) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default StroopChallenge;

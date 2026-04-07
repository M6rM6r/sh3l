import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { audioManager } from '../../utils/audio';

interface DualNBackProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const GRID_SIZE = 3;
const GAME_DURATION = 180;
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T'];

const DualNBack: React.FC<DualNBackProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [n, setN] = useState(2);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [currentPosition, setCurrentPosition] = useState<number | null>(null);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  
  const historyRef = useRef<Array<{ position: number; letter: string; color: string }>>([]);
  const [positionMatchPressed, setPositionMatchPressed] = useState(false);
  const [soundMatchPressed, setSoundMatchPressed] = useState(false);
  const [colorMatchPressed, setColorMatchPressed] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: 'position' | 'sound' | 'color' | 'miss'; correct: boolean } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [levelUpTrials, setLevelUpTrials] = useState(0);

  const generateStimulus = useCallback(() => {
    const position = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { position, letter, color };
  }, []);

  const getMatchType = useCallback(() => {
    if (historyRef.current.length < n + 1) return { positionMatch: false, soundMatch: false, colorMatch: false };
    
    const current = historyRef.current[historyRef.current.length - 1];
    const nBack = historyRef.current[historyRef.current.length - 1 - n];
    
    return {
      positionMatch: current.position === nBack.position,
      soundMatch: current.letter === nBack.letter,
      colorMatch: current.color === nBack.color
    };
  }, [n]);

  const startTrial = useCallback(() => {
    const stimulus = generateStimulus();
    historyRef.current.push(stimulus);
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
    
    setCurrentPosition(stimulus.position);
    setCurrentLetter(stimulus.letter);
    setCurrentColor(stimulus.color);
    
    setPositionMatchPressed(false);
    setSoundMatchPressed(false);
    setColorMatchPressed(false);
    setFeedback(null);
    setShowFeedback(false);
    
    // Play audio for the letter
    if (stimulus.letter) {
      const utterance = new SpeechSynthesisUtterance(stimulus.letter);
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [generateStimulus]);

  const checkMatch = useCallback(() => {
    if (historyRef.current.length <= n) return;
    
    const { positionMatch, soundMatch, colorMatch } = getMatchType();
    
    let points = 0;
    let newCorrect = 0;
    let newTotal = 0;
    
    // Check position match
    if (positionMatchPressed && positionMatch) {
      points += 10;
      newCorrect++;
      audioManager.playCorrect();
      setFeedback({ type: 'position', correct: true });
    } else if (positionMatchPressed && !positionMatch) {
      points -= 5;
      audioManager.playWrong();
      setFeedback({ type: 'position', correct: false });
    } else if (!positionMatchPressed && positionMatch) {
      points -= 5;
      setFeedback({ type: 'miss', correct: false });
    }
    newTotal++;
    
    // Check sound match
    if (soundMatchPressed && soundMatch) {
      points += 10;
      newCorrect++;
      audioManager.playCorrect();
      setFeedback({ type: 'sound', correct: true });
    } else if (soundMatchPressed && !soundMatch) {
      points -= 5;
      audioManager.playWrong();
      setFeedback({ type: 'sound', correct: false });
    } else if (!soundMatchPressed && soundMatch) {
      points -= 5;
      setFeedback({ type: 'miss', correct: false });
    }
    newTotal++;
    
    // Check color match (only on level 3+)
    if (n >= 3) {
      if (colorMatchPressed && colorMatch) {
        points += 10;
        newCorrect++;
        audioManager.playCorrect();
      } else if (colorMatchPressed && !colorMatch) {
        points -= 5;
        audioManager.playWrong();
      } else if (!colorMatchPressed && colorMatch) {
        points -= 5;
      }
      newTotal++;
    }
    
    setScore(prev => Math.max(0, prev + points));
    setCorrect(prev => prev + newCorrect);
    setTotal(prev => prev + newTotal);
    setShowFeedback(true);
    
    // Level up logic
    const newLevelUp = levelUpTrials + (newCorrect === newTotal && newTotal > 0 ? 1 : -1);
    setLevelUpTrials(Math.max(0, newLevelUp));
    
    if (newLevelUp >= 10) {
      setN(prev => Math.min(6, prev + 1));
      setLevelUpTrials(0);
    }
  }, [n, positionMatchPressed, soundMatchPressed, colorMatchPressed, getMatchType, levelUpTrials]);

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

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Start first trial
    startTrial();
    
    // Set up trial interval
    const trialInterval = setInterval(() => {
      checkMatch();
      
      setTimeout(() => {
        setTrialCount(prev => {
          const next = prev + 1;
          if (next >= 50) {
            setGameState('gameover');
          }
          return next;
        });
        startTrial();
      }, 500);
    }, 3000);
    
    return () => clearInterval(trialInterval);
  }, [gameState, startTrial, checkMatch]);

  const handlePositionMatch = () => {
    if (!positionMatchPressed) {
      setPositionMatchPressed(true);
    }
  };

  const handleSoundMatch = () => {
    if (!soundMatchPressed) {
      setSoundMatchPressed(true);
    }
  };

  const handleColorMatch = () => {
    if (!colorMatchPressed && n >= 3) {
      setColorMatchPressed(true);
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setTotal(0);
    setN(2);
    setTrialCount(0);
    setLevelUpTrials(0);
    historyRef.current = [];
  };

  const renderGrid = () => {
    const tiles = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const isActive = currentPosition === i;
      const row = Math.floor(i / GRID_SIZE) + 1;
      const col = (i % GRID_SIZE) + 1;
      
      tiles.push(
        <div
          key={i}
          className={`dualnback-tile ${isActive ? 'active' : ''}`}
          style={{
            backgroundColor: isActive ? (currentColor ?? undefined) : 'transparent',
            boxShadow: isActive ? `0 0 20px ${currentColor}` : 'none'
          }}
          aria-label={`Row ${row}, Column ${col}${isActive ? ', Active' : ''}`}
        >
          {isActive && (
            <div className="tile-letter">{currentLetter}</div>
          )}
        </div>
      );
    }
    return tiles;
  };

  if (gameState === 'intro') {
    return (
      <div className="dualnback-intro" role="alert" aria-live="polite">
        <h2>Dual N-Back Training</h2>
        <p>The gold standard for working memory training.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>A square will flash in the grid while a letter is spoken</li>
            <li>Press <strong>Position Match</strong> if the square position matches the one from {n} trials ago</li>
            <li>Press <strong>Sound Match</strong> if the letter matches the one from {n} trials ago</li>
            <li>At higher levels, you must also match colors!</li>
          </ul>
        </div>
        <button className="start-button" onClick={startGame}>
          Start Training
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Training Complete!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">N-Level Reached: {n}-Back</div>
        <div className="final-stats">Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
        <div className="final-stats">Trials Completed: {trialCount}</div>
        <button className="restart-button" onClick={() => setGameState('intro')}>
          Train Again
        </button>
      </div>
    );
  }

  return (
    <div className="dual-nback" role="application" aria-label="Dual N-Back training game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>N-Back: {n}</span>
        <span>Time: {timeLeft}s</span>
        <span>Trial: {trialCount}/50</span>
      </div>

      <div className="nback-container">
        <div className="nback-grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {renderGrid()}
        </div>

        {showFeedback && feedback && (
          <div className={`feedback-overlay ${feedback.correct ? 'correct' : 'wrong'}`}>
            {feedback.type === 'position' && (feedback.correct ? '✓ Position Match!' : '✗ Wrong Position')}
            {feedback.type === 'sound' && (feedback.correct ? '✓ Sound Match!' : '✗ Wrong Sound')}
            {feedback.type === 'color' && (feedback.correct ? '✓ Color Match!' : '✗ Wrong Color')}
            {feedback.type === 'miss' && '✗ Missed Match!'}
          </div>
        )}
      </div>

      <div className="match-buttons">
        <button
          className={`match-button position ${positionMatchPressed ? 'pressed' : ''}`}
          onClick={handlePositionMatch}
          aria-label="Position match button"
        >
          <span className="button-icon">🎯</span>
          <span className="button-label">Position Match</span>
          <span className="button-key">A</span>
        </button>

        <button
          className={`match-button sound ${soundMatchPressed ? 'pressed' : ''}`}
          onClick={handleSoundMatch}
          aria-label="Sound match button"
        >
          <span className="button-icon">🔊</span>
          <span className="button-label">Sound Match</span>
          <span className="button-key">L</span>
        </button>

        {n >= 3 && (
          <button
            className={`match-button color ${colorMatchPressed ? 'pressed' : ''}`}
            onClick={handleColorMatch}
            aria-label="Color match button"
          >
            <span className="button-icon">🎨</span>
            <span className="button-label">Color Match</span>
            <span className="button-key">Space</span>
          </button>
        )}
      </div>

      <div className="level-progress">
        <span>Level Progress: {levelUpTrials}/10 to {n + 1}-Back</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(levelUpTrials / 10) * 100}%` }} />
        </div>
      </div>
    </div>
  );
});

export default DualNBack;

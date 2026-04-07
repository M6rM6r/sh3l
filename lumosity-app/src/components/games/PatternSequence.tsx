import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface PatternSequenceProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type PatternType = 'numeric' | 'geometric' | 'abstract' | 'symbolic' | 'color';

interface Pattern {
  id: string;
  type: PatternType;
  sequence: string[];
  answer: string;
  options: string[];
  rule: string;
  difficulty: number;
}

const GAME_DURATION = 180;

const generatePattern = (difficulty: number): Pattern => {
  const types: PatternType[] = ['numeric', 'geometric', 'abstract', 'symbolic', 'color'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  switch (type) {
    case 'numeric':
      return generateNumericPattern(difficulty);
    case 'geometric':
      return generateGeometricPattern(difficulty);
    case 'abstract':
      return generateAbstractPattern(difficulty);
    case 'symbolic':
      return generateSymbolicPattern(difficulty);
    case 'color':
      return generateColorPattern(difficulty);
    default:
      return generateNumericPattern(difficulty);
  }
};

const generateNumericPattern = (difficulty: number): Pattern => {
  const patterns = [
    {
      seq: ['2', '4', '8', '16', '?'],
      ans: '32',
      rule: 'Multiply by 2 (geometric)',
      options: ['24', '32', '30', '28']
    },
    {
      seq: ['1', '1', '2', '3', '5', '8', '?'],
      ans: '13',
      rule: 'Fibonacci: Add previous two numbers',
      options: ['11', '13', '12', '21']
    },
    {
      seq: ['1', '4', '9', '16', '25', '?'],
      ans: '36',
      rule: 'Perfect squares (n²)',
      options: ['30', '34', '36', '40']
    },
    {
      seq: ['3', '6', '11', '18', '27', '?'],
      ans: '38',
      rule: 'Add consecutive odd numbers: +3, +5, +7, +9, +11',
      options: ['34', '36', '38', '40']
    },
    {
      seq: ['2', '6', '12', '20', '30', '?'],
      ans: '42',
      rule: 'n×(n+1): 1×2, 2×3, 3×4, 4×5, 5×6, 6×7',
      options: ['38', '40', '42', '44']
    },
  ];
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  return {
    id: Math.random().toString(36),
    type: 'numeric',
    sequence: p.seq,
    answer: p.ans,
    options: p.options.sort(() => Math.random() - 0.5),
    rule: p.rule,
    difficulty
  };
};

const generateGeometricPattern = (difficulty: number): Pattern => {
  const shapes = ['◯', '△', '□', '◇', '⬡', '✦'];
  const rotations = ['↻', '↺'];
  
  const patterns = [
    {
      seq: ['◯', '△', '□', '◇', '?'],
      ans: '⬡',
      rule: 'Increasing number of sides: circle(∞), triangle(3), square(4), diamond(4), hexagon(6)',
      options: ['✦', '⬡', '△', '◯']
    },
    {
      seq: ['◯', '◐', '◑', '●', '?'],
      ans: '○',
      rule: 'Filling then emptying: empty, half, half-full, full, empty',
      options: ['◐', '◑', '●', '○']
    },
    {
      seq: ['▲', '△', '▲', '△', '▲', '?'],
      ans: '△',
      rule: 'Alternating filled/empty triangle',
      options: ['▲', '△', '◇', '◆']
    },
  ];
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  return {
    id: Math.random().toString(36),
    type: 'geometric',
    sequence: p.seq,
    answer: p.ans,
    options: p.options.sort(() => Math.random() - 0.5),
    rule: p.rule,
    difficulty
  };
};

const generateAbstractPattern = (difficulty: number): Pattern => {
  const patterns = [
    {
      seq: ['A1', 'B2', 'C3', 'D4', '?'],
      ans: 'E5',
      rule: 'Letter advances, number matches position: A→E, 1→5',
      options: ['E5', 'F5', 'E6', 'D5']
    },
    {
      seq: ['↑', '→', '↓', '←', '?'],
      ans: '↑',
      rule: 'Clockwise rotation: up, right, down, left, up',
      options: ['→', '↓', '←', '↑']
    },
    {
      seq: ['╔', '╗', '╝', '╚', '?'],
      ans: '╔',
      rule: 'Corner rotation: top-left, top-right, bottom-right, bottom-left, top-left',
      options: ['╗', '╝', '╚', '╔']
    },
  ];
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  return {
    id: Math.random().toString(36),
    type: 'abstract',
    sequence: p.seq,
    answer: p.ans,
    options: p.options.sort(() => Math.random() - 0.5),
    rule: p.rule,
    difficulty
  };
};

const generateSymbolicPattern = (difficulty: number): Pattern => {
  const patterns = [
    {
      seq: ['♠', '♥', '♦', '♣', '?'],
      ans: '♠',
      rule: 'Card suits cycle: spades, hearts, diamonds, clubs, spades',
      options: ['♥', '♦', '♣', '♠']
    },
    {
      seq: ['☀', '☁', '☂', '☃', '?'],
      ans: '☀',
      rule: 'Seasonal weather cycle: sun, cloud, rain, snow, sun',
      options: ['☁', '☂', '☃', '☀']
    },
    {
      seq: ['α', 'β', 'γ', 'δ', '?'],
      ans: 'ε',
      rule: 'Greek alphabet: alpha, beta, gamma, delta, epsilon',
      options: ['ζ', 'ε', 'η', 'θ']
    },
  ];
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  return {
    id: Math.random().toString(36),
    type: 'symbolic',
    sequence: p.seq,
    answer: p.ans,
    options: p.options.sort(() => Math.random() - 0.5),
    rule: p.rule,
    difficulty
  };
};

const generateColorPattern = (difficulty: number): Pattern => {
  const colors = ['🔴', '🔵', '🟢', '🟡', '🟠', '🟣'];
  
  const patterns = [
    {
      seq: ['🔴', '🟠', '🟡', '🟢', '?'],
      ans: '🔵',
      rule: 'Rainbow order: red, orange, yellow, green, blue',
      options: ['🟣', '🔵', '🟢', '🟡']
    },
    {
      seq: ['🔴', '⚪', '🔴', '⚪', '🔴', '?'],
      ans: '⚪',
      rule: 'Alternating red and white',
      options: ['🔴', '⚪', '🔵', '⚫']
    },
  ];
  
  const p = patterns[Math.floor(Math.random() * patterns.length)];
  return {
    id: Math.random().toString(36),
    type: 'color',
    sequence: p.seq,
    answer: p.ans,
    options: p.options.sort(() => Math.random() - 0.5),
    rule: p.rule,
    difficulty
  };
};

const PatternSequence: React.FC<PatternSequenceProps> = memo(({
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
  const [streak, setStreak] = useState(0);
  
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [showRule, setShowRule] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateNewPattern = useCallback(() => {
    const difficulty = Math.min(5, 1 + Math.floor(level / 3));
    const pattern = generatePattern(difficulty);
    setCurrentPattern(pattern);
    setShowRule(false);
    setSelectedAnswer(null);
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
    generateNewPattern();
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

  const handleAnswer = (answer: string) => {
    if (!currentPattern || feedback) return;
    
    setSelectedAnswer(answer);
    setTotal(t => t + 1);
    
    if (answer === currentPattern.answer) {
      audioManager.playCorrect();
      setFeedback('correct');
      setCorrect(c => c + 1);
      setStreak(s => s + 1);
      
      const basePoints = 10;
      const streakBonus = Math.min(streak * 2, 20);
      const speedBonus = Math.floor(timeLeft / 20);
      setScore(s => s + basePoints + streakBonus + speedBonus);
      
      setShowRule(true);
      
      setTimeout(() => {
        setLevel(l => l + 1);
        generateNewPattern();
      }, 2000);
    } else {
      audioManager.playWrong();
      setFeedback('wrong');
      setStreak(0);
      setScore(s => Math.max(0, s - 5));
      
      setTimeout(() => {
        setGameState('gameover');
      }, 1500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'intro') {
    return (
      <div className="pattern-sequence-intro" role="alert" aria-live="polite">
        <h2>🔮 Pattern Sequence</h2>
        <p>INTJ Special: Abstract reasoning and pattern extrapolation.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>Analyze the sequence and identify the underlying pattern</li>
            <li>Select the correct element to continue the sequence</li>
            <li>Patterns include: numeric, geometric, symbolic, and color logic</li>
            <li>Build your streak for bonus points!</li>
          </ul>
          <div className="pattern-types">
            <h4>Pattern Categories:</h4>
            <div className="type-tags">
              <span className="type-tag">Numeric</span>
              <span className="type-tag">Geometric</span>
              <span className="type-tag">Abstract</span>
              <span className="type-tag">Symbolic</span>
              <span className="type-tag">Color</span>
            </div>
          </div>
        </div>
        <button className="start-button" onClick={startGame}>
          Start Pattern Recognition
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Sequence Complete</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Patterns Solved: {correct}</div>
        <div className="final-stats">Accuracy: {Math.round((correct / total) * 100)}%</div>
        <div className="final-stats">Longest Streak: {streak}</div>
        <p className="intj-quote">"The ability to perceive patterns is the foundation of intelligence."</p>
        <button onClick={startGame}>Play Again</button>
      </div>
    );
  }

  return (
    <div className="pattern-sequence" role="application" aria-label="Pattern Sequence Game">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Streak: {streak}🔥</span>
        <span>Time: {formatTime(timeLeft)}</span>
      </div>

      {currentPattern && (
        <>
          <div className="pattern-type-badge">{currentPattern.type}</div>
          
          <div className="sequence-display">
            {currentPattern.sequence.map((item, index) => (
              <div 
                key={index} 
                className={`sequence-item ${item === '?' ? 'question' : ''}`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="answer-options">
            {currentPattern.options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  selectedAnswer === option 
                    ? (feedback === 'correct' ? 'correct' : 'wrong')
                    : ''
                } ${feedback === 'correct' && option === currentPattern.answer ? 'correct-answer' : ''}`}
                onClick={() => handleAnswer(option)}
                disabled={!!feedback}
                aria-label={`Option ${index + 1}: ${option}`}
              >
                {option}
              </button>
            ))}
          </div>

          {showRule && (
            <div className="rule-reveal" role="alert">
              <h4>Pattern Rule:</h4>
              <p>{currentPattern.rule}</p>
            </div>
          )}

          {feedback && (
            <div className={`sequence-feedback ${feedback}`} role="alert">
              {feedback === 'correct' 
                ? '✓ Correct! Excellent pattern recognition.' 
                : '✗ Wrong! The pattern was broken.'}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default PatternSequence;

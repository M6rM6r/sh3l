import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface TaskSwitcherProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type TaskRule = 'color' | 'shape' | 'size' | 'number';

interface Stimulus {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  size: 'small' | 'medium' | 'large';
  number: number;
  position: number;
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#f97316'];
const SHAPES: Stimulus['shape'][] = ['circle', 'square', 'triangle', 'diamond'];
const SIZES: Stimulus['size'][] = ['small', 'medium', 'large'];
const GAME_DURATION = 90;

const TaskSwitcher: React.FC<TaskSwitcherProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [currentRule, setCurrentRule] = useState<TaskRule>('color');
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [trialCount, setTrialCount] = useState(0);
  const [switchCostTrials, setSwitchCostTrials] = useState<{ switch: boolean; rt: number }[]>([]);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [lastRule, setLastRule] = useState<TaskRule>('color');
  const [consecutiveSame, setConsecutiveSame] = useState(0);

  const generateStimulus = useCallback((): Stimulus => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: SIZES[Math.floor(Math.random() * SIZES.length)],
      number: Math.floor(Math.random() * 9) + 1,
      position: Math.floor(Math.random() * 4)
    };
  }, []);

  const generateOptions = useCallback((rule: TaskRule, stim: Stimulus): string[] => {
    let correct: string;
    let distractors: string[];
    
    switch (rule) {
      case 'color':
        correct = stim.color;
        distractors = COLORS.filter(c => c !== stim.color).slice(0, 3);
        break;
      case 'shape':
        correct = stim.shape;
        distractors = SHAPES.filter(s => s !== stim.shape);
        break;
      case 'size':
        correct = stim.size;
        distractors = SIZES.filter(s => s !== stim.size);
        break;
      case 'number':
        correct = stim.number.toString();
        distractors = [1, 2, 3, 4, 5, 6, 7, 8, 9]
          .filter(n => n !== stim.number)
          .slice(0, 3)
          .map(n => n.toString());
        break;
    }
    
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
  }, []);

  const selectNextRule = useCallback(() => {
    const rules: TaskRule[] = ['color', 'shape', 'size', 'number'];
    
    // 70% chance to switch after 2-3 same trials
    const shouldSwitch = consecutiveSame >= 2 && Math.random() > 0.3;
    
    if (shouldSwitch) {
      const otherRules = rules.filter(r => r !== currentRule);
      const newRule = otherRules[Math.floor(Math.random() * otherRules.length)];
      setLastRule(currentRule);
      setCurrentRule(newRule);
      setConsecutiveSame(0);
    } else {
      setConsecutiveSame(prev => prev + 1);
    }
  }, [currentRule, consecutiveSame]);

  const startTrial = useCallback(() => {
    const newStimulus = generateStimulus();
    setStimulus(newStimulus);
    setOptions(generateOptions(currentRule, newStimulus));
    setTrialStartTime(Date.now());
    setFeedback(null);
  }, [currentRule, generateStimulus, generateOptions]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setTotal(0);
    setTrialCount(0);
    setCurrentRule('color');
    setConsecutiveSame(0);
    setSwitchCostTrials([]);
    startTrial();
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

  const getCorrectAnswer = (stim: Stimulus, rule: TaskRule): string => {
    switch (rule) {
      case 'color': return stim.color;
      case 'shape': return stim.shape;
      case 'size': return stim.size;
      case 'number': return stim.number.toString();
    }
  };

  const handleOptionSelect = (option: string) => {
    if (!stimulus || feedback) return;
    
    const reactionTime = Date.now() - trialStartTime;
    const correctAnswer = getCorrectAnswer(stimulus, currentRule);
    const isCorrect = option === correctAnswer;
    const isSwitch = currentRule !== lastRule;
    
    setTotal(prev => prev + 1);
    setSwitchCostTrials(prev => [...prev, { switch: isSwitch, rt: reactionTime }]);
    
    if (isCorrect) {
      audioManager.playCorrect();
      setCorrect(prev => prev + 1);
      setFeedback('correct');
      
      // Switch cost bonus
      const basePoints = 10;
      const switchBonus = isSwitch ? 5 : 0;
      const speedBonus = Math.max(0, 5 - Math.floor(reactionTime / 200));
      
      setScore(prev => prev + basePoints + switchBonus + speedBonus);
    } else {
      audioManager.playWrong();
      setFeedback('wrong');
    }
    
    setTrialCount(prev => prev + 1);
    
    setTimeout(() => {
      selectNextRule();
      setTimeout(() => startTrial(), 300);
    }, isCorrect ? 400 : 800);
  };

  const getRuleIcon = (rule: TaskRule) => {
    switch (rule) {
      case 'color': return '🎨';
      case 'shape': return '🔷';
      case 'size': return '📏';
      case 'number': return '🔢';
    }
  };

  const getRuleInstruction = (rule: TaskRule) => {
    switch (rule) {
      case 'color': return 'Select the COLOR of the shape';
      case 'shape': return 'Select the SHAPE type';
      case 'size': return 'Select the SIZE (small/medium/large)';
      case 'number': return 'Select the NUMBER inside';
    }
  };

  const calculateSwitchCost = () => {
    const switchTrials = switchCostTrials.filter(t => t.switch);
    const stayTrials = switchCostTrials.filter(t => !t.switch);
    
    if (switchTrials.length === 0 || stayTrials.length === 0) return 0;
    
    const avgSwitch = switchTrials.reduce((a, b) => a + b.rt, 0) / switchTrials.length;
    const avgStay = stayTrials.reduce((a, b) => a + b.rt, 0) / stayTrials.length;
    
    return Math.round(avgSwitch - avgStay);
  };

  const renderShape = (stim: Stimulus) => {
    const sizeMap = { small: 40, medium: 60, large: 80 };
    const size = sizeMap[stim.size];
    
    const shapeStyle = {
      width: size,
      height: size,
      backgroundColor: stim.color,
    };
    
    switch (stim.shape) {
      case 'circle':
        return <div className="stimulus-shape circle" style={{ ...shapeStyle, borderRadius: '50%' }} />;
      case 'square':
        return <div className="stimulus-shape square" style={shapeStyle} />;
      case 'triangle':
        return (
          <div 
            className="stimulus-shape triangle" 
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size/2}px solid transparent`,
              borderRight: `${size/2}px solid transparent`,
              borderBottom: `${size}px solid ${stim.color}`,
              backgroundColor: 'transparent'
            }} 
          />
        );
      case 'diamond':
        return (
          <div 
            className="stimulus-shape diamond" 
            style={{ 
              ...shapeStyle, 
              transform: 'rotate(45deg)',
              margin: '10px'
            }} 
          />
        );
    }
  };

  if (gameState === 'intro') {
    return (
      <div className="task-switcher-intro" role="alert" aria-live="polite">
        <h2>Task Switcher</h2>
        <p>Train your cognitive flexibility by rapidly switching between tasks.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>A shape will appear with different attributes</li>
            <li>The rule will change between: <strong>Color, Shape, Size, Number</strong></li>
            <li>Pay attention to the rule indicator at the top</li>
            <li>Respond based on the current rule</li>
            <li>Switching rules has a "cost" - your reaction time will be slower!</li>
          </ul>
        </div>
        <button className="start-button" onClick={startGame}>
          Start Training
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const switchCost = calculateSwitchCost();
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Training Complete!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
        <div className="final-stats">Trials Completed: {trialCount}</div>
        <div className="final-stats">Switch Cost: {switchCost}ms</div>
        <div className="switcher-insights">
          <h4>Cognitive Insights:</h4>
          <p>
            Switch cost measures how much slower you are when changing tasks.
            {switchCost < 100 
              ? " Excellent cognitive flexibility!" 
              : switchCost < 300 
                ? " Good switching ability." 
                : " Practice switching tasks to improve!"}
          </p>
        </div>
        <button className="restart-button" onClick={() => setGameState('intro')}>
          Train Again
        </button>
      </div>
    );
  }

  return (
    <div className="task-switcher" role="application" aria-label="Task Switcher game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Trials: {trialCount}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="rule-indicator">
        <div className={`rule-badge ${currentRule}`}>
          <span className="rule-icon">{getRuleIcon(currentRule)}</span>
          <span className="rule-name">{currentRule.toUpperCase()}</span>
        </div>
        <p className="rule-instruction">{getRuleInstruction(currentRule)}</p>
      </div>

      <div className="stimulus-display">
        {stimulus && (
          <div className="stimulus-container">
            {renderShape(stimulus)}
            {currentRule === 'number' && (
              <div className="stimulus-number">{stimulus.number}</div>
            )}
          </div>
        )}
        
        {feedback && (
          <div className={`switcher-feedback ${feedback}`} role="alert" aria-live="assertive">
            {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong!'}
          </div>
        )}
      </div>

      <div className="options-grid">
        {options.map((option, index) => (
          <button
            key={`${option}-${index}`}
            className={`switcher-option ${feedback && option === getCorrectAnswer(stimulus!, currentRule) ? 'correct-answer' : ''}`}
            onClick={() => handleOptionSelect(option)}
            disabled={!!feedback}
            style={{
              backgroundColor: currentRule === 'color' ? option : undefined,
              border: currentRule === 'color' ? '3px solid white' : undefined
            }}
            aria-label={`Option: ${option}`}
          >
            {currentRule === 'color' ? '' : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      <div className="switcher-progress">
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

export default TaskSwitcher;

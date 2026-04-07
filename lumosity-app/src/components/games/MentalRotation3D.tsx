import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface MentalRotation3DProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface Shape3D {
  id: string;
  type: 'cube' | 'pyramid' | 'cylinder' | 'cross' | 'lshape';
  rotation: { x: number; y: number; z: number };
  color: string;
}

const SHAPES: Shape3D['type'][] = ['cube', 'pyramid', 'cylinder', 'cross', 'lshape'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
const GAME_DURATION = 90;

const MentalRotation3D: React.FC<MentalRotation3DProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'showing' | 'input' | 'gameover'>('showing');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [targetShape, setTargetShape] = useState<Shape3D | null>(null);
  const [options, setOptions] = useState<Shape3D[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateShape = useCallback((type: Shape3D['type'], isTarget: boolean): Shape3D => {
    const baseRotation = isTarget 
      ? { x: Math.random() * 360, y: Math.random() * 360, z: Math.random() * 360 }
      : { x: 0, y: 0, z: 0 };
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      rotation: baseRotation,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
  }, []);

  const generateRound = useCallback(() => {
    const shapeType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const target = generateShape(shapeType, true);
    setTargetShape(target);
    
    // Generate 4 options: 1 correct match, 3 distractors
    const correctOption: Shape3D = {
      ...target,
      id: Math.random().toString(36).substr(2, 9),
      rotation: { x: 0, y: 0, z: 0 }
    };
    
    // Distractors are different rotations or similar shapes
    const distractors: Shape3D[] = [];
    for (let i = 0; i < 3; i++) {
      const isMirror = Math.random() > 0.5;
      if (isMirror && shapeType === 'lshape') {
        // Mirror L-shape (different chirality)
        distractors.push({
          id: Math.random().toString(36).substr(2, 9),
          type: shapeType,
          rotation: { x: 0, y: 180, z: 0 },
          color: target.color
        });
      } else {
        // Different shape entirely
        const distractorType = SHAPES.filter(s => s !== shapeType)[Math.floor(Math.random() * (SHAPES.length - 1))];
        distractors.push({
          id: Math.random().toString(36).substr(2, 9),
          type: distractorType,
          rotation: { x: 0, y: 0, z: 0 },
          color: target.color
        });
      }
    }
    
    // Shuffle options
    const allOptions = [correctOption, ...distractors].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setGameState('input');
    setSelectedOption(null);
    setFeedback(null);
  }, [generateShape]);

  useEffect(() => {
    if (gameState === 'showing') {
      generateRound();
    }
  }, [gameState, generateRound]);

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (isPaused || gameState === 'gameover') return;
    
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
  }, [isPaused, gameState]);

  useEffect(() => {
    if (gameState === 'gameover') {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameState, score, correct, total, onComplete]);

  const handleOptionSelect = (optionId: string, isCorrect: boolean) => {
    if (selectedOption) return;
    
    setSelectedOption(optionId);
    setTotal(prev => prev + 1);
    
    if (isCorrect) {
      audioManager.playCorrect();
      setCorrect(prev => prev + 1);
      setFeedback('correct');
      const timeBonus = Math.floor(timeLeft / 10);
      const levelBonus = level * 10;
      setScore(prev => prev + 50 + timeBonus + levelBonus);
      setLevel(prev => prev + 1);
    } else {
      audioManager.playWrong();
      setFeedback('wrong');
    }
    
    setTimeout(() => {
      if (isCorrect) {
        generateRound();
      } else {
        setGameState('gameover');
      }
    }, 1500);
  };

  const renderShape = (shape: Shape3D, isTarget: boolean) => {
    const { type, rotation, color } = shape;
    const transform = `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`;
    
    const getShapeSVG = () => {
      switch (type) {
        case 'cube':
          return (
            <svg viewBox="0 0 100 100" className="shape-svg">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill={color} opacity="0.8" />
              <polygon points="50,10 90,30 50,50 10,30" fill={color} opacity="0.9" />
              <polygon points="90,30 90,70 50,90 50,50" fill={color} opacity="0.6" />
              <polygon points="10,30 50,50 50,90 10,70" fill={color} opacity="0.7" />
            </svg>
          );
        case 'pyramid':
          return (
            <svg viewBox="0 0 100 100" className="shape-svg">
              <polygon points="50,10 90,80 50,90 10,80" fill={color} opacity="0.8" />
              <polygon points="50,10 90,80 50,50" fill={color} opacity="0.9" />
              <polygon points="50,10 50,50 10,80" fill={color} opacity="0.7" />
            </svg>
          );
        case 'cylinder':
          return (
            <svg viewBox="0 0 100 100" className="shape-svg">
              <ellipse cx="50" cy="25" rx="40" ry="15" fill={color} opacity="0.9" />
              <rect x="10" y="25" width="80" height="50" fill={color} opacity="0.7" />
              <ellipse cx="50" cy="75" rx="40" ry="15" fill={color} opacity="0.6" />
            </svg>
          );
        case 'cross':
          return (
            <svg viewBox="0 0 100 100" className="shape-svg">
              <rect x="35" y="10" width="30" height="80" fill={color} opacity="0.8" rx="3" />
              <rect x="10" y="35" width="80" height="30" fill={color} opacity="0.8" rx="3" />
              <rect x="35" y="35" width="30" height="30" fill={color} opacity="0.9" />
            </svg>
          );
        case 'lshape':
          return (
            <svg viewBox="0 0 100 100" className="shape-svg">
              <rect x="20" y="20" width="35" height="60" fill={color} opacity="0.8" rx="3" />
              <rect x="20" y="45" width="60" height="35" fill={color} opacity="0.8" rx="3" />
              <rect x="20" y="45" width="35" height="35" fill={color} opacity="0.9" />
            </svg>
          );
        default:
          return null;
      }
    };

    return (
      <div 
        className={`mental-rotation-shape ${isTarget ? 'target' : ''}`}
        style={{ 
          transform,
          transition: 'transform 0.3s ease'
        }}
      >
        {getShapeSVG()}
      </div>
    );
  };

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Game Over!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Level Reached: {level}</div>
        <div className="final-stats">Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
      </div>
    );
  }

  return (
    <div className="mental-rotation-3d" role="application" aria-label="Mental Rotation 3D game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>
      
      <div className="target-section">
        <h3>Target Shape (Mentally Rotate to Match)</h3>
        <div className="target-container">
          {targetShape && renderShape(targetShape, true)}
        </div>
      </div>

      <div className="options-section">
        <h3>Select the Matching Shape:</h3>
        <div className="options-grid">
          {options.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = option.rotation.x === 0 && option.rotation.y === 0 && option.rotation.z === 0 &&
                             option.type === targetShape?.type;
            
            return (
              <button
                key={option.id}
                className={`shape-option ${isSelected ? (isCorrect ? 'correct' : 'wrong') : ''} ${feedback && isCorrect ? 'correct-answer' : ''}`}
                onClick={() => handleOptionSelect(option.id, isCorrect)}
                disabled={selectedOption !== null}
                aria-label={`Option ${options.indexOf(option) + 1}`}
              >
                {renderShape(option, false)}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className={`feedback ${feedback}`} role="alert" aria-live="assertive">
          {feedback === 'correct' ? 'Correct! Great spatial reasoning!' : 'Wrong shape! Game Over.'}
        </div>
      )}
    </div>
  );
});

export default MentalRotation3D;

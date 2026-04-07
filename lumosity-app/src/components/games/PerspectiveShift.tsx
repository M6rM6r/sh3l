import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface PerspectiveShiftProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface SceneObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'tree' | 'house' | 'person';
  color: string;
  x: number;
  y: number;
  z: number;
  size: number;
}

type ViewAngle = 'front' | 'back' | 'left' | 'right' | 'top';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899'];
const OBJECT_TYPES: SceneObject['type'][] = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'tree', 'house', 'person'];
const VIEW_ANGLES: ViewAngle[] = ['front', 'back', 'left', 'right', 'top'];
const GAME_DURATION = 90;

const PerspectiveShift: React.FC<PerspectiveShiftProps> = memo(({
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
  
  const [scene, setScene] = useState<SceneObject[]>([]);
  const [currentView, setCurrentView] = useState<ViewAngle>('front');
  const [targetView, setTargetView] = useState<ViewAngle>('back');
  const [options, setOptions] = useState<ViewAngle[]>([]);
  const [selectedOption, setSelectedOption] = useState<ViewAngle | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateScene = useCallback((objectCount: number): SceneObject[] => {
    const objects: SceneObject[] = [];
    const usedPositions: { x: number; y: number; z: number }[] = [];
    
    for (let i = 0; i < objectCount; i++) {
      let x: number, y: number, z: number;
      let attempts = 0;
      
      do {
        x = Math.floor(Math.random() * 5) - 2;
        y = Math.floor(Math.random() * 3);
        z = Math.floor(Math.random() * 5) - 2;
        attempts++;
      } while (
        usedPositions.some(pos => 
          Math.abs(pos.x - x) < 1.5 && Math.abs(pos.y - y) < 1.5 && Math.abs(pos.z - z) < 1.5
        ) && attempts < 50
      );
      
      usedPositions.push({ x, y, z });
      objects.push({
        id: Math.random().toString(36).substr(2, 9),
        type: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        x,
        y,
        z,
        size: 0.5 + Math.random() * 0.5
      });
    }
    
    return objects;
  }, []);

  const getObjectPositionForView = (obj: SceneObject, view: ViewAngle): { x: number; y: number } => {
    switch (view) {
      case 'front':
        return { x: obj.x, y: -obj.y };
      case 'back':
        return { x: -obj.x, y: -obj.y };
      case 'left':
        return { x: obj.z, y: -obj.y };
      case 'right':
        return { x: -obj.z, y: -obj.y };
      case 'top':
        return { x: obj.x, y: -obj.z };
      default:
        return { x: obj.x, y: -obj.y };
    }
  };

  const generateRound = useCallback(() => {
    const objectCount = Math.min(3 + Math.floor(level / 2), 8);
    const newScene = generateScene(objectCount);
    setScene(newScene);
    
    // Randomly select current and target views
    const shuffledViews = [...VIEW_ANGLES].sort(() => Math.random() - 0.5);
    const current = shuffledViews[0];
    const target = shuffledViews[1];
    setCurrentView(current);
    setTargetView(target);
    
    // Generate options including the correct answer and 3 distractors
    const correctAnswer = target;
    const otherViews = VIEW_ANGLES.filter(v => v !== correctAnswer);
    const distractors = otherViews.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    
    setGameState('input');
    setSelectedOption(null);
    setFeedback(null);
  }, [level, generateScene]);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

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

  const handleOptionSelect = (view: ViewAngle) => {
    if (selectedOption) return;
    
    setSelectedOption(view);
    setTotal(prev => prev + 1);
    
    if (view === targetView) {
      audioManager.playCorrect();
      setCorrect(prev => prev + 1);
      setFeedback('correct');
      const timeBonus = Math.floor(timeLeft / 10);
      const levelBonus = level * 15;
      const objectBonus = scene.length * 5;
      setScore(prev => prev + 50 + timeBonus + levelBonus + objectBonus);
      setLevel(prev => prev + 1);
    } else {
      audioManager.playWrong();
      setFeedback('wrong');
    }
    
    setTimeout(() => {
      if (view === targetView) {
        generateRound();
      } else {
        setGameState('gameover');
      }
    }, 1500);
  };

  const renderScene = (view: ViewAngle, isPreview: boolean) => {
    const sortedObjects = [...scene].sort((a, b) => {
      // Sort by depth based on view angle
      switch (view) {
        case 'front':
          return b.z - a.z;
        case 'back':
          return a.z - b.z;
        case 'left':
          return b.x - a.x;
        case 'right':
          return a.x - b.x;
        case 'top':
          return b.y - a.y;
        default:
          return 0;
      }
    });

    return (
      <div className={`scene-container ${isPreview ? 'preview' : 'option'}`}>
        <div className="ground-plane">
          {sortedObjects.map((obj, index) => {
            const pos = getObjectPositionForView(obj, view);
            const scale = isPreview ? 1 : 0.7;
            
            return (
              <div
                key={obj.id}
                className={`scene-object ${obj.type}`}
                style={{
                  left: `${50 + pos.x * 15 * scale}%`,
                  bottom: `${30 + pos.y * 15 * scale}%`,
                  transform: `translate(-50%, 0) scale(${obj.size * scale})`,
                  zIndex: index,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {renderObjectShape(obj)}
              </div>
            );
          })}
        </div>
        <div className="view-label">{view.charAt(0).toUpperCase() + view.slice(1)} View</div>
      </div>
    );
  };

  const renderObjectShape = (obj: SceneObject) => {
    const { type, color } = obj;
    
    switch (type) {
      case 'cube':
        return (
          <div className="object-cube" style={{ backgroundColor: color }}>
            <div className="cube-face front" style={{ backgroundColor: color }} />
            <div className="cube-face top" style={{ backgroundColor: color, filter: 'brightness(1.2)' }} />
            <div className="cube-face side" style={{ backgroundColor: color, filter: 'brightness(0.8)' }} />
          </div>
        );
      case 'sphere':
        return (
          <div 
            className="object-sphere" 
            style={{ 
              backgroundColor: color,
              background: `radial-gradient(circle at 30% 30%, ${color}, ${color}dd, ${color}99)`
            }} 
          />
        );
      case 'cylinder':
        return (
          <div className="object-cylinder" style={{ backgroundColor: color }}>
            <div className="cylinder-top" style={{ backgroundColor: color, filter: 'brightness(1.2)' }} />
            <div className="cylinder-body" style={{ backgroundColor: color }} />
          </div>
        );
      case 'cone':
        return (
          <div className="object-cone">
            <div className="cone-top" style={{ borderBottomColor: color }} />
            <div className="cone-base" style={{ backgroundColor: color }} />
          </div>
        );
      case 'pyramid':
        return (
          <div className="object-pyramid">
            <div className="pyramid-body" style={{ borderBottomColor: color }} />
            <div className="pyramid-base" style={{ backgroundColor: color }} />
          </div>
        );
      case 'tree':
        return (
          <div className="object-tree">
            <div className="tree-foliage" style={{ backgroundColor: color }} />
            <div className="tree-trunk" style={{ backgroundColor: '#8b4513' }} />
          </div>
        );
      case 'house':
        return (
          <div className="object-house">
            <div className="house-roof" style={{ borderBottomColor: color }} />
            <div className="house-body" style={{ backgroundColor: '#e5e7eb' }} />
            <div className="house-door" style={{ backgroundColor: '#8b4513' }} />
          </div>
        );
      case 'person':
        return (
          <div className="object-person">
            <div className="person-head" style={{ backgroundColor: '#fca5a5' }} />
            <div className="person-body" style={{ backgroundColor: color }} />
            <div className="person-legs" style={{ backgroundColor: '#1f2937' }} />
          </div>
        );
      default:
        return null;
    }
  };

  const getViewIcon = (view: ViewAngle) => {
    switch (view) {
      case 'front': return '👁️';
      case 'back': return '🔄';
      case 'left': return '⬅️';
      case 'right': return '➡️';
      case 'top': return '⬆️';
      default: return '👁️';
    }
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
    <div className="perspective-shift" role="application" aria-label="Perspective Shift game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="game-instructions">
        <h3>Mental Perspective Challenge</h3>
        <p>You are viewing the scene from the <strong>{currentView}</strong> perspective.</p>
        <p>Which view shows how the scene looks from the <strong>{targetView}</strong> perspective?</p>
      </div>

      <div className="perspective-game-container">
        {/* Current View Preview */}
        <div className="current-view-section">
          <h4>Current View ({currentView})</h4>
          <div className="view-indicator">{getViewIcon(currentView)}</div>
          {renderScene(currentView, true)}
        </div>

        {/* Options Grid */}
        <div className="options-section">
          <h4>Select the {targetView} view:</h4>
          <div className="perspective-options-grid">
            {options.map((view) => {
              const isSelected = selectedOption === view;
              const isCorrect = view === targetView;
              
              return (
                <button
                  key={view}
                  className={`perspective-option ${isSelected ? (isCorrect ? 'correct' : 'wrong') : ''} ${feedback && isCorrect ? 'correct-answer' : ''}`}
                  onClick={() => handleOptionSelect(view)}
                  disabled={selectedOption !== null}
                  aria-label={`${view} view option`}
                >
                  {renderScene(view, false)}
                  <div className="option-label">{getViewIcon(view)} {view}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`feedback ${feedback}`} role="alert" aria-live="assertive">
          {feedback === 'correct' 
            ? 'Excellent! You have great spatial perspective skills!' 
            : 'That\'s not the correct perspective! Game Over.'}
        </div>
      )}
    </div>
  );
});

export default PerspectiveShift;

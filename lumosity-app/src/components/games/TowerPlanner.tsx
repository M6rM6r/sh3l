import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface TowerPlannerProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface Disk {
  id: number;
  size: number;
  color: string;
}

interface Peg {
  id: number;
  disks: Disk[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const PLANNING_TIME_BASE = 30;
const EXECUTION_TIME_BASE = 60;

const TowerPlanner: React.FC<TowerPlannerProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [planningTimeLeft, setPlanningTimeLeft] = useState(PLANNING_TIME_BASE);
  const [executionTimeLeft, setExecutionTimeLeft] = useState(EXECUTION_TIME_BASE);
  const [gameState, setGameState] = useState<'intro' | 'planning' | 'executing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [pegs, setPegs] = useState<Peg[]>([]);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [optimalMoves, setOptimalMoves] = useState(0);
  const [targetPeg, setTargetPeg] = useState(2);
  const [plan, setPlan] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const calculateOptimalMoves = (disks: number) => Math.pow(2, disks) - 1;

  const generatePuzzle = useCallback((diskCount: number) => {
    const disks: Disk[] = [];
    for (let i = diskCount; i >= 1; i--) {
      disks.push({
        id: i,
        size: i,
        color: COLORS[i - 1] || COLORS[COLORS.length - 1]
      });
    }
    
    // Randomize target peg (1, 2, or 3)
    const target = Math.floor(Math.random() * 3) + 1;
    setTargetPeg(target);
    
    setPegs([
      { id: 1, disks: [...disks] },
      { id: 2, disks: [] },
      { id: 3, disks: [] }
    ]);
    
    setOptimalMoves(calculateOptimalMoves(diskCount));
    setMoves(0);
    setSelectedPeg(null);
    setPlan([]);
    setIsExecuting(false);
  }, []);

  const startGame = () => {
    const diskCount = Math.min(3 + level, 7);
    setLevel(1);
    setScore(0);
    setPlanningTimeLeft(PLANNING_TIME_BASE);
    setExecutionTimeLeft(EXECUTION_TIME_BASE);
    setCorrect(0);
    setTotal(0);
    generatePuzzle(diskCount);
    setGameState('planning');
  };

  const startExecution = () => {
    setGameState('executing');
    setIsExecuting(true);
  };

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(gameState === 'planning' ? planningTimeLeft : executionTimeLeft);
  }, [planningTimeLeft, executionTimeLeft, gameState, onTimeChange]);

  useEffect(() => {
    if (gameState === 'planning' && !isPaused) {
      const timer = setInterval(() => {
        setPlanningTimeLeft(prev => {
          if (prev <= 1) {
            startExecution();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState === 'executing' && !isPaused) {
      const timer = setInterval(() => {
        setExecutionTimeLeft(prev => {
          if (prev <= 1) {
            checkCompletion(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, isPaused]);

  const checkCompletion = useCallback((timeOut = false) => {
    const target = pegs.find(p => p.id === targetPeg);
    const diskCount = pegs[0].disks.length + pegs[1].disks.length + pegs[2].disks.length;
    
    if (target && target.disks.length === diskCount) {
      // Completed successfully
      setCorrect(prev => prev + 1);
      setTotal(prev => prev + 1);
      
      // Calculate score
      const basePoints = 100;
      const efficiencyBonus = Math.max(0, (optimalMoves * 2 - moves) * 5);
      const planningBonus = Math.max(0, (PLANNING_TIME_BASE - planningTimeLeft) * 2);
      const speedBonus = Math.max(0, executionTimeLeft);
      
      setScore(prev => prev + basePoints + efficiencyBonus + planningBonus + speedBonus);
      
      // Level up
      if (correct + 1 >= level * 2) {
        setLevel(prev => Math.min(5, prev + 1));
        setGameState('planning');
        setPlanningTimeLeft(PLANNING_TIME_BASE);
        setExecutionTimeLeft(EXECUTION_TIME_BASE);
        generatePuzzle(Math.min(3 + level + 1, 7));
      } else {
        setGameState('gameover');
      }
    } else if (timeOut) {
      setTotal(prev => prev + 1);
      setGameState('gameover');
    }
  }, [pegs, targetPeg, moves, optimalMoves, planningTimeLeft, executionTimeLeft, correct, level, generatePuzzle]);

  useEffect(() => {
    if (gameState === 'executing') {
      checkCompletion();
    }
  }, [pegs, gameState, checkCompletion]);

  useEffect(() => {
    if (gameState === 'gameover') {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameState, score, correct, total, onComplete]);

  const handlePegClick = (pegId: number) => {
    if (!isExecuting) {
      // In planning phase, just record the plan
      if (plan.length < 10) {
        setPlan(prev => [...prev, `Peg ${pegId}`]);
      }
      return;
    }

    if (selectedPeg === null) {
      // Select source peg
      const peg = pegs.find(p => p.id === pegId);
      if (peg && peg.disks.length > 0) {
        setSelectedPeg(pegId);
        audioManager.playTilePress();
      }
    } else {
      // Select target peg
      if (selectedPeg === pegId) {
        // Deselect
        setSelectedPeg(null);
      } else {
        // Attempt move
        moveDisk(selectedPeg, pegId);
        setSelectedPeg(null);
      }
    }
  };

  const moveDisk = (fromId: number, toId: number) => {
    const fromPeg = pegs.find(p => p.id === fromId);
    const toPeg = pegs.find(p => p.id === toId);
    
    if (!fromPeg || !toPeg || fromPeg.disks.length === 0) return;
    
    const diskToMove = fromPeg.disks[fromPeg.disks.length - 1];
    const topDiskOnTarget = toPeg.disks[toPeg.disks.length - 1];
    
    // Check if move is valid (smaller disk on larger)
    if (topDiskOnTarget && diskToMove.size > topDiskOnTarget.size) {
      audioManager.playWrong();
      return;
    }
    
    // Execute move
    const newPegs = pegs.map(p => {
      if (p.id === fromId) {
        return { ...p, disks: p.disks.slice(0, -1) };
      }
      if (p.id === toId) {
        return { ...p, disks: [...p.disks, diskToMove] };
      }
      return p;
    });
    
    setPegs(newPegs);
    setMoves(prev => prev + 1);
    audioManager.playCorrect();
    
    // Add to plan
    setPlan(prev => [...prev, `${fromId}→${toId}`]);
  };

  const renderDisk = (disk: Disk, index: number, total: number) => {
    const width = 60 + disk.size * 20;
    return (
      <div
        key={disk.id}
        className="tower-disk"
        style={{
          width: `${width}px`,
          height: '20px',
          backgroundColor: disk.color,
          bottom: `${index * 22}px`,
          zIndex: total - index
        }}
      >
        <span className="disk-label">{disk.id}</span>
      </div>
    );
  };

  const renderPeg = (peg: Peg) => {
    const isSelected = selectedPeg === peg.id;
    const isTarget = peg.id === targetPeg;
    
    return (
      <div
        key={peg.id}
        className={`tower-peg ${isSelected ? 'selected' : ''} ${isTarget ? 'target' : ''}`}
        onClick={() => handlePegClick(peg.id)}
        role="button"
        aria-label={`Peg ${peg.id}${isTarget ? ' - Target' : ''}${peg.disks.length > 0 ? `, ${peg.disks.length} disks` : ''}`}
        tabIndex={0}
      >
        <div className="peg-base">
          <div className="peg-rod" />
          <div className="peg-platform">
            {peg.disks.map((disk, index) => renderDisk(disk, index, peg.disks.length))}
          </div>
        </div>
        <div className="peg-label">Peg {peg.id}{isTarget ? ' 🎯' : ''}</div>
      </div>
    );
  };

  const getEfficiencyRating = () => {
    if (moves === 0) return '-';
    const ratio = optimalMoves / moves;
    if (ratio >= 0.95) return 'Perfect! ⭐⭐⭐';
    if (ratio >= 0.8) return 'Excellent ⭐⭐';
    if (ratio >= 0.6) return 'Good ⭐';
    return 'Keep Practicing';
  };

  if (gameState === 'intro') {
    return (
      <div className="tower-planner-intro" role="alert" aria-live="polite">
        <h2>Tower Planner</h2>
        <p>Extended Tower of Hanoi with planning phase - the ultimate executive function challenge.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li><strong>Planning Phase:</strong> You have {PLANNING_TIME_BASE} seconds to plan your moves</li>
            <li>Study the starting position and target peg (marked with 🎯)</li>
            <li>Think about the most efficient sequence of moves</li>
            <li><strong>Execution Phase:</strong> Execute your plan within the time limit</li>
            <li>Move all disks to the target peg following the rules:</li>
            <ul>
              <li>Only move one disk at a time</li>
              <li>Never place a larger disk on a smaller one</li>
            </ul>
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
        <div className="final-stats">Level Reached: {level}</div>
        <div className="final-stats">Moves: {moves} / Optimal: {optimalMoves}</div>
        <div className="final-stats">Efficiency: {getEfficiencyRating()}</div>
        <div className="final-stats">Planning Time Used: {PLANNING_TIME_BASE - planningTimeLeft}s</div>
        <div className="planning-insights">
          <h4>Executive Function Insights:</h4>
          <p>
            This game measures planning, working memory, and inhibition control.
            {moves <= optimalMoves * 1.2 
              ? " Outstanding planning skills!" 
              : moves <= optimalMoves * 1.5 
                ? " Good planning with room for optimization." 
                : " Take more time in the planning phase to think through your moves."}
          </p>
        </div>
        <button className="restart-button" onClick={() => setGameState('intro')}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="tower-planner" role="application" aria-label="Tower Planner game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Moves: {moves}</span>
        {gameState === 'planning' ? (
          <span className="phase-timer">Planning: {planningTimeLeft}s</span>
        ) : (
          <span className="phase-timer">Execute: {executionTimeLeft}s</span>
        )}
      </div>

      <div className={`phase-indicator ${gameState}`}>
        {gameState === 'planning' ? (
          <>
            <h3>🧠 PLANNING PHASE</h3>
            <p>Study the puzzle and plan your moves. Target peg is marked with 🎯</p>
            <button className="start-execution-btn" onClick={startExecution}>
              Start Execution Early
            </button>
          </>
        ) : (
          <>
            <h3>⚡ EXECUTION PHASE</h3>
            <p>Click a peg to select it, then click another to move the top disk</p>
          </>
        )}
      </div>

      <div className="tower-container">
        {pegs.map(renderPeg)}
      </div>

      <div className="tower-stats">
        <div className="stat-item">
          <span className="stat-label">Optimal Moves:</span>
          <span className="stat-value">{optimalMoves}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Current Moves:</span>
          <span className={`stat-value ${moves > optimalMoves ? 'over' : ''}`}>{moves}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Efficiency:</span>
          <span className="stat-value">{getEfficiencyRating()}</span>
        </div>
      </div>

      {selectedPeg && (
        <div className="selection-hint" role="alert" aria-live="polite">
          Peg {selectedPeg} selected. Click another peg to move the top disk.
        </div>
      )}
    </div>
  );
});

export default TowerPlanner;

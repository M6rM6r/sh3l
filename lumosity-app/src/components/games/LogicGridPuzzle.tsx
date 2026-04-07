import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface LogicGridPuzzleProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface Category {
  name: string;
  values: string[];
  icons: string[];
}

interface Clue {
  type: 'same' | 'different' | 'left_of' | 'right_of' | 'between' | 'not';
  category1: string;
  value1: string;
  category2: string;
  value2: string;
  hint?: string;
}

interface GridState {
  [key: string]: { [key: string]: boolean | null };
}

const CATEGORIES: Category[] = [
  { name: 'Person', values: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'], icons: ['👩‍🔬', '👨‍💼', '👨‍🎨', '👨‍🔧', '👩‍💻'] },
  { name: 'Job', values: ['Engineer', 'Artist', 'Doctor', 'Teacher', 'Chef'], icons: ['⚙️', '🎨', '🏥', '📚', '👨‍🍳'] },
  { name: 'Color', values: ['Red', 'Blue', 'Green', 'Yellow', 'Purple'], icons: ['🔴', '🔵', '🟢', '🟡', '🟣'] },
  { name: 'Pet', values: ['Dog', 'Cat', 'Bird', 'Fish', 'Hamster'], icons: ['🐕', '🐈', '🦜', '🐠', '🐹'] },
  { name: 'Drink', values: ['Coffee', 'Tea', 'Juice', 'Water', 'Soda'], icons: ['☕', '🍵', '🧃', '💧', '🥤'] },
];

const GAME_DURATION = 600; // 10 minutes for INTJ deep thinking

const LogicGridPuzzle: React.FC<LogicGridPuzzleProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'solved' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [solution, setSolution] = useState<Map<string, string>>(new Map());
  const [clues, setClues] = useState<Clue[]>([]);
  const [grid, setGrid] = useState<GridState>({});
  const [selectedCell, setSelectedCell] = useState<{cat1: string, val1: string, cat2: string, val2: string} | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Generate a valid logic puzzle
  const generatePuzzle = useCallback((difficulty: number) => {
    // Create random solution
    const cats = CATEGORIES.slice(0, 3 + Math.min(difficulty, 2));
    const newSolution = new Map<string, string>();
    
    // Generate consistent solution
    cats.forEach((cat, catIdx) => {
      const shuffled = [...cat.values].sort(() => Math.random() - 0.5);
      cats.forEach((otherCat, otherIdx) => {
        if (catIdx !== otherIdx) {
          cat.values.forEach((val, idx) => {
            newSolution.set(`${cat.name}-${val}-${otherCat.name}`, shuffled[idx]);
          });
        }
      });
    });
    
    setSolution(newSolution);
    
    // Generate clues based on solution
    const newClues: Clue[] = [];
    const usedPairs = new Set<string>();
    
    // Generate "same" clues (X is Y)
    for (let i = 0; i < 3 + difficulty; i++) {
      const cat1 = cats[Math.floor(Math.random() * cats.length)];
      const val1 = cat1.values[Math.floor(Math.random() * cat1.values.length)];
      const otherCats = cats.filter(c => c.name !== cat1.name);
      const cat2 = otherCats[Math.floor(Math.random() * otherCats.length)];
      const val2 = newSolution.get(`${cat1.name}-${val1}-${cat2.name}`)!;
      
      const key = `${val1}-${val2}`;
      if (!usedPairs.has(key)) {
        usedPairs.add(key);
        newClues.push({
          type: 'same',
          category1: cat1.name,
          value1: val1,
          category2: cat2.name,
          value2: val2,
          hint: `${val1} is the ${val2}`
        });
      }
    }
    
    // Generate "not" clues
    for (let i = 0; i < 2 + difficulty; i++) {
      const cat1 = cats[Math.floor(Math.random() * cats.length)];
      const val1 = cat1.values[Math.floor(Math.random() * cat1.values.length)];
      const otherCats = cats.filter(c => c.name !== cat1.name);
      const cat2 = otherCats[Math.floor(Math.random() * otherCats.length)];
      const correctVal = newSolution.get(`${cat1.name}-${val1}-${cat2.name}`)!;
      const wrongVal = cat2.values.find(v => v !== correctVal)!;
      
      newClues.push({
        type: 'not',
        category1: cat1.name,
        value1: val1,
        category2: cat2.name,
        value2: wrongVal,
        hint: `${val1} is not ${wrongVal}`
      });
    }
    
    // Generate positional clues for higher levels
    if (difficulty >= 2) {
      const positions = ['1st', '2nd', '3rd', '4th', '5th'];
      const pos1 = Math.floor(Math.random() * positions.length);
      const pos2 = (pos1 + 1) % positions.length;
      
      newClues.push({
        type: 'left_of',
        category1: 'Position',
        value1: positions[pos1],
        category2: 'Position',
        value2: positions[pos2],
        hint: `${positions[pos1]} is immediately left of ${positions[pos2]}`
      });
    }
    
    setClues(newClues.sort(() => Math.random() - 0.5));
    
    // Initialize empty grid
    const newGrid: GridState = {};
    cats.forEach(cat1 => {
      cat1.values.forEach(val1 => {
        const key = `${cat1.name}-${val1}`;
        newGrid[key] = {};
        cats.filter(c => c.name !== cat1.name).forEach(cat2 => {
          cat2.values.forEach(val2 => {
            newGrid[key][`${cat2.name}-${val2}`] = null;
          });
        });
      });
    });
    setGrid(newGrid);
    setEliminated(new Set());
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setTotal(0);
    setLevel(1);
    setHintsUsed(0);
    generatePuzzle(1);
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

  const handleCellClick = (cat1: string, val1: string, cat2: string, val2: string) => {
    if (gameState !== 'playing') return;
    
    const key1 = `${cat1}-${val1}`;
    const key2 = `${cat2}-${val2}`;
    const currentValue = grid[key1]?.[key2];
    
    // Cycle through: null -> true -> false -> null
    let newValue: boolean | null;
    if (currentValue === null) newValue = true;
    else if (currentValue === true) newValue = false;
    else newValue = null;
    
    const newGrid = { ...grid };
    if (!newGrid[key1]) newGrid[key1] = {};
    newGrid[key1][key2] = newValue;
    
    // Also set symmetric value
    const symKey1 = `${cat2}-${val2}`;
    const symKey2 = `${cat1}-${val1}`;
    if (!newGrid[symKey1]) newGrid[symKey1] = {};
    newGrid[symKey1][symKey2] = newValue;
    
    setGrid(newGrid);
    
    // Check if correct
    const correctValue = solution.get(`${cat1}-${val1}-${cat2}`) === val2;
    
    if (newValue === true) {
      if (correctValue) {
        audioManager.playCorrect();
        setCorrect(c => c + 1);
        setScore(s => s + 20);
        
        // Auto-eliminate other options in same row/column
        autoEliminate(cat1, val1, cat2, val2, newGrid);
      } else {
        audioManager.playWrong();
        setScore(s => Math.max(0, s - 5));
      }
    }
    
    setTotal(t => t + 1);
    
    // Check if puzzle is complete
    checkCompletion(newGrid);
  };

  const autoEliminate = (cat1: string, val1: string, cat2: string, val2: string, currentGrid: GridState) => {
    // When we confirm a match, eliminate all other possibilities
    const newGrid = { ...currentGrid };
    const key1 = `${cat1}-${val1}`;
    
    // Eliminate other values in same category2 for this val1
    const cat2Obj = CATEGORIES.find(c => c.name === cat2);
    if (cat2Obj) {
      cat2Obj.values.forEach(v => {
        if (v !== val2) {
          const otherKey = `${cat2}-${v}`;
          const symKey = `${cat1}-${val1}`;
          if (newGrid[key1]) newGrid[key1][otherKey] = false;
          if (newGrid[otherKey]) newGrid[otherKey][symKey] = false;
        }
      });
    }
    
    setGrid(newGrid);
  };

  const checkCompletion = (currentGrid: GridState) => {
    // Check if all cells have been determined
    let allFilled = true;
    let allCorrect = true;
    
    for (const [key1, row] of Object.entries(currentGrid)) {
      for (const [key2, value] of Object.entries(row)) {
        if (value === null) {
          allFilled = false;
          break;
        }
        
        // Parse keys to check correctness
        const [cat1, val1] = key1.split('-');
        const [cat2, val2] = key2.split('-');
        const correctValue = solution.get(`${cat1}-${val1}-${cat2}`) === val2;
        
        if (value !== correctValue) {
          allCorrect = false;
        }
      }
    }
    
    if (allFilled) {
      if (allCorrect) {
        setGameState('solved');
        const timeBonus = Math.floor(timeLeft / 10);
        const hintPenalty = hintsUsed * 10;
        setScore(s => s + 200 + timeBonus - hintPenalty);
      } else {
        setGameState('gameover');
      }
    }
  };

  const useHint = () => {
    if (hintsUsed >= 3) return;
    
    // Find a random unsolved correct cell and reveal it
    const unsolvedCorrect: Array<{cat1: string, val1: string, cat2: string, val2: string}> = [];
    
    for (const [key1, row] of Object.entries(grid)) {
      for (const [key2, value] of Object.entries(row)) {
        if (value === null || value === false) {
          const [cat1, val1] = key1.split('-');
          const [cat2, val2] = key2.split('-');
          const correctValue = solution.get(`${cat1}-${val1}-${cat2}`) === val2;
          
          if (correctValue) {
            unsolvedCorrect.push({cat1, val1, cat2, val2});
          }
        }
      }
    }
    
    if (unsolvedCorrect.length > 0) {
      const toReveal = unsolvedCorrect[Math.floor(Math.random() * unsolvedCorrect.length)];
      handleCellClick(toReveal.cat1, toReveal.val1, toReveal.cat2, toReveal.val2);
      setHintsUsed(h => h + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'intro') {
    return (
      <div className="logic-grid-intro" role="alert" aria-live="polite">
        <h2>🧩 Logic Grid Puzzle</h2>
        <p>INTJ Special: Pure deductive reasoning. No guessing, only logic.</p>
        <div className="instructions">
          <h3>How to Solve:</h3>
          <ul>
            <li>Use the clues to determine which values go together</li>
            <li>Click cells to mark: ✅ (match), ❌ (not match), or blank (unknown)</li>
            <li>Use process of elimination to solve the puzzle</li>
            <li>All clues are necessary and sufficient to solve the puzzle</li>
          </ul>
          <div className="difficulty-selector">
            <p>Select difficulty:</p>
            <div className="difficulty-buttons">
              <button onClick={() => { setLevel(1); generatePuzzle(1); setGameState('playing'); }}>
                Beginner (3 categories)
              </button>
              <button onClick={() => { setLevel(2); generatePuzzle(2); setGameState('playing'); }}>
                Intermediate (4 categories)
              </button>
              <button onClick={() => { setLevel(3); generatePuzzle(3); setGameState('playing'); }}>
                INTJ Master (5 categories)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'solved') {
    return (
      <div className="puzzle-solved" role="alert" aria-live="polite">
        <h2>🎉 Puzzle Solved!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Time: {formatTime(GAME_DURATION - timeLeft)}</div>
        <div className="final-stats">Hints Used: {hintsUsed}</div>
        <div className="final-stats">Accuracy: {Math.round((correct / total) * 100)}%</div>
        <p className="intj-quote">"The satisfaction of pure logic."</p>
        <button onClick={startGame}>Next Puzzle</button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Puzzle Failed</h2>
        <div className="final-score">Score: {score}</div>
        <p>Some deductions were incorrect. Try again with fresh logic.</p>
        <button onClick={startGame}>Try Again</button>
      </div>
    );
  }

  // Get current categories for display
  const currentCats = CATEGORIES.slice(0, 2 + level);

  return (
    <div className="logic-grid-puzzle" role="application" aria-label="Logic Grid Puzzle">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {formatTime(timeLeft)}</span>
        <span>Hints: {3 - hintsUsed}</span>
      </div>

      <div className="clues-panel">
        <h3>Clues ({clues.length})</h3>
        <div className="clues-list">
          {clues.map((clue, idx) => (
            <div 
              key={idx} 
              className={`clue-item ${showHint === clue.hint ? 'highlighted' : ''}`}
              onClick={() => setShowHint(showHint === clue.hint ? null : clue.hint!)}
            >
              <span className="clue-number">{idx + 1}.</span>
              <span className="clue-text">
                {clue.type === 'same' && `${clue.value1} = ${clue.value2}`}
                {clue.type === 'not' && `${clue.value1} ≠ ${clue.value2}`}
                {clue.type === 'left_of' && `${clue.value1} → ${clue.value2}`}
                {clue.type === 'between' && `${clue.value2} is between ${clue.value1} and ...`}
              </span>
            </div>
          ))}
        </div>
        <button 
          className="hint-button" 
          onClick={useHint}
          disabled={hintsUsed >= 3}
        >
          Use Hint ({3 - hintsUsed} left)
        </button>
      </div>

      <div className="logic-grid-container">
        <div className="grid-table">
          {/* Header row */}
          <div className="grid-header">
            <div className="corner-cell"></div>
            {currentCats[1].values.map((val, idx) => (
              <div key={val} className="header-cell">
                <span className="header-icon">{currentCats[1].icons[idx]}</span>
                <span className="header-text">{val}</span>
              </div>
            ))}
          </div>
          
          {/* Grid rows */}
          {currentCats[0].values.map((rowVal, rowIdx) => (
            <div key={rowVal} className="grid-row">
              <div className="row-header">
                <span className="row-icon">{currentCats[0].icons[rowIdx]}</span>
                <span className="row-text">{rowVal}</span>
              </div>
              {currentCats[1].values.map((colVal) => {
                const key1 = `${currentCats[0].name}-${rowVal}`;
                const key2 = `${currentCats[1].name}-${colVal}`;
                const value = grid[key1]?.[key2];
                
                return (
                  <button
                    key={`${rowVal}-${colVal}`}
                    className={`grid-cell ${value === true ? 'match' : ''} ${value === false ? 'no-match' : ''}`}
                    onClick={() => handleCellClick(currentCats[0].name, rowVal, currentCats[1].name, colVal)}
                    aria-label={`${rowVal} and ${colVal}: ${value === true ? 'match' : value === false ? 'not match' : 'unknown'}`}
                  >
                    {value === true && '✓'}
                    {value === false && '✗'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showHint && (
        <div className="hint-popup" role="alert">
          <p>💡 {showHint}</p>
        </div>
      )}

      <div className="progress-indicator">
        <span>Progress: {correct} / {clues.length} clues resolved</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(correct / clues.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
});

export default LogicGridPuzzle;

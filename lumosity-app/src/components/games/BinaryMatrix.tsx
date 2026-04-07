import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface BinaryMatrixProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface BinaryPuzzle {
  grid: (0 | 1 | null)[][];
  solution: (0 | 1)[][];
  size: number;
}

// Binary puzzle rules: each row/col has equal 0s and 1s, no 3 consecutive same, no duplicate rows/cols
function generateBinaryPuzzle(size: number): BinaryPuzzle {
  const s = size % 2 === 0 ? size : size + 1; // must be even
  const solution: (0 | 1)[][] = [];

  function isValidPlacement(grid: (0 | 1 | -1)[][], r: number, c: number, val: 0 | 1): boolean {
    // Check no 3 in a row horizontally
    if (c >= 2 && grid[r][c - 1] === val && grid[r][c - 2] === val) return false;
    // Check no 3 in a row vertically
    if (r >= 2 && grid[r - 1][c] === val && grid[r - 2][c] === val) return false;
    // Count in row
    let rowCount = 0;
    for (let x = 0; x < s; x++) { if (grid[r][x] === val) rowCount++; }
    if (rowCount >= s / 2) return false;
    // Count in col
    let colCount = 0;
    for (let y = 0; y < s; y++) { if (grid[y]?.[c] === val) colCount++; }
    if (colCount >= s / 2) return false;
    return true;
  }

  function solve(grid: (0 | 1 | -1)[][]): boolean {
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        if (grid[r][c] === -1) {
          const vals: (0 | 1)[] = Math.random() > 0.5 ? [1, 0] : [0, 1];
          for (const v of vals) {
            if (isValidPlacement(grid, r, c, v)) {
              grid[r][c] = v;
              if (solve(grid)) return true;
              grid[r][c] = -1;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  const grid: (0 | 1 | -1)[][] = Array.from({ length: s }, () => Array(s).fill(-1));
  solve(grid);

  for (let r = 0; r < s; r++) {
    solution.push(grid[r].map(v => (v === -1 ? 0 : v) as 0 | 1));
  }

  // Remove cells to create puzzle
  const puzzle: (0 | 1 | null)[][] = solution.map(row => [...row]);
  const removeCount = Math.floor(s * s * 0.55);
  const positions: [number, number][] = [];
  for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < removeCount; i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = null;
  }

  return { grid: puzzle, solution, size: s };
}

const GAME_DURATION = 360;

const BinaryMatrix: React.FC<BinaryMatrixProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [puzzle, setPuzzle] = useState<BinaryPuzzle | null>(null);
  const [userGrid, setUserGrid] = useState<(0 | 1 | null)[][]>([]);
  const [given, setGiven] = useState<boolean[][]>([]);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const initPuzzle = useCallback(() => {
    const size = Math.min(4 + Math.floor(level / 2) * 2, 8);
    const p = generateBinaryPuzzle(size);
    setPuzzle(p);
    setUserGrid(p.grid.map(row => [...row]));
    setGiven(p.grid.map(row => row.map(c => c !== null)));
    setErrors(new Set());
  }, [level]);

  useEffect(() => { if (gameState === 'playing') initPuzzle(); }, [gameState, initPuzzle]);

  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    const t = setInterval(() => setTimeLeft(prev => {
      const next = prev - 1;
      onTimeChange?.(next);
      if (next <= 0) { setGameState('gameover'); clearInterval(t); }
      return Math.max(0, next);
    }), 1000);
    return () => clearInterval(t);
  }, [gameState, isPaused, onTimeChange]);

  useEffect(() => { onScoreChange?.(score); }, [score, onScoreChange]);

  const handleCellClick = (r: number, c: number) => {
    if (!puzzle || given[r][c]) return;
    const newGrid = userGrid.map(row => [...row]);
    const current = newGrid[r][c];
    // Cycle: null → 0 → 1 → null
    newGrid[r][c] = current === null ? 0 : current === 0 ? 1 : null;
    setUserGrid(newGrid);

    // Check errors
    if (newGrid[r][c] !== null && newGrid[r][c] !== puzzle.solution[r][c]) {
      setErrors(prev => new Set(prev).add(`${r},${c}`));
    } else {
      setErrors(prev => { const n = new Set(prev); n.delete(`${r},${c}`); return n; });
    }

    // Check completion
    let complete = true;
    for (let i = 0; i < puzzle.size; i++) for (let j = 0; j < puzzle.size; j++) {
      if (newGrid[i][j] !== puzzle.solution[i][j]) complete = false;
    }
    if (complete) {
      const bonus = timeLeft * 2 + (errors.size === 0 ? 500 : 0);
      setScore(s => s + 400 * level + bonus);
      setCorrect(c => c + 1);
      setTotal(t => t + 1);
      setLevel(l => l + 1);
      audioManager.playLevelUp();
      setTimeout(() => initPuzzle(), 1500);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔲</div>
        <h2 style={{ color: '#76ff03', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Binary Matrix</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Fill the grid with 0s and 1s. Rules: Equal 0s and 1s in each row/column.
          No three consecutive same digits. No duplicate rows or columns.
        </p>
        <div style={{ background: 'rgba(118,255,3,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#76ff03', fontWeight: 600 }}>🧠 INTJ Skills: Constraint Logic • Binary Reasoning • Pattern Elimination</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #76ff03, #64dd17)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          Start Solving →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#76ff03' }}>Binary Complete</h2>
        <p>Grids solved: <strong>{correct}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  if (!puzzle) return null;
  const cellSize = Math.min(48, (window.innerWidth - 64) / puzzle.size);

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <span>🔲 Level {level} ({puzzle.size}×{puzzle.size})</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.size}, ${cellSize}px)`, gap: 3, justifyContent: 'center' }}>
          {userGrid.map((row, r) => row.map((cell, c) => {
            const isGiven = given[r][c];
            const isError = errors.has(`${r},${c}`);
            return (
              <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} style={{
                width: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, cursor: isGiven ? 'default' : 'pointer', fontSize: cellSize > 36 ? '1.2rem' : '1rem', fontWeight: 700,
                fontFamily: 'monospace', transition: 'all 0.15s',
                background: isError ? 'rgba(255,82,82,0.2)' : isGiven ? 'rgba(118,255,3,0.15)' : 'rgba(255,255,255,0.05)',
                color: isGiven ? '#76ff03' : cell === 0 ? '#42a5f5' : cell === 1 ? '#ef5350' : '#333',
                border: isError ? '1px solid #ff5252' : '1px solid rgba(255,255,255,0.08)',
              }}>
                {cell !== null ? cell : ''}
              </div>
            );
          }))}
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
        Tap to cycle: empty → 0 → 1 → empty
      </div>
    </div>
  );
});

export default BinaryMatrix;

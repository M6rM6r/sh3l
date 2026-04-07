import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface SudokuProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type Board = (number | null)[][];

function generateSolvedBoard(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(b: number[][], r: number, c: number, num: number): boolean {
    for (let x = 0; x < 9; x++) { if (b[r][x] === num || b[x][c] === num) return false; }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (b[br + i][bc + j] === num) return false; }
    return true;
  }

  function fill(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const n of nums) {
            if (isValid(b, r, c, n)) { b[r][c] = n; if (fill(b)) return true; b[r][c] = 0; }
          }
          return false;
        }
      }
    }
    return true;
  }

  fill(board);
  return board;
}

function createPuzzle(solved: number[][], difficulty: number): Board {
  const puzzle: Board = solved.map(row => [...row]);
  const removeCount = 30 + difficulty * 8; // 38-62 cells removed
  const positions = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
  positions.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(removeCount, 64); i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = null;
  }
  return puzzle;
}

const GAME_DURATION = 600;

const Sudoku: React.FC<SudokuProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [solved, setSolved] = useState<number[][]>([]);
  const [puzzle, setPuzzle] = useState<Board>([]);
  const [userBoard, setUserBoard] = useState<Board>([]);
  const [given, setGiven] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [notes, setNotes] = useState<Set<string>[][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
  const [noteMode, setNoteMode] = useState(false);

  const initPuzzle = useCallback(() => {
    const s = generateSolvedBoard();
    const p = createPuzzle(s, Math.min(level, 4));
    const g = p.map(row => row.map(c => c !== null));
    setSolved(s);
    setPuzzle(p);
    setUserBoard(p.map(row => [...row]));
    setGiven(g);
    setErrors(new Set());
    setSelectedCell(null);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
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

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameState !== 'playing') return;
    const [r, c] = selectedCell;
    if (given[r][c]) return;

    if (noteMode) {
      const newNotes = notes.map(row => row.map(s => new Set(s)));
      const key = String(num);
      if (newNotes[r][c].has(key)) newNotes[r][c].delete(key); else newNotes[r][c].add(key);
      setNotes(newNotes);
      return;
    }

    const newBoard = userBoard.map(row => [...row]);
    newBoard[r][c] = num;
    setUserBoard(newBoard);

    if (num !== solved[r][c]) {
      setErrors(prev => new Set(prev).add(`${r},${c}`));
      audioManager.playWrong();
    } else {
      setErrors(prev => { const n = new Set(prev); n.delete(`${r},${c}`); return n; });
      audioManager.playCorrect();
    }

    // Check completion
    let complete = true;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { if (newBoard[i][j] !== solved[i][j]) complete = false; }
    if (complete) {
      const bonus = timeLeft * 3 + (errors.size === 0 ? 1000 : 0);
      setScore(s => s + 1000 * level + bonus);
      setPuzzlesSolved(p => p + 1);
      setLevel(l => l + 1);
      audioManager.playLevelUp();
      setTimeout(() => initPuzzle(), 2000);
    }
  };

  const clearCell = () => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    if (given[r][c]) return;
    const newBoard = userBoard.map(row => [...row]);
    newBoard[r][c] = null;
    setUserBoard(newBoard);
    setErrors(prev => { const n = new Set(prev); n.delete(`${r},${c}`); return n; });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔢</div>
        <h2 style={{ color: '#7c4dff', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Sudoku</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Fill every row, column, and 3×3 box with digits 1–9. No repeats allowed.
          Use notes mode to track candidates.
        </p>
        <div style={{ background: 'rgba(124,77,255,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#7c4dff', fontWeight: 600 }}>🧠 INTJ Skills: Logical Elimination • Constraint Satisfaction • Systematic Analysis</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #7c4dff, #536dfe)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Start Puzzle →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = puzzlesSolved > 0 ? Math.min(100, Math.round(100 - errors.size * 5)) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#7c4dff' }}>Sudoku Complete</h2>
        <p>Puzzles solved: <strong>{puzzlesSolved}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  const boxSize = Math.min(38, (window.innerWidth - 32) / 9);

  return (
    <div style={{ padding: '0.5rem', color: '#e0e0e0', maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
        <span>📊 Lvl {level}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      {/* Board */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(9, ${boxSize}px)`, gap: 1, background: '#444', padding: 2, borderRadius: 8, margin: '0 auto', width: 'fit-content' }}>
        {userBoard.map((row, r) => row.map((cell, c) => {
          const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
          const isHighlight = selectedCell && (selectedCell[0] === r || selectedCell[1] === c || (Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) && Math.floor(selectedCell[1] / 3) === Math.floor(c / 3)));
          const isError = errors.has(`${r},${c}`);
          const borderRight = c % 3 === 2 && c < 8 ? '2px solid #666' : 'none';
          const borderBottom = r % 3 === 2 && r < 8 ? '2px solid #666' : 'none';
          return (
            <div key={`${r}-${c}`} onClick={() => setSelectedCell([r, c])} style={{
              width: boxSize, height: boxSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isSelected ? 'rgba(124,77,255,0.4)' : isError ? 'rgba(255,82,82,0.2)' : isHighlight ? 'rgba(124,77,255,0.1)' : '#1a1a2e',
              cursor: 'pointer', fontSize: given[r]?.[c] ? '1rem' : '0.95rem', fontWeight: given[r]?.[c] ? 700 : 400,
              color: given[r]?.[c] ? '#fff' : isError ? '#ff5252' : '#7c4dff', borderRight, borderBottom, position: 'relative',
            }}>
              {cell || ''}
              {!cell && notes[r]?.[c]?.size > 0 && (
                <span style={{ fontSize: '0.45rem', position: 'absolute', color: '#888', lineHeight: 1 }}>
                  {Array.from(notes[r][c]).sort().join('')}
                </span>
              )}
            </div>
          );
        }))}
      </div>
      {/* Number pad */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => handleNumberInput(n)} style={{
            width: 38, height: 38, border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            background: 'rgba(124,77,255,0.2)', color: '#7c4dff',
          }}>{n}</button>
        ))}
        <button onClick={clearCell} style={{ width: 38, height: 38, border: 'none', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', background: 'rgba(255,82,82,0.2)', color: '#ff5252' }}>✕</button>
        <button onClick={() => setNoteMode(!noteMode)} style={{ width: 50, height: 38, border: noteMode ? '2px solid #7c4dff' : 'none', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', background: noteMode ? 'rgba(124,77,255,0.3)' : 'rgba(255,255,255,0.05)', color: '#aaa' }}>
          ✏️ {noteMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
});

export default Sudoku;

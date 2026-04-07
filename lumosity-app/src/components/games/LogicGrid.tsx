import { useState, useEffect, useRef, useCallback } from 'react';
import './LogicGrid.css';

const font = "'Courier New', Courier, monospace";

// ── Audio ─────────────────────────────────────────────────────────────────────
function beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const o = ctx.createOscillator(); o.frequency.value = freq; o.type = type;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch {}
}
function playCheck() { beep(660, 0.08); }
function playX()     { beep(220, 0.1, 'sawtooth'); }
function playSolve() { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.15, 'sine', 0.2), i*80)); }
function playWrong() { beep(180, 0.25, 'square', 0.15); }

// ── Puzzle data ───────────────────────────────────────────────────────────────
const THEMES = [
  { name: 'Explorers', rows: ['Amelia','Bruno','Clara','Dana','Evan','Faye'],
    cols: ['🚀 Space','🌊 Ocean','🏔 Mountain','🌴 Jungle','🏜 Desert','🌋 Volcano'] },
  { name: 'Pets & Colors', rows: ['Dog','Cat','Rabbit','Parrot','Hamster','Fish'],
    cols: ['Red','Blue','Green','Yellow','Purple','Orange'] },
  { name: 'Scientists', rows: ['Newton','Darwin','Curie','Tesla','Einstein','Hawking'],
    cols: ['Physics','Biology','Chemistry','Engineering','Maths','Astro'] },
];

type Cell = 'empty' | 'check' | 'x';
type Diff = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'game';

const DIFF_SIZE: Record<Diff, number> = { easy: 3, medium: 4, hard: 5 };
const DIFF_CLUE_RATIO: Record<Diff, number> = { easy: 1.0, medium: 0.75, hard: 0.5 };
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };
const DIFF_SCORE: Record<Diff, number> = { easy: 200, medium: 350, hard: 550 };

interface Clue { text: string; used: boolean }

interface Puzzle {
  size: number;
  rowLabels: string[];
  colLabels: string[];
  solution: number[];   // solution[row] = col index
  clues: Clue[];
}

function buildClues(rows: string[], cols: string[], sol: number[], ratio: number): Clue[] {
  const n = rows.length;
  const direct: Clue[] = [];
  const negative: Clue[] = [];
  for (let r = 0; r < n; r++) {
    direct.push({ text: `${rows[r]} → ${cols[sol[r]]}`, used: false });
    for (let c = 0; c < n; c++) {
      if (c !== sol[r]) negative.push({ text: `${rows[r]} ≠ ${cols[c]}`, used: false });
    }
  }
  // shuffle negatives, pick enough for solvability based on ratio
  negative.sort(() => Math.random() - 0.5);
  const want = Math.ceil(n * ratio);
  const dirCount = Math.max(1, Math.floor(want * 0.4));
  const negCount = want - dirCount;
  return [...direct.slice(0, dirCount), ...negative.slice(0, Math.max(n - dirCount, negCount))].sort(() => Math.random() - 0.5);
}

function makePuzzle(diff: Diff, level: number): Puzzle {
  const size = Math.min(DIFF_SIZE[diff] + Math.floor(level / 4), 6);
  const theme = THEMES[level % THEMES.length];
  const rowLabels = theme.rows.slice(0, size);
  const colLabels = theme.cols.slice(0, size);
  const sol: number[] = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sol[i], sol[j]] = [sol[j], sol[i]]; }
  const clues = buildClues(rowLabels, colLabels, sol, DIFF_CLUE_RATIO[diff]);
  return { size, rowLabels, colLabels, solution: sol, clues };
}

interface LogicGridProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function LogicGrid({ onComplete, onBack }: LogicGridProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [diff, setDiff]   = useState<Diff>('medium');
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [grid, setGrid]   = useState<Cell[][]>([]);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [solved, setSolved]   = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintMsg, setHintMsg] = useState('');
  const [popText, setPopText] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [clueUsed, setClueUsed] = useState<boolean[]>([]);

  const startGame = useCallback(() => {
    const p = makePuzzle(diff, level);
    setPuzzle(p);
    setGrid(Array.from({ length: p.size }, () => Array(p.size).fill('empty')));
    setSolved(false);
    setWrongFlash(false);
    setElapsed(0);
    setHintsLeft(3);
    setHintMsg('');
    setPopText('');
    setMistakes(0);
    setClueUsed(p.clues.map(() => false));
    startRef.current = Date.now();
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    setPhase('game');
  }, [diff, level]);

  useEffect(() => { return () => { timerRef.current && clearInterval(timerRef.current); }; }, []);

  const toggle = (r: number, c: number) => {
    if (!puzzle || solved) return;
    const ng = grid.map(row => [...row]);
    const cur = ng[r][c];
    ng[r][c] = cur === 'empty' ? 'check' : cur === 'check' ? 'x' : 'empty';
    if (ng[r][c] === 'check') playCheck();
    else if (ng[r][c] === 'x') playX();
    setGrid(ng);
    checkSol(ng);
  };

  const checkSol = (g: Cell[][]) => {
    if (!puzzle) return;
    const { size, solution } = puzzle;
    // Check if player's check marks exactly match solution
    let allCorrect = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const want = solution[r] === c;
        const has  = g[r][c] === 'check';
        if (want !== has) { allCorrect = false; break; }
      }
      if (!allCorrect) break;
    }
    if (!allCorrect) return;

    timerRef.current && clearInterval(timerRef.current);
    const timeBonus = Math.max(0, 120 - elapsed);
    const hintPenalty = (3 - hintsLeft) * 30;
    const mistakePenalty = mistakes * 20;
    const pts = Math.max(50, DIFF_SCORE[diff] + level * 50 + timeBonus - hintPenalty - mistakePenalty);
    const newScore = scoreRef.current + pts;
    scoreRef.current = newScore;
    setScore(newScore);
    setPopText(`+${pts}`);
    setTimeout(() => setPopText(''), 1200);
    playSolve();
    setSolved(true);
  };

  const handleSubmit = () => {
    if (!puzzle || solved) return;
    const { size, solution } = puzzle;
    let wrong = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 'check' && solution[r] !== c) { wrong = true; break; }
      }
    }
    if (wrong) {
      setMistakes(m => m + 1);
      setWrongFlash(true);
      playWrong();
      setTimeout(() => setWrongFlash(false), 500);
    }
  };

  const useHint = () => {
    if (!puzzle || hintsLeft <= 0 || solved) return;
    const { rowLabels, colLabels, solution, clues } = puzzle;
    const unusedIdx = clues.findIndex((_, i) => !clueUsed[i]);
    if (unusedIdx === -1) { setHintMsg('No more hints!'); return; }
    const nc = [...clueUsed]; nc[unusedIdx] = true; setClueUsed(nc);
    setHintsLeft(h => h - 1);
    // Reveal one cell: pick first unsolved row
    for (let r = 0; r < puzzle.size; r++) {
      if (grid[r][solution[r]] !== 'check') {
        const ng = grid.map(row => [...row]);
        ng[r][solution[r]] = 'check';
        setGrid(ng);
        setHintMsg(`Hint: ${rowLabels[r]} → ${colLabels[solution[r]]}`);
        playCheck();
        checkSol(ng);
        return;
      }
    }
    setHintMsg('All solved already!');
  };

  const nextLevel = () => {
    setLevel(l => l + 1);
    setTimeout(() => startGame(), 50);
  };

  const finish = () => {
    timerRef.current && clearInterval(timerRef.current);
    onComplete(scoreRef.current, level, elapsed);
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const dc = DIFF_COLOR[diff];

  // ── Select screen ──────────────────────────────────────────────────────────
  if (phase === 'select') return (
    <div className="lg-select-screen">
      <div className="lg-select-emoji">🔷</div>
      <h1 className="lg-select-title">LOGIC GRID</h1>
      <p className="lg-select-subtitle">DEDUCE · ELIMINATE · SOLVE</p>
      <p className="lg-difficulty-label">DIFFICULTY</p>
      <div className="lg-difficulty-container">
        {(['easy','medium','hard'] as Diff[]).map(d => (
          <button
            key={d}
            className={`lg-difficulty-btn ${diff === d ? 'lg-difficulty-btn-selected' : ''}`}
            onClick={() => setDiff(d)}
            style={{
              '--lg-diff-color': DIFF_COLOR[d],
              '--lg-diff-rgb': d === 'easy' ? '0,255,159' : d === 'medium' ? '255,204,0' : '255,68,100'
            } as React.CSSProperties}
          >
            <span className="lg-difficulty-name">{d.toUpperCase()}</span>
            <span className="lg-difficulty-size">{DIFF_SIZE[d]}×{DIFF_SIZE[d]} grid</span>
          </button>
        ))}
      </div>
      <button className="lg-start-btn" onClick={startGame}>START GAME</button>
      <button className="lg-back-btn" onClick={onBack}>← BACK</button>
    </div>
  );

  if (!puzzle) return null;

  const { size, rowLabels, colLabels, clues } = puzzle;
  const cellSize = Math.min(56, Math.floor((Math.min(window.innerWidth, 520) - 80) / size));

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div className="lg-game-container">
      <div className="lg-game-wrapper">
        {/* Header */}
        <div className="lg-header">
          <button className="lg-header-back-btn" onClick={onBack}>← BACK</button>
          <h1 className="lg-header-title">🔷 LOGIC GRID</h1>
          <div
            className="lg-header-difficulty"
            style={{
              '--lg-diff-color': dc,
              '--lg-diff-rgb': diff === 'easy' ? '0,255,159' : diff === 'medium' ? '255,204,0' : '255,68,100'
            } as React.CSSProperties}
          >
            {diff.toUpperCase()}
          </div>
        </div>
        {/* Stats */}
        <div className="lg-stats">
          {[['LVL',level],['SCORE',scoreRef.current],['TIME',fmtTime(elapsed)],['HINTS',`${hintsLeft}💡`],['MISTAKES',mistakes]].map(([l,v]) => (
            <div key={l as string} className="lg-stat-item">
              <div className="lg-stat-label">{l}</div>
              <div
                className={`lg-stat-value ${l === 'MISTAKES' && (v as number) > 0 ? 'lg-stat-value-error' : ''}`}
                style={l === 'MISTAKES' && (v as number) > 0 ? { '--lg-stat-color': '#ff4464' } as React.CSSProperties : {}}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        <div className="lg-game-layout">
          {/* Grid */}
          <div className="lg-grid-container">
            {popText && <div className="lg-pop-text">{popText}</div>}
            <div
              className={`lg-grid ${solved ? 'lg-grid-solved' : ''}`}
              style={{
                '--lg-grid-animation': wrongFlash ? 'lgWrong 0.5s' : 'none',
                '--lg-cell-size': `${cellSize}px`
              } as React.CSSProperties}
            >
              {/* Col headers */}
              <div className="lg-col-headers">
                {colLabels.map((c,i) => (
                  <div key={i} className="lg-col-header">{c}</div>
                ))}
              </div>
              {/* Rows */}
              {rowLabels.map((row, r) => (
                <div key={r} className="lg-row">
                  <div className="lg-row-label">{row}</div>
                  {colLabels.map((_, c) => {
                    const cell = grid[r]?.[c] ?? 'empty';
                    return (
                      <div
                        key={c}
                        className={`lg-cell lg-cell-${cell}`}
                        onClick={() => toggle(r, c)}
                      >
                        <span className="lg-cell-text">
                          {cell === 'check' ? '✓' : cell === 'x' ? '✕' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Clues panel */}
          <div className="lg-clues-panel">
            <div className="lg-clues-title">CLUES ({clues.length})</div>
            <div className="lg-clues-list">
              {clues.map((cl, i) => (
                <div key={i} className={`lg-clue-item ${clueUsed[i] ? 'lg-clue-used' : 'lg-clue-unused'}`}>
                  {cl.text}
                </div>
              ))}
            </div>
            {hintMsg && <div className="lg-hint-message">{hintMsg}</div>}
            <div className="lg-controls">
              <button className="lg-check-btn" onClick={handleSubmit} disabled={solved}>CHECK ✓</button>
              <button className="lg-hint-btn" onClick={useHint} disabled={hintsLeft <= 0 || solved}>💡{hintsLeft}</button>
            </div>
            <div className="lg-instructions">
              Click cell → ✓ → ✕ → empty<br/>✓ = correct pair &nbsp; ✕ = ruled out
            </div>
          </div>
        </div>
      </div>

      {/* Solved overlay */}
      {solved && (
        <div className="lg-overlay">
          <div className="lg-win-content">
            <div className="lg-win-emoji">🎉</div>
            <h2 className="lg-win-title">PUZZLE SOLVED!</h2>
            <div className="lg-win-stats">
              {[['SCORE',scoreRef.current],['TIME',fmtTime(elapsed)],['MISTAKES',mistakes],['HINTS USED',3-hintsLeft]].map(([l,v]) => (
                <span key={l as string} className="lg-win-stat">{l}: {v}</span>
              ))}
            </div>
            <div className="lg-win-buttons">
              <button className="lg-win-btn-primary" onClick={nextLevel}>NEXT LEVEL →</button>
              <button className="lg-win-btn-secondary" onClick={() => { setPhase('select'); setLevel(1); scoreRef.current=0; setScore(0); }}>MENU</button>
              <button className="lg-win-btn-tertiary" onClick={finish}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



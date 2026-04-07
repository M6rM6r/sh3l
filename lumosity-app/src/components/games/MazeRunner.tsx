import { useState, useEffect, useRef, useCallback } from 'react';
import './MazeRunner.css';

// ── Audio ─────────────────────────────────────────────────────────────────────
function beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const o = ctx.createOscillator(); o.frequency.value = freq; o.type = type;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch {}
}
function playStep()   { beep(440, 0.05, 'sine', 0.06); }
function playWall()   { beep(120, 0.08, 'square', 0.1); }
function playWin()    { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.14, 'sine', 0.18), i*90)); }
function playTimeout(){ beep(200, 0.4, 'sawtooth', 0.12); }

// ── Maze generation (recursive backtracker) ────────────────────────────────────
type Pos = { x: number; y: number };
type Maze = number[][];  // 1=wall, 0=path

function generateMaze(size: number): { maze: Maze; start: Pos; end: Pos } {
  const maze: Maze = Array.from({ length: size }, () => Array(size).fill(1));
  const carve = (x: number, y: number) => {
    maze[y][x] = 0;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && maze[ny][nx] === 1) {
        maze[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  };
  carve(1, 1);
  maze[1][1] = 0;
  maze[size - 2][size - 2] = 0;
  return { maze, start: { x: 1, y: 1 }, end: { x: size - 2, y: size - 2 } };
}

// ── Difficulty ────────────────────────────────────────────────────────────────
type Diff = 'easy' | 'medium' | 'hard';
const DIFF_SIZE: Record<Diff, number>  = { easy: 9, medium: 13, hard: 17 };
const DIFF_TIME: Record<Diff, number>  = { easy: 90, medium: 70, hard: 50 };
const DIFF_SCORE: Record<Diff, number> = { easy: 300, medium: 500, hard: 800 };
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };
type Phase = 'select' | 'game';

interface MazeRunnerProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function MazeRunner({ onComplete, onBack }: MazeRunnerProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [diff, setDiff]   = useState<Diff>('medium');
  const [level, setLevel] = useState(1);
  const [maze, setMaze]   = useState<Maze>([]);
  const [player, setPlayer] = useState<Pos>({ x: 1, y: 1 });
  const [exit, setExit]     = useState<Pos>({ x: 1, y: 1 });
  const [moves, setMoves]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [score, setScore]   = useState(0);
  const scoreRef = useRef(0);
  const [solved, setSolved] = useState(false);
  const [popText, setPopText] = useState('');
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const movesRef = useRef(0);

  const initLevel = useCallback((lv: number, d: Diff) => {
    const baseSize = DIFF_SIZE[d];
    const sz = Math.min(baseSize + Math.floor(lv / 3) * 2, 21);
    const odd = sz % 2 === 0 ? sz + 1 : sz;
    const { maze: m, start, end } = generateMaze(odd);
    setMaze(m);
    setPlayer(start);
    setExit(end);
    setMoves(0);
    movesRef.current = 0;
    setSolved(false);
    setPopText('');
    const t = DIFF_TIME[d] + Math.max(0, 30 - lv * 3);
    setTimeLeft(t);
    startRef.current = Date.now();
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Timer expiry
  useEffect(() => {
    if (timeLeft === 0 && phase === 'game' && !solved) {
      playTimeout();
      timerRef.current && clearInterval(timerRef.current);
      setTimeout(() => onComplete(scoreRef.current, level, Math.floor((Date.now() - startRef.current) / 1000)), 1500);
    }
  }, [timeLeft, phase, solved]);

  // Keyboard
  useEffect(() => {
    if (phase !== 'game' || solved) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number,number]> = {
        ArrowUp:[0,-1], w:[0,-1], W:[0,-1],
        ArrowDown:[0,1], s:[0,1], S:[0,1],
        ArrowLeft:[-1,0], a:[-1,0], A:[-1,0],
        ArrowRight:[1,0], d:[1,0], D:[1,0],
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir[0], dir[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, solved, player, maze, exit]);

  const move = useCallback((dx: number, dy: number) => {
    setPlayer(prev => {
      const nx = prev.x + dx, ny = prev.y + dy;
      if (!maze[ny] || maze[ny][nx] === undefined || maze[ny][nx] === 1) {
        playWall();
        return prev;
      }
      playStep();
      const nm = movesRef.current + 1;
      movesRef.current = nm;
      setMoves(nm);
      // Check exit
      if (nx === exit.x && ny === exit.y) {
        handleReach(nm);
      }
      return { x: nx, y: ny };
    });
  }, [maze, exit]);

  const handleReach = (currentMoves: number) => {
    timerRef.current && clearInterval(timerRef.current);
    setTimeLeft(t => {
      const tb = t * 8;
      const mb = Math.max(0, 200 - currentMoves * 2);
      const pts = DIFF_SCORE[diff] + level * 80 + tb + mb;
      const ns = scoreRef.current + pts;
      scoreRef.current = ns;
      setScore(ns);
      setPopText(`+${pts}`);
      setTimeout(() => setPopText(''), 1400);
      playWin();
      setSolved(true);
      return t;
    });
  };

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setLevel(1);
    initLevel(1, diff);
    setPhase('game');
  };

  const nextLevel = () => {
    const nl = level + 1;
    setLevel(nl);
    initLevel(nl, diff);
  };

  const finish = () => {
    timerRef.current && clearInterval(timerRef.current);
    onComplete(scoreRef.current, level, Math.floor((Date.now() - startRef.current) / 1000));
  };

  // Touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
    else move(0, dy > 0 ? 1 : -1);
  };

  const dc = DIFF_COLOR[diff];
  const timerPct = DIFF_TIME[diff] > 0 ? (timeLeft / (DIFF_TIME[diff] + Math.max(0, 30 - level * 3))) * 100 : 0;
  const timerColor = timerPct > 50 ? '#00ff9f' : timerPct > 25 ? '#ffcc00' : '#ff4464';

  // ── Select screen ──────────────────────────────────────────────────────────
  if (phase === 'select') return (
    <div className="mr-select-screen">
      <div className="mr-icon">🏃</div>
      <h1 className="mr-title">MAZE RUNNER</h1>
      <p className="mr-subtitle">NAVIGATE · ESCAPE · SCORE</p>
      <p className="mr-difficulty-label">DIFFICULTY</p>
      <div className="mr-difficulty-buttons">
        {(['easy','medium','hard'] as Diff[]).map(d => (
          <button
            key={d}
            className={`mr-difficulty-btn ${diff === d ? 'mr-difficulty-btn-selected' : ''}`}
            onClick={() => setDiff(d)}
            style={{
              '--diff-color': DIFF_COLOR[d],
              '--diff-rgb': d === 'easy' ? '0,255,159' : d === 'medium' ? '255,204,0' : '255,68,100'
            } as React.CSSProperties}
          >
            <span className="mr-difficulty-name">{d.toUpperCase()}</span>
            <span className="mr-difficulty-info">{DIFF_SIZE[d]}×{DIFF_SIZE[d]} · {DIFF_TIME[d]}s</span>
          </button>
        ))}
      </div>
      <button className="mr-start-btn" onClick={startGame}>START GAME</button>
      <button className="mr-back-btn" onClick={onBack}>← BACK</button>
    </div>
  );

  const sz = maze.length || 9;
  const cellPx = Math.min(36, Math.floor((Math.min(window.innerWidth, 520) - 32) / sz));

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div className="mr-game-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mr-game-content">
        {/* Header */}
        <div className="mr-game-header">
          <button className="mr-back-btn" onClick={onBack}>← BACK</button>
          <h1 className="mr-game-title">🏃 MAZE RUNNER</h1>
          <div
            className="mr-difficulty-badge"
            style={{
              '--diff-color': dc,
              '--diff-rgb': diff === 'easy' ? '0,255,159' : diff === 'medium' ? '255,204,0' : '255,68,100'
            } as React.CSSProperties}
          >
            {diff.toUpperCase()}
          </div>
        </div>
        {/* Stats */}
        <div className="mr-stats">
          {[['LVL', level], ['SCORE', scoreRef.current], ['MOVES', moves]].map(([l, v]) => (
            <div key={l as string} className="mr-stat-card">
              <div className="mr-stat-label">{l}</div>
              <div className="mr-stat-value">{v}</div>
            </div>
          ))}
        </div>
        {/* Timer bar */}
        <div className="mr-timer-bar">
          <div
            className={`mr-timer-fill ${timerPct <= 25 ? 'mr-timer-fill-danger' : timerPct <= 50 ? 'mr-timer-fill-warning' : ''}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="mr-timer-display" style={{ '--timer-color': timerColor } as React.CSSProperties}>{timeLeft}s</div>

        {/* Maze */}
        <div className="mr-maze-container">
          {popText && <div className="mr-pop-text">{popText}</div>}
          <div className="mr-maze-grid" style={{ gridTemplateColumns: `repeat(${sz}, ${cellPx}px)`, gridTemplateRows: `repeat(${sz}, ${cellPx}px)` }}>
            {maze.map((row, y) => row.map((cell, x) => {
              const isPlayer = x === player.x && y === player.y;
              const isExit = x === exit.x && y === exit.y;
              return (
                <div
                  key={`${x}-${y}`}
                  className={`mr-cell ${cell === 1 ? 'mr-wall' : 'mr-path'} ${isPlayer ? 'mr-player' : ''} ${isExit ? 'mr-exit' : ''}`}
                  style={{ width: `${cellPx}px`, height: `${cellPx}px` }}
                >
                  {isPlayer && '🟢'}
                  {isExit && '🏁'}
                </div>
              );
            }))}
          </div>
        </div>

        {/* D-pad (mobile) */}
        <div className="mr-dpad-container">
          <button className="mr-dpad-btn" onPointerDown={() => move(0,-1)}>▲</button>
          <div className="mr-dpad-row">
            <button className="mr-dpad-btn" onPointerDown={() => move(-1,0)}>◄</button>
            <button className="mr-dpad-btn" onPointerDown={() => move(0,1)}>▼</button>
            <button className="mr-dpad-btn" onPointerDown={() => move(1,0)}>►</button>
          </div>
        </div>
        <div className="mr-control-hint">ARROWS / WASD / SWIPE</div>
      </div>

      {/* Solved overlay */}
      {solved && (
        <div className="mr-overlay mr-win-overlay">
          <div className="mr-overlay-content">
            <div className="mr-win-emoji">🏁</div>
            <h2 className="mr-win-title">ESCAPED!</h2>
            <div className="mr-stats-container">
              {[['SCORE',scoreRef.current],['MOVES',moves],['TIME',`${timeLeft}s`],['LEVEL',level]].map(([l,v]) => (
                <span key={l as string} className="mr-stat-item">{l}: {v}</span>
              ))}
            </div>
            <div className="mr-overlay-buttons">
              <button className="mr-overlay-btn-primary" onClick={nextLevel}>NEXT LEVEL →</button>
              <button className="mr-overlay-btn-secondary" onClick={() => { setPhase('select'); }}>MENU</button>
              <button className="mr-overlay-btn-tertiary" onClick={finish}>EXIT</button>
            </div>
          </div>
        </div>
      )}

      {/* Time up overlay */}
      {timeLeft === 0 && !solved && (
        <div className="mr-overlay mr-timeup-overlay">
          <div className="mr-overlay-content">
            <div className="mr-timeup-emoji">⏱</div>
            <h2 className="mr-timeup-title">TIME UP!</h2>
            <p className="mr-timeup-score">Score: {scoreRef.current}</p>
            <div className="mr-overlay-buttons">
              <button className="mr-overlay-btn-primary" onClick={startGame}>PLAY AGAIN</button>
              <button className="mr-overlay-btn-secondary" onClick={() => setPhase('select')}>MENU</button>
              <button className="mr-overlay-btn-tertiary" onClick={finish}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







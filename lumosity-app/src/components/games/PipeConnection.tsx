import { useState, useEffect, useRef, useCallback } from 'react';
import './PipeConnection.css';

interface PipeConnectionProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

type Diff = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'game' | 'done';
type PipeT = 'empty' | 'straight' | 'corner' | 'tee' | 'cross' | 'cap';
type Rot = 0 | 90 | 180 | 270;

interface Cell {
  pipe: PipeT;
  rot: Rot;
  connected: boolean;
}

// openings per pipe type at rot=0: top=t,right=r,bottom=b,left=l
const BASE_OPENINGS: Record<PipeT, boolean[]> = {
  // [top, right, bottom, left]
  empty:    [false, false, false, false],
  cap:      [false, false, true,  false],
  straight: [true,  false, true,  false],
  corner:   [false, true,  true,  false],
  tee:      [false, true,  true,  true ],
  cross:    [true,  true,  true,  true ],
};

function getOpenings(pipe: PipeT, rot: Rot): boolean[] {
  const base = BASE_OPENINGS[pipe];
  const times = rot / 90;
  let arr = [...base];
  for (let i = 0; i < times; i++) {
    arr = [arr[3], arr[0], arr[1], arr[2]]; // rotate CCW => shift left (visual CW rotation)
  }
  return arr;
}

const DIFF_N: Record<Diff, number> = { easy: 5, medium: 6, hard: 8 };
const DIFF_TIME: Record<Diff, number> = { easy: 120, medium: 90, hard: 60 };
const DIFF_BASE: Record<Diff, number> = { easy: 300, medium: 600, hard: 1000 };
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };
const EMPTY_PROB: Record<Diff, number> = { easy: 0.05, medium: 0.1, hard: 0.0 };
const PIPE_POOL: Record<Diff, PipeT[]> = {
  easy:   ['straight', 'straight', 'corner', 'corner', 'corner'],
  medium: ['straight', 'corner', 'corner', 'tee', 'tee'],
  hard:   ['straight', 'corner', 'tee', 'tee', 'cross'],
};

function generateGrid(n: number, diff: Diff): Cell[][] {
  // BFS from [0,0] to [n-1][n-1], place pipes on path, fill rest randomly
  const DIRS = [[-1,0],[0,1],[1,0],[0,-1]]; // top right bottom left
  // create random path via BFS
  type Pos = [number,number];
  const visited: boolean[][] = Array.from({length:n},()=>Array(n).fill(false));
  const parent: Map<string,string|null> = new Map();
  const queue: Pos[] = [[0,0]];
  visited[0][0] = true;
  parent.set('0,0', null);
  // shuffle directions per step
  function shuffle<T>(a: T[]): T[] {
    const b = [...a];
    for (let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
    return b;
  }
  let found = false;
  while (queue.length && !found) {
    const [r,c] = queue.shift()!;
    for (const [dr,dc] of shuffle(DIRS)) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<n&&nc>=0&&nc<n&&!visited[nr][nc]) {
        visited[nr][nc]=true;
        parent.set(`${nr},${nc}`,`${r},${c}`);
        if (nr===n-1&&nc===n-1) { found=true; break; }
        queue.push([nr,nc]);
      }
    }
  }
  // trace path
  const pathSet = new Set<string>();
  let cur: string|null|undefined = `${n-1},${n-1}`;
  while (cur) { pathSet.add(cur); cur = parent.get(cur); }

  // build connection map for path cells
  const pathConn: Map<string, boolean[]> = new Map();
  for (const key of pathSet) {
    const [r,c] = key.split(',').map(Number);
    // find connected path neighbors
    const openings = [false,false,false,false];
    for (let d=0;d<4;d++) {
      const nr=r+DIRS[d][0], nc=c+DIRS[d][1];
      if (nr>=0&&nr<n&&nc>=0&&nc<n&&pathSet.has(`${nr},${nc}`)) openings[d]=true;
    }
    pathConn.set(key, openings);
  }

  // pick pipe type matching openings for path cells
  function pickPipe(openings: boolean[]): {pipe:PipeT, rot:Rot} {
    const count = openings.filter(Boolean).length;
    const types: PipeT[] = count===1?['cap']:count===2?['straight','corner']:count===3?['tee']:['cross'];
    for (let attempt=0;attempt<200;attempt++) {
      const pipe = types[Math.floor(Math.random()*types.length)];
      for (const r of [0,90,180,270] as Rot[]) {
        const got = getOpenings(pipe,r);
        if (got.every((v,i)=>v===openings[i])) return {pipe, rot:r};
      }
    }
    return {pipe:'cross', rot:0};
  }

  const grid: Cell[][] = Array.from({length:n},(_,r)=>
    Array.from({length:n},(_,c)=>{
      const key=`${r},${c}`;
      if (pathSet.has(key)) {
        const op = pathConn.get(key)!;
        const {pipe,rot} = pickPipe(op);
        return {pipe, rot, connected:false};
      }
      // filler cell
      if (Math.random()<EMPTY_PROB[diff]) return {pipe:'empty',rot:0,connected:false};
      const pool = PIPE_POOL[diff];
      const pipe = pool[Math.floor(Math.random()*pool.length)];
      const rot = ([0,90,180,270] as Rot[])[Math.floor(Math.random()*4)];
      return {pipe, rot, connected:false};
    })
  );
  return grid;
}

function floodFill(grid: Cell[][], n: number): Set<string> {
  const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];
  const connected = new Set<string>();
  const queue: [number,number][] = [[0,0]];
  connected.add('0,0');
  while (queue.length) {
    const [r,c] = queue.shift()!;
    const op = getOpenings(grid[r][c].pipe, grid[r][c].rot);
    for (let d=0;d<4;d++) {
      if (!op[d]) continue;
      const nr=r+DIRS[d][0], nc=c+DIRS[d][1];
      if (nr<0||nr>=n||nc<0||nc>=n) continue;
      const key=`${nr},${nc}`;
      if (connected.has(key)) continue;
      const nop = getOpenings(grid[nr][nc].pipe, grid[nr][nc].rot);
      const opp = (d+2)%4;
      if (nop[opp]) { connected.add(key); queue.push([nr,nc]); }
    }
  }
  return connected;
}

let pcAudioCtx: AudioContext | null = null;
function pcBeep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  try {
    if (!pcAudioCtx) pcAudioCtx = new AudioContext();
    const o = pcAudioCtx.createOscillator();
    const g = pcAudioCtx.createGain();
    o.connect(g); g.connect(pcAudioCtx.destination);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, pcAudioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, pcAudioCtx.currentTime + dur);
    o.start(); o.stop(pcAudioCtx.currentTime + dur);
  } catch {}
}
function playRotate() { pcBeep(400, 0.07, 'square', 0.12); }
function playConnect() { pcBeep(660, 0.15, 'sine', 0.18); setTimeout(()=>pcBeep(880,0.1,'sine',0.15),80); }
function playWin() {
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>pcBeep(f,0.22,'sine',0.2),i*90));
}
function playTimeout() { pcBeep(220,0.4,'sawtooth',0.15); setTimeout(()=>pcBeep(180,0.5,'sawtooth',0.12),200); }

export function PipeConnection({ onComplete, onBack }: PipeConnectionProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [diff, setDiff] = useState<Diff>('medium');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [n, setN] = useState(6);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [rotations, setRotations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [won, setWon] = useState(false);

  const scoreRef = useRef(0);
  const rotRef = useRef(0);
  const levelRef = useRef(1);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const wonRef = useRef(false);

  useEffect(() => {
    if (!document.querySelector('style[data-pc]')) {
      const s = document.createElement('style');
      s.setAttribute('data-pc','1');
      s.textContent = `
        @keyframes pcFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pcFlow { 0%{box-shadow:0 0 4px #00ff9f} 50%{box-shadow:0 0 18px #00ff9f,0 0 35px rgba(0,255,159,0.5)} 100%{box-shadow:0 0 4px #00ff9f} }
        @keyframes pcWinPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes pcPulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes pcCellSpin { from{transform:rotate(0deg)} to{transform:rotate(90deg)} }
        @keyframes pcTimerWarn { 0%,100%{background:#ff4464} 50%{background:#ff8888} }
        @keyframes pcSlideIn { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const startGame = useCallback((d: Diff) => {
    const sz = DIFF_N[d];
    const g = generateGrid(sz, d);
    const filled = floodFill(g, sz);
    const newGrid = g.map((row,ri)=>row.map((cell,ci)=>({...cell, connected: filled.has(`${ri},${ci}`)})));
    setDiff(d); setN(sz); setGrid(newGrid);
    setLevel(1); setScore(0); setRotations(0);
    setTimeLeft(DIFF_TIME[d]); setWon(false);
    scoreRef.current=0; rotRef.current=0; levelRef.current=1; wonRef.current=false;
    startTimeRef.current = Date.now();
    setPhase('game');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if (t<=1) {
          clearInterval(timerRef.current!);
          if (!wonRef.current) { playTimeout(); setPhase('done'); }
          return 0;
        }
        return t-1;
      });
    }, 1000);
  }, []);

  useEffect(()=>()=>{ if(timerRef.current) clearInterval(timerRef.current); },[]);

  const handleRotate = useCallback((r: number, c: number) => {
    if (wonRef.current) return;
    playRotate();
    setGrid(prev => {
      const ng = prev.map(row=>row.map(cell=>({...cell})));
      const cell = ng[r][c];
      cell.rot = ((cell.rot + 90) % 360) as Rot;
      const sz = ng.length;
      const filled = floodFill(ng, sz);
      ng.forEach((row,ri)=>row.forEach((cl,ci)=>{cl.connected=filled.has(`${ri},${ci}`);}));

      const newRot = rotRef.current + 1;
      rotRef.current = newRot;
      setRotations(newRot);

      if (filled.has(`${sz-1},${sz-1}`)) {
        // win
        wonRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        const tLeft = DIFF_TIME[diff] - Math.floor((Date.now()-startTimeRef.current)/1000);
        const bonus = Math.max(0, tLeft * 6);
        const lvlScore = DIFF_BASE[diff] + bonus + levelRef.current * 100;
        const ns = scoreRef.current + lvlScore;
        scoreRef.current = ns;
        setScore(ns);
        setWon(true);
        playConnect();
        setTimeout(()=>playWin(), 300);
      }
      return ng;
    });
  }, [diff]);

  const handleNextLevel = useCallback(() => {
    const nextLv = levelRef.current + 1;
    levelRef.current = nextLv;
    setLevel(nextLv);
    const sz = DIFF_N[diff];
    const g = generateGrid(sz, diff);
    const filled = floodFill(g, sz);
    const newGrid = g.map((row,ri)=>row.map((cell,ci)=>({...cell, connected: filled.has(`${ri},${ci}`)})));
    setGrid(newGrid);
    setRotations(0); rotRef.current=0;
    const tl = DIFF_TIME[diff];
    setTimeLeft(tl); setWon(false); wonRef.current=false;
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if (t<=1) {
          clearInterval(timerRef.current!);
          if (!wonRef.current) { playTimeout(); setPhase('done'); }
          return 0;
        }
        return t-1;
      });
    }, 1000);
  }, [diff]);

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const dur = Math.floor((Date.now()-startTimeRef.current)/1000);
    onComplete(scoreRef.current, levelRef.current, dur);
  }, [onComplete]);

  const CELL_PX = Math.max(44, Math.min(68, Math.floor(340 / n)));
  const dc = DIFF_COLOR[diff] ?? '#00ff9f';
  const timerPct = timeLeft / DIFF_TIME[diff];
  const timerColor = timerPct > 0.5 ? '#00ff9f' : timerPct > 0.25 ? '#ffcc00' : '#ff4464';

  // --- SELECT SCREEN ---
  if (phase === 'select') {
    return (
      <div className="pc-container" style={{ '--diff-color': '#00ff9f' } as React.CSSProperties}>
        <button className="pc-back-btn" onClick={onBack}>{'<'} BACK</button>
        <div className="pc-title">{'>'} PIPE_CONNECTION</div>
        <div className="pc-subtitle">Rotate pipes to connect source to drain</div>
        <div className="pc-difficulty-grid">
          {(['easy','medium','hard'] as Diff[]).map(d => (
            <button
              key={d}
              className="pc-difficulty-btn"
              onClick={() => startGame(d)}
              style={{
                '--diff-color': DIFF_COLOR[d]
              } as React.CSSProperties}
            >
              <span>[ {d.toUpperCase()} ]</span>
              <span className="pc-difficulty-info">{DIFF_N[d]}×{DIFF_N[d]} grid · {DIFF_TIME[d]}s</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- DONE SCREEN ---
  if (phase === 'done') {
    const dur = Math.floor((Date.now()-startTimeRef.current)/1000);
    return (
      <div className="pc-container" style={{ '--diff-color': dc } as React.CSSProperties}>
        <div className="pc-win-modal">
          <div className="pc-win-content">
            <div className="pc-win-title">
              {won ? '[ LEVEL COMPLETE ]' : '[ TIME UP ]'}
            </div>
            <div className="pc-stats-grid">
              {([['LEVEL',levelRef.current],['SCORE',scoreRef.current],['ROTATIONS',rotRef.current],['TIME',`${dur}s`]] as [string,string|number][]).map(([k,v]) => (
                <div key={k} className="pc-stat-card">
                  <div className="pc-stat-label">{k}</div>
                  <div className="pc-stat-value">{v}</div>
                </div>
              ))}
            </div>
            <div className="pc-win-buttons">
              <button className="pc-win-btn-primary" onClick={() => startGame(diff)}>PLAY AGAIN</button>
              <button className="pc-win-btn-secondary" onClick={() => setPhase('select')}>MENU</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN ---
  return (
    <div className="pc-game-container" style={{
      '--diff-color': dc,
      '--timer-color': timerColor,
      '--seg-w': `${CELL_PX * 0.4}px`
    } as React.CSSProperties}>
      {/* Header */}
      <div className="pc-game-header">
        <button className="pc-game-back-btn" onClick={onBack}>{'<'} BACK</button>
        <div className="pc-game-title">{'>'} PIPE_CONNECTION</div>
        <div className="pc-game-difficulty">{diff.toUpperCase()}</div>
      </div>

      {/* Stats bar */}
      <div className="pc-game-stats">
        {([['LVL',level],['SCORE',score],['ROTS',rotations]] as [string,number][]).map(([k,v]) => (
          <div key={k} className="pc-stat-item">
            {k}: <span className="pc-stat-value">{v}</span>
          </div>
        ))}
        <div className={`pc-stat-item ${timerPct < 0.25 ? 'pc-timer-warn' : ''}`}>
          TIME: <span className="pc-stat-value">{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="pc-timer-bar">
        <div className="pc-timer-fill" style={{ width: `${timerPct * 100}%` }} />
      </div>

      {/* Grid */}
      <div className="pc-game-board">
        <div className="pc-grid" style={{
          gridTemplateColumns: `repeat(${n}, ${CELL_PX}px)`,
          gridTemplateRows: `repeat(${n}, ${CELL_PX}px)`
        }}>
          {grid.map((row,ri)=>row.map((cell,ci)=>{
            const isSource = ri===0&&ci===0;
            const isSink = ri===n-1&&ci===n-1;
            const cellColor = cell.connected ? '#00ff9f' : '#2a3a4a';
            const op = getOpenings(cell.pipe, cell.rot);
            return (
              <div
                key={`${ri}-${ci}`}
                className={`pc-cell ${cell.connected && !isSource && !isSink ? 'pc-cell-flow' : ''} ${isSource ? 'pc-cell-source' : ''} ${isSink ? 'pc-cell-sink' : ''} ${!isSource && !isSink && cell.pipe !== 'empty' ? 'pc-cell-clickable' : ''}`}
                onClick={() => { if(!isSource&&!isSink&&cell.pipe!=='empty') handleRotate(ri,ci); }}
                style={{
                  '--cell-color': cellColor,
                  width: `${CELL_PX}px`,
                  height: `${CELL_PX}px`,
                  borderColor: cell.connected ? '#00ff9f33' : '#1e2a38'
                } as React.CSSProperties}
              >
                {/* Pipe segments via absolute divs */}
                {cell.pipe !== 'empty' && (
                  <>
                    <div className="pc-segment pc-center" />
                    {op[0] && <div className="pc-segment pc-arm-top" />}
                    {op[1] && <div className="pc-segment pc-arm-right" />}
                    {op[2] && <div className="pc-segment pc-arm-bottom" />}
                    {op[3] && <div className="pc-segment pc-arm-left" />}
                  </>
                )}
                {isSource && (
                  <div className="pc-source">
                    <div className="pc-source-dot" />
                  </div>
                )}
                {isSink && (
                  <div className="pc-sink">
                    <div
                      className="pc-sink-dot"
                      style={{
                        '--sink-bg': cell.connected ? '#ff4464' : '#1a1a2e',
                        '--sink-shadow': cell.connected ? '0 0 16px rgba(255,68,100,0.9)' : 'none'
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      <div className="pc-instruction">
        [click pipes to rotate · connect ● to ●]
      </div>

      {/* Win overlay */}
      {won && (
        <div className="pc-win-overlay">
          <div className="pc-win-modal">
            <div className="pc-win-title">[ CONNECTED! ]</div>
            <div className="pc-win-subtitle">Level {level} complete · {rotations} rotations</div>
            <div className="pc-win-buttons">
              <button className="pc-win-btn-primary" onClick={handleNextLevel}>[NEXT LEVEL]</button>
              <button className="pc-win-btn-secondary" onClick={handleFinish}>[FINISH]</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













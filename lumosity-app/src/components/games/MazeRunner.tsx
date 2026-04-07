import { useState, useEffect, useRef, useCallback } from 'react';

const font = "'Courier New', Courier, monospace";

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS_KEY = 'data-mr-styles';
const STYLES = `
@keyframes mrPlayer{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
@keyframes mrExit{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.12)}}
@keyframes mrWin{0%{transform:scale(1)}30%{transform:scale(1.3) rotate(-5deg)}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1)}}
@keyframes mrPop{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-36px) scale(0.7)}}
@keyframes mrFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes mrPulse{0%,100%{box-shadow:0 0 8px rgba(0,255,159,0.3)}50%{box-shadow:0 0 22px rgba(0,255,159,0.8)}}
`;
if (!document.querySelector(`[${CSS_KEY}]`)) {
  const s = document.createElement('style');
  s.setAttribute(CSS_KEY, '1');
  s.textContent = STYLES;
  document.head.appendChild(s);
}

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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'20px'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>🏃</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(20px,5vw,34px)',letterSpacing:'4px',margin:'0 0 4px'}}>MAZE RUNNER</h1>
      <p style={{color:'rgba(0,255,159,0.4)',fontSize:'11px',letterSpacing:'3px',margin:'0 0 36px'}}>NAVIGATE · ESCAPE · SCORE</p>
      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>DIFFICULTY</p>
      <div style={{display:'flex',flexDirection:'column',gap:'9px',width:'min(280px,90vw)',marginBottom:'24px'}}>
        {(['easy','medium','hard'] as Diff[]).map(d => (
          <button key={d} onClick={() => setDiff(d)} style={{padding:'12px 16px',background:diff===d?`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.14)`:'rgba(255,255,255,0.04)',border:`1px solid ${diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.1)'}`,borderRadius:'9px',color:diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:font,fontSize:'13px',textAlign:'left',transition:'all .2s'}}>
            <span style={{fontWeight:'bold',letterSpacing:'1px'}}>{d.toUpperCase()}</span>
            <span style={{fontSize:'10px',opacity:0.65,float:'right'}}>{DIFF_SIZE[d]}×{DIFF_SIZE[d]} · {DIFF_TIME[d]}s</span>
          </button>
        ))}
      </div>
      <button onClick={startGame} style={{padding:'14px 48px',background:'rgba(0,255,159,0.15)',border:'1px solid rgba(0,255,159,0.65)',borderRadius:'10px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'15px',letterSpacing:'2px',boxShadow:'0 0 24px rgba(0,255,159,0.2)'}}>START GAME</button>
      <button onClick={onBack} style={{marginTop:'16px',padding:'8px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontFamily:font,fontSize:'12px'}}>← BACK</button>
    </div>
  );

  const sz = maze.length || 9;
  const cellPx = Math.min(36, Math.floor((Math.min(window.innerWidth, 520) - 32) / sz));

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'10px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{maxWidth:'600px',margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <button onClick={onBack} style={{padding:'6px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'6px',color:'#00ff9f',cursor:'pointer',fontSize:'12px',fontFamily:font}}>← BACK</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(12px,3.5vw,18px)',letterSpacing:'2px'}}>🏃 MAZE RUNNER</h1>
          <div style={{padding:'4px 9px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',fontFamily:font}}>{diff.toUpperCase()}</div>
        </div>
        {/* Stats */}
        <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
          {[['LVL',level],['SCORE',scoreRef.current],['MOVES',moves]].map(([l,v]) => (
            <div key={l as string} style={{flex:1,padding:'6px 4px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.17)',borderRadius:'7px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.38)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'13px',fontWeight:'bold',color:'#00ff9f'}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Timer bar */}
        <div style={{width:'100%',height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'3px',marginBottom:'4px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${timerPct}%`,background:`linear-gradient(90deg,${timerColor},${timerColor}aa)`,borderRadius:'3px',transition:'width 1s linear,background .5s'}} />
        </div>
        <div style={{textAlign:'right',fontSize:'10px',color:timerColor,letterSpacing:'1px',marginBottom:'10px'}}>{timeLeft}s</div>

        {/* Maze */}
        <div style={{position:'relative',display:'flex',justifyContent:'center'}}>
          {popText && <div style={{position:'absolute',top:'-20px',left:'50%',transform:'translateX(-50%)',color:'#00ff9f',fontSize:'18px',fontWeight:'bold',animation:'mrPop 1.4s forwards',zIndex:10,pointerEvents:'none'}}>{popText}</div>}
          <div style={{background:'rgba(0,0,0,0.5)',padding:'4px',borderRadius:'8px',border:`1px solid rgba(0,255,159,0.2)`,animation:'mrPulse 2s infinite'}}>
            {maze.map((row, y) => (
              <div key={y} style={{display:'flex'}}>
                {row.map((cell, x) => {
                  const isPlayer = x === player.x && y === player.y;
                  const isExit   = x === exit.x   && y === exit.y;
                  const bg = isPlayer ? 'rgba(0,255,159,0.9)' : isExit ? 'rgba(255,204,0,0.9)' : cell===1 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.7)';
                  return (
                    <div key={x} style={{width:cellPx,height:cellPx,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.max(8, cellPx*0.55),animation:isPlayer?'mrPlayer 0.6s infinite':isExit?'mrExit 1.2s infinite':'none',flexShrink:0}}>
                      {isPlayer ? '🟢' : isExit ? '🏁' : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* D-pad (mobile) */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',marginTop:'14px'}}>
          <button onPointerDown={() => move(0,-1)} style={{width:'44px',height:'36px',background:'rgba(0,255,159,0.1)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',fontFamily:font,userSelect:'none'}}>▲</button>
          <div style={{display:'flex',gap:'4px'}}>
            <button onPointerDown={() => move(-1,0)} style={{width:'44px',height:'36px',background:'rgba(0,255,159,0.1)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',fontFamily:font,userSelect:'none'}}>◄</button>
            <button onPointerDown={() => move(0,1)} style={{width:'44px',height:'36px',background:'rgba(0,255,159,0.1)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',fontFamily:font,userSelect:'none'}}>▼</button>
            <button onPointerDown={() => move(1,0)} style={{width:'44px',height:'36px',background:'rgba(0,255,159,0.1)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',fontFamily:font,userSelect:'none'}}>►</button>
          </div>
        </div>
        <div style={{textAlign:'center',fontSize:'10px',color:'rgba(0,255,159,0.3)',marginTop:'6px',letterSpacing:'1px'}}>ARROWS / WASD / SWIPE</div>
      </div>

      {/* Solved overlay */}
      {solved && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(0,255,159,0.5)',borderRadius:'16px',padding:'clamp(22px,5vw,42px) clamp(26px,6vw,50px)',textAlign:'center',fontFamily:font,animation:'mrFadeIn 0.4s'}}>
            <div style={{fontSize:'52px',marginBottom:'8px',animation:'mrWin 0.6s'}}>🏁</div>
            <h2 style={{color:'#00ff9f',fontSize:'clamp(18px,5vw,26px)',margin:'0 0 6px',letterSpacing:'3px'}}>ESCAPED!</h2>
            <div style={{display:'flex',gap:'7px',justifyContent:'center',margin:'11px 0 20px',flexWrap:'wrap'}}>
              {[['SCORE',scoreRef.current],['MOVES',moves],['TIME',`${timeLeft}s`],['LEVEL',level]].map(([l,v]) => (
                <span key={l as string} style={{fontSize:'11px',color:'rgba(0,255,159,0.65)',border:'1px solid rgba(0,255,159,0.22)',padding:'3px 9px',borderRadius:'5px'}}>{l}: {v}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:'9px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={nextLevel} style={{padding:'10px 18px',background:'rgba(0,255,159,0.13)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'13px',letterSpacing:'1px'}}>NEXT LEVEL →</button>
              <button onClick={() => { setPhase('select'); }} style={{padding:'10px 18px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>MENU</button>
              <button onClick={finish} style={{padding:'10px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#555',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>EXIT</button>
            </div>
          </div>
        </div>
      )}

      {/* Time up overlay */}
      {timeLeft === 0 && !solved && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(255,68,100,0.5)',borderRadius:'16px',padding:'42px 50px',textAlign:'center',fontFamily:font,animation:'mrFadeIn 0.4s'}}>
            <div style={{fontSize:'52px',marginBottom:'8px'}}>⏱</div>
            <h2 style={{color:'#ff4464',fontSize:'clamp(18px,5vw,26px)',margin:'0 0 6px',letterSpacing:'3px'}}>TIME UP!</h2>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',margin:'0 0 20px'}}>Score: {scoreRef.current}</p>
            <div style={{display:'flex',gap:'9px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={startGame} style={{padding:'10px 18px',background:'rgba(0,255,159,0.13)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>PLAY AGAIN</button>
              <button onClick={() => setPhase('select')} style={{padding:'10px 18px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>MENU</button>
              <button onClick={finish} style={{padding:'10px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#555',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





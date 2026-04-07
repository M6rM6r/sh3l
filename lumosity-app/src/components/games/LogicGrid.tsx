import { useState, useEffect, useRef, useCallback } from 'react';

const font = "'Courier New', Courier, monospace";

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS_KEY = 'data-lg-styles';
const STYLES = `
@keyframes lgSolve{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes lgWrong{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes lgPop{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-34px) scale(0.7)}}
@keyframes lgFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
`;
if (!document.querySelector(`[${CSS_KEY}]`)) {
  const s = document.createElement('style');
  s.setAttribute(CSS_KEY, '1');
  s.textContent = STYLES;
  document.head.appendChild(s);
}

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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'20px'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>🔷</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(20px,5vw,34px)',letterSpacing:'4px',margin:'0 0 4px'}}>LOGIC GRID</h1>
      <p style={{color:'rgba(0,255,159,0.4)',fontSize:'11px',letterSpacing:'3px',margin:'0 0 36px'}}>DEDUCE · ELIMINATE · SOLVE</p>
      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>DIFFICULTY</p>
      <div style={{display:'flex',flexDirection:'column',gap:'9px',width:'min(280px,90vw)',marginBottom:'24px'}}>
        {(['easy','medium','hard'] as Diff[]).map(d => (
          <button key={d} onClick={() => setDiff(d)} style={{padding:'12px 16px',background:diff===d?`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.14)`:'rgba(255,255,255,0.04)',border:`1px solid ${diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.1)'}`,borderRadius:'9px',color:diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:font,fontSize:'13px',textAlign:'left',transition:'all .2s'}}>
            <span style={{fontWeight:'bold',letterSpacing:'1px'}}>{d.toUpperCase()}</span>
            <span style={{fontSize:'10px',opacity:0.65,float:'right'}}>{DIFF_SIZE[d]}×{DIFF_SIZE[d]} grid</span>
          </button>
        ))}
      </div>
      <button onClick={startGame} style={{padding:'14px 48px',background:'rgba(0,255,159,0.15)',border:'1px solid rgba(0,255,159,0.65)',borderRadius:'10px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'15px',letterSpacing:'2px',boxShadow:'0 0 24px rgba(0,255,159,0.2)'}}>START GAME</button>
      <button onClick={onBack} style={{marginTop:'16px',padding:'8px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontFamily:font,fontSize:'12px'}}>← BACK</button>
    </div>
  );

  if (!puzzle) return null;

  const { size, rowLabels, colLabels, clues } = puzzle;
  const cellSize = Math.min(56, Math.floor((Math.min(window.innerWidth, 520) - 80) / size));

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'10px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}>
      <div style={{maxWidth:'900px',margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <button onClick={onBack} style={{padding:'6px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'6px',color:'#00ff9f',cursor:'pointer',fontSize:'12px',fontFamily:font}}>← BACK</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(12px,3.5vw,18px)',letterSpacing:'2px'}}>🔷 LOGIC GRID</h1>
          <div style={{padding:'4px 9px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',fontFamily:font,letterSpacing:'1px'}}>{diff.toUpperCase()}</div>
        </div>
        {/* Stats */}
        <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
          {[['LVL',level],['SCORE',scoreRef.current],['TIME',fmtTime(elapsed)],['HINTS',`${hintsLeft}💡`],['MISTAKES',mistakes]].map(([l,v]) => (
            <div key={l as string} style={{flex:1,minWidth:'58px',padding:'6px 4px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.17)',borderRadius:'7px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.38)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'13px',fontWeight:'bold',color:(l==='MISTAKES'&&(v as number)>0)?'#ff4464':'#00ff9f'}}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:'16px',flexWrap:'wrap',justifyContent:'center'}}>
          {/* Grid */}
          <div style={{position:'relative'}}>
            {popText && <div style={{position:'absolute',top:'-20px',left:'50%',transform:'translateX(-50%)',color:'#00ff9f',fontSize:'18px',fontWeight:'bold',animation:'lgPop 1.2s forwards',zIndex:10,pointerEvents:'none'}}>{popText}</div>}
            <div style={{animation:wrongFlash?'lgWrong 0.5s':'none',background:'rgba(0,255,159,0.03)',border:`2px solid ${solved?'rgba(0,255,159,0.8)':'rgba(0,255,159,0.22)'}`,borderRadius:'10px',padding:'10px',transition:'border-color .3s'}}>
              {/* Col headers */}
              <div style={{display:'flex',gap:'3px',marginBottom:'3px',paddingLeft:`${cellSize+3}px`}}>
                {colLabels.map((c,i) => (
                  <div key={i} style={{width:cellSize,height:cellSize*0.7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',color:'rgba(0,255,159,0.55)',textAlign:'center',letterSpacing:'0.3px',padding:'0 2px',boxSizing:'border-box'}}>{c}</div>
                ))}
              </div>
              {/* Rows */}
              {rowLabels.map((row, r) => (
                <div key={r} style={{display:'flex',gap:'3px',marginBottom:'3px'}}>
                  <div style={{width:cellSize,height:cellSize,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'rgba(0,255,159,0.65)',fontWeight:'bold',letterSpacing:'0.3px'}}>{row}</div>
                  {colLabels.map((_, c) => {
                    const cell = grid[r]?.[c] ?? 'empty';
                    const bg = cell === 'check' ? 'rgba(0,255,159,0.22)' : cell === 'x' ? 'rgba(255,68,100,0.15)' : 'rgba(255,255,255,0.03)';
                    const bc = cell === 'check' ? '#00ff9f' : cell === 'x' ? '#ff4464' : 'rgba(0,255,159,0.15)';
                    return (
                      <div key={c} onClick={() => toggle(r, c)} style={{width:cellSize,height:cellSize,background:bg,border:`1.5px solid ${bc}`,borderRadius:'5px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.max(14, cellSize * 0.4),fontWeight:'bold',color:cell==='check'?'#00ff9f':'#ff4464',transition:'all .12s',userSelect:'none',animation:cell!=='empty'?'lgSolve 0.25s':'none'}}>
                        {cell === 'check' ? '✓' : cell === 'x' ? '✕' : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Clues panel */}
          <div style={{flex:1,minWidth:'200px',maxWidth:'320px'}}>
            <div style={{fontSize:'11px',color:'rgba(0,255,159,0.5)',letterSpacing:'2px',marginBottom:'8px'}}>CLUES ({clues.length})</div>
            <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'10px'}}>
              {clues.map((cl, i) => (
                <div key={i} style={{padding:'7px 10px',background:clueUsed[i]?'rgba(0,255,159,0.09)':'rgba(255,255,255,0.03)',border:`1px solid ${clueUsed[i]?'rgba(0,255,159,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'6px',fontSize:'11px',color:clueUsed[i]?'#00ff9f':'rgba(255,255,255,0.6)',lineHeight:'1.4',animation:'lgFadeIn 0.4s'}}>
                  {cl.text}
                </div>
              ))}
            </div>
            {hintMsg && <div style={{padding:'6px 10px',background:'rgba(255,204,0,0.1)',border:'1px solid rgba(255,204,0,0.4)',borderRadius:'6px',color:'#ffcc00',fontSize:'11px',marginBottom:'8px'}}>{hintMsg}</div>}
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              <button onClick={handleSubmit} disabled={solved} style={{flex:1,padding:'9px',background:'rgba(0,255,159,0.12)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'7px',color:'#00ff9f',cursor:solved?'not-allowed':'pointer',fontFamily:font,fontSize:'12px',letterSpacing:'1px'}}>CHECK ✓</button>
              <button onClick={useHint} disabled={hintsLeft<=0||solved} style={{padding:'9px 12px',background:'rgba(255,204,0,0.1)',border:'1px solid rgba(255,204,0,0.35)',borderRadius:'7px',color:'#ffcc00',cursor:hintsLeft<=0||solved?'not-allowed':'pointer',fontFamily:font,fontSize:'12px',opacity:hintsLeft>0?1:0.4}}>💡{hintsLeft}</button>
            </div>
            <div style={{marginTop:'10px',padding:'8px 10px',background:'rgba(0,255,159,0.03)',border:'1px solid rgba(0,255,159,0.1)',borderRadius:'6px',fontSize:'10px',color:'rgba(0,255,159,0.38)',lineHeight:'1.7'}}>
              Click cell → ✓ → ✕ → empty<br/>✓ = correct pair &nbsp; ✕ = ruled out
            </div>
          </div>
        </div>
      </div>

      {/* Solved overlay */}
      {solved && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(0,255,159,0.5)',borderRadius:'16px',padding:'clamp(22px,5vw,42px) clamp(26px,6vw,50px)',textAlign:'center',fontFamily:font,animation:'lgFadeIn 0.4s'}}>
            <div style={{fontSize:'52px',marginBottom:'8px'}}>🎉</div>
            <h2 style={{color:'#00ff9f',fontSize:'clamp(18px,5vw,26px)',margin:'0 0 6px',letterSpacing:'3px'}}>PUZZLE SOLVED!</h2>
            <div style={{display:'flex',gap:'7px',justifyContent:'center',margin:'11px 0 20px',flexWrap:'wrap'}}>
              {[['SCORE',scoreRef.current],['TIME',fmtTime(elapsed)],['MISTAKES',mistakes],['HINTS USED',3-hintsLeft]].map(([l,v]) => (
                <span key={l as string} style={{fontSize:'11px',color:'rgba(0,255,159,0.65)',border:'1px solid rgba(0,255,159,0.22)',padding:'3px 9px',borderRadius:'5px'}}>{l}: {v}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:'9px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={nextLevel} style={{padding:'10px 18px',background:'rgba(0,255,159,0.13)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'13px',letterSpacing:'1px'}}>NEXT LEVEL →</button>
              <button onClick={() => { setPhase('select'); setLevel(1); scoreRef.current=0; setScore(0); }} style={{padding:'10px 18px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>MENU</button>
              <button onClick={finish} style={{padding:'10px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#555',cursor:'pointer',fontFamily:font,fontSize:'13px'}}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

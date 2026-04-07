import { useState, useEffect, useRef, useCallback } from 'react';

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
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Courier New',monospace"}}>
        <button onClick={onBack} style={{position:'absolute',top:24,left:24,padding:'8px 18px',background:'transparent',border:'2px solid #00ff9f',color:'#00ff9f',fontFamily:"'Courier New',monospace",cursor:'pointer',fontSize:'13px'}}>{'<'} BACK</button>
        <div style={{animation:'pcFadeIn 0.6s ease',textAlign:'center',maxWidth:'520px',width:'100%'}}>
          <div style={{fontSize:'42px',fontWeight:'700',color:'#00ff9f',textShadow:'0 0 30px rgba(0,255,159,0.6)',marginBottom:'8px',letterSpacing:'2px'}}>{'>'} PIPE_CONNECTION</div>
          <div style={{color:'#00ff9f',opacity:0.6,marginBottom:'40px',fontSize:'13px'}}>Rotate pipes to connect source to drain</div>
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {(['easy','medium','hard'] as Diff[]).map(d=>(
              <button key={d} onClick={()=>startGame(d)} style={{padding:'20px 28px',background:'rgba(0,0,0,0.4)',border:`2px solid ${DIFF_COLOR[d]}`,color:DIFF_COLOR[d],fontFamily:"'Courier New',monospace",cursor:'pointer',fontSize:'15px',fontWeight:'700',letterSpacing:'2px',transition:'all 0.2s',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${DIFF_COLOR[d]}22`;e.currentTarget.style.boxShadow=`0 0 20px ${DIFF_COLOR[d]}55`;}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,0,0,0.4)';e.currentTarget.style.boxShadow='none';}}>
                <span>[ {d.toUpperCase()} ]</span>
                <span style={{fontSize:'12px',opacity:0.8}}>{DIFF_N[d]}×{DIFF_N[d]} grid · {DIFF_TIME[d]}s</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- DONE SCREEN ---
  if (phase === 'done') {
    const dur = Math.floor((Date.now()-startTimeRef.current)/1000);
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Courier New',monospace"}}>
        <div style={{animation:'pcWinPop 0.5s ease',background:'rgba(0,0,0,0.7)',border:`2px solid ${dc}`,padding:'40px',maxWidth:'420px',width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'28px',fontWeight:'700',color:dc,textShadow:`0 0 20px ${dc}88`,marginBottom:'24px',letterSpacing:'2px'}}>
            {won ? '[ LEVEL COMPLETE ]' : '[ TIME UP ]'}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'32px'}}>
            {([['LEVEL',levelRef.current],['SCORE',scoreRef.current],['ROTATIONS',rotRef.current],['TIME',`${dur}s`]] as [string,string|number][]).map(([k,v])=>(
              <div key={k} style={{background:'rgba(0,0,0,0.4)',border:`1px solid ${dc}44`,padding:'14px',textAlign:'center'}}>
                <div style={{fontSize:'10px',color:dc,opacity:0.6,letterSpacing:'2px',marginBottom:'6px'}}>{k}</div>
                <div style={{fontSize:'22px',color:dc,fontWeight:'700'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
            <button onClick={()=>startGame(diff)} style={{padding:'12px 24px',background:dc,border:`2px solid ${dc}`,color:'#0a0a0f',fontFamily:"'Courier New',monospace",cursor:'pointer',fontWeight:'700',fontSize:'14px',letterSpacing:'1px'}}>PLAY AGAIN</button>
            <button onClick={()=>setPhase('select')} style={{padding:'12px 24px',background:'transparent',border:`2px solid ${dc}`,color:dc,fontFamily:"'Courier New',monospace",cursor:'pointer',fontWeight:'700',fontSize:'14px',letterSpacing:'1px'}}>MENU</button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN ---
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',padding:'16px',fontFamily:"'Courier New',monospace"}}>
      {/* Header */}
      <div style={{width:'100%',maxWidth:'600px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <button onClick={onBack} style={{padding:'8px 16px',background:'transparent',border:`2px solid ${dc}`,color:dc,fontFamily:"'Courier New',monospace",cursor:'pointer',fontSize:'13px'}}>{'<'} BACK</button>
        <div style={{fontSize:'18px',fontWeight:'700',color:dc,textShadow:`0 0 15px ${dc}88`,letterSpacing:'2px'}}>{'>'} PIPE_CONNECTION</div>
        <div style={{color:dc,fontSize:'13px',opacity:0.7}}>{diff.toUpperCase()}</div>
      </div>

      {/* Stats bar */}
      <div style={{width:'100%',maxWidth:'600px',display:'flex',gap:'12px',marginBottom:'10px',justifyContent:'center',flexWrap:'wrap'}}>
        {([['LVL',level],['SCORE',score],['ROTS',rotations]] as [string,number][]).map(([k,v])=>(
          <div key={k} style={{background:'rgba(0,0,0,0.4)',border:`1px solid ${dc}55`,padding:'6px 16px',color:dc,fontSize:'12px',letterSpacing:'1px'}}>
            {k}: <span style={{fontWeight:'700'}}>{v}</span>
          </div>
        ))}
        <div style={{background:'rgba(0,0,0,0.4)',border:`1px solid ${timerColor}55`,padding:'6px 16px',color:timerColor,fontSize:'12px',letterSpacing:'1px',animation:timerPct<0.25?'pcTimerWarn 0.6s infinite':'none'}}>
          TIME: <span style={{fontWeight:'700'}}>{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div style={{width:'100%',maxWidth:'600px',height:'4px',background:'#1a1a2e',marginBottom:'14px',borderRadius:'2px'}}>
        <div style={{width:`${timerPct*100}%`,height:'100%',background:timerColor,borderRadius:'2px',transition:'width 1s linear, background 0.5s'}} />
      </div>

      {/* Grid */}
      <div style={{background:'rgba(0,255,159,0.04)',padding:'10px',border:`2px solid ${dc}44`,boxShadow:`0 0 30px ${dc}22`,marginBottom:'12px'}}>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${n},${CELL_PX}px)`,gridTemplateRows:`repeat(${n},${CELL_PX}px)`,gap:'3px',background:'#0a0a0f',padding:'6px'}}>
          {grid.map((row,ri)=>row.map((cell,ci)=>{
            const isSource = ri===0&&ci===0;
            const isSink = ri===n-1&&ci===n-1;
            const cellColor = cell.connected ? '#00ff9f' : '#2a3a4a';
            const op = getOpenings(cell.pipe, cell.rot);
            const segW = Math.round(CELL_PX * 0.28);
            const half = Math.round(CELL_PX / 2);
            return (
              <div key={`${ri}-${ci}`}
                onClick={()=>{ if(!isSource&&!isSink&&cell.pipe!=='empty') handleRotate(ri,ci); }}
                style={{
                  width:`${CELL_PX}px`,height:`${CELL_PX}px`,
                  background:isSource?'rgba(0,255,159,0.12)':isSink?'rgba(255,100,100,0.12)':'#111825',
                  cursor:(isSource||isSink||cell.pipe==='empty')?'default':'pointer',
                  position:'relative',
                  border:`1px solid ${cell.connected?'#00ff9f33':'#1e2a38'}`,
                  transition:'border-color 0.3s',
                  animation: cell.connected&&!isSource&&!isSink ? 'pcFlow 2s ease-in-out infinite' : 'none',
                  boxSizing:'border-box',
                }}
                onMouseEnter={e=>{ if(!isSource&&!isSink&&cell.pipe!=='empty') e.currentTarget.style.borderColor='#00ff9f88'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=cell.connected?'#00ff9f33':'#1e2a38'; }}
              >
                {/* Pipe segments via absolute divs */}
                {cell.pipe === 'empty' ? null : (<>
                  {/* center dot */}
                  <div style={{position:'absolute',left:`${half-segW/2}px`,top:`${half-segW/2}px`,width:`${segW}px`,height:`${segW}px`,background:cellColor,borderRadius:'2px',transition:'background 0.3s',zIndex:2}} />
                  {/* arms */}
                  {op[0]&&<div style={{position:'absolute',left:`${half-segW/2}px`,top:0,width:`${segW}px`,height:`${half}px`,background:cellColor,transition:'background 0.3s',zIndex:1}} />}
                  {op[1]&&<div style={{position:'absolute',left:`${half}px`,top:`${half-segW/2}px`,width:`${half}px`,height:`${segW}px`,background:cellColor,transition:'background 0.3s',zIndex:1}} />}
                  {op[2]&&<div style={{position:'absolute',left:`${half-segW/2}px`,top:`${half}px`,width:`${segW}px`,height:`${half}px`,background:cellColor,transition:'background 0.3s',zIndex:1}} />}
                  {op[3]&&<div style={{position:'absolute',left:0,top:`${half-segW/2}px`,width:`${half}px`,height:`${segW}px`,background:cellColor,transition:'background 0.3s',zIndex:1}} />}
                </>)}
                {/* Source / Sink icons */}
                {isSource&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:3}}>
                  <div style={{width:`${segW+6}px`,height:`${segW+6}px`,borderRadius:'50%',background:'#00ff9f',boxShadow:'0 0 12px rgba(0,255,159,0.9)',zIndex:4}} />
                </div>}
                {isSink&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:3}}>
                  <div style={{width:`${segW+6}px`,height:`${segW+6}px`,borderRadius:'50%',background:cell.connected?'#ff4464':'#1a1a2e',boxShadow:cell.connected?'0 0 16px rgba(255,68,100,0.9)':'none',border:'2px solid #ff4464',transition:'all 0.3s',zIndex:4}} />
                </div>}
              </div>
            );
          }))}
        </div>
      </div>

      <div style={{color:'#00ff9f',opacity:0.5,fontSize:'12px',textAlign:'center',marginBottom:'12px',letterSpacing:'1px'}}>
        [click pipes to rotate · connect ● to ●]
      </div>

      {/* Win overlay */}
      {won && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{animation:'pcSlideIn 0.4s ease',background:'rgba(0,0,0,0.9)',border:'2px solid #00ff9f',padding:'36px 48px',textAlign:'center',maxWidth:'380px',width:'90%'}}>
            <div style={{fontSize:'26px',fontWeight:'700',color:'#00ff9f',textShadow:'0 0 20px rgba(0,255,159,0.7)',marginBottom:'8px',letterSpacing:'2px'}}>[ CONNECTED! ]</div>
            <div style={{color:'#00ff9f',opacity:0.7,fontSize:'13px',marginBottom:'24px'}}>Level {level} complete · {rotations} rotations</div>
            <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
              <button onClick={handleNextLevel} style={{padding:'12px 24px',background:'#00ff9f',border:'2px solid #00ff9f',color:'#0a0a0f',fontFamily:"'Courier New',monospace",cursor:'pointer',fontWeight:'700',fontSize:'14px',letterSpacing:'1px'}}>[NEXT LEVEL]</button>
              <button onClick={handleFinish} style={{padding:'12px 24px',background:'transparent',border:'2px solid #00ff9f',color:'#00ff9f',fontFamily:"'Courier New',monospace",cursor:'pointer',fontWeight:'700',fontSize:'14px',letterSpacing:'1px'}}>[FINISH]</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}











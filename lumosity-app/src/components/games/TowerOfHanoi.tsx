import { useState, useEffect, useRef } from 'react';

type Diff = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'game';

interface Disk { size: number; color: string; }

interface TowerOfHanoiProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

const DIFF_DISKS: Record<Diff, number> = { easy: 3, medium: 4, hard: 5 };
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };
const DISK_COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];

function beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* silent */ }
}
function playPick() { beep(440, 0.07, 'sine', 0.18); }
function playPlace() { beep(300, 0.1, 'sine', 0.18); }
function playInvalid() { beep(180, 0.12, 'sawtooth', 0.12); }
function playWin() { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.18, 'sine', 0.2), i*90)); }

export function TowerOfHanoi({ onComplete, onBack }: TowerOfHanoiProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [diff, setDiff] = useState<Diff>('medium');
  const [towers, setTowers] = useState<Disk[][]>([[], [], []]);
  const [selectedTower, setSelectedTower] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [diskCount, setDiskCount] = useState(3);
  const [minMoves, setMinMoves] = useState(7);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const startTimeRef = useRef(Date.now());
  const movesRef = useRef(0);

  // CSS injection
  useEffect(() => {
    if (document.querySelector('style[data-toh]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-toh', '1');
    s.textContent = `
      @keyframes tohFadeIn { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
      @keyframes tohSlide { from{transform:translateY(-8px);opacity:0;}to{transform:translateY(0);opacity:1;} }
      @keyframes tohWinPop { 0%{transform:translate(-50%,-50%) scale(0.7);opacity:0;} 60%{transform:translate(-50%,-50%) scale(1.05);} 100%{transform:translate(-50%,-50%) scale(1);opacity:1;} }
      @keyframes tohPulse { 0%,100%{box-shadow:0 0 12px rgba(0,255,159,0.4);} 50%{box-shadow:0 0 28px rgba(0,255,159,0.8);} }
      @keyframes tohShake { 0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);} }
      @keyframes tohGlow { 0%,100%{opacity:0.5;} 50%{opacity:1;} }
    `;
    document.head.appendChild(s);
  }, []);

  const initLevel = (lv: number, d: Diff) => {
    const disks = Math.min(DIFF_DISKS[d] + Math.floor(lv / 2), 8);
    setDiskCount(disks);
    const mm = Math.pow(2, disks) - 1;
    setMinMoves(mm);
    const init: Disk[] = [];
    for (let i = disks; i >= 1; i--) init.push({ size: i, color: DISK_COLORS[i - 1] });
    setTowers([init, [], []]);
    setMoves(0); movesRef.current = 0;
    setSelectedTower(null);
    setShowSuccess(false);
  };

  const startGame = (d: Diff) => {
    setDiff(d);
    setLevel(1);
    setScore(0); scoreRef.current = 0;
    startTimeRef.current = Date.now();
    setPhase('game');
    initLevel(1, d);
  };

  const handleTowerClick = (idx: number) => {
    if (showSuccess) return;
    if (selectedTower === null) {
      if (towers[idx].length > 0) { setSelectedTower(idx); playPick(); }
      return;
    }
    if (selectedTower === idx) { setSelectedTower(null); return; }

    const from = towers[selectedTower];
    const to = towers[idx];
    if (from.length === 0) { setSelectedTower(null); return; }
    const disk = from[from.length - 1];

    if (to.length === 0 || disk.size < to[to.length - 1].size) {
      const newTowers = towers.map(t => [...t]);
      newTowers[selectedTower].pop();
      newTowers[idx].push(disk);
      setTowers(newTowers);
      const newMoves = movesRef.current + 1;
      movesRef.current = newMoves;
      setMoves(newMoves);
      setSelectedTower(null);
      playPlace();
      if (newTowers[2].length === diskCount) {
        const efficiency = minMoves / newMoves;
        const bonus = Math.floor(efficiency * 300);
        const pts = 400 + bonus + level * 150;
        scoreRef.current += pts;
        setScore(scoreRef.current);
        setShowSuccess(true);
        playWin();
      }
    } else {
      setSelectedTower(null);
      setInvalidFlash(true);
      setTimeout(() => setInvalidFlash(false), 400);
      playInvalid();
    }
  };

  const handleNextLevel = () => {
    const newLv = level + 1;
    setLevel(newLv);
    initLevel(newLv, diff);
  };

  const handleFinish = () => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onComplete(scoreRef.current, level, duration);
  };

  // ── SELECT SCREEN ──
  if (phase === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: 'center', animation: 'tohFadeIn 0.5s ease', maxWidth: 520, padding: '0 20px' }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>🗼</div>
          <h1 style={{ color: '#00ff9f', fontSize: 36, margin: '0 0 10px', letterSpacing: 2 }}>TOWER OF HANOI</h1>
          <p style={{ color: '#888', marginBottom: 34, fontSize: 15 }}>Move all disks to Tower 3 • Larger disk cannot sit on smaller</p>
          {(['easy', 'medium', 'hard'] as Diff[]).map(d => (
            <button key={d} onClick={() => startGame(d)} style={{ display: 'block', width: '100%', marginBottom: 14, padding: '18px 24px', background: 'rgba(255,255,255,0.04)', border: `2px solid ${DIFF_COLOR[d]}`, borderRadius: 14, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = `rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.1)`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
              <span style={{ color: DIFF_COLOR[d], fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase' }}>{d}</span>
              <span style={{ color: '#aaa', fontSize: 13, marginLeft: 14 }}>
                {d === 'easy' && `${DIFF_DISKS.easy} disks • ${Math.pow(2, DIFF_DISKS.easy)-1} min moves`}
                {d === 'medium' && `${DIFF_DISKS.medium} disks • ${Math.pow(2, DIFF_DISKS.medium)-1} min moves`}
                {d === 'hard' && `${DIFF_DISKS.hard} disks • ${Math.pow(2, DIFF_DISKS.hard)-1} min moves`}
              </span>
            </button>
          ))}
          <button onClick={onBack} style={{ marginTop: 10, padding: '10px 28px', background: 'transparent', border: '1px solid #444', borderRadius: 8, color: '#888', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Back</button>
        </div>
      </div>
    );
  }

  const canReceive = (idx: number) =>
    selectedTower !== null && selectedTower !== idx &&
    towers[selectedTower].length > 0 &&
    (towers[idx].length === 0 || towers[selectedTower][towers[selectedTower].length - 1].size < towers[idx][towers[idx].length - 1].size);

  // ── GAME SCREEN ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)', padding: '16px', fontFamily: "'Courier New', monospace", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={onBack} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,255,159,0.3)', borderRadius: 8, color: '#00ff9f', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Back</button>
        <h1 style={{ color: '#00ff9f', margin: 0, fontSize: 22, letterSpacing: 2 }}>🗼 TOWER OF HANOI</h1>
        <span style={{ color: DIFF_COLOR[diff], fontSize: 12, textTransform: 'uppercase', border: `1px solid ${DIFF_COLOR[diff]}`, padding: '4px 10px', borderRadius: 6 }}>{diff}</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['LVL', level, '#a78bfa'], ['SCORE', score, '#00ff9f'], ['MOVES', moves, '#00cfff'], ['MIN', minMoves, '#ffcc00'], ['DISKS', diskCount, '#ff9f00']].map(([k, v, c]) => (
          <div key={String(k)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${String(c)}33`, borderRadius: 10, textAlign: 'center', minWidth: 60 }}>
            <div style={{ color: '#666', fontSize: 10, letterSpacing: 1 }}>{k}</div>
            <div style={{ color: String(c), fontSize: 18, fontWeight: 'bold' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Towers area */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', width: '100%', maxWidth: 900, animation: invalidFlash ? 'tohShake 0.4s ease' : 'none' }}>
        {[0, 1, 2].map(idx => {
          const tower = towers[idx];
          const isSel = selectedTower === idx;
          const canRcv = canReceive(idx);
          return (
            <div key={idx} onClick={() => handleTowerClick(idx)} style={{
              flex: 1, minWidth: 100, height: 'clamp(260px, 42vh, 400px)',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
              position: 'relative', cursor: 'pointer', padding: '12px 8px 0',
              background: isSel ? 'rgba(0,255,159,0.10)' : canRcv ? 'rgba(0,207,255,0.07)' : 'rgba(255,255,255,0.03)',
              border: isSel ? '2px solid #00ff9f' : canRcv ? '2px dashed #00cfff' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, transition: 'all 0.2s',
              animation: isSel ? 'tohPulse 1.5s ease infinite' : 'none',
            }}>
              {/* Tower label */}
              <div style={{ position: 'absolute', top: 10, color: isSel ? '#00ff9f' : '#555', fontSize: 11, letterSpacing: 1, fontWeight: 'bold', transition: 'color 0.2s' }}>TOWER {idx + 1}</div>
              {/* Pole */}
              <div style={{ position: 'absolute', bottom: 24, width: 4, height: '78%', background: 'linear-gradient(to top, #00ff9f88, transparent)', borderRadius: 2 }} />
              {/* Disks */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 4, zIndex: 1, width: '100%' }}>
                {tower.map((disk, di) => {
                  const maxW = 200;
                  const w = Math.floor(34 + (disk.size / 8) * (maxW - 34));
                  return (
                    <div key={di} style={{
                      width: w, height: 22,
                      background: `linear-gradient(90deg, ${disk.color}cc, ${disk.color}, ${disk.color}cc)`,
                      border: `2px solid ${disk.color}`,
                      borderRadius: 6,
                      boxShadow: `0 0 10px ${disk.color}66, inset 0 -3px 6px rgba(0,0,0,0.3)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 'bold',
                      animation: 'tohSlide 0.15s ease',
                      transition: 'width 0.2s',
                    }}>{diskCount <= 5 ? disk.size : ''}</div>
                  );
                })}
              </div>
              {/* Base */}
              <div style={{ width: '90%', height: 10, background: 'linear-gradient(90deg,#1a1a2e,#00ff9f,#1a1a2e)', borderRadius: 4, boxShadow: '0 0 14px rgba(0,255,159,0.5)' }} />
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 10 }}>
        {selectedTower !== null ? `Disk selected from Tower ${selectedTower + 1} — click destination` : 'Click a tower to pick up its top disk'}
      </div>

      {/* Reset */}
      <button onClick={() => initLevel(level, diff)} style={{ marginTop: 14, padding: '8px 24px', background: 'transparent', border: '1px solid #ef4444', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>RESET</button>

      {/* Win overlay */}
      {showSuccess && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(10,10,15,0.97)', border: '2px solid #00ff9f', borderRadius: 18, padding: '36px 40px', textAlign: 'center', zIndex: 1000, animation: 'tohWinPop 0.4s ease', boxShadow: '0 0 60px rgba(0,255,159,0.4)', minWidth: 280 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <h2 style={{ color: '#00ff9f', fontSize: 26, margin: '0 0 10px', fontFamily: 'inherit' }}>PUZZLE SOLVED!</h2>
          <p style={{ color: '#888', marginBottom: 6, fontFamily: 'inherit', fontSize: 14 }}>{moves} moves used • minimum: {minMoves}</p>
          <p style={{ color: moves === minMoves ? '#00ff9f' : '#ffcc00', marginBottom: 18, fontFamily: 'inherit', fontSize: 13 }}>
            {moves === minMoves ? '⭐ PERFECT — Optimal solution!' : `${Math.floor((minMoves / moves) * 100)}% efficiency`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleNextLevel} style={{ padding: '12px 24px', background: '#00ff9f', border: 'none', borderRadius: 10, color: '#000', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>NEXT LEVEL</button>
            <button onClick={handleFinish} style={{ padding: '12px 24px', background: 'transparent', border: '2px solid #444', borderRadius: 10, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>DONE</button>
          </div>
        </div>
      )}
    </div>
  );
}




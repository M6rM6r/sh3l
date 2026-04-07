import { useState, useEffect, useRef, useCallback } from 'react';

type Diff = 'easy' | 'medium' | 'hard';
type Phase = 'select' | 'game' | 'done';

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  born: number;
}

interface QuickReflexesProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

const DIFF_SIZE: Record<Diff, number> = { easy: 62, medium: 42, hard: 28 };
const DIFF_LIFE: Record<Diff, number> = { easy: 1200, medium: 850, hard: 550 };
const DIFF_SPAWN: Record<Diff, number> = { easy: 700, medium: 480, hard: 320 };
const DIFF_TIME: Record<Diff, number> = { easy: 45, medium: 35, hard: 30 };
const DIFF_BASE: Record<Diff, number> = { easy: 500, medium: 1000, hard: 2000 };
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };

const TARGET_COLORS = ['#00ff9f','#00cfff','#ff4af7','#ffcc00','#ff9f00','#a78bfa'];

function beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
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
function playHit() { beep(880, 0.08, 'sine', 0.22); }
function playMiss() { beep(160, 0.15, 'sawtooth', 0.12); }
function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => beep(f, 0.18, 'sine', 0.2), i * 100);
  });
}

export function QuickReflexes({ onComplete, onBack }: QuickReflexesProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [diff, setDiff] = useState<Diff>('medium');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const nextIdRef = useRef(0);
  const [hits, setHits] = useState(0);
  const hitsRef = useRef(0);
  const [misses, setMisses] = useState(0);
  const missesRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(DIFF_TIME['medium']);
  const totalTime = useRef(DIFF_TIME['medium']);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(1);
  const [flashMiss, setFlashMiss] = useState(false);
  const [popTexts, setPopTexts] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const popIdRef = useRef(0);

  // CSS injection
  useEffect(() => {
    if (document.querySelector('style[data-qr]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-qr', '1');
    s.textContent = `
      @keyframes qrFadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes qrPop { 0%{transform:scale(0.2);opacity:0;} 40%{transform:scale(1.2);opacity:1;} 100%{transform:scale(1);opacity:1;} }
      @keyframes qrHit { 0%{transform:scale(1);opacity:1;} 60%{transform:scale(1.8);opacity:0.6;} 100%{transform:scale(2.4);opacity:0;} }
      @keyframes qrPulse { 0%,100%{box-shadow:0 0 14px currentColor;} 50%{box-shadow:0 0 28px currentColor, 0 0 50px currentColor;} }
      @keyframes qrPopText { 0%{transform:translateY(0);opacity:1;} 100%{transform:translateY(-60px);opacity:0;} }
      @keyframes qrFlashMiss { 0%,100%{box-shadow:inset 0 0 0 transparent;} 50%{box-shadow:inset 0 0 40px rgba(255,68,100,0.45);} }
      @keyframes qrCountdown { from{transform:scale(1.4);opacity:0;} to{transform:scale(1);opacity:1;} }
    `;
    document.head.appendChild(s);
  }, []);

  const addPopText = (text: string, x: number, y: number) => {
    const id = popIdRef.current++;
    setPopTexts(prev => [...prev, { id, text, x, y }]);
    setTimeout(() => setPopTexts(prev => prev.filter(p => p.id !== id)), 700);
  };

  const startGame = (d: Diff) => {
    setDiff(d);
    setPhase('game');
    setLevel(1); levelRef.current = 1;
    setScore(0); scoreRef.current = 0;
    setTargets([]);
    setHits(0); hitsRef.current = 0;
    setMisses(0); missesRef.current = 0;
    setCombo(0); comboRef.current = 0;
    nextIdRef.current = 0;
    totalTime.current = DIFF_TIME[d];
    setTimeLeft(DIFF_TIME[d]);
    startTimeRef.current = Date.now();
  };

  const endGame = useCallback(() => {
    setPhase('done');
    playWin();
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTimeout(() => onComplete(scoreRef.current, levelRef.current, duration), 800);
  }, [onComplete]);

  // Timer
  useEffect(() => {
    if (phase !== 'game') return;
    if (timeLeft <= 0) { endGame(); return; }
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, endGame]);

  // Level up
  useEffect(() => {
    if (hitsRef.current > 0 && hitsRef.current % 12 === 0) {
      const newLv = Math.min(15, levelRef.current + 1);
      setLevel(newLv); levelRef.current = newLv;
    }
  }, [hits]);

  // Spawn
  useEffect(() => {
    if (phase !== 'game') return;
    const spawnMs = Math.max(200, DIFF_SPAWN[diff] - levelRef.current * 15);
    const lifeMs = Math.max(300, DIFF_LIFE[diff] - levelRef.current * 20);
    const size = Math.max(22, DIFF_SIZE[diff] - Math.floor(levelRef.current / 3) * 3);

    const iv = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const id = nextIdRef.current++;
      const color = TARGET_COLORS[(id + levelRef.current) % TARGET_COLORS.length];
      const target: Target = {
        id,
        x: Math.random() * Math.max(0, rect.width - size - 8),
        y: Math.random() * Math.max(0, rect.height - size - 8),
        size,
        color,
        born: Date.now(),
      };
      setTargets(prev => [...prev, target]);

      setTimeout(() => {
        setTargets(prev => {
          const still = prev.find(t => t.id === id);
          if (still) {
            missesRef.current++;
            setMisses(missesRef.current);
            comboRef.current = 0;
            setCombo(0);
            setFlashMiss(true);
            setTimeout(() => setFlashMiss(false), 350);
            playMiss();
          }
          return prev.filter(t => t.id !== id);
        });
      }, lifeMs);
    }, spawnMs);

    return () => clearInterval(iv);
  }, [phase, diff, level]);

  const handleTargetClick = (e: React.MouseEvent, t: Target) => {
    e.stopPropagation();
    setTargets(prev => prev.filter(t2 => t2.id !== t.id));
    hitsRef.current++;
    setHits(hitsRef.current);
    comboRef.current++;
    setCombo(comboRef.current);
    const pts = DIFF_BASE[diff] > 500
      ? levelRef.current * 8 + comboRef.current * 15
      : levelRef.current * 5 + comboRef.current * 10;
    scoreRef.current += pts;
    setScore(scoreRef.current);
    playHit();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      addPopText(comboRef.current >= 3 ? `+${pts} 🔥${comboRef.current}x` : `+${pts}`, t.x + t.size / 2, t.y);
    }
  };

  const accuracy = hitsRef.current + missesRef.current > 0
    ? Math.round((hitsRef.current / (hitsRef.current + missesRef.current)) * 100)
    : 0;

  const timerPct = totalTime.current > 0 ? timeLeft / totalTime.current : 0;
  const timerColor = timerPct > 0.5 ? '#00ff9f' : timerPct > 0.25 ? '#ffcc00' : '#ff4464';

  // ── SELECT SCREEN ──
  if (phase === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: 'center', animation: 'qrFadeIn 0.5s ease', maxWidth: 520, padding: '0 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>⚡</div>
          <h1 style={{ color: '#00ff9f', fontSize: 38, margin: '0 0 10px', letterSpacing: 2 }}>QUICK REFLEXES</h1>
          <p style={{ color: '#888', marginBottom: 36, fontSize: 15 }}>Tap the targets before they vanish!</p>
          {(['easy', 'medium', 'hard'] as Diff[]).map(d => (
            <button key={d} onClick={() => startGame(d)} style={{ display: 'block', width: '100%', marginBottom: 14, padding: '18px 24px', background: 'rgba(255,255,255,0.04)', border: `2px solid ${DIFF_COLOR[d]}`, borderRadius: 14, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = `rgba(${d === 'easy' ? '0,255,159' : d === 'medium' ? '255,204,0' : '255,68,100'},0.12)`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
              <span style={{ color: DIFF_COLOR[d], fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase' }}>{d}</span>
              <span style={{ color: '#aaa', fontSize: 13, marginLeft: 14 }}>
                {d === 'easy' && `Large targets • ${DIFF_TIME.easy}s • Slow spawn`}
                {d === 'medium' && `Medium targets • ${DIFF_TIME.medium}s • Normal spawn`}
                {d === 'hard' && `Tiny targets • ${DIFF_TIME.hard}s • Fast spawn`}
              </span>
            </button>
          ))}
          <button onClick={onBack} style={{ marginTop: 10, padding: '10px 28px', background: 'transparent', border: '1px solid #444', borderRadius: 8, color: '#888', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← Back</button>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ──
  if (phase === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: 'center', animation: 'qrFadeIn 0.5s ease', maxWidth: 500, padding: '0 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
          <h2 style={{ color: '#00ff9f', fontSize: 32, margin: '0 0 24px' }}>TIME'S UP!</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
            {[['SCORE', score], ['LEVEL', level], ['HITS', hitsRef.current], ['MISSES', missesRef.current], ['ACCURACY', `${accuracy}%`], ['BEST COMBO', comboRef.current]].map(([k, v]) => (
              <div key={String(k)} style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,255,159,0.25)', borderRadius: 10 }}>
                <div style={{ color: '#666', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{k}</div>
                <div style={{ color: '#00ff9f', fontSize: 22, fontWeight: 'bold' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => startGame(diff)} style={{ padding: '12px 28px', background: '#00ff9f', border: 'none', borderRadius: 10, color: '#000', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}>PLAY AGAIN</button>
            <button onClick={onBack} style={{ padding: '12px 28px', background: 'transparent', border: '2px solid #444', borderRadius: 10, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }}>MENU</button>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)', padding: '16px', fontFamily: "'Courier New', monospace" }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onBack} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0,255,159,0.3)', borderRadius: 8, color: '#00ff9f', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>← Back</button>
          <h1 style={{ color: '#00ff9f', margin: 0, fontSize: 26, letterSpacing: 2 }}>⚡ QUICK REFLEXES</h1>
          <span style={{ color: DIFF_COLOR[diff], fontSize: 13, textTransform: 'uppercase', border: `1px solid ${DIFF_COLOR[diff]}`, padding: '4px 10px', borderRadius: 6 }}>{diff}</span>
        </div>

        {/* Timer bar */}
        <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timerPct * 100}%`, background: timerColor, borderRadius: 4, transition: 'width 1s linear, background 0.5s' }} />
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'SCORE', value: score, color: '#00ff9f' },
            { label: 'LVL', value: level, color: '#a78bfa' },
            { label: 'HITS', value: hitsRef.current, color: '#00cfff' },
            { label: 'MISSES', value: missesRef.current, color: '#ff4464' },
            { label: 'COMBO', value: combo, color: combo >= 5 ? '#ff9f00' : '#ffcc00' },
            { label: 'TIME', value: `${timeLeft}s`, color: timerColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}33`, borderRadius: 10, textAlign: 'center', minWidth: 64 }}>
              <div style={{ color: '#666', fontSize: 10, letterSpacing: 1 }}>{label}</div>
              <div style={{ color, fontSize: 18, fontWeight: 'bold' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Target area */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(320px, 55vh, 520px)',
            background: flashMiss ? 'rgba(255,68,100,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${flashMiss ? 'rgba(255,68,100,0.6)' : 'rgba(0,255,159,0.2)'}`,
            borderRadius: 16,
            overflow: 'hidden',
            cursor: 'crosshair',
            transition: 'background 0.2s, border-color 0.2s',
            animation: flashMiss ? 'qrFlashMiss 0.35s ease' : 'none',
          }}
        >
          {targets.map(t => (
            <div
              key={t.id}
              onClick={e => handleTargetClick(e, t)}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, white 0%, ${t.color} 40%, ${t.color}88 100%)`,
                border: `2px solid ${t.color}`,
                boxShadow: `0 0 12px ${t.color}99`,
                cursor: 'pointer',
                animation: 'qrPop 0.18s ease, qrPulse 1.2s ease infinite',
                color: t.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: t.size * 0.45,
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              🎯
            </div>
          ))}

          {/* Pop texts */}
          {popTexts.map(p => (
            <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y, color: '#ffcc00', fontWeight: 'bold', fontSize: 15, pointerEvents: 'none', animation: 'qrPopText 0.7s ease forwards', whiteSpace: 'nowrap', textShadow: '0 0 8px #ffcc00' }}>
              {p.text}
            </div>
          ))}

          {/* Combo badge */}
          {combo >= 3 && (
            <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(255,159,0,0.18)', border: '1px solid #ff9f00', borderRadius: 8, padding: '4px 12px', color: '#ff9f00', fontSize: 13, fontWeight: 'bold' }}>
              🔥 {combo}x COMBO
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 8 }}>
          Tap targets before they vanish • Miss = combo reset
        </div>
      </div>
    </div>
  );
}




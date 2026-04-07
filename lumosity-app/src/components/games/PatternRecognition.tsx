import { useState, useEffect, useRef, useCallback } from 'react';

const font = "'Courier New', Courier, monospace";

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS_KEY = 'data-pr-styles';
const STYLES = `
@keyframes prCorrect{0%{transform:scale(1)}30%{transform:scale(1.22)}100%{transform:scale(1)}}
@keyframes prWrong{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
@keyframes prShow{0%{opacity:0;transform:scale(0.5)}100%{opacity:1;transform:scale(1)}}
@keyframes prPop{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-40px) scale(0.6)}}
@keyframes prFadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes prPulse{0%,100%{box-shadow:0 0 10px rgba(0,255,159,0.2)}50%{box-shadow:0 0 26px rgba(0,255,159,0.55)}}
@keyframes prBlink{0%,100%{opacity:1}50%{opacity:0.3}}
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
function playCorrect() { beep(660, 0.1, 'sine', 0.15); setTimeout(() => beep(880, 0.08, 'sine', 0.12), 80); }
function playWrong()   { beep(160, 0.22, 'sawtooth', 0.14); }
function playWin()     { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.12, 'sine', 0.18), i*80)); }
function playReveal(i: number) { beep(300 + i * 40, 0.06, 'sine', 0.08); }

// ── Patterns ──────────────────────────────────────────────────────────────────
const SHAPES = ['●', '■', '▲', '◆', '★', '⬟', '⬡'];
const COLORS = ['#ff4464','#00ff9f','#ffcc00','#00b4ff','#cc66ff','#ff8844','#44ffdd'];
const COLOR_NAMES = ['Red','Green','Yellow','Blue','Purple','Orange','Cyan'];

type Diff = 'easy' | 'medium' | 'hard';
const DIFF_COLOR: Record<Diff, string> = { easy: '#00ff9f', medium: '#ffcc00', hard: '#ff4464' };
const DIFF_LEN:   Record<Diff, number> = { easy: 3, medium: 5, hard: 7 };
const DIFF_OPTS:  Record<Diff, number> = { easy: 3, medium: 4, hard: 4 };
const DIFF_SCORE: Record<Diff, number> = { easy: 80, medium: 140, hard: 220 };
const TOTAL_Q = 10;
type Phase = 'select' | 'show' | 'answer' | 'feedback';

interface PatternItem { shape: string; color: string; colorName: string; }

interface PatternRecognitionProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function PatternRecognition({ onComplete, onBack }: PatternRecognitionProps) {
  const [phase, setPhase]   = useState<Phase>('select');
  const [diff, setDiff]     = useState<Diff>('medium');
  const [level, setLevel]   = useState(1);
  const [question, setQuestion]   = useState(0);
  const [pattern, setPattern]     = useState<PatternItem[]>([]);
  const [nextItem, setNextItem]   = useState<PatternItem | null>(null);
  const [options, setOptions]     = useState<PatternItem[]>([]);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [score, setScore]   = useState(0);
  const scoreRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [popText, setPopText] = useState('');
  const [showIdx, setShowIdx] = useState(-1);  // animate items in one by one
  const startRef = useRef(Date.now());

  const randItem = (exclude?: PatternItem): PatternItem => {
    let item: PatternItem;
    do {
      const si = Math.floor(Math.random() * SHAPES.length);
      const ci = Math.floor(Math.random() * COLORS.length);
      item = { shape: SHAPES[si], color: COLORS[ci], colorName: COLOR_NAMES[ci] };
    } while (exclude && item.shape === exclude.shape && item.color === exclude.color);
    return item;
  };

  const makeQuestion = useCallback((lv: number, d: Diff) => {
    const len = DIFF_LEN[d] + Math.floor(lv / 4);
    const patt: PatternItem[] = [];
    // Two-rule pattern: shape cycles through subset, color in another cycle
    const shapeSubset = SHAPES.slice(0, 3 + Math.floor(lv / 3));
    const colorSubset = COLORS.slice(0, 3 + Math.floor(lv / 4));
    for (let i = 0; i < len; i++) {
      patt.push({ shape: shapeSubset[i % shapeSubset.length], color: colorSubset[i % colorSubset.length], colorName: COLOR_NAMES[COLORS.indexOf(colorSubset[i % colorSubset.length])] });
    }
    const ni: PatternItem = { shape: shapeSubset[len % shapeSubset.length], color: colorSubset[len % colorSubset.length], colorName: COLOR_NAMES[COLORS.indexOf(colorSubset[len % colorSubset.length])] };
    // Build options
    const numOpts = DIFF_OPTS[d];
    const wrongs: PatternItem[] = [];
    while (wrongs.length < numOpts - 1) {
      const cand = randItem(ni);
      if (!wrongs.some(w => w.shape === cand.shape && w.color === cand.color)) wrongs.push(cand);
    }
    const all = [ni, ...wrongs].sort(() => Math.random() - 0.5);
    setPattern(patt);
    setNextItem(ni);
    setOptions(all);
    setCorrectIdx(all.findIndex(o => o.shape === ni.shape && o.color === ni.color));
    setSelected(null);
    setShowIdx(-1);
    // Animate items in one by one
    for (let i = 0; i <= patt.length; i++) {
      setTimeout(() => { playReveal(i); setShowIdx(i); }, i * 200);
    }
    setTimeout(() => setPhase('answer'), (patt.length + 1) * 200 + 100);
  }, []);

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setStreak(0);
    setLevel(1);
    setQuestion(0);
    startRef.current = Date.now();
    setPhase('show');
    makeQuestion(1, diff);
  };

  const handleSelect = (idx: number) => {
    if (phase !== 'answer' || selected !== null) return;
    setSelected(idx);
    setPhase('feedback');
    const isCorrect = idx === correctIdx;
    if (isCorrect) {
      playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = Math.floor(newStreak / 3) * 30;
      const pts = DIFF_SCORE[diff] + level * 20 + bonus;
      const ns = scoreRef.current + pts;
      scoreRef.current = ns;
      setScore(ns);
      setPopText(`+${pts}${bonus > 0 ? ' 🔥' : ''}`);
      setTimeout(() => setPopText(''), 1200);
      const nextQ = question + 1;
      setQuestion(nextQ);
      setTimeout(() => {
        if (nextQ >= TOTAL_Q) {
          playWin();
          const dur = Math.floor((Date.now() - startRef.current) / 1000);
          onComplete(scoreRef.current, level, dur);
        } else {
          const nl = level + 1;
          setLevel(nl);
          setPhase('show');
          makeQuestion(nl, diff);
        }
      }, 900);
    } else {
      playWrong();
      setStreak(0);
      setTimeout(() => {
        const dur = Math.floor((Date.now() - startRef.current) / 1000);
        onComplete(scoreRef.current, level, dur);
      }, 1600);
    }
  };

  const dc = DIFF_COLOR[diff];

  // ── Select screen ─────────────────────────────────────────────────────────
  if (phase === 'select') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'20px'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>🎯</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(18px,5vw,30px)',letterSpacing:'4px',margin:'0 0 4px'}}>PATTERN RECOGNITION</h1>
      <p style={{color:'rgba(0,255,159,0.4)',fontSize:'11px',letterSpacing:'3px',margin:'0 0 36px'}}>SEE · PREDICT · SCORE</p>
      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>DIFFICULTY</p>
      <div style={{display:'flex',flexDirection:'column',gap:'9px',width:'min(280px,90vw)',marginBottom:'24px'}}>
        {(['easy','medium','hard'] as Diff[]).map(d => (
          <button key={d} onClick={() => setDiff(d)} style={{padding:'12px 16px',background:diff===d?`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.14)`:'rgba(255,255,255,0.04)',border:`1px solid ${diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.1)'}`,borderRadius:'9px',color:diff===d?DIFF_COLOR[d]:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:font,fontSize:'13px',textAlign:'left',transition:'all .2s'}}>
            <span style={{fontWeight:'bold',letterSpacing:'1px'}}>{d.toUpperCase()}</span>
            <span style={{fontSize:'10px',opacity:0.65,float:'right'}}>{DIFF_LEN[d]} items · {DIFF_OPTS[d]} choices</span>
          </button>
        ))}
      </div>
      <button onClick={startGame} style={{padding:'14px 48px',background:'rgba(0,255,159,0.15)',border:'1px solid rgba(0,255,159,0.65)',borderRadius:'10px',color:'#00ff9f',cursor:'pointer',fontFamily:font,fontSize:'15px',letterSpacing:'2px',boxShadow:'0 0 24px rgba(0,255,159,0.2)'}}>START GAME</button>
      <button onClick={onBack} style={{marginTop:'16px',padding:'8px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontFamily:font,fontSize:'12px'}}>← BACK</button>
    </div>
  );

  const numOpts = DIFF_OPTS[diff];
  const cols = numOpts === 3 ? 3 : 2;

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'12px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button onClick={onBack} style={{padding:'6px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'6px',color:'#00ff9f',cursor:'pointer',fontSize:'12px',fontFamily:font}}>← BACK</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(12px,3.5vw,18px)',letterSpacing:'2px'}}>🎯 PATTERN</h1>
          <div style={{padding:'4px 9px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',fontFamily:font}}>{diff.toUpperCase()}</div>
        </div>
        {/* Stats */}
        <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
          {[['Q',`${question+1}/${TOTAL_Q}`],['SCORE',scoreRef.current],['STREAK',streak]].map(([l,v]) => (
            <div key={l as string} style={{flex:1,padding:'6px 4px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.17)',borderRadius:'7px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.38)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'13px',fontWeight:'bold',color:l==='STREAK'&&streak>=3?'#ffcc00':'#00ff9f'}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{width:'100%',height:'4px',background:'rgba(255,255,255,0.07)',borderRadius:'2px',marginBottom:'12px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(question/TOTAL_Q)*100}%`,background:'linear-gradient(90deg,#00ff9f,#00ccff)',borderRadius:'2px',transition:'width .4s'}} />
        </div>
        {/* Pattern area */}
        <div style={{position:'relative',background:'rgba(0,0,0,0.4)',borderRadius:'12px',padding:'18px 10px',marginBottom:'14px',border:'1px solid rgba(0,255,159,0.18)',animation:'prPulse 2.5s infinite'}}>
          {popText && <div style={{position:'absolute',top:'-14px',left:'50%',transform:'translateX(-50%)',color:'#00ff9f',fontSize:'16px',fontWeight:'bold',animation:'prPop 1.2s forwards',pointerEvents:'none',whiteSpace:'nowrap'}}>{popText}</div>}
          <p style={{textAlign:'center',fontSize:'10px',color:'rgba(0,255,159,0.38)',letterSpacing:'2px',margin:'0 0 14px'}}>WHAT COMES NEXT?</p>
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
            {pattern.map((item, i) => (
              <div key={i} style={{fontSize:'clamp(28px,7vw,46px)',color:item.color,opacity:showIdx>=i?1:0,transform:showIdx>=i?'scale(1)':'scale(0.4)',transition:'all 0.2s',display:'flex',flexDirection:'column',alignItems:'center'}}>
                {item.shape}
                {diff === 'hard' && <span style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',marginTop:'2px'}}>{item.colorName}</span>}
              </div>
            ))}
            <div style={{fontSize:'clamp(28px,7vw,46px)',color:'rgba(255,255,255,0.3)',animation:phase==='answer'?'prBlink 1s infinite':'none'}}>?</div>
          </div>
        </div>
        {/* Options */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:'8px',marginBottom:'12px'}}>
          {options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect  = isSelected && i === correctIdx;
            const isWrong    = isSelected && i !== correctIdx;
            const showRight  = phase === 'feedback' && i === correctIdx && selected !== null;
            const bg = isCorrect ? 'rgba(0,255,159,0.22)' : isWrong ? 'rgba(255,68,100,0.22)' : showRight ? 'rgba(0,255,159,0.1)' : 'rgba(255,255,255,0.05)';
            const border = isCorrect ? '2px solid #00ff9f' : isWrong ? '2px solid #ff4464' : showRight ? '2px solid rgba(0,255,159,0.5)' : '1px solid rgba(255,255,255,0.1)';
            const anim = isCorrect ? 'prCorrect 0.4s' : isWrong ? 'prWrong 0.4s' : '';
            return (
              <button key={i} onClick={() => handleSelect(i)} disabled={phase !== 'answer'} style={{padding:'18px 8px',background:bg,border,borderRadius:'10px',color:opt.color,cursor:phase==='answer'?'pointer':'default',fontFamily:font,fontSize:'clamp(30px,8vw,50px)',transition:'background .15s,border .15s',animation:anim,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                {opt.shape}
                {diff === 'hard' && <span style={{fontSize:'9px',color:'rgba(255,255,255,0.35)'}}>{opt.colorName}</span>}
              </button>
            );
          })}
        </div>
        {/* Feedback text */}
        {phase === 'feedback' && (
          <div style={{textAlign:'center',fontSize:'13px',fontWeight:'bold',color:selected===correctIdx?'#00ff9f':'#ff4464',letterSpacing:'2px',animation:'prFadeIn 0.3s'}}>
            {selected === correctIdx ? '✓ CORRECT!' : `✗ WRONG — GAME OVER (${scoreRef.current} pts)`}
          </div>
        )}
      </div>
    </div>
  );
}



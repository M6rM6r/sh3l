import { useState, useEffect, useRef, useCallback } from 'react';

// ─── CSS Injection ────────────────────────────────────────────────────────
const _s = document.createElement('style');
_s.textContent = `
  @keyframes mmCorrect{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}
  @keyframes mmWrong{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
  @keyframes mmPop{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-44px) scale(1.5)}}
  @keyframes mmTimer{0%{stroke-dashoffset:0}100%{stroke-dashoffset:283}}
`;
if (!document.head.querySelector('[data-math-styles]')) { _s.setAttribute('data-math-styles','1'); document.head.appendChild(_s); }

// ─── Types ───────────────────────────────────────────────────────────────
interface MathMarathonProps { onComplete: (score: number, level: number, duration: number) => void; onBack: () => void; }
type Diff = 'easy' | 'medium' | 'hard';
type Op = '+' | '-' | '×' | '÷';
interface Question { n1: number; n2: number; op: Op; ans: number; }

// ─── Sound ───────────────────────────────────────────────────────────────
function playSound(type: 'correct'|'wrong'|'levelup'|'tick'|'end') {
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain(); g.connect(ctx.destination);
    const o = ctx.createOscillator(); o.connect(g);
    if (type==='correct')  { o.type='sine';   o.frequency.value=880; g.gain.setValueAtTime(0.1,ctx.currentTime); o.frequency.setValueAtTime(1100,ctx.currentTime+0.08); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25); }
    if (type==='wrong')    { o.type='square'; o.frequency.value=220; g.gain.setValueAtTime(0.08,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25); }
    if (type==='levelup')  { o.type='sine';   o.frequency.setValueAtTime(660,ctx.currentTime); o.frequency.setValueAtTime(880,ctx.currentTime+0.12); o.frequency.setValueAtTime(1100,ctx.currentTime+0.24); g.gain.setValueAtTime(0.12,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); }
    if (type==='tick')     { o.type='sine';   o.frequency.value=440; g.gain.setValueAtTime(0.04,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.07); }
    if (type==='end')      { o.type='sawtooth'; o.frequency.value=220; o.frequency.setValueAtTime(110,ctx.currentTime+0.2); g.gain.setValueAtTime(0.1,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); }
    o.start(); o.stop(ctx.currentTime+0.6);
  } catch(_){}
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const DIFF_TIME: Record<Diff,number> = { easy:90, medium:60, hard:45 };
const DIFF_OPS:  Record<Diff,Op[]>   = { easy:['+','-'], medium:['+','-','×'], hard:['+','-','×','÷'] };

function genQuestion(level: number, diff: Diff): Question {
  const ops = DIFF_OPS[diff];
  const op = ops[Math.floor(Math.random()*ops.length)];
  const scale = 1 + Math.floor((level-1)/3);
  let n1: number, n2: number, ans: number;
  if (op==='÷') {
    n2 = Math.floor(Math.random()*(4+scale))+1;
    ans = Math.floor(Math.random()*(4+scale))+1;
    n1 = n2*ans;
  } else if (op==='×') {
    n1 = Math.floor(Math.random()*(4+scale))+1;
    n2 = Math.floor(Math.random()*(4+scale))+1;
    ans = n1*n2;
  } else if (op==='-') {
    n1 = Math.floor(Math.random()*(10*scale))+5;
    n2 = Math.floor(Math.random()*n1)+1;
    ans = n1-n2;
  } else {
    n1 = Math.floor(Math.random()*(10*scale))+1;
    n2 = Math.floor(Math.random()*(10*scale))+1;
    ans = n1+n2;
  }
  return { n1, n2, op, ans };
}

const font = "'Courier New', Courier, monospace";

// ─── Component ───────────────────────────────────────────────────────────
export function MathMarathon({ onComplete, onBack }: MathMarathonProps) {
  const [phase, setPhase] = useState<'select'|'game'|'over'>('select');
  const [diff, setDiff] = useState<Diff>('medium');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<Question>({n1:0,n2:0,op:'+',ans:0});
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null);
  const [popText, setPopText] = useState<string|null>(null);
  const scoreRef = useRef(0);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxTime = DIFF_TIME[diff];

  const nextQuestion = useCallback((lv: number, d: Diff) => {
    setQuestion(genQuestion(lv, d));
    setInput('');
    setFeedback(null);
    setTimeout(()=>inputRef.current?.focus(),50);
  }, []);

  function startGame() {
    scoreRef.current=0; setScore(0); setStreak(0); setBestStreak(0);
    setCorrect(0); setTotal(0); setLevel(1); setInput(''); setFeedback(null); setPopText(null);
    const q = genQuestion(1, diff); setQuestion(q);
    setTimeLeft(DIFF_TIME[diff]);
    startRef.current=Date.now();
    setPhase('game');
    setTimeout(()=>inputRef.current?.focus(),100);
  }

  useEffect(()=>{
    if(phase!=='game') return;
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=4 && t>1) playSound('tick');
        if(t<=1){
          clearInterval(timerRef.current!);
          playSound('end');
          const dur=Math.floor((Date.now()-startRef.current)/1000);
          setTimeout(()=>onComplete(scoreRef.current, level, dur),600);
          setPhase('over');
          return 0;
        }
        return t-1;
      });
    },1000);
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[phase]);

  function submit() {
    if(!input.trim()||phase!=='game') return;
    const ans = parseInt(input,10);
    const isCorrect = ans===question.ans;
    setTotal(t=>t+1);

    if(isCorrect){
      playSound('correct');
      const newStreak = streak+1;
      setStreak(newStreak);
      setBestStreak(bs=>Math.max(bs,newStreak));
      const pts = Math.floor((10+level*5)*(1+newStreak*0.12));
      scoreRef.current+=pts; setScore(scoreRef.current);
      setCorrect(c=>c+1);
      setFeedback('correct');
      if(newStreak>0&&newStreak%5===0) { playSound('levelup'); const nl=level+1; setLevel(nl); setPopText(`LEVEL UP! ×${(1+newStreak*0.12).toFixed(1)}`); setTimeout(()=>setPopText(null),900); nextQuestion(nl,diff); }
      else { setPopText(`+${pts}`); setTimeout(()=>setPopText(null),600); nextQuestion(level,diff); }
    } else {
      playSound('wrong');
      setStreak(0); setFeedback('wrong');
      setTimeout(()=>nextQuestion(level,diff),800);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if(e.key==='Enter') submit();
  }

  const pct = (timeLeft/maxTime)*100;
  const timerColor = pct>50?'#00ff9f':pct>25?'#ffcc00':'#ff4464';
  const accuracy = total>0?Math.round((correct/total)*100):100;
  const dc = diff==='easy'?'#00ff9f':diff==='medium'?'#ffcc00':'#ff4464';

  // ── Select ──────────────────────────────────────────────────────
  if(phase==='select') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'24px',boxSizing:'border-box'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>🔢</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(20px,5vw,34px)',letterSpacing:'4px',margin:'0 0 4px'}}>MATH MARATHON</h1>
      <p style={{color:'rgba(0,255,159,0.4)',fontSize:'11px',letterSpacing:'3px',margin:'0 0 36px'}}>SOLVE · STREAK · SCORE</p>

      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>DIFFICULTY</p>
      <div style={{display:'flex',flexDirection:'column',gap:'9px',width:'min(280px,90vw)',marginBottom:'14px'}}>
        {(['easy','medium','hard'] as Diff[]).map(d=>{
          const col=d==='easy'?'#00ff9f':d==='medium'?'#ffcc00':'#ff4464';
          const ops=DIFF_OPS[d].join(' ');
          return (
            <button key={d} onClick={()=>setDiff(d)} style={{padding:'12px 16px',background:diff===d?`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.14)`:'rgba(255,255,255,0.04)',border:`1px solid ${diff===d?col:'rgba(255,255,255,0.11)'}`,borderRadius:'9px',color:diff===d?col:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'13px',letterSpacing:'2px',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:font,transition:'all 0.15s'}}>
              <span>{d.toUpperCase()}</span>
              <span style={{fontSize:'10px',opacity:0.65}}>{ops} · {DIFF_TIME[d]}s</span>
            </button>
          );
        })}
      </div>

      <button onClick={startGame} style={{marginTop:'18px',padding:'14px 48px',background:'rgba(0,255,159,0.15)',border:'1px solid rgba(0,255,159,0.65)',borderRadius:'10px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',letterSpacing:'3px',fontFamily:font,fontWeight:'bold'}}>
        START
      </button>
      <button onClick={onBack} style={{marginTop:'16px',padding:'8px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontSize:'11px',fontFamily:font,letterSpacing:'1px'}}>
        ← BACK
      </button>
    </div>
  );

  // ── Game / Over ──────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'12px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}>
      <div style={{maxWidth:'500px',margin:'0 auto'}}>

        {/* Top bar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button onClick={onBack} style={{padding:'7px 13px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'11px',fontFamily:font,letterSpacing:'1px'}}>← BACK</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(13px,3.5vw,20px)',letterSpacing:'2px'}}>🔢 MATH MARATHON</h1>
          <div style={{padding:'4px 9px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',letterSpacing:'1px'}}>{diff.toUpperCase()}</div>
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
          {([['LEVEL',level],['SCORE',scoreRef.current],['STREAK',`${streak}🔥`],['ACC',`${accuracy}%`]] as [string,string|number][]).map(([l,v])=>(
            <div key={l} style={{flex:1,padding:'7px 4px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.17)',borderRadius:'7px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.38)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'13px',fontWeight:'bold',color:l==='STREAK'&&streak>=5?'#ffcc00':'#00ff9f'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Timer bar */}
        <div style={{width:'100%',height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'3px',marginBottom:'14px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${timerColor},${timerColor}aa)`,borderRadius:'3px',transition:'width 1s linear,background 0.5s'}} />
        </div>
        <div style={{textAlign:'right',fontSize:'10px',color:timerColor,letterSpacing:'1px',marginTop:'-12px',marginBottom:'12px'}}>{timeLeft}s</div>

        {/* Question card */}
        <div style={{background:'rgba(255,255,255,0.04)',border:`2px solid ${feedback==='correct'?'rgba(0,255,159,0.6)':feedback==='wrong'?'rgba(255,60,60,0.6)':'rgba(0,255,159,0.2)'}`,borderRadius:'14px',padding:'clamp(20px,5vw,40px)',textAlign:'center',marginBottom:'14px',position:'relative',animation:feedback==='correct'?'mmCorrect 0.3s ease':feedback==='wrong'?'mmWrong 0.4s ease':'none',transition:'border 0.2s'}}>
          {/* Pop text */}
          {popText&&<div style={{position:'absolute',top:'10px',right:'16px',color:popText.includes('LEVEL')?'#ffcc00':'rgba(0,255,159,0.85)',fontSize:'14px',fontWeight:'bold',letterSpacing:'1px',animation:'mmPop 0.8s forwards'}}>{popText}</div>}

          <div style={{fontSize:'clamp(36px,10vw,64px)',fontWeight:'bold',letterSpacing:'4px',marginBottom:'8px',color:'#fff'}}>
            {question.n1} {question.op} {question.n2} = ?
          </div>

          {feedback==='wrong'&&<div style={{fontSize:'12px',color:'rgba(255,80,80,0.85)',marginBottom:'8px',letterSpacing:'1px'}}>Answer was {question.ans}</div>}

          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={phase==='over'||feedback==='wrong'}
            placeholder="?"
            style={{width:'100%',padding:'14px',fontSize:'clamp(22px,6vw,38px)',textAlign:'center',background:'rgba(255,255,255,0.07)',border:`2px solid ${feedback==='correct'?'rgba(0,255,159,0.7)':feedback==='wrong'?'rgba(255,60,60,0.6)':'rgba(0,255,159,0.3)'}`,borderRadius:'10px',color:'#fff',fontFamily:font,outline:'none',boxSizing:'border-box'}}
          />
        </div>

        {/* Submit button */}
        <button onClick={submit} disabled={!input.trim()||phase==='over'} style={{width:'100%',padding:'14px',background:input.trim()?'rgba(0,255,159,0.18)':'rgba(255,255,255,0.05)',border:`1px solid ${input.trim()?'rgba(0,255,159,0.55)':'rgba(255,255,255,0.1)'}`,borderRadius:'10px',color:input.trim()?'#00ff9f':'rgba(255,255,255,0.25)',cursor:input.trim()?'pointer':'default',fontSize:'15px',letterSpacing:'2px',fontFamily:font,fontWeight:'bold',transition:'all 0.15s'}}>
          SUBMIT
        </button>

        {/* Streak banner */}
        {streak>=5&&<div style={{textAlign:'center',marginTop:'10px',color:'#ffcc00',fontSize:'11px',letterSpacing:'2px',fontWeight:'bold'}}>🔥 {streak}x STREAK! BONUS ×{(1+streak*0.12).toFixed(1)}</div>}

        {/* Bottom info */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',padding:'0 2px'}}>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.3)',letterSpacing:'1px'}}>BEST STREAK: {bestStreak}🔥</span>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.3)',letterSpacing:'1px'}}>{correct}/{total} CORRECT</span>
        </div>
      </div>

      {/* Game over overlay */}
      {phase==='over'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(0,255,159,0.5)',borderRadius:'16px',padding:'clamp(22px,5vw,42px) clamp(26px,6vw,50px)',textAlign:'center',maxWidth:'320px',width:'90vw'}}>
            <div style={{fontSize:'52px',marginBottom:'10px'}}>⏱</div>
            <h2 style={{color:'#00ff9f',fontSize:'clamp(18px,5vw,26px)',margin:'0 0 6px',letterSpacing:'3px'}}>TIME UP!</h2>
            <div style={{display:'flex',gap:'7px',justifyContent:'center',margin:'11px 0 20px',flexWrap:'wrap'}}>
              {([['SCORE',scoreRef.current],['LEVEL',level],['STREAK',`${bestStreak}🔥`],['ACC',`${accuracy}%`]] as [string,string|number][]).map(([l,v])=>(
                <span key={l} style={{fontSize:'11px',color:'rgba(0,255,159,0.65)',border:'1px solid rgba(0,255,159,0.22)',padding:'3px 9px',borderRadius:'5px'}}>{l}: {v}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:'9px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={startGame} style={{padding:'10px 18px',background:'rgba(0,255,159,0.13)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontSize:'13px',letterSpacing:'1px',fontFamily:font}}>PLAY AGAIN</button>
              <button onClick={()=>setPhase('select')} style={{padding:'10px 18px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontSize:'13px',letterSpacing:'1px',fontFamily:font}}>MENU</button>
              <button onClick={onBack} style={{padding:'10px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#555',cursor:'pointer',fontSize:'13px',fontFamily:font}}>EXIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';

// ─── CSS Injection ─────────────────────────────────────────────────────────
const _s = document.createElement('style');
_s.textContent = `
  @keyframes mmMatch{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(1)}}
  @keyframes mmWrong{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes mmCombo{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-36px) scale(1.4)}}
`;
if (!document.head.querySelector('[data-mm-styles]')) { _s.setAttribute('data-mm-styles','1'); document.head.appendChild(_s); }

// ─── Types ─────────────────────────────────────────────────────────────────
type Theme = 'fruits' | 'animals' | 'space';
type Diff  = 'easy' | 'medium' | 'hard';
interface Card { id: number; sym: string; state: 'face-down' | 'face-up' | 'matched'; }

interface MemoryMatchProps { onComplete: (score: number, level: number, duration: number) => void; onBack: () => void; }

// ─── Data ──────────────────────────────────────────────────────────────────
const SYMS: Record<Theme, string[]> = {
  fruits:  ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍍','🥥'],
  animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯'],
  space:   ['🚀','🌙','⭐','🪐','☄️','🌍','🔭','👾','🛸','🌌'],
};
const PAIRS:Record<Diff,number> = { easy:6, medium:8, hard:10 };
const COLS: Record<Diff,number> = { easy:4, medium:4, hard:5  };

// ─── Sound ─────────────────────────────────────────────────────────────────
function playSound(type: 'flip'|'match'|'wrong'|'win') {
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain(); g.connect(ctx.destination);
    const o = ctx.createOscillator(); o.connect(g);
    if (type==='flip')  { o.frequency.value=600;  g.gain.setValueAtTime(0.07,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.09); }
    if (type==='match') { o.type='sine'; o.frequency.value=880; g.gain.setValueAtTime(0.11,ctx.currentTime); o.frequency.setValueAtTime(1100,ctx.currentTime+0.1); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.32); }
    if (type==='wrong') { o.type='square'; o.frequency.value=180; g.gain.setValueAtTime(0.05,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2); }
    if (type==='win')   { o.type='sine'; o.frequency.setValueAtTime(660,ctx.currentTime); o.frequency.setValueAtTime(880,ctx.currentTime+0.15); o.frequency.setValueAtTime(1100,ctx.currentTime+0.3); g.gain.setValueAtTime(0.14,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.65); }
    o.start(); o.stop(ctx.currentTime+0.7);
  } catch(_){}
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}
function makeCards(theme: Theme, diff: Diff): Card[] {
  const syms = shuffle(SYMS[theme]).slice(0,PAIRS[diff]);
  return shuffle([...syms,...syms]).map((sym,id)=>({id,sym,state:'face-down' as const}));
}

const font = "'Courier New', Courier, monospace";

// ─── Component ────────────────────────────────────────────────────────────
export function MemoryMatch({ onComplete, onBack }: MemoryMatchProps) {
  const [phase, setPhase] = useState<'select'|'game'>('select');
  const [theme, setTheme] = useState<Theme>('fruits');
  const [diff,  setDiff]  = useState<Diff>('medium');
  const [cards,  setCards]  = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves,  setMoves]  = useState(0);
  const [matched,setMatched]= useState(0);
  const [combo,  setCombo]  = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [score,  setScore]  = useState(0);
  const [secs,   setSecs]   = useState(0);
  const [comboText, setComboText] = useState<string|null>(null);
  const [busy,   setBusy]   = useState(false);
  const startRef  = useRef(Date.now());
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const scoreRef  = useRef(0);

  const totalPairs = PAIRS[diff];
  const cols = COLS[diff];

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(()=>{ const h=()=>setWinW(window.innerWidth); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h); },[]);
  const maxBoard = Math.min(winW-32,520);
  const cs = Math.floor((maxBoard-(cols-1)*8)/cols);

  function startGame() {
    const fresh = makeCards(theme, diff);
    setCards(fresh); setFlipped([]); setMoves(0); setMatched(0);
    setCombo(0); setBestCombo(0); setScore(0); scoreRef.current=0;
    setSecs(0); setBusy(false); setComboText(null);
    startRef.current = Date.now();
    setPhase('game');
  }

  useEffect(()=>{
    if(phase!=='game') return;
    timerRef.current = setInterval(()=>setSecs(s=>s+1),1000);
    return ()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[phase]);

  function handleFlip(id: number) {
    if(busy || flipped.length===2) return;
    const card = cards[id];
    if(card.state!=='face-down') return;
    playSound('flip');
    const next = cards.map(c=>c.id===id?{...c,state:'face-up' as const}:c);
    setCards(next);
    const nf = [...flipped, id];
    setFlipped(nf);

    if(nf.length===2) {
      const [a,b]=nf; setBusy(true); setMoves(m=>m+1);
      if(next[a].sym===next[b].sym) {
        playSound('match');
        setCombo(prev=>{
          const nc=prev+1; setBestCombo(bc=>Math.max(bc,nc));
          const pts=100+nc*50; scoreRef.current+=pts; setScore(scoreRef.current);
          if(nc>=2) { setComboText(`${nc}x COMBO! +${pts}`); setTimeout(()=>setComboText(null),800); }
          return nc;
        });
        setTimeout(()=>{
          setCards(c=>c.map(card=>nf.includes(card.id)?{...card,state:'matched' as const}:card));
          setFlipped([]); setBusy(false);
          setMatched(m=>{
            const nm=m+1;
            if(nm===totalPairs){
              if(timerRef.current) clearInterval(timerRef.current);
              playSound('win');
              const dur=Math.floor((Date.now()-startRef.current)/1000);
              const fin=scoreRef.current+Math.max(0,500-secs*3);
              scoreRef.current=fin; setScore(fin);
              setTimeout(()=>onComplete(fin, diff==='easy'?1:diff==='medium'?2:3, dur),900);
            }
            return nm;
          });
        },500);
      } else {
        playSound('wrong'); setCombo(0);
        setTimeout(()=>{
          setCards(c=>c.map(card=>nf.includes(card.id)?{...card,state:'face-down' as const}:card));
          setFlipped([]); setBusy(false);
        },900);
      }
    }
  }

  const dc = diff==='easy'?'#00ff9f':diff==='medium'?'#ffcc00':'#ff4464';
  const accuracy = moves>0?Math.round((matched/moves)*100):100;
  const isWon = matched===totalPairs;

  // ── Select screen ──────────────────────────────────────────────
  if(phase==='select') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'24px',boxSizing:'border-box'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>🧠</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(20px,5vw,34px)',letterSpacing:'4px',margin:'0 0 4px'}}>MEMORY MATCH</h1>
      <p style={{color:'rgba(0,255,159,0.4)',fontSize:'11px',letterSpacing:'3px',margin:'0 0 34px'}}>FLIP · MATCH · REMEMBER</p>

      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>THEME</p>
      <div style={{display:'flex',gap:'10px',marginBottom:'26px',flexWrap:'wrap',justifyContent:'center'}}>
        {(['fruits','animals','space'] as Theme[]).map(t=>(
          <button key={t} onClick={()=>setTheme(t)} style={{padding:'9px 18px',background:theme===t?'rgba(0,255,159,0.16)':'rgba(255,255,255,0.04)',border:`1px solid ${theme===t?'rgba(0,255,159,0.7)':'rgba(255,255,255,0.14)'}`,borderRadius:'8px',color:theme===t?'#00ff9f':'rgba(255,255,255,0.45)',cursor:'pointer',fontSize:'13px',fontFamily:font,letterSpacing:'1px',textTransform:'uppercase'}}>
            {t==='fruits'?'🍎 Fruits':t==='animals'?'🐱 Animals':'🚀 Space'}
          </button>
        ))}
      </div>

      <p style={{color:'rgba(0,255,159,0.5)',fontSize:'10px',letterSpacing:'2px',marginBottom:'8px'}}>DIFFICULTY</p>
      <div style={{display:'flex',flexDirection:'column',gap:'9px',width:'min(260px,88vw)',marginBottom:'32px'}}>
        {(['easy','medium','hard'] as Diff[]).map(d=>{
          const col=d==='easy'?'#00ff9f':d==='medium'?'#ffcc00':'#ff4464';
          return (
            <button key={d} onClick={()=>setDiff(d)} style={{padding:'12px',background:diff===d?`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.14)`:'rgba(255,255,255,0.04)',border:`1px solid ${diff===d?col:'rgba(255,255,255,0.11)'}`,borderRadius:'9px',color:diff===d?col:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'13px',letterSpacing:'2px',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:font,transition:'all 0.15s'}}>
              <span>{d.toUpperCase()}</span>
              <span style={{fontSize:'10px',opacity:0.65}}>{PAIRS[d]} pairs · {COLS[d]} cols</span>
            </button>
          );
        })}
      </div>

      <button onClick={startGame} style={{padding:'14px 48px',background:'rgba(0,255,159,0.15)',border:'1px solid rgba(0,255,159,0.65)',borderRadius:'10px',color:'#00ff9f',cursor:'pointer',fontSize:'16px',letterSpacing:'3px',fontFamily:font,fontWeight:'bold'}}>
        START
      </button>
      <button onClick={onBack} style={{marginTop:'18px',padding:'8px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontSize:'11px',fontFamily:font,letterSpacing:'1px'}}>
        ← BACK
      </button>
    </div>
  );

  // ── Game screen ─────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'12px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>

        {/* Top bar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button onClick={onBack} style={{padding:'7px 13px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'7px',color:'#00ff9f',cursor:'pointer',fontSize:'11px',fontFamily:font,letterSpacing:'1px'}}>← BACK</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(13px,3.5vw,20px)',letterSpacing:'2px'}}>🧠 MEMORY MATCH</h1>
          <div style={{padding:'4px 9px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',letterSpacing:'1px'}}>{diff.toUpperCase()}</div>
        </div>

        {/* Stats row */}
        <div style={{display:'flex',gap:'6px',marginBottom:'9px'}}>
          {([['TIME',`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`],['MOVES',moves],['SCORE',score],['ACC',`${accuracy}%`]] as [string,string|number][]).map(([l,v])=>(
            <div key={l} style={{flex:1,padding:'7px 4px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.17)',borderRadius:'7px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.38)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'13px',fontWeight:'bold'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{width:'100%',height:'4px',background:'rgba(255,255,255,0.07)',borderRadius:'2px',marginBottom:'8px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(matched/totalPairs)*100}%`,background:'linear-gradient(90deg,#00ff9f,#00cc7a)',borderRadius:'2px',transition:'width 0.4s'}} />
        </div>

        {/* Combo */}
        <div style={{minHeight:'26px',textAlign:'center',marginBottom:'6px'}}>
          {comboText && <div style={{color:'#ffcc00',fontSize:'13px',fontWeight:'bold',letterSpacing:'2px',animation:'mmCombo 0.8s forwards'}}>{comboText}</div>}
          {combo>=2&&!comboText && <div style={{color:'rgba(255,204,0,0.55)',fontSize:'10px',letterSpacing:'1px'}}>{combo}x COMBO ACTIVE</div>}
        </div>

        {/* Card grid */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:'8px',margin:'0 auto'}}>
          {cards.map(card=>{
            const isUp    = card.state==='face-up'||card.state==='matched';
            const isMatch = card.state==='matched';
            return (
              <div key={card.id} onClick={()=>handleFlip(card.id)}
                style={{
                  width:cs, height:cs,
                  background:isMatch?'rgba(0,255,159,0.16)':isUp?'rgba(0,80,50,0.45)':'rgba(255,255,255,0.055)',
                  border:`2px solid ${isMatch?'rgba(0,255,159,0.75)':isUp?'rgba(0,255,159,0.45)':'rgba(255,255,255,0.1)'}`,
                  borderRadius:'10px',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:`${Math.min(cs*0.42,38)}px`,
                  cursor:card.state==='face-down'?'pointer':'default',
                  userSelect:'none',
                  transition:'background 0.2s,border 0.2s',
                  animation:isMatch?'mmMatch 0.45s ease':'none',
                  boxShadow:isMatch?'0 0 16px rgba(0,255,159,0.38)':'none',
                }}
              >
                {isUp?card.sym:<span style={{fontSize:`${Math.min(cs*0.3,22)}px`,color:'rgba(255,255,255,0.18)',fontWeight:'bold'}}>?</span>}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',padding:'0 2px'}}>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.3)',letterSpacing:'1px'}}>BEST COMBO: {bestCombo}x</span>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.3)',letterSpacing:'1px'}}>{matched}/{totalPairs} PAIRS</span>
        </div>
      </div>

      {/* Win overlay */}
      {isWon&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(0,255,159,0.5)',borderRadius:'16px',padding:'clamp(22px,5vw,42px) clamp(26px,6vw,50px)',textAlign:'center',maxWidth:'320px',width:'90vw'}}>
            <div style={{fontSize:'52px',marginBottom:'10px'}}>🏆</div>
            <h2 style={{color:'#00ff9f',fontSize:'clamp(18px,5vw,26px)',margin:'0 0 6px',letterSpacing:'3px'}}>COMPLETE!</h2>
            <div style={{display:'flex',gap:'7px',justifyContent:'center',margin:'11px 0 20px',flexWrap:'wrap'}}>
              {([['SCORE',score],['MOVES',moves],['COMBO',`${bestCombo}x`],['ACC',`${accuracy}%`]] as [string,string|number][]).map(([l,v])=>(
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



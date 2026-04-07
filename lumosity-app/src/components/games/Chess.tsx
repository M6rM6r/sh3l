import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Pulse keyframe injected once ───────────────────────────────
const _style = document.createElement('style');
_style.textContent = `@keyframes chessPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}} @keyframes chessFlash{0%,100%{background:transparent}50%{background:rgba(255,50,50,0.45)}}`;
if (!document.head.querySelector('[data-chess-styles]')) { _style.setAttribute('data-chess-styles','1'); document.head.appendChild(_style); }

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChessProps { onComplete: (score: number, level: number, duration: number) => void; onBack: () => void; }
type Color = 'white' | 'black';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';
interface Piece { type: PieceType; color: Color; hasMoved?: boolean; }
type Board = (Piece | null)[][];

// ─── Constants ────────────────────────────────────────────────────────────────
const PIECE_UNICODE: Record<PieceType, { white: string; black: string }> = {
  K:{white:'♔',black:'♚'}, Q:{white:'♕',black:'♛'}, R:{white:'♖',black:'♜'},
  B:{white:'♗',black:'♝'}, N:{white:'♘',black:'♞'}, P:{white:'♙',black:'♟'},
};
const PIECE_VALUE: Record<PieceType, number> = { K:0, Q:9, R:5, B:3, N:3, P:1 };
const DIFF_DEPTH: Record<Difficulty, number> = { easy:1, medium:2, hard:3 };
const DIFF_LABEL: Record<Difficulty, string>  = { easy:'EASY', medium:'MEDIUM', hard:'HARD' };
const DIFF_COLOR: Record<Difficulty, string>  = { easy:'#00ff9f', medium:'#ffcc00', hard:'#ff4464' };

// Piece-square tables (0.1× scaling applied in evaluate)
const PST: Partial<Record<PieceType, number[][]>> = {
  P: [[0,0,0,0,0,0,0,0],[5,5,5,5,5,5,5,5],[1,1,2,3,3,2,1,1],[0,0,0,2,2,0,0,0],[0,0,0,2,2,0,0,0],[0,1,-1,0,0,-1,1,0],[0,1,1,-2,-2,1,1,0],[0,0,0,0,0,0,0,0]],
  N: [[-5,-4,-3,-3,-3,-3,-4,-5],[-4,-2,0,0,0,0,-2,-4],[-3,0,1,2,2,1,0,-3],[-3,0,2,3,3,2,0,-3],[-3,0,2,3,3,2,0,-3],[-3,0,1,2,2,1,0,-3],[-4,-2,0,0,0,0,-2,-4],[-5,-4,-3,-3,-3,-3,-4,-5]],
  B: [[-2,-1,-1,-1,-1,-1,-1,-2],[-1,0,0,0,0,0,0,-1],[-1,0,1,1,1,1,0,-1],[-1,1,1,1,1,1,1,-1],[-1,0,1,1,1,1,0,-1],[-1,1,1,1,1,1,1,-1],[-1,0,0,0,0,0,0,-1],[-2,-1,-1,-1,-1,-1,-1,-2]],
};

// ─── Board helpers ────────────────────────────────────────────────────────────
function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const order: PieceType[] = ['R','N','B','Q','K','B','N','R'];
  for (let c=0;c<8;c++) {
    b[0][c]={type:order[c],color:'black'};  b[1][c]={type:'P',color:'black'};
    b[6][c]={type:'P',color:'white'};       b[7][c]={type:order[c],color:'white'};
  }
  return b;
}
function clone(board: Board): Board { return board.map(r=>r.map(c=>c?{...c}:null)); }
function inB(r:number,c:number){ return r>=0&&r<8&&c>=0&&c<8; }

// Returns squares attacked by enemies — used for castling legality (skipCastling=true prevents infinite recursion)
function pseudoMoves(board:Board, r:number, c:number, ep:[number,number]|null=null, skipCastling=false): [number,number][] {
  const piece=board[r][c]; if(!piece) return [];
  const {type,color}=piece; const enemy=color==='white'?'black':'white';
  const moves:[number,number][]=[];
  const slide=(dr:number,dc:number)=>{ let nr=r+dr,nc=c+dc; while(inB(nr,nc)){if(board[nr][nc]){if(board[nr][nc]!.color===enemy)moves.push([nr,nc]);break;}moves.push([nr,nc]);nr+=dr;nc+=dc;} };
  const step=(dr:number,dc:number)=>{ const nr=r+dr,nc=c+dc; if(inB(nr,nc)&&board[nr][nc]?.color!==color)moves.push([nr,nc]); };
  switch(type){
    case 'P':{ const dir=color==='white'?-1:1; const sr=color==='white'?6:1;
      if(inB(r+dir,c)&&!board[r+dir][c]){moves.push([r+dir,c]);if(r===sr&&!board[r+2*dir]?.[c])moves.push([r+2*dir,c]);}
      for(const dc of[-1,1])if(inB(r+dir,c+dc)){if(board[r+dir][c+dc]?.color===enemy)moves.push([r+dir,c+dc]);if(ep&&ep[0]===r+dir&&ep[1]===c+dc)moves.push([r+dir,c+dc]);}
      break;}
    case 'N': for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])step(dr,dc); break;
    case 'B': for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]])slide(dr,dc); break;
    case 'R': for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]])slide(dr,dc); break;
    case 'Q': for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])slide(dr,dc); break;
    case 'K':{
      for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])step(dr,dc);
      if(!skipCastling&&!piece.hasMoved){
        const row=color==='white'?7:0;
        if(r===row){
          const kR=board[row][7]; if(kR?.type==='R'&&!kR.hasMoved&&!board[row][5]&&!board[row][6]&&!sqAttacked(board,row,4,color)&&!sqAttacked(board,row,5,color)&&!sqAttacked(board,row,6,color))moves.push([row,6]);
          const qR=board[row][0]; if(qR?.type==='R'&&!qR.hasMoved&&!board[row][1]&&!board[row][2]&&!board[row][3]&&!sqAttacked(board,row,4,color)&&!sqAttacked(board,row,3,color)&&!sqAttacked(board,row,2,color))moves.push([row,2]);
        }
      }
      break;}
  }
  return moves;
}
function sqAttacked(board:Board,r:number,c:number,byEnemy_ofColor:Color):boolean{
  const enemy=byEnemy_ofColor==='white'?'black':'white';
  for(let er=0;er<8;er++)for(let ec=0;ec<8;ec++)if(board[er][ec]?.color===enemy)for(const[mr,mc]of pseudoMoves(board,er,ec,null,true))if(mr===r&&mc===c)return true;
  return false;
}
function inCheck(board:Board,color:Color):boolean{
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.type==='K'&&board[r][c]?.color===color)return sqAttacked(board,r,c,color);
  return false;
}
interface MoveResult { board:Board; newEP:[number,number]|null; castled:boolean; }
function applyMove(board:Board,fr:number,fc:number,tr:number,tc:number,ep:[number,number]|null=null):MoveResult{
  const nb=clone(board); const moving=nb[fr][fc]!; let castled=false; let newEP:[number,number]|null=null;
  if(moving.type==='P'&&ep&&tr===ep[0]&&tc===ep[1]){const cr=moving.color==='white'?tr+1:tr-1;nb[cr][tc]=null;}
  if(moving.type==='K'&&Math.abs(tc-fc)===2){castled=true;if(tc===6){nb[tr][5]=nb[tr][7];nb[tr][7]=null;if(nb[tr][5])nb[tr][5]!.hasMoved=true;}else{nb[tr][3]=nb[tr][0];nb[tr][0]=null;if(nb[tr][3])nb[tr][3]!.hasMoved=true;}}
  nb[tr][tc]={...moving,hasMoved:true}; nb[fr][fc]=null;
  if(nb[tr][tc]?.type==='P'&&(tr===0||tr===7))nb[tr][tc]={type:'Q',color:nb[tr][tc]!.color,hasMoved:true};
  if(moving.type==='P'&&Math.abs(tr-fr)===2)newEP=[(fr+tr)/2,tc];
  return{board:nb,newEP,castled};
}
function legalMoves(board:Board,r:number,c:number,ep:[number,number]|null=null):[number,number][]{
  const piece=board[r][c]; if(!piece) return [];
  return pseudoMoves(board,r,c,ep).filter(([tr,tc])=>{ const{board:nb}=applyMove(board,r,c,tr,tc,ep); return !inCheck(nb,piece.color); });
}
function hasLegal(board:Board,color:Color,ep:[number,number]|null):boolean{
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&legalMoves(board,r,c,ep).length>0)return true;
  return false;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
function evaluate(board:Board):number{
  let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c]; if(!p)continue;
    const row=p.color==='black'?r:7-r;
    const pos=(PST[p.type]?PST[p.type]![row][c]:0)*0.1;
    s+=(p.color==='black'?1:-1)*(PIECE_VALUE[p.type]*10+pos);
  }
  return s;
}
function minimax(board:Board,depth:number,alpha:number,beta:number,max:boolean,ep:[number,number]|null):number{
  if(depth===0)return evaluate(board);
  const color:Color=max?'black':'white';
  if(!hasLegal(board,color,ep))return inCheck(board,color)?(max?-1000:1000):0;
  let best=max?-Infinity:Infinity;
  outer: for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(board[r][c]?.color!==color)continue;
    for(const[tr,tc]of legalMoves(board,r,c,ep)){
      const{board:nb,newEP}=applyMove(board,r,c,tr,tc,ep);
      const val=minimax(nb,depth-1,alpha,beta,!max,newEP);
      if(max){best=Math.max(best,val);alpha=Math.max(alpha,val);}else{best=Math.min(best,val);beta=Math.min(beta,val);}
      if(beta<=alpha)break outer;
    }
  }
  return best;
}
function bestMove(board:Board,depth:number,ep:[number,number]|null):[number,number,number,number]|null{
  const moves:{r:number;c:number;tr:number;tc:number;val:number}[]=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    if(board[r][c]?.color!=='black')continue;
    for(const[tr,tc]of legalMoves(board,r,c,ep)){
      const{board:nb,newEP}=applyMove(board,r,c,tr,tc,ep);
      moves.push({r,c,tr,tc,val:minimax(nb,depth-1,-Infinity,Infinity,false,newEP)});
    }
  }
  if(!moves.length)return null;
  const best=Math.max(...moves.map(m=>m.val));
  const pool=moves.filter(m=>m.val===best);
  const p=pool[Math.floor(Math.random()*pool.length)];
  return[p.r,p.c,p.tr,p.tc];
}

// ─── Sound ────────────────────────────────────────────────────────────────────
type SoundType='move'|'capture'|'check'|'castle'|'win'|'lose';
function playSound(ctx:AudioContext|null,type:SoundType){
  if(!ctx)return;
  const t=ctx.currentTime;
  const beep=(freq:number,dur:number,vol:number,wave:OscillatorType='sine',delay=0)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);o.type=wave;
    o.frequency.setValueAtTime(freq,t+delay);
    g.gain.setValueAtTime(vol,t+delay);g.gain.exponentialRampToValueAtTime(0.001,t+delay+dur);
    o.start(t+delay);o.stop(t+delay+dur);
  };
  if(type==='move')    beep(440,0.12,0.12);
  if(type==='capture') {beep(220,0.08,0.2);beep(180,0.15,0.2,'sine',0.08);}
  if(type==='check')   beep(320,0.28,0.18,'sawtooth');
  if(type==='castle')  {beep(523,0.12,0.13);beep(659,0.12,0.13,'sine',0.1);}
  if(type==='win')     [523,659,784,1046].forEach((f,i)=>beep(f,0.15,0.18,'sine',i*0.12));
  if(type==='lose')    [400,340,280,220].forEach((f,i)=>beep(f,0.18,0.15,'sine',i*0.14));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Chess({ onComplete, onBack }: ChessProps) {
  const [phase,  setPhase]  = useState<'select'|'game'>('select');
  const [diff,   setDiff]   = useState<Difficulty>('medium');
  const [board,  setBoard]  = useState<Board>(initBoard);
  const [sel,    setSel]    = useState<[number,number]|null>(null);
  const [dots,   setDots]   = useState<Set<string>>(new Set());
  const [turn,   setTurn]   = useState<Color>('white');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [captB,  setCaptB]  = useState<Piece[]>([]);  // captured by black
  const [captW,  setCaptW]  = useState<Piece[]>([]);  // captured by white
  const [moves,  setMoves]  = useState(0);
  const [score,  setScore]  = useState(0);
  const [secs,   setSecs]   = useState(0);
  const [aiWork, setAiWork] = useState(false);
  const [lastMv, setLastMv] = useState<[number,number,number,number]|null>(null);
  const [ep,     setEp]     = useState<[number,number]|null>(null);
  const [anim,   setAnim]   = useState<string|null>(null);
  const [flash,  setFlash]  = useState(false);
  const boardRef   = useRef(board);   boardRef.current = board;
  const epRef      = useRef(ep);      epRef.current    = ep;
  const audioRef   = useRef<AudioContext|null>(null);
  const startRef   = useRef(Date.now());
  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);

  const snd = (t:SoundType) => { if(!audioRef.current) audioRef.current = (() => { try{return new AudioContext();}catch{return null;} })(); playSound(audioRef.current,t); };

  // Timer
  useEffect(()=>{
    if(phase!=='game'||status==='checkmate'||status==='stalemate')return;
    timerRef.current=setInterval(()=>setSecs(s=>s+1),1000);
    return()=>{ if(timerRef.current)clearInterval(timerRef.current); };
  },[phase,status]);

  const calcStatus = useCallback((b:Board,color:Color,e:[number,number]|null):GameStatus=>{
    const c=inCheck(b,color),h=hasLegal(b,color,e);
    if(!h)return c?'checkmate':'stalemate'; if(c)return 'check'; return 'playing';
  },[]);

  // AI turn
  useEffect(()=>{
    if(phase!=='game'||turn!=='black'||status==='checkmate'||status==='stalemate')return;
    setAiWork(true);
    const delay=diff==='easy'?350:diff==='medium'?550:800;
    const id=setTimeout(()=>{
      const mv=bestMove(boardRef.current,DIFF_DEPTH[diff],epRef.current);
      if(mv){
        const[fr,fc,tr,tc]=mv;
        const cap=boardRef.current[tr][tc];
        const moving=boardRef.current[fr][fc];
        const isEP=moving?.type==='P'&&epRef.current&&tr===epRef.current[0]&&tc===epRef.current[1];
        const{board:nb,newEP,castled}=applyMove(boardRef.current,fr,fc,tr,tc,epRef.current);
        if(cap){setCaptB(p=>[...p,cap]);setScore(s=>s+PIECE_VALUE[cap.type]*8);}
        else if(isEP)setCaptB(p=>[...p,{type:'P',color:'white'}]);
        setBoard(nb); setLastMv([fr,fc,tr,tc]); setEp(newEP); setMoves(m=>m+1);
        setAnim(`${tr},${tc}`); setTimeout(()=>setAnim(null),300);
        const ns=calcStatus(nb,'white',newEP); setStatus(ns); setTurn('white');
        if(castled)snd('castle'); else if(cap||isEP)snd('capture'); else snd('move');
        if(ns==='check'){snd('check');setFlash(true);setTimeout(()=>setFlash(false),600);}
        if(ns==='checkmate')snd('lose');
      }
      setAiWork(false);
    },delay);
    return()=>clearTimeout(id);
  },[turn,phase,status,diff,calcStatus]);

  // Cell click (player)
  const handleClick=(r:number,c:number)=>{
    if(turn!=='white'||aiWork||status==='checkmate'||status==='stalemate')return;
    if(sel){
      const[sr,sc]=sel; const key=`${r},${c}`;
      if(dots.has(key)){
        const cap=board[r][c]; const moving=board[sr][sc];
        const isEP=moving?.type==='P'&&ep&&r===ep[0]&&c===ep[1];
        const{board:nb,newEP,castled}=applyMove(board,sr,sc,r,c,ep);
        if(cap){setCaptW(p=>[...p,cap]);setScore(s=>s+PIECE_VALUE[cap.type]*10);}
        else if(isEP){setCaptW(p=>[...p,{type:'P',color:'black'}]);setScore(s=>s+10);}
        setBoard(nb); setLastMv([sr,sc,r,c]); setEp(newEP); setMoves(m=>m+1);
        setAnim(`${r},${c}`); setTimeout(()=>setAnim(null),300);
        const ns=calcStatus(nb,'black',newEP); setStatus(ns);
        setSel(null); setDots(new Set()); setTurn('black');
        if(castled)snd('castle'); else if(cap||isEP)snd('capture'); else snd('move');
        if(ns==='check'){snd('check');setFlash(true);setTimeout(()=>setFlash(false),600);}
        if(ns==='checkmate'){setScore(s=>s+300);snd('win');}
      } else if(board[r][c]?.color==='white'){
        const ms=legalMoves(board,r,c,ep);
        setSel([r,c]); setDots(new Set(ms.map(([mr,mc])=>`${mr},${mc}`)));
      } else { setSel(null); setDots(new Set()); }
    } else {
      if(board[r][c]?.color!=='white')return;
      const ms=legalMoves(board,r,c,ep);
      setSel([r,c]); setDots(new Set(ms.map(([mr,mc])=>`${mr},${mc}`)));
    }
  };

  const reset=()=>{
    setBoard(initBoard()); setSel(null); setDots(new Set()); setTurn('white');
    setStatus('playing'); setCaptB([]); setCaptW([]); setMoves(0); setScore(0);
    setSecs(0); setLastMv(null); setEp(null); startRef.current=Date.now();
  };

  const exit=()=>{ onComplete(score,DIFF_DEPTH[diff],Math.floor((Date.now()-startRef.current)/1000)); onBack(); };

  const isLast=(r:number,c:number)=>lastMv&&([`${lastMv[0]},${lastMv[1]}`,`${lastMv[2]},${lastMv[3]}`].includes(`${r},${c}`));
  const cs=Math.min(62,Math.floor((Math.min(typeof window!=='undefined'?window.innerWidth:480,520)-48)/8));

  const cellBg=(r:number,c:number)=>{
    const light=(r+c)%2===0; const key=`${r},${c}`;
    const isSel=sel?.[0]===r&&sel?.[1]===c;
    const isDot=dots.has(key); const isLast2=isLast(r,c);
    const isKingCheck=flash&&status==='check'&&board[r][c]?.type==='K'&&board[r][c]?.color===turn;
    if(isSel)return'rgba(0,255,159,0.42)';
    if(isDot)return board[r][c]?'rgba(255,60,60,0.5)':'rgba(0,255,159,0.22)';
    if(isKingCheck)return'rgba(255,50,50,0.52)';
    if(isLast2)return light?'rgba(0,200,120,0.26)':'rgba(0,150,80,0.3)';
    return light?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.38)';
  };

  const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const matW=captW.reduce((a,p)=>a+PIECE_VALUE[p.type],0);
  const matB=captB.reduce((a,p)=>a+PIECE_VALUE[p.type],0);
  const isOver=status==='checkmate'||status==='stalemate';
  const dc=DIFF_COLOR[diff];

  const statusMsg=()=>{
    if(status==='checkmate')return turn==='white'?'♟ Black wins by checkmate!':'♔ You win by checkmate!';
    if(status==='stalemate')return'½ Stalemate — Draw';
    if(status==='check')return turn==='white'?'⚠ YOUR KING IS IN CHECK!':'⚠ Black king in check!';
    if(aiWork)return`⏳ AI thinking${diff==='hard'?' (hard)':''}…`;
    return turn==='white'?'♙ Your turn (White)':'♟ AI turn (Black)';
  };

  const font="'Courier New',monospace";

  // ── Select screen ──────────────────────────────────────────────────────────
  if(phase==='select') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:font,padding:'24px',boxSizing:'border-box'}}>
      <div style={{fontSize:'clamp(48px,10vw,72px)',marginBottom:'8px'}}>♟</div>
      <h1 style={{color:'#00ff9f',fontSize:'clamp(24px,6vw,38px)',letterSpacing:'4px',margin:'0 0 6px'}}>CHESS</h1>
      <p style={{color:'rgba(0,255,159,0.45)',fontSize:'12px',letterSpacing:'3px',margin:'0 0 48px'}}>PLAY VS AI</p>
      <div style={{display:'flex',flexDirection:'column',gap:'12px',width:'min(280px,90vw)'}}>
        {(['easy','medium','hard'] as Difficulty[]).map(d=>(
          <button key={d} onClick={()=>{setDiff(d);reset();setPhase('game');}}
            style={{padding:'18px',background:`rgba(${d==='easy'?'0,255,159':d==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`2px solid ${DIFF_COLOR[d]}`,borderRadius:'12px',color:DIFF_COLOR[d],fontSize:'17px',letterSpacing:'3px',cursor:'pointer',fontFamily:font,transition:'transform 0.15s,box-shadow 0.15s',boxShadow:`0 0 0 rgba(0,0,0,0)`}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform='scale(1.04)';(e.currentTarget as HTMLButtonElement).style.boxShadow=`0 0 20px ${DIFF_COLOR[d]}44`;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='';(e.currentTarget as HTMLButtonElement).style.boxShadow='';}}
          >
            {DIFF_LABEL[d]}
          </button>
        ))}
      </div>
      <button onClick={onBack} style={{marginTop:'36px',padding:'10px 24px',background:'transparent',border:'1px solid rgba(255,255,255,0.18)',borderRadius:'8px',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontFamily:font,fontSize:'12px',letterSpacing:'2px'}}>← BACK</button>
    </div>
  );

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)',padding:'14px',fontFamily:font,color:'#00ff9f',boxSizing:'border-box'}}>
      <div style={{maxWidth:'540px',margin:'0 auto'}}>

        {/* Top bar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
          <button onClick={onBack} style={{padding:'8px 16px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(0,255,159,0.3)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontSize:'13px',fontFamily:font}}>← Back</button>
          <h1 style={{color:'#00ff9f',margin:0,fontSize:'clamp(16px,4vw,24px)',letterSpacing:'2px'}}>♟ CHESS</h1>
          <div style={{padding:'5px 10px',background:`rgba(${diff==='easy'?'0,255,159':diff==='medium'?'255,204,0':'255,68,100'},0.1)`,border:`1px solid ${dc}`,borderRadius:'6px',color:dc,fontSize:'10px',letterSpacing:'2px'}}>{DIFF_LABEL[diff]}</div>
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          {([{l:'SCORE',v:score},{l:'MOVES',v:moves},{l:'TIME',v:fmt(secs)}]).map(({l,v})=>(
            <div key={l} style={{flex:1,padding:'8px 6px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(0,255,159,0.22)',borderRadius:'8px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'rgba(0,255,159,0.45)',letterSpacing:'1px',marginBottom:'2px'}}>{l}</div>
              <div style={{fontSize:'14px',fontWeight:'bold'}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Captured by black */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'24px',marginBottom:'5px',padding:'0 2px'}}>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.35)',letterSpacing:'1px'}}>AI captured</span>
          <span style={{fontSize:'16px'}}>{captB.map((p,i)=><span key={i}>{PIECE_UNICODE[p.type][p.color]}</span>)}</span>
          <span style={{fontSize:'11px',color:'rgba(255,100,100,0.7)'}}>{matB>0?`−${matB}`:''}</span>
        </div>

        {/* Board */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:'5px'}}>
          <div style={{border:`2px solid ${status==='check'&&turn==='white'?'rgba(255,80,80,0.7)':'rgba(0,255,159,0.4)'}`,borderRadius:'8px',overflow:'hidden',boxShadow:`0 0 ${status==='check'&&turn==='white'?'40px rgba(255,60,60,0.25)':'24px rgba(0,255,159,0.1)'}`,transition:'border-color 0.3s,box-shadow 0.3s',display:'flex',flexDirection:'column'}}>
            {board.map((row,r)=>(
              <div key={r} style={{display:'flex'}}>
                {row.map((piece,c)=>{
                  const key=`${r},${c}`; const isAnimCell=anim===key;
                  return (
                    <div key={c} onClick={()=>handleClick(r,c)}
                      style={{width:cs,height:cs,background:cellBg(r,c),display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.max(20,cs-14)+'px',cursor:turn==='white'&&!aiWork?'pointer':'default',position:'relative',userSelect:'none',borderRight:c<7?'1px solid rgba(0,255,159,0.06)':'none',borderBottom:r<7?'1px solid rgba(0,255,159,0.06)':'none',transition:'background 0.15s',WebkitTapHighlightColor:'transparent'}}>
                      {dots.has(key)&&!piece&&(
                        <div style={{width:cs*0.3,height:cs*0.3,borderRadius:'50%',background:'rgba(0,255,159,0.65)',position:'absolute',boxShadow:'0 0 8px rgba(0,255,159,0.5)',animation:'chessPulse 1.1s ease-in-out infinite'}} />
                      )}
                      {piece&&(
                        <span style={{lineHeight:1,zIndex:1,filter:piece.color==='white'?'drop-shadow(0 0 7px rgba(0,255,159,0.9))':'drop-shadow(0 0 3px rgba(0,0,0,0.95))',transform:isAnimCell?'scale(1.3)':'scale(1)',transition:'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',display:'inline-block'}}>
                          {PIECE_UNICODE[piece.type][piece.color]}
                        </span>
                      )}
                      {c===0&&<span style={{position:'absolute',top:1,left:2,fontSize:'8px',color:'rgba(0,255,159,0.28)',fontWeight:700,lineHeight:1}}>{8-r}</span>}
                      {r===7&&<span style={{position:'absolute',bottom:1,right:2,fontSize:'8px',color:'rgba(0,255,159,0.28)',fontWeight:700,lineHeight:1}}>{String.fromCharCode(97+c)}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Captured by white */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:'24px',marginBottom:'10px',padding:'0 2px'}}>
          <span style={{fontSize:'10px',color:'rgba(0,255,159,0.35)',letterSpacing:'1px'}}>You captured</span>
          <span style={{fontSize:'16px'}}>{captW.map((p,i)=><span key={i}>{PIECE_UNICODE[p.type][p.color]}</span>)}</span>
          <span style={{fontSize:'11px',color:'rgba(0,255,159,0.7)'}}>{matW>0?`+${matW}`:''}</span>
        </div>

        {/* Status */}
        <div style={{textAlign:'center',padding:'11px',borderRadius:'10px',border:`1px solid ${status==='check'?'rgba(255,80,80,0.5)':status==='checkmate'?'rgba(255,60,60,0.6)':'rgba(0,255,159,0.28)'}`,background:status==='check'||status==='checkmate'?'rgba(255,50,50,0.07)':'rgba(0,255,159,0.04)',color:status==='check'||status==='checkmate'?'#ff6464':'#00ff9f',fontSize:'13px',letterSpacing:'1px',transition:'all 0.3s',animation:status==='check'&&turn==='white'?'chessFlash 0.3s ease-in-out 2':'none'}}>
          {statusMsg()}
        </div>
        <p style={{textAlign:'center',color:'rgba(0,255,159,0.3)',fontSize:'10px',letterSpacing:'1px',margin:'8px 0 0'}}>tap piece → tap dot · castling &amp; en passant enabled</p>
      </div>

      {/* Game over overlay */}
      {isOver&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'linear-gradient(135deg,#0d1117,#1a1a2e)',border:'2px solid rgba(0,255,159,0.5)',borderRadius:'16px',padding:'clamp(24px,5vw,44px) clamp(28px,6vw,52px)',textAlign:'center',boxShadow:'0 0 60px rgba(0,255,159,0.18)',maxWidth:'320px',width:'90%',fontFamily:font}}>
            <div style={{fontSize:'clamp(44px,10vw,68px)',marginBottom:'10px'}}>{status==='checkmate'?(turn==='white'?'♟':'♔'):'🤝'}</div>
            <h2 style={{color:status==='checkmate'&&turn==='white'?'#ff4464':'#00ff9f',fontSize:'clamp(20px,5vw,28px)',margin:'0 0 6px',letterSpacing:'3px'}}>
              {status==='checkmate'?(turn==='white'?'BLACK WINS':'YOU WIN!'):'DRAW'}
            </h2>
            <div style={{display:'flex',gap:'8px',justifyContent:'center',margin:'10px 0 22px',flexWrap:'wrap'}}>
              {[{l:`${moves} moves`},{l:fmt(secs)},{l:`SCORE: ${score}`}].map(({l})=>(
                <span key={l} style={{fontSize:'11px',color:'rgba(0,255,159,0.65)',border:'1px solid rgba(0,255,159,0.22)',padding:'3px 9px',borderRadius:'5px'}}>{l}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:'9px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={reset}            style={{padding:'11px 20px',background:'rgba(0,255,159,0.13)',border:'1px solid rgba(0,255,159,0.45)',borderRadius:'8px',color:'#00ff9f',cursor:'pointer',fontSize:'13px',letterSpacing:'1px',fontFamily:font}}>Play Again</button>
              <button onClick={()=>setPhase('select')} style={{padding:'11px 20px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:'8px',color:'#aaa',cursor:'pointer',fontSize:'13px',letterSpacing:'1px',fontFamily:font}}>Menu</button>
              <button onClick={exit}             style={{padding:'11px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#555',cursor:'pointer',fontSize:'13px',letterSpacing:'1px',fontFamily:font}}>Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



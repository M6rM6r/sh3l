import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 1rem;
`;

const Header = styled.div`
  text-align: center;
  font-size: 1rem;
  color: #a5b4fc;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const Cell = styled.button<{ $hit: boolean }>`
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 12px;
  background: ${p => p.$hit ? '#22c55e' : 'rgba(255,255,255,0.09)'};
  cursor: pointer;
  font-size: 1.3rem;
  transition: background 0.2s, transform 0.15s;
  &:hover:not(:disabled) { transform: scale(1.07); }
`;

const FlashCell = styled(Cell)`
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  animation: flash 0.18s;
  @keyframes flash { 0%{opacity:1} 50%{opacity:0.3} 100%{opacity:1} }
`;

const FooterRow = styled.div`
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.5);
`;

interface Props { onComplete: (points: number) => void; }

const GRID = 25;

const AttentionGrid = ({ onComplete }: Props) => {
  const [targets, setTargets] = useState<number[]>([]);
  const [hit, setHit] = useState<number[]>([]);
  const [miss, setMiss] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(35);
  const [ready, setReady] = useState(false);

  const genTargets = useCallback((lvl: number) => {
    const count = Math.min(3 + Math.floor(lvl / 2), 9);
    const t: number[] = [];
    while (t.length < count) {
      const p = Math.floor(Math.random() * GRID);
      if (!t.includes(p)) t.push(p);
    }
    return t;
  }, []);

  useEffect(() => {
    setTargets(genTargets(1));
    setReady(true);
  }, [genTargets]);

  useEffect(() => {
    if (timeLeft <= 0) { onComplete(score); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, score, onComplete]);

  const handleClick = (idx: number) => {
    if (!ready || hit.includes(idx) || miss.includes(idx)) return;
    if (targets.includes(idx)) {
      const newHit = [...hit, idx];
      setHit(newHit);
      const gained = 100 + Math.floor(timeLeft / 2);
      setScore(s => s + gained);
      if (newHit.length === targets.length) {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        setHit([]);
        setMiss([]);
        setTargets(genTargets(nextLevel));
      }
    } else {
      setMiss(m => [...m, idx]);
      setScore(s => Math.max(0, s - 50));
    }
  };

  return (
    <Wrapper>
      <Header>
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Attention Grid</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          Click the highlighted cells as fast as you can!
        </div>
      </Header>
      <Grid>
        {Array.from({ length: GRID }).map((_, i) => {
          const isTarget = targets.includes(i);
          const isHit = hit.includes(i);
          const isMiss = miss.includes(i);
          if (isTarget && !isHit) {
            return <FlashCell key={i} $hit={false} onClick={() => handleClick(i)} />;
          }
          return (
            <Cell
              key={i}
              $hit={isHit}
              onClick={() => handleClick(i)}
              disabled={isHit || isMiss}
              style={isMiss ? { background: 'rgba(239,68,68,0.4)' } : undefined}
            >
              {isHit ? '✓' : isMiss ? '✗' : ''}
            </Cell>
          );
        })}
      </Grid>
      <FooterRow>
        <span>⏱ {timeLeft}s</span>
        <span>⭐ {score}</span>
        <span>Level {level}</span>
        <span>{hit.length}/{targets.length} found</span>
      </FooterRow>
    </Wrapper>
  );
};

export default AttentionGrid;



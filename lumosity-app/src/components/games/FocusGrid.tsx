import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 1rem;
`;

const Header = styled.div`
  text-align: center;
  font-size: 1.1rem;
  color: #a5b4fc;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const Cell = styled.button<{ $found: boolean; $reveal: boolean }>`
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 12px;
  background: ${p => p.$found ? '#22c55e' : p.$reveal ? 'rgba(108,99,255,0.55)' : 'rgba(255,255,255,0.09)'};
  cursor: pointer;
  font-size: 1.4rem;
  transition: background 0.2s, transform 0.15s;
  outline: ${p => p.$reveal && !p.$found ? '2px solid rgba(108,99,255,0.8)' : 'none'};

  &:hover:not(:disabled) { transform: scale(1.08); }
`;

const FooterRow = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.55);
`;

interface FocusGridProps {
  onComplete: (points: number) => void;
}

const GRID_SIZE = 25;
const TARGET_COUNT = 5;
const REVEAL_MS = 1500;

const FocusGrid = ({ onComplete }: FocusGridProps) => {
  const [targets, setTargets] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [revealPhase, setRevealPhase] = useState(true);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [round, setRound] = useState(1);

  const newRound = useCallback(() => {
    const t: number[] = [];
    while (t.length < TARGET_COUNT) {
      const p = Math.floor(Math.random() * GRID_SIZE);
      if (!t.includes(p)) t.push(p);
    }
    setTargets(t);
    setFound([]);
    setRevealPhase(true);
    setTimeout(() => setRevealPhase(false), REVEAL_MS);
  }, []);

  useEffect(() => { newRound(); }, [newRound]);

  useEffect(() => {
    if (timeLeft <= 0) { onComplete(score); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, score, onComplete]);

  const handleClick = (idx: number) => {
    if (revealPhase || found.includes(idx)) return;
    if (targets.includes(idx)) {
      const newFound = [...found, idx];
      setFound(newFound);
      const gained = 100;
      setScore(s => s + gained);
      if (newFound.length === targets.length) {
        const bonus = timeLeft * 10;
        setScore(s => s + bonus);
        setRound(r => r + 1);
        newRound();
      }
    } else {
      setScore(s => Math.max(0, s - 25));
    }
  };

  return (
    <Wrapper>
      <Header>
        {revealPhase
          ? '👁 Memorize the targets!'
          : '🎯 Click all highlighted cells!'}
      </Header>
      <Grid>
        {Array.from({ length: GRID_SIZE }).map((_, i) => (
          <Cell
            key={i}
            $found={found.includes(i)}
            $reveal={revealPhase && targets.includes(i)}
            onClick={() => handleClick(i)}
            disabled={revealPhase}
          >
            {found.includes(i) ? '✓' : ''}
          </Cell>
        ))}
      </Grid>
      <FooterRow>
        <span>⏱ {timeLeft}s</span>
        <span>⭐ {score}</span>
        <span>🔍 {found.length}/{TARGET_COUNT}</span>
        <span>Level {round}</span>
      </FooterRow>
    </Wrapper>
  );
};

export default FocusGrid;



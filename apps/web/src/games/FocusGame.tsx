import { useState, useEffect } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  text-align: center;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  max-width: 350px;
  margin: 0 auto;
`;

const Cell = styled.button<{ $isTarget: boolean; $found: boolean }>`
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 12px;
  background: ${props => props.$found ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'};
  cursor: pointer;
  font-size: 1.5rem;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const Status = styled.div`
  font-size: 1.25rem;
  color: #a5b4fc;
  margin-bottom: 1.5rem;
`;

interface FocusGameProps {
  onComplete: (points: number) => void;
}

const FocusGame = ({ onComplete }: FocusGameProps) => {
  const [targets] = useState<number[]>(() => {
    const newTargets: number[] = [];
    while (newTargets.length < 5) {
      const pos = Math.floor(Math.random() * 25);
      if (!newTargets.includes(pos)) {
        newTargets.push(pos);
      }
    }
    return newTargets;
  });
  const [found, setFound] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else {
      onComplete(score);
    }
  }, [timeLeft, score, onComplete]);
  
  const handleCellClick = (index: number) => {
    if (found.includes(index)) return;
    
    if (targets.includes(index)) {
      setFound([...found, index]);
      setScore(s => s + 100);
      
      if (found.length + 1 === targets.length) {
        onComplete(score + 100 + timeLeft * 10);
      }
    } else {
      setScore(s => Math.max(0, s - 25));
    }
  };
  
  return (
    <GameArea>
      <Status>Find the hidden targets! | Score: {score} | Time: {timeLeft}s</Status>
      <Grid>
        {Array.from({ length: 25 }).map((_, index) => (
          <Cell
            key={index}
            $isTarget={targets.includes(index)}
            $found={found.includes(index)}
            onClick={() => handleCellClick(index)}
          >
            {found.includes(index) ? '✓' : ''}
          </Cell>
        ))}
      </Grid>
      <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>
        Found: {found.length} / {targets.length}
      </div>
    </GameArea>
  );
};

export default FocusGame;

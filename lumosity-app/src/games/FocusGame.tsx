import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { audioManager } from '../utils/audio';

const GameContainer = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0 16px;
`;

const GameArea = styled.div`
  text-align: center;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(8px, 2vw, 12px);
  max-width: min(350px, 95vw);
  margin: 0 auto;
  
  @media (max-width: 360px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
`;

const Cell = styled.button<{ $isTarget: boolean; $found: boolean }>`
  width: clamp(52px, 16vw, 60px);
  height: clamp(52px, 16vw, 60px);
  border: none;
  border-radius: clamp(8px, 2vw, 12px);
  background: ${props => props.$found ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'};
  cursor: pointer;
  font-size: clamp(20px, 6vw, 24px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    transform: scale(0.92);
  }
  
  @media (hover: hover) {
    &:hover {
      transform: scale(1.1);
    }
  }
`;

const Status = styled.div`
  font-size: clamp(18px, 5vw, 20px);
  color: #a5b4fc;
  margin-bottom: clamp(1rem, 4vw, 1.5rem);
  font-weight: 600;
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
      audioManager.playCorrect();
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setFound([...found, index]);
      setScore(s => s + 100);
      
      if (found.length + 1 === targets.length) {
        audioManager.playGameOver();
        onComplete(score + 100 + timeLeft * 10);
      }
    } else {
      audioManager.playWrong();
      if (navigator.vibrate) navigator.vibrate(50);
      setScore(s => Math.max(0, s - 25));
    }
  };
  
  return (
    <GameContainer>
      <GameArea>
        <Status>Find the hidden targets!</Status>
        
        <div style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{score}</div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Score | Time: {timeLeft}s</div>
        </div>
        
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
        
        <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Found: {found.length} / {targets.length}
        </div>
      </GameArea>
    </GameContainer>
  );
};

export default FocusGame;



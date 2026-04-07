import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { audioManager } from '../utils/audio';

const GameContainer = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0 16px;
`;

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(16px, 4vw, 20px);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(6px, 2vw, 8px);
  max-width: min(350px, 95vw);
  margin: 0 auto;
  
  @media (max-width: 360px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  }
`;

const Cell = styled.button<{ $hasTarget: boolean; $found: boolean }>`
  width: clamp(48px, 18vw, 60px);
  height: clamp(48px, 18vw, 60px);
  border: none;
  border-radius: clamp(8px, 2vw, 12px);
  background: ${(props: { $hasTarget: boolean; $found: boolean }) => 
    props.$found 
      ? '#2ecc71' 
      : props.$hasTarget 
        ? '#e74c3c' 
        : 'rgba(255, 255, 255, 0.1)'};
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
      transform: scale(1.05);
    }
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: clamp(18px, 5vw, 20px);
  color: #ffd700;
  font-weight: 600;
`;

const ScoreBoard = styled.div`
  display: flex;
  gap: 24px;
  font-size: clamp(16px, 4vw, 18px);
  color: #a0a0a0;
  
  .stat {
    text-align: center;
    
    .label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .value {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }
  }
`;

interface AttentionGameProps {
  onComplete: (points: number) => void;
}

const AttentionGame = ({ onComplete }: AttentionGameProps) => {
  const [grid, setGrid] = useState<boolean[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gridInitialized, setGridInitialized] = useState(false);
  
  const generateGrid = useCallback(() => {
    const size = 25;
    const targetCount = Math.min(3 + Math.floor(round / 3), 8);
    const newGrid = Array(size).fill(false);
    
    for (let i = 0; i < targetCount; i++) {
      let pos;
      do {
        pos = Math.floor(Math.random() * size);
      } while (newGrid[pos]);
      newGrid[pos] = true;
    }
    
    setGrid(newGrid);
    setFound([]);
  }, [round]);
  
  useEffect(() => {
    if (!gridInitialized) {
      generateGrid();
      setGridInitialized(true);
    }
  }, [generateGrid, gridInitialized]);
  
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
    
    if (grid[index]) {
      audioManager.playCorrect();
      if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
      setFound([...found, index]);
      setScore(score + 100);
      
      if (found.length + 1 === grid.filter(Boolean).length) {
        audioManager.playGameOver();
        setRound(round + 1);
        setScore(score + 100 + timeLeft * 10);
        generateGrid();
      }
    } else {
      audioManager.playWrong();
      if (navigator.vibrate) navigator.vibrate(50);
      setScore(Math.max(0, score - 50));
    }
  };
  
  return (
    <GameContainer>
      <GameArea>
        <Status>Find the hidden targets!</Status>
        
        <ScoreBoard>
          <div className="stat">
            <div className="label">Score</div>
            <div className="value">{score}</div>
          </div>
          <div className="stat">
            <div className="label">Time</div>
            <div className="value">{timeLeft}s</div>
          </div>
          <div className="stat">
            <div className="label">Level</div>
            <div className="value">{round}</div>
          </div>
        </ScoreBoard>
        
        <Grid>
          {grid.map((hasTarget, index) => (
            <Cell
              key={index}
              $hasTarget={hasTarget}
              $found={found.includes(index)}
              onClick={() => handleCellClick(index)}
              aria-label={found.includes(index) ? 'Found' : hasTarget ? 'Target' : 'Empty'}
            >
              {found.includes(index) ? '✓' : ''}
            </Cell>
          ))}
        </Grid>
        
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Found: {found.length} / {grid.filter(Boolean).length}
        </div>
      </GameArea>
    </GameContainer>
  );
};

export default AttentionGame;



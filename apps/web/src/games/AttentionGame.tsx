import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const Cell = styled.button<{ $hasTarget: boolean; $found: boolean }>`
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 12px;
  background: ${(props: { $hasTarget: boolean; $found: boolean }) => 
    props.$found 
      ? '#2ecc71' 
      : props.$hasTarget 
        ? '#e74c3c' 
        : 'rgba(255, 255, 255, 0.1)'};
  cursor: pointer;
  font-size: 24px;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: 20px;
  color: #ffd700;
`;

const Score = styled.div`
  font-size: 18px;
  color: #a0a0a0;
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
      setFound([...found, index]);
      setScore(score + 100);
      
      if (found.length + 1 === grid.filter(Boolean).length) {
        setRound(round + 1);
        setScore(score + 100 + timeLeft * 10);
        generateGrid();
      }
    } else {
      setScore(Math.max(0, score - 50));
    }
  };
  
  return (
    <GameArea>
      <Status>اعثر على الأهداف المخفية!</Status>
      <Score>النقاط: {score} | الوقت: {timeLeft}s</Score>
      
      <Grid>
        {grid.map((hasTarget, index) => (
          <Cell
            key={index}
            $hasTarget={hasTarget}
            $found={found.includes(index)}
            onClick={() => handleCellClick(index)}
          >
            {found.includes(index) ? '✓' : ''}
          </Cell>
        ))}
      </Grid>
      
      <div>المستوى: {round} | تم العثور: {found.length} / {grid.filter(Boolean).length}</div>
    </GameArea>
  );
};

export default AttentionGame;

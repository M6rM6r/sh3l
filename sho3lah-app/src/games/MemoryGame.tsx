import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const GameGrid = styled.div<{ $size: number }>`
  display: grid;
  grid-template-columns: repeat(${(props: { $size: number }) => props.$size}, 1fr);
  gap: 10px;
  max-width: 400px;
  margin: 0 auto;
`;

const Tile = styled.button<{ $active: boolean; $showing: boolean }>`
  aspect-ratio: 1;
  border: none;
  border-radius: 12px;
  background: ${(props: { $active: boolean; $showing: boolean }) => 
    props.$showing 
      ? 'linear-gradient(135deg, #ff6b35, #f7931e)' 
      : props.$active 
        ? '#2ecc71' 
        : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${(props: { $showing: boolean }) => props.$showing ? 'not-allowed' : 'pointer'};
  transition: all 0.3s;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Status = styled.div`
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
  color: #ffd700;
`;

interface MemoryGameProps {
  onComplete: (points: number) => void;
}

const MemoryGame = ({ onComplete }: MemoryGameProps) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [showingPattern, setShowingPattern] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const gridSize = Math.min(3 + Math.floor((level - 1) / 2), 6);
  const totalTiles = gridSize * gridSize;
  
  const generateSequence = useCallback(() => {
    const length = Math.min(3 + level, 12);
    const newSequence: number[] = [];
    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(Math.random() * totalTiles));
    }
    return newSequence;
  }, [level, totalTiles]);
  
  const startLevel = useCallback(() => {
    const newSequence = generateSequence();
    setSequence(newSequence);
    setUserSequence([]);
    setCurrentIndex(0);
    setShowingPattern(true);
    
    // Show pattern sequentially
    let i = 0;
    const interval = setInterval(() => {
      setCurrentIndex(i + 1);
      i++;
      if (i >= newSequence.length) {
        clearInterval(interval);
        setTimeout(() => {
          setShowingPattern(false);
          setCurrentIndex(0);
        }, 500);
      }
    }, 600);
    
    return () => clearInterval(interval);
  }, [generateSequence]);
  
  useEffect(() => {
    startLevel();
  }, [startLevel]);
  
  const handleTileClick = (index: number) => {
    if (showingPattern || gameOver) return;
    
    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);
    
    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      setGameOver(true);
      onComplete(Math.max(0, (level - 1) * 100));
      return;
    }
    
    if (newUserSequence.length === sequence.length) {
      setLevel(level + 1);
      onComplete(level * 100);
    }
  };
  
  return (
    <div>
      <Status>
        {showingPattern ? 'راقب النمط...' : 'كرر النمط!'}
      </Status>
      <GameGrid $size={gridSize}>
        {Array.from({ length: totalTiles }).map((_, index) => (
          <Tile
            key={index}
            $active={userSequence.includes(index)}
            $showing={showingPattern && sequence[currentIndex - 1] === index}
            onClick={() => handleTileClick(index)}
            disabled={showingPattern}
          />
        ))}
      </GameGrid>
    </div>
  );
};

export default MemoryGame;

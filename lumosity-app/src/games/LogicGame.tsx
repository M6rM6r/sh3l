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

const Puzzle = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(6px, 2vw, 8px);
  max-width: min(300px, 85vw);
  margin: 0 auto;
  padding: clamp(12px, 3vw, 16px);
  background: rgba(255, 255, 255, 0.1);
  border-radius: clamp(12px, 3vw, 16px);
`;

const Tile = styled.button<{ $value: number; $isEmpty: boolean }>`
  width: clamp(60px, 25vw, 80px);
  height: clamp(60px, 25vw, 80px);
  border: none;
  border-radius: clamp(8px, 2vw, 10px);
  background: ${props => props.$isEmpty ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  color: white;
  font-size: clamp(1.25rem, 6vw, 1.5rem);
  font-weight: 600;
  cursor: ${props => props.$isEmpty ? 'default' : 'pointer'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  box-shadow: ${props => props.$isEmpty ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'};
  
  &:active:not(:disabled) {
    transform: scale(0.95);
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);
  }
  
  @media (hover: hover) {
    &:hover:not(:disabled) {
      transform: scale(1.05);
    }
  }
`;

const Status = styled.div`
  font-size: clamp(18px, 5vw, 20px);
  color: #a5b4fc;
  margin-bottom: clamp(1rem, 4vw, 1.5rem);
  font-weight: 600;
`;

const Stats = styled.div`
  display: flex;
  gap: clamp(1rem, 4vw, 2rem);
  justify-content: center;
  margin-top: clamp(1rem, 4vw, 1.5rem);
  color: rgba(255, 255, 255, 0.7);
  font-size: clamp(14px, 4vw, 16px);
`;

interface LogicGameProps {
  onComplete: (points: number) => void;
}

const LogicGame = ({ onComplete }: LogicGameProps) => {
  const [tiles, setTiles] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  
  const shuffleTiles = () => {
    const newTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    for (let i = newTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTiles[i], newTiles[j]] = [newTiles[j], newTiles[i]];
    }
    setTiles(newTiles);
    setMoves(0);
    setTime(0);
    setStarted(true);
  };
  
  useEffect(() => {
    if (!started) {
      shuffleTiles();
    }
  }, [started]);
  
  useEffect(() => {
    const timer = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const canMove = (index: number) => {
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / 3);
    const emptyRow = Math.floor(emptyIndex / 3);
    const col = index % 3;
    const emptyCol = emptyIndex % 3;
    return Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;
  };
  
  const handleTileClick = (index: number) => {
    if (tiles[index] === 0 || !canMove(index)) return;
    
    audioManager.playCardSelect();
    if (navigator.vibrate) navigator.vibrate(10);
    
    const newTiles = [...tiles];
    const emptyIndex = tiles.indexOf(0);
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
    
    setTiles(newTiles);
    setMoves(m => m + 1);
    
    const isSolved = newTiles.slice(0, 8).every((val, i) => val === i + 1);
    if (isSolved) {
      audioManager.playGameOver();
      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
      const score = Math.max(1000 - moves * 10 - time * 5, 100);
      onComplete(score);
    }
  };
  
  return (
    <GameContainer>
      <GameArea>
        <Status>Arrange numbers 1-8 in order</Status>
        <Puzzle>
          {tiles.map((tile, index) => (
            <Tile
              key={index}
              $value={tile}
              $isEmpty={tile === 0}
              onClick={() => handleTileClick(index)}
              disabled={tile === 0}
              aria-label={tile === 0 ? 'Empty space' : `Tile ${tile}`}
            >
              {tile !== 0 && tile}
            </Tile>
          ))}
        </Puzzle>
        <Stats>
          <div><strong>Moves:</strong> {moves}</div>
          <div><strong>Time:</strong> {time}s</div>
        </Stats>
      </GameArea>
    </GameContainer>
  );
};

export default LogicGame;



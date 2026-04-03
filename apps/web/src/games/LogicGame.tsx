import { useState, useEffect } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  text-align: center;
`;

const Puzzle = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-width: 280px;
  margin: 0 auto;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const Tile = styled.button<{ $value: number; $isEmpty: boolean }>`
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 10px;
  background: ${props => props.$isEmpty ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: ${props => props.$isEmpty ? 'default' : 'pointer'};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
`;

const Status = styled.div`
  font-size: 1.25rem;
  color: #a5b4fc;
  margin-bottom: 1.5rem;
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
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
    
    const newTiles = [...tiles];
    const emptyIndex = tiles.indexOf(0);
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
    
    setTiles(newTiles);
    setMoves(m => m + 1);
    
    const isSolved = newTiles.slice(0, 8).every((val, i) => val === i + 1);
    if (isSolved) {
      const score = Math.max(1000 - moves * 10 - time * 5, 100);
      onComplete(score);
    }
  };
  
  return (
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
          >
            {tile !== 0 && tile}
          </Tile>
        ))}
      </Puzzle>
      <Stats>
        <div>Moves: {moves}</div>
        <div>Time: {time}s</div>
      </Stats>
    </GameArea>
  );
};

export default LogicGame;

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
`;

const Puzzle = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 16px;
`;

const Tile = styled.button<{ $value: number; $isEmpty: boolean }>`
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 12px;
  background: ${(props: { $isEmpty: boolean }) => 
    props.$isEmpty ? 'transparent' : 'linear-gradient(135deg, #3498db, #2980b9)'};
  color: white;
  font-size: 28px;
  font-weight: 700;
  cursor: ${(props: { $isEmpty: boolean }) => props.$isEmpty ? 'default' : 'pointer'};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: 22px;
  color: #ffd700;
`;

const Stats = styled.div`
  display: flex;
  gap: 30px;
  font-size: 16px;
  color: #a0a0a0;
`;

interface LogicGameProps {
  onComplete: (points: number) => void;
}

const LogicGame = ({ onComplete }: LogicGameProps) => {
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [time, setTime] = useState(0);
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
    }
  }, [initialized]);

  const shuffleTiles = useCallback(() => {
    const newTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    for (let i = newTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTiles[i], newTiles[j]] = [newTiles[j], newTiles[i]];
    }
    setTiles(newTiles);
    setMoves(0);
    setSolved(false);
    setTime(0);
  }, [setTiles, setMoves, setSolved, setTime]);

  useEffect(() => {
    shuffleTiles();
  }, [shuffleTiles]);

  useEffect(() => {
    if (!solved) {
      const timer = setInterval(() => setTime(t => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [solved]);
  
  const canMove = (index: number) => {
    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(index / 3);
    const emptyRow = Math.floor(emptyIndex / 3);
    const col = index % 3;
    const emptyCol = emptyIndex % 3;
    
    return (Math.abs(row - emptyRow) + Math.abs(col - emptyCol)) === 1;
  };
  
  const handleTileClick = (index: number) => {
    if (solved || tiles[index] === 0 || !canMove(index)) return;
    
    const newTiles = [...tiles];
    const emptyIndex = tiles.indexOf(0);
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
    
    setTiles(newTiles);
    setMoves(moves + 1);
    
    // Check if solved
    const isSolved = newTiles.slice(0, 8).every((val, i) => val === i + 1);
    if (isSolved) {
      setSolved(true);
      const score = Math.max(1000 - moves * 10 - time * 5, 100);
      onComplete(score);
    }
  };
  
  return (
    <GameArea>
      <Status>
        {solved ? '🎉 مبروك! لقد حللت اللغز!' : 'رتب الأرقام بالترتيب'}
      </Status>
      
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
        <div>الحركات: {moves}</div>
        <div>الوقت: {time}s</div>
      </Stats>
      
      {solved && (
        <button onClick={shuffleTiles}>لعب مرة أخرى</button>
      )}
    </GameArea>
  );
};

export default LogicGame;

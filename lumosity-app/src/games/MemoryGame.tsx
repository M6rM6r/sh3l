import { useState, useEffect } from 'react';
import styled from 'styled-components';

const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
`;

const Card = styled.button<{ $flipped: boolean; $matched: boolean }>`
  aspect-ratio: 1;
  border: none;
  border-radius: 12px;
  background: ${props => props.$matched ? '#22c55e' : props.$flipped ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${props => props.$matched ? 'default' : 'pointer'};
  font-size: 2rem;
  transition: all 0.3s;
  transform: ${props => props.$flipped ? 'rotateY(0deg)' : 'rotateY(180deg)'};
  
  &:hover:not(:disabled) {
    transform: ${props => props.$flipped ? 'rotateY(0deg)' : 'rotateY(180deg) scale(1.05)'};
  }
`;

const Status = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  color: #a5b4fc;
`;

interface MemoryGameProps {
  onComplete: (points: number) => void;
}

const emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

const MemoryGame = ({ onComplete }: MemoryGameProps) => {
  const [cards] = useState<string[]>(() => [...emojis, ...emojis].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  
  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0 && !gameComplete) {
      setGameComplete(true);
      const points = Math.max(100 - moves * 5, 20);
      onComplete(points);
    }
  }, [matched, cards, moves, gameComplete, onComplete]);
  
  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched(prev => [...prev, ...newFlipped]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };
  
  return (
    <div>
      <Status>Moves: {moves} | Matched: {matched.length / 2} / {emojis.length}</Status>
      <GameGrid>
        {cards.map((emoji, index) => (
          <Card
            key={index}
            $flipped={flipped.includes(index) || matched.includes(index)}
            $matched={matched.includes(index)}
            onClick={() => handleCardClick(index)}
            disabled={matched.includes(index)}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </Card>
        ))}
      </GameGrid>
    </div>
  );
};

export default MemoryGame;



import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { audioManager } from '../utils/audio';

const GameContainer = styled.div`
  width: 100%;
  max-width: 100%;
  padding: 0 16px;
  
  @media (max-width: 480px) {
    padding: 0 8px;
  }
`;

const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(8px, 2vw, 16px);
  max-width: min(400px, 95vw);
  margin: 0 auto;
  
  @media (max-width: 360px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
`;

const Card = styled.button<{ $flipped: boolean; $matched: boolean }>`
  aspect-ratio: 1;
  border: none;
  border-radius: clamp(8px, 2vw, 12px);
  background: ${props => props.$matched ? '#22c55e' : props.$flipped ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${props => props.$matched ? 'default' : 'pointer'};
  font-size: clamp(1.5rem, 8vw, 2rem);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${props => props.$flipped ? 'rotateY(0deg)' : 'rotateY(180deg)'};
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active:not(:disabled) {
    transform: ${props => props.$flipped ? 'rotateY(0deg) scale(0.95)' : 'rotateY(180deg) scale(0.95)'};
  }
  
  @media (hover: hover) {
    &:hover:not(:disabled) {
      transform: ${props => props.$flipped ? 'rotateY(0deg)' : 'rotateY(180deg) scale(1.05)'};
    }
  }
`;

const Status = styled.div`
  text-align: center;
  margin-bottom: clamp(1rem, 4vw, 1.5rem);
  font-size: clamp(1rem, 4vw, 1.25rem);
  color: #a5b4fc;
  font-weight: 500;
`;

const GameStats = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  
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
  
  const handleCardClick = useCallback((index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    audioManager.playCardSelect();
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        audioManager.playCorrect();
        setMatched(prev => [...prev, ...newFlipped]);
        setFlipped([]);
        if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
      } else {
        audioManager.playWrong();
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [flipped, matched, cards]);
  
  return (
    <GameContainer>
      <GameStats>
        <div className="stat">
          <div className="label">Moves</div>
          <div className="value">{moves}</div>
        </div>
        <div className="stat">
          <div className="label">Matched</div>
          <div className="value">{matched.length / 2} / {emojis.length}</div>
        </div>
      </GameStats>
      
      <GameGrid>
        {cards.map((emoji, index) => (
          <Card
            key={index}
            $flipped={flipped.includes(index) || matched.includes(index)}
            $matched={matched.includes(index)}
            onClick={() => handleCardClick(index)}
            disabled={matched.includes(index)}
            aria-label={matched.includes(index) ? `Matched ${emoji}` : flipped.includes(index) ? emoji : 'Hidden card'}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </Card>
        ))}
      </GameGrid>
    </GameContainer>
  );
};

export default MemoryGame;



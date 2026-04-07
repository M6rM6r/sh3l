import { useState } from 'react';
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

const Word = styled.div`
  font-size: clamp(1.75rem, 8vw, 2.5rem);
  font-weight: 700;
  margin-bottom: clamp(1.5rem, 6vw, 2rem);
  letter-spacing: clamp(0.25rem, 2vw, 0.5rem);
  color: white;
  font-family: 'Nunito', sans-serif;
  word-break: break-all;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 3vw, 16px);
  max-width: min(400px, 95vw);
  margin: 0 auto;
`;

const Option = styled.button`
  padding: clamp(0.875rem, 3vw, 1rem) clamp(1rem, 4vw, 1.5rem);
  border: none;
  border-radius: clamp(10px, 2vw, 12px);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: clamp(0.875rem, 4vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  min-height: 44px;
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (hover: hover) {
    &:hover {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      transform: scale(1.02);
    }
  }
`;

const Status = styled.div`
  font-size: clamp(14px, 4vw, 16px);
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  gap: 24px;
  
  .stat {
    .label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .value {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
  }
`;

const words = [
  { scrambled: 'ELPHANTE', answer: 'ELEPHANT', options: ['ELEPHANT', 'LEOPHANT', 'ELPHANTE', 'PANTHER'] },
  { scrambled: 'ACDEMY', answer: 'ACADEMY', options: ['ACADEMY', 'DECAY', 'MEDICAY', 'ACEDOMY'] },
  { scrambled: 'AINBOWR', answer: 'RAINBOW', options: ['RAINBOW', 'BROWNING', 'ROWNAIB', 'WAINBOR'] },
  { scrambled: 'YZALON', answer: 'ANALYZE', options: ['ANALYZE', 'LAZYONE', 'ZALONY', 'YEARNLO'] },
  { scrambled: 'TINNOVAO', answer: 'INNOVATE', options: ['INNOVATE', 'NATIVEON', 'VINTANO', 'NOVATION'] },
];

interface LanguageGameProps {
  onComplete: (points: number) => void;
}

const LanguageGame = ({ onComplete }: LanguageGameProps) => {
  const [currentWord, setCurrentWord] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  
  const word = words[currentWord];
  
  const handleAnswer = (answer: string) => {
    if (answer === word.answer) {
      audioManager.playCorrect();
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      const points = 100;
      setScore(s => s + points);
      
      if (round >= 5) {
        audioManager.playGameOver();
        onComplete(score + points);
      } else {
        setRound(r => r + 1);
        setCurrentWord((currentWord + 1) % words.length);
      }
    } else {
      audioManager.playWrong();
      if (navigator.vibrate) navigator.vibrate(50);
      if (round >= 5) {
        onComplete(score);
      } else {
        setRound(r => r + 1);
        setCurrentWord((currentWord + 1) % words.length);
      }
    }
  };
  
  return (
    <GameContainer>
      <GameArea>
        <Status>
          <div className="stat">
            <div className="label">Round</div>
            <div className="value">{round} / 5</div>
          </div>
          <div className="stat">
            <div className="label">Score</div>
            <div className="value">{score}</div>
          </div>
        </Status>
        <Word>{word.scrambled}</Word>
        <Options>
          {word.options.map((option, index) => (
            <Option key={index} onClick={() => handleAnswer(option)}>
              {option}
            </Option>
          ))}
        </Options>
      </GameArea>
    </GameContainer>
  );
};

export default LanguageGame;



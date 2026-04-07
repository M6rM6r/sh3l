import { useState } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  text-align: center;
`;

const Word = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 2rem;
  letter-spacing: 0.5rem;
  color: white;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
`;

const Option = styled.button`
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    transform: scale(1.02);
  }
`;

const Status = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
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
      const points = 100;
      setScore(s => s + points);
      
      if (round >= 5) {
        onComplete(score + points);
      } else {
        setRound(r => r + 1);
        setCurrentWord((currentWord + 1) % words.length);
      }
    } else {
      if (round >= 5) {
        onComplete(score);
      } else {
        setRound(r => r + 1);
        setCurrentWord((currentWord + 1) % words.length);
      }
    }
  };
  
  return (
    <GameArea>
      <Status>Round {round} / 5 | Score: {score}</Status>
      <Word>{word.scrambled}</Word>
      <Options>
        {word.options.map((option, index) => (
          <Option key={index} onClick={() => handleAnswer(option)}>
            {option}
          </Option>
        ))}
      </Options>
    </GameArea>
  );
};

export default LanguageGame;



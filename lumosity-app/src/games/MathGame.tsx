import { useState, useCallback } from 'react';
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

const Problem = styled.div`
  font-size: clamp(2.5rem, 10vw, 3.5rem);
  font-weight: 700;
  margin-bottom: clamp(1.5rem, 6vw, 2rem);
  color: white;
  font-family: 'Nunito', sans-serif;
  letter-spacing: 2px;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 3vw, 16px);
  max-width: min(350px, 90vw);
  margin: 0 auto;
`;

const Option = styled.button`
  padding: clamp(1rem, 4vw, 1.5rem);
  border: none;
  border-radius: clamp(10px, 2vw, 12px);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: clamp(1.25rem, 5vw, 1.5rem);
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

interface MathGameProps {
  onComplete: (points: number) => void;
}

const generateProblem = () => {
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 15) + 1;
  
  let answer: number;
  switch (operator) {
    case '+': answer = num1 + num2; break;
    case '-': answer = Math.abs(num1 - num2); break;
    case '*': answer = num1 * num2; break;
    default: answer = num1 + num2;
  }
  
  return { num1, num2, operator, answer };
};

const MathGame = ({ onComplete }: MathGameProps) => {
  const [problem, setProblem] = useState(() => generateProblem());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  
  const generateOptions = (answer: number) => {
    const wrongOptions: number[] = [];
    while (wrongOptions.length < 3) {
      const wrong = answer + Math.floor(Math.random() * 20) - 10;
      if (wrong !== answer && !wrongOptions.includes(wrong) && wrong > 0) {
        wrongOptions.push(wrong);
      }
    }
    return [answer, ...wrongOptions].sort(() => Math.random() - 0.5);
  };
  
  const options = generateOptions(problem.answer);
  
  const handleAnswer = (answer: number) => {
    const isCorrect = answer === problem.answer;
    if (isCorrect) {
      audioManager.playCorrect();
      if (navigator.vibrate) navigator.vibrate([10, 20]);
      setScore(s => s + 100);
    } else {
      audioManager.playWrong();
      if (navigator.vibrate) navigator.vibrate(50);
    }
    
    if (round >= 5) {
      audioManager.playGameOver();
      onComplete(score + (isCorrect ? 100 : 0));
    } else {
      setRound(r => r + 1);
      setProblem(generateProblem());
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
        <Problem>
          {problem.num1} {problem.operator} {problem.num2} = ?
        </Problem>
        <Options>
          {options.map((option, index) => (
            <Option key={index} onClick={() => handleAnswer(option)}>
              {option}
            </Option>
          ))}
        </Options>
      </GameArea>
    </GameContainer>
  );
};

export default MathGame;



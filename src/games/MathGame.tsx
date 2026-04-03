import { useState } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  text-align: center;
`;

const Problem = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: white;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 350px;
  margin: 0 auto;
`;

const Option = styled.button`
  padding: 1.25rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    transform: scale(1.05);
  }
`;

const Status = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
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
      setScore(s => s + 100);
    }
    
    if (round >= 5) {
      onComplete(score + (isCorrect ? 100 : 0));
    } else {
      setRound(r => r + 1);
      setProblem(generateProblem());
    }
  };
  
  return (
    <GameArea>
      <Status>Round {round} / 5 | Score: {score}</Status>
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
  );
};

export default MathGame;

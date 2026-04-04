import { useState, useEffect } from 'react';
import styled from 'styled-components';

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
`;

const Problem = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: #ffd700;
  text-align: center;
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  max-width: 300px;
`;

const Option = styled.button`
  padding: 20px 30px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const Status = styled.div`
  text-align: center;
  font-size: 20px;
  color: #a0a0a0;
`;

const Score = styled.div`
  font-size: 18px;
  color: #2ecc71;
`;

interface MathGameProps {
  onComplete: (points: number) => void;
}

const MathGame = ({ onComplete }: MathGameProps) => {
  const [problem, setProblem] = useState({ num1: 0, num2: 0, operator: '+', answer: 0 });
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    generateProblem();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else {
      onComplete(score);
    }
  }, [timeLeft, score, onComplete]);

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

    setProblem({ num1, num2, operator, answer });
    
    // Generate wrong options
    const wrongOptions: number[] = [];
    while (wrongOptions.length < 3) {
      const wrong = answer + Math.floor(Math.random() * 20) - 10;
      if (wrong !== answer && !wrongOptions.includes(wrong) && wrong > 0) {
        wrongOptions.push(wrong);
      }
    }
    
    setOptions([answer, ...wrongOptions].sort(() => Math.random() - 0.5));
  };

  const handleAnswer = (answer: number) => {
    if (answer === problem.answer) {
      setScore(score + 100 + Math.floor(timeLeft / 2));
      setRound(round + 1);
      generateProblem();
    } else {
      setScore(Math.max(0, score - 50));
    }
  };

  return (
    <GameArea>
      <Status>حل المسائل الرياضية!</Status>
      <Score>النقاط: {score} | الوقت: {timeLeft}s | الجولة: {round}</Score>
      
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

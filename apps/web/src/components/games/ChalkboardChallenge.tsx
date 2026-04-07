import React, { useState, useEffect, useCallback } from 'react';

interface ChalkboardChallengeProps {
  onComplete: (score: number, accuracy: number) => void;
  isPractice?: boolean;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

const OPERATIONS = ['+', '-', '*'];
const GAME_DURATION = 60;

const ChalkboardChallenge: React.FC<ChalkboardChallengeProps> = ({ 
  onComplete, 
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState('+');
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const generateProblem = useCallback(() => {
    const op = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
    let n1, n2;
    
    switch(op) {
      case '+':
        n1 = Math.floor(Math.random() * 50) + 10;
        n2 = Math.floor(Math.random() * 50) + 10;
        break;
      case '-':
        n1 = Math.floor(Math.random() * 50) + 20;
        n2 = Math.floor(Math.random() * n1);
        break;
      case '*':
        n1 = Math.floor(Math.random() * 12) + 2;
        n2 = Math.floor(Math.random() * 12) + 2;
        break;
      default:
        n1 = 1; n2 = 1;
    }
    
    setNum1(n1);
    setNum2(n2);
    setOperation(op);
    setAnswer('');
  }, []);

  useEffect(() => {
    generateProblem();
  }, [generateProblem]);

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (isPaused || gameOver) return;
    
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver) {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameOver, score, correct, total, onComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer || gameOver) return;

    const userAns = parseInt(answer);
    let correctAns;
    
    switch(operation) {
      case '+': correctAns = num1 + num2; break;
      case '-': correctAns = num1 - num2; break;
      case '*': correctAns = num1 * num2; break;
      default: correctAns = 0;
    }

    if (userAns === correctAns) {
      setCorrect(prev => prev + 1);
      setScore(prev => prev + 10 + Math.floor(timeLeft / 6));
    }
    setTotal(prev => prev + 1);
    generateProblem();
  };

  const getOperationSymbol = (op: string) => {
    switch(op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      default: return '+';
    }
  };

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Time's Up!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">
          Problems Solved: {correct}/{total}<br/>
          Accuracy: {total > 0 ? Math.round((correct / total) * 100) : 0}%
        </div>
      </div>
    );
  }

  return (
    <div className="chalkboard-challenge">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      <div className="chalkboard">
        <div className="math-problem">
          <span className="math-number">{num1}</span>
          <span className="math-op">{getOperationSymbol(operation)}</span>
          <span className="math-number">{num2}</span>
          <span className="math-equals">=</span>
        </div>
        
        <form onSubmit={handleSubmit} className="answer-form">
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="answer-input"
            placeholder="?"
            autoFocus
          />
          <button type="submit" className="answer-submit">Submit</button>
        </form>
      </div>

      <div className="game-instructions">
        Solve as many math problems as you can!
      </div>
    </div>
  );
};

export default ChalkboardChallenge;



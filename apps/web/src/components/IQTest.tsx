import React, { useState, useEffect } from 'react';
import type { UserStats } from '../types';
import './IQTest.css';

interface IQTestProps {
  onComplete: (score: number, stats: Partial<UserStats>) => void;
  onExit: () => void;
}

interface Question {
  id: number;
  type: 'pattern' | 'logic' | 'math' | 'memory' | 'verbal';
  question: string;
  options: string[];
  correct: number;
  timeLimit: number; // seconds
}

const IQTest: React.FC<IQTestProps> = ({ onComplete, onExit }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);

  const questions: Question[] = [
    {
      id: 1,
      type: 'pattern',
      question: 'What comes next in the sequence: 2, 4, 8, 16, ?',
      options: ['24', '32', '18', '20'],
      correct: 1,
      timeLimit: 30
    },
    {
      id: 2,
      type: 'logic',
      question: 'If all cats are mammals and some mammals are pets, are all cats pets?',
      options: ['Yes', 'No', 'Sometimes', 'Cannot determine'],
      correct: 1,
      timeLimit: 45
    },
    {
      id: 3,
      type: 'math',
      question: 'What is 17 × 13?',
      options: ['221', '211', '231', '201'],
      correct: 0,
      timeLimit: 60
    },
    {
      id: 4,
      type: 'memory',
      question: 'Remember these numbers: 7, 3, 9, 2, 8, 1. What was the third number?',
      options: ['7', '3', '9', '2'],
      correct: 2,
      timeLimit: 20
    },
    {
      id: 5,
      type: 'verbal',
      question: 'Choose the word that does NOT belong: Apple, Banana, Carrot, Orange',
      options: ['Apple', 'Banana', 'Carrot', 'Orange'],
      correct: 2,
      timeLimit: 40
    },
    // Add more questions...
  ];

  useEffect(() => {
    if (currentQuestion < questions.length) {
      setTimeLeft(questions[currentQuestion].timeLimit);
    }
  }, [currentQuestion]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentQuestion < questions.length) {
      handleAnswer(-1); // Time out
    }
  }, [timeLeft, currentQuestion]);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore(newAnswers);
    }
  };

  const calculateScore = (userAnswers: number[]) => {
    let correct = 0;
    let totalTime = 0;

    questions.forEach((q, index) => {
      if (userAnswers[index] === q.correct) {
        correct++;
      }
      totalTime += q.timeLimit;
    });

    // IQ formula approximation: score based on correct answers and time
    const accuracy = correct / questions.length;
    const timeBonus = Math.max(0, (totalTime - timeLeft) / totalTime); // Bonus for speed
    const rawScore = (accuracy * 100) + (timeBonus * 20);
    
    // Convert to IQ scale (approximate)
    const iqScore = Math.round(70 + (rawScore * 0.6));
    
    setScore(Math.min(160, Math.max(60, iqScore)));
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="iq-test-complete">
        <h2>IQ Test Complete</h2>
        <div className="iq-score">
          <div className="score-circle">
            <span className="score-number">{score}</span>
            <span className="score-label">IQ Score</span>
          </div>
        </div>
        <div className="iq-interpretation">
          {score >= 130 ? 'Exceptionally gifted' :
           score >= 120 ? 'Superior intelligence' :
           score >= 110 ? 'High average' :
           score >= 90 ? 'Average' :
           score >= 80 ? 'Low average' : 'Below average'}
        </div>
        <div className="iq-stats">
          <p>Correct answers: {answers.filter((a, i) => a === questions[i].correct).length}/{questions.length}</p>
        </div>
        <button className="btn-primary" onClick={() => onComplete(score, { iq: score })}>Continue to Dashboard</button>
        <button className="btn-secondary" onClick={onExit}>Exit</button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="iq-test">
      <div className="test-header">
        <h2>IQ Assessment</h2>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
        <span className="question-counter">{currentQuestion + 1}/{questions.length}</span>
        <div className="timer">Time: {timeLeft}s</div>
      </div>

      <div className="question-container">
        <h3>{question.question}</h3>
        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={index}
              className="option-btn"
              onClick={() => handleAnswer(index)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button className="exit-btn" onClick={onExit}>Exit Test</button>
    </div>
  );
};

export default IQTest;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';

const GameContainer = styled.div`
  text-align: center;
  padding: 2rem;
`;

const MathProblem = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 2rem 0;
  color: white;
`;

const Status = styled.div`
  font-size: 1.25rem;
  color: #a5b4fc;
  margin-bottom: 1rem;
`;

const Feedback = styled.div<{ $correct: boolean }>`
  font-size: 1.5rem;
  color: ${props => props.$correct ? '#22c55e' : '#ef4444'};
  margin: 1rem 0;
  min-height: 2rem;
`;

const MicButton = styled.button<{ $listening: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: ${props => props.$listening ? 
    'linear-gradient(135deg, #ef4444, #dc2626)' : 
    'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  color: white;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 30px ${props => props.$listening ? 
    'rgba(239, 68, 68, 0.5)' : 'rgba(99, 102, 241, 0.5)'};
  
  &:hover {
    transform: scale(1.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Instructions = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.8);
`;

interface VoiceMathGameProps {
  onComplete: (points: number) => void;
}

interface Problem {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
}

const generateProblem = (): Problem => {
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

const parseNumber = (text: string): number | null => {
  const numberWords: { [key: string]: number } = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
    'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100,
  };
  
  const cleanText = text.toLowerCase().trim();
  
  // Try direct number parsing
  const directNumber = parseInt(cleanText.replace(/[^0-9]/g, ''));
  if (!isNaN(directNumber) && directNumber > 0) {
    return directNumber;
  }
  
  // Try word parsing
  const words = cleanText.split(/\s+/);
  let total = 0;
  let current = 0;
  
  for (const word of words) {
    const num = numberWords[word];
    if (num !== undefined) {
      if (num === 100) {
        current = current * 100;
      } else if (num >= 20) {
        current += num;
      } else {
        current += num;
      }
    }
  }
  
  total += current;
  return total > 0 ? total : null;
};

const VoiceMathGame = ({ onComplete }: VoiceMathGameProps) => {
  const [problem, setProblem] = useState<Problem>(generateProblem());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        checkAnswer(transcript);
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setFeedback('Error listening. Try again.');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setSpokenText('');
      setFeedback('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening]);
  
  const checkAnswer = useCallback((spoken: string) => {
    const parsedAnswer = parseNumber(spoken);
    const correct = parsedAnswer === problem.answer;
    
    setIsCorrect(correct);
    
    if (correct) {
      setFeedback('Correct!');
      setScore(s => s + 100);
    } else {
      setFeedback(`You said: ${spoken} (${parsedAnswer ?? 'unknown'})`);
    }
    
    setTimeout(() => {
      if (round >= 10) {
        setGameComplete(true);
        onComplete(score + (correct ? 100 : 0));
      } else {
        setRound(r => r + 1);
        setProblem(generateProblem());
        setFeedback('');
        setSpokenText('');
      }
    }, 1500);
  }, [problem, round, score, onComplete]);
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return (
      <GameContainer>
        <h2>Voice Math</h2>
        <p>Your browser doesn't support voice recognition.</p>
        <p>Please use Chrome, Edge, or Safari for this game.</p>
      </GameContainer>
    );
  }
  
  return (
    <GameContainer>
      <Status>Round {round} / 10 | Score: {score}</Status>
      
      <MathProblem>
        {problem.num1} {problem.operator} {problem.num2} = ?
      </MathProblem>
      
      <div>
        <MicButton 
          $listening={isListening}
          onClick={startListening}
          disabled={isListening || gameComplete}
        >
          {isListening ? '🔴' : '🎤'}
        </MicButton>
      </div>
      
      {spokenText && (
        <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)' }}>
          Heard: {spokenText}
        </div>
      )}
      
      <Feedback $correct={isCorrect}>{feedback}</Feedback>
      
      <Instructions>
        <strong>How to play:</strong>
        <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
          <li>Click the microphone button</li>
          <li>Say the answer out loud</li>
          <li>Examples: "twenty-five", "42", "one hundred"</li>
        </ul>
      </Instructions>
    </GameContainer>
  );
};

export default VoiceMathGame;



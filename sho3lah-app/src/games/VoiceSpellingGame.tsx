import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';

const GameContainer = styled.div`
  text-align: center;
  padding: 2rem;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  font-size: 1.25rem;
  color: #a5b4fc;
`;

const TargetWord = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin: 2rem 0;
  color: white;
  letter-spacing: 0.2em;
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

const Progress = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.3s;
`;

interface VoiceGameProps {
  onComplete: (points: number) => void;
}

const words = [
  'APPLE', 'BRAIN', 'CHAIR', 'DREAM', 'EARTH',
  'FLAME', 'GRACE', 'HEART', 'IMAGE', 'JUICE',
  'KNIFE', 'LIGHT', 'MUSIC', 'NIGHT', 'OCEAN',
  'PEACE', 'QUEEN', 'RIVER', 'SMILE', 'TRUST',
  'UNION', 'VOICE', 'WATER', 'YOUTH', 'ZEBRA',
];

const VoiceSpellingGame = ({ onComplete }: VoiceGameProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentWord = words[currentWordIndex];
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript.toUpperCase().trim();
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
    const cleaned = spoken.replace(/[^A-Z]/g, '');
    const correct = cleaned === currentWord;
    
    setIsCorrect(correct);
    setFeedback(correct ? 'Correct!' : `You said: ${spoken}`);
    
    if (correct) {
      const points = 100;
      setScore(s => s + points);
    }
    
    setTimeout(() => {
      if (round >= 10) {
        setGameComplete(true);
        onComplete(score + (correct ? 100 : 0));
      } else {
        setRound(r => r + 1);
        setCurrentWordIndex((currentWordIndex + 1) % words.length);
        setFeedback('');
        setSpokenText('');
      }
    }, 1500);
  }, [currentWord, currentWordIndex, round, score, onComplete]);
  
  const progress = (round / 10) * 100;
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return (
      <GameContainer>
        <h2>Voice Spelling</h2>
        <p>Your browser doesn't support voice recognition.</p>
        <p>Please use Chrome, Edge, or Safari for this game.</p>
      </GameContainer>
    );
  }
  
  return (
    <GameContainer>
      <StatusBar>
        <span>Round {round} / 10</span>
        <span>Score: {score}</span>
      </StatusBar>
      
      <Progress>
        <ProgressBar $progress={progress} />
      </Progress>
      
      <TargetWord>{currentWord}</TargetWord>
      
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
          <li>Spell out the word letter by letter</li>
          <li>Example: Say "A-P-P-L-E" for APPLE</li>
        </ul>
      </Instructions>
    </GameContainer>
  );
};

export default VoiceSpellingGame;

/**
 * VoiceCommandGame — say the COLOR of the word shown (not the word itself).
 * Classic Stroop-style voice challenge using Web Speech API.
 *
 * Example: word "BLUE" displayed in RED ink → say "red"
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------
const GameContainer = styled.div`text-align: center; padding: 2rem;`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const StageLabel = styled.div`
  font-size: 1rem;
  color: #a5b4fc;
  margin-bottom: 1.5rem;
`;

const WordCard = styled.div<{ $color: string }>`
  display: inline-block;
  font-size: 3.5rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: ${p => p.$color};
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 1.5rem 3rem;
  margin: 1.5rem auto;
`;

const Feedback = styled.div<{ $correct: boolean }>`
  font-size: 1.4rem;
  color: ${p => (p.$correct ? '#22c55e' : '#ef4444')};
  min-height: 2rem;
  margin: 0.75rem 0;
`;

const MicButton = styled.button<{ $listening: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: ${p =>
    p.$listening
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  color: white;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 0 30px
    ${p => (p.$listening ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.5)')};
  &:hover { transform: scale(1.1); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Timer = styled.div<{ $low: boolean }>`
  font-size: 2rem;
  font-weight: 800;
  color: ${p => (p.$low ? '#ef4444' : '#facc15')};
  margin-bottom: 0.5rem;
`;

const ScoreRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  color: rgba(255,255,255,0.7);
  font-size: 0.95rem;
`;

const Hint = styled.p`
  margin-top: 1.5rem;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
`;

const ColorPalette = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ColorChip = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${p => p.$color};
  border: 2px solid rgba(255,255,255,0.3);
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface VoiceCommandGameProps {
  onComplete: (points: number) => void;
}

type SpeechRecognitionWithAbort = SpeechRecognition & {
  abort?: () => void;
  maxAlternatives?: number;
};

type VoiceRound = {
  word: string;
  ink: { name: string; hex: string };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COLORS: { name: string; hex: string }[] = [
  { name: 'red',    hex: '#ef4444' },
  { name: 'blue',   hex: '#3b82f6' },
  { name: 'green',  hex: '#22c55e' },
  { name: 'yellow', hex: '#facc15' },
  { name: 'purple', hex: '#a855f7' },
  { name: 'orange', hex: '#fb923c' },
];

const ROUND_TIME_S = 4; // seconds per round
const TOTAL_ROUNDS = 10;

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRound() {
  const word = randomItem(COLORS);
  // ink color is always different from the word text
  const remaining = COLORS.filter(c => c.name !== word.name);
  const ink = randomItem(remaining);
  return { word: word.name, ink };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'playing' | 'feedback' | 'done';

const VoiceCommandGame: React.FC<VoiceCommandGameProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [currentRound, setCurrentRound] = useState<VoiceRound | null>(null);
  const [heard, setHeard] = useState('');
  const [correct, setCorrect] = useState(false);
  const [listening, setListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_S);
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      (recogRef.current as SpeechRecognitionWithAbort | null)?.abort?.();
    };
  }, []);

  const advanceOrEnd = useCallback((nextRound: number, totalScore: number) => {
    if (nextRound > TOTAL_ROUNDS) {
      setPhase('done');
      onComplete(totalScore);
    } else {
      setRound(nextRound);
      setCurrentRound(buildRound());
      setTimeLeft(ROUND_TIME_S);
      setHeard('');
      setPhase('playing');
    }
  }, [onComplete]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          (recogRef.current as SpeechRecognitionWithAbort | null)?.abort?.();
          setListening(false);
          setHeard('—');
          setCorrect(false);
          setPhase('feedback');
          setTimeout(() => advanceOrEnd(round + 1, score), 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase, round, score, advanceOrEnd]);

  const startListening = useCallback(() => {
    if (!currentRound) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR() as SpeechRecognitionWithAbort;
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 3;
    recogRef.current = recog;

    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript.toLowerCase().trim();
      const isCorrect = transcript.includes(currentRound.ink.name);
      clearInterval(timerRef.current!);

      setHeard(transcript);
      setCorrect(isCorrect);
      setListening(false);
      setPhase('feedback');

      const pts = isCorrect ? Math.ceil((timeLeft / ROUND_TIME_S) * 20) + 5 : 0;
      const newScore = score + pts;
      setScore(newScore);

      setTimeout(() => advanceOrEnd(round + 1, newScore), 1200);
    };

    recog.onerror = () => { setListening(false); };
    recog.onend = () => setListening(false);
    recog.start();
    setListening(true);
  }, [currentRound, score, round, timeLeft, advanceOrEnd]);

  const startGame = useCallback(() => {
    setScore(0);
    setRound(1);
    setCurrentRound(buildRound());
    setTimeLeft(ROUND_TIME_S);
    setPhase('playing');
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-start listening when round begins
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase === 'playing' && !listening) {
      const id = setTimeout(startListening, 400);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentRound]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!supported) {
    return (
      <GameContainer>
        <Title>Voice Commands</Title>
        <p style={{ color: '#f87171', marginTop: '2rem' }}>
          Your browser doesn't support the Web Speech API. Try Chrome or Edge.
        </p>
      </GameContainer>
    );
  }

  if (phase === 'idle') {
    return (
      <GameContainer>
        <Title>🗣️ Voice Commands</Title>
        <StageLabel>Say the COLOR of the ink — not the word!</StageLabel>
        <WordCard $color="#22c55e">RED</WordCard>
        <br />
        <MicButton $listening={false} onClick={startGame}>▶</MicButton>
        <ColorPalette>
          {COLORS.map(c => <ColorChip key={c.name} $color={c.hex} title={c.name} />)}
        </ColorPalette>
        <Hint>Microphone will activate automatically each round.</Hint>
      </GameContainer>
    );
  }

  if (phase === 'done') {
    return (
      <GameContainer>
        <Title>🏁 Done!</Title>
        <WordCard $color="#facc15">{score}</WordCard>
        <StageLabel>Total Score</StageLabel>
        <MicButton $listening={false} onClick={startGame}>↺</MicButton>
      </GameContainer>
    );
  }

  const inkHex = currentRound?.ink.hex ?? '#fff';

  return (
    <GameContainer>
      <Title>🗣️ Voice Commands</Title>
      <ScoreRow>
        <span>Round {round}/{TOTAL_ROUNDS}</span>
        <span>Score: {score}</span>
      </ScoreRow>
      <Timer $low={timeLeft <= 2}>{timeLeft}s</Timer>

      {phase === 'playing' && currentRound && (
        <>
          <StageLabel>Say the INK color (not the word)</StageLabel>
          <WordCard $color={inkHex}>{currentRound.word.toUpperCase()}</WordCard>
          <br />
          <MicButton $listening={listening} onClick={startListening} disabled={listening}>
            {listening ? '🎤' : '🎤'}
          </MicButton>
        </>
      )}

      {phase === 'feedback' && currentRound && (
        <>
          <WordCard $color={inkHex}>{currentRound.word.toUpperCase()}</WordCard>
          <Feedback $correct={correct}>
            {correct ? `✅ "${heard}" — Correct!` : `❌ "${heard}" — Say "${currentRound.ink.name}"`}
          </Feedback>
        </>
      )}
    </GameContainer>
  );
};

export default VoiceCommandGame;

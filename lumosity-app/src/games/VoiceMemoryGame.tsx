/**
 * VoiceMemoryGame — listen to a spoken digit sequence and repeat it back.
 * Uses window.speechSynthesis (TTS) and window.SpeechRecognition (STT).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';

// ---------------------------------------------------------------------------
// Styled components (matches platform dark-glass aesthetic)
// ---------------------------------------------------------------------------
const GameContainer = styled.div`text-align: center; padding: 2rem;`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const StageLabel = styled.div`
  font-size: 1.1rem;
  color: #a5b4fc;
  margin-bottom: 1.5rem;
`;

const SequenceDisplay = styled.div`
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.4em;
  color: #facc15;
  min-height: 4rem;
  margin: 1.5rem 0;
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

// ---------------------------------------------------------------------------
// Type declarations for Web Speech API (not yet in lib.dom.d.ts for all TS)
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface VoiceMemoryGameProps {
  onComplete: (points: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOTAL_ROUNDS = 7;
const BASE_LENGTH = 3;

function buildSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.85;
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

function normaliseDigits(transcript: string): string {
  const wordMap: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4',
    five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  };
  return transcript
    .toLowerCase()
    .split(/\s+/)
    .map(w => wordMap[w] ?? w.replace(/\D/g, ''))
    .join('');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'listening-tts' | 'recall' | 'feedback' | 'done';

const VoiceMemoryGame: React.FC<VoiceMemoryGameProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [heard, setHeard] = useState('');
  const [correct, setCorrect] = useState(false);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); }
  }, []);

  const runRound = useCallback(async (r: number) => {
    const length = BASE_LENGTH + Math.floor(r / 2); // grows every 2 rounds
    const seq = buildSequence(length);
    setSequence(seq);
    setHeard('');
    setPhase('listening-tts');

    // Speak each digit with a pause
    await speak('Listen carefully:');
    for (const d of seq) {
      await speak(String(d));
      await new Promise(res => setTimeout(res, 300));
    }
    await speak('Now repeat the sequence.');
    setPhase('recall');
  }, []);

  const startGame = useCallback(() => {
    setRound(1);
    setScore(0);
    runRound(1);
  }, [runRound]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition() as SpeechRecognition & { maxAlternatives?: number };
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recogRef.current = recog;

    recog.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      const normalised = normaliseDigits(transcript);
      const expected = sequence.join('');
      const isCorrect = normalised === expected;

      setHeard(normalised);
      setCorrect(isCorrect);
      setListening(false);
      setPhase('feedback');

      const pts = isCorrect ? sequence.length * 15 : 0;
      setScore(prev => prev + pts);

      setTimeout(() => {
        if (round >= TOTAL_ROUNDS) {
          setPhase('done');
          onComplete(score + pts);
        } else {
          const nextRound = round + 1;
          setRound(nextRound);
          runRound(nextRound);
        }
      }, 1800);
    };

    recog.onerror = () => { setListening(false); setPhase('recall'); };
    recog.onend = () => setListening(false);

    recog.start();
    setListening(true);
  }, [onComplete, round, score, sequence, runRound]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!supported) {
    return (
      <GameContainer>
        <Title>Voice Memory</Title>
        <p style={{ color: '#f87171', marginTop: '2rem' }}>
          Your browser doesn't support the Web Speech API. Try Chrome or Edge.
        </p>
      </GameContainer>
    );
  }

  if (phase === 'idle') {
    return (
      <GameContainer>
        <Title>🎧 Voice Memory</Title>
        <StageLabel>Listen to the digit sequence, then say it back!</StageLabel>
        <SequenceDisplay>?</SequenceDisplay>
        <MicButton $listening={false} onClick={startGame}>▶</MicButton>
        <Hint>Works best in a quiet environment. Requires microphone access.</Hint>
      </GameContainer>
    );
  }

  if (phase === 'done') {
    return (
      <GameContainer>
        <Title>🏁 Round Complete!</Title>
        <SequenceDisplay style={{ fontSize: '4rem' }}>{score}</SequenceDisplay>
        <StageLabel>Total Score</StageLabel>
        <MicButton $listening={false} onClick={startGame}>↺</MicButton>
      </GameContainer>
    );
  }

  return (
    <GameContainer>
      <Title>🎧 Voice Memory</Title>
      <ScoreRow>
        <span>Round {round}/{TOTAL_ROUNDS}</span>
        <span>Score: {score}</span>
        <span>Length: {sequence.length}</span>
      </ScoreRow>

      {phase === 'listening-tts' && (
        <>
          <StageLabel>🔊 Listen…</StageLabel>
          <SequenceDisplay>{sequence.map(() => '•').join(' ')}</SequenceDisplay>
        </>
      )}

      {phase === 'recall' && (
        <>
          <StageLabel>Say the digits in order</StageLabel>
          <SequenceDisplay>{listening ? '🎤' : '?'}</SequenceDisplay>
          <MicButton $listening={listening} onClick={startListening} disabled={listening}>
            {listening ? '⏹' : '🎤'}
          </MicButton>
        </>
      )}

      {phase === 'feedback' && (
        <>
          <StageLabel>Expected: {sequence.join(' ')}</StageLabel>
          <SequenceDisplay>{heard || '—'}</SequenceDisplay>
          <Feedback $correct={correct}>{correct ? '✅ Correct!' : '❌ Wrong'}</Feedback>
        </>
      )}
    </GameContainer>
  );
};

export default VoiceMemoryGame;

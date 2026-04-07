import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: 1rem;
`;

const Equation = styled.div`
  font-size: 2.4rem;
  font-weight: 700;
  color: #e0d7ff;
  text-shadow: 0 0 20px rgba(108,99,255,0.4);
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 380px;
  width: 100%;
`;

const Btn = styled.button<{ $state: 'idle' | 'correct' | 'wrong' }>`
  padding: 1rem;
  border: none;
  border-radius: 14px;
  background: ${p =>
    p.$state === 'correct' ? 'linear-gradient(135deg,#22c55e,#16a34a)' :
    p.$state === 'wrong'   ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
    'rgba(255,255,255,0.1)'};
  color: white;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.12s;
  &:hover:not(:disabled) { transform: scale(1.04); background: rgba(108,99,255,0.3); }
  &:disabled { cursor: default; }
`;

const ProgressBar = styled.div<{ $pct: number }>`
  width: 320px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.12);
  &::after {
    content: '';
    display: block;
    height: 100%;
    border-radius: 4px;
    width: ${p => p.$pct}%;
    background: linear-gradient(135deg,#6c63ff,#00d2ff);
    transition: width 0.3s;
  }
`;

const Stats = styled.div`
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.5);
`;

interface Props { onComplete: (points: number) => void; }

const OPS = ['+', '-', '×'] as const;

const makeQuestion = () => {
  const op = OPS[Math.floor(Math.random() * OPS.length)];
  let a = Math.floor(Math.random() * 20) + 1;
  let b = Math.floor(Math.random() * 15) + 1;
  if (op === '-' && b > a) [a, b] = [b, a];
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 10) + 1;
    const w = answer + (Math.random() < 0.5 ? delta : -delta);
    if (w !== answer) wrongs.add(w);
  }
  const options = [...wrongs, answer].sort(() => Math.random() - 0.5);
  return { eq: `${a} ${op} ${b}`, answer, options };
};

const DURATION = 60;

const MathBlitz = ({ onComplete }: Props) => {
  const [q, setQ] = useState(() => makeQuestion());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [correct, setCorrect] = useState(0);
  const [btnState, setBtnState] = useState<Record<number, 'idle' | 'correct' | 'wrong'>>({});

  const nextQ = useCallback(() => {
    setQ(makeQuestion());
    setBtnState({});
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) { onComplete(score); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, score, onComplete]);

  const handleAnswer = (opt: number) => {
    if (Object.keys(btnState).length) return;
    const isCorrect = opt === q.answer;
    setBtnState({
      [opt]: isCorrect ? 'correct' : 'wrong',
      ...(!isCorrect ? { [q.answer]: 'correct' } : {}),
    });
    if (isCorrect) {
      setScore(s => s + 100 + Math.floor(timeLeft / 2));
      setCorrect(c => c + 1);
    } else {
      setScore(s => Math.max(0, s - 50));
    }
    setTimeout(nextQ, 550);
  };

  return (
    <Wrapper>
      <Stats>
        <span>⏱ {timeLeft}s</span>
        <span>⭐ {score}</span>
        <span>✅ {correct}</span>
      </Stats>
      <ProgressBar $pct={(timeLeft / DURATION) * 100} />
      <Equation>{q.eq} = ?</Equation>
      <Options>
        {q.options.map(opt => (
          <Btn
            key={opt}
            $state={btnState[opt] ?? 'idle'}
            onClick={() => handleAnswer(opt)}
            disabled={Object.keys(btnState).length > 0}
          >
            {opt}
          </Btn>
        ))}
      </Options>
    </Wrapper>
  );
};

export default MathBlitz;



import { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
  70%  { box-shadow: 0 0 0 24px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 1.5rem 1rem;
`;

const Prompt = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: #a5b4fc;
  min-height: 1.8rem;
`;

const Target = styled.button<{ $active: boolean }>`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: none;
  background: ${p => p.$active
    ? 'linear-gradient(135deg,#22c55e,#16a34a)'
    : 'rgba(255,255,255,0.08)'};
  cursor: ${p => p.$active ? 'pointer' : 'default'};
  font-size: 3rem;
  transition: background 0.1s;
  ${p => p.$active && css`animation: ${pulse} 1s infinite;`}

  &:active { transform: ${p => p.$active ? 'scale(0.93)' : 'none'}; }
`;

const ReactionBadge = styled.div<{ $good: boolean }>`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${p => p.$good ? '#22c55e' : '#ef4444'};
`;

const RoundDots = styled.div`
  display: flex;
  gap: 8px;
`;

const Dot = styled.div<{ $done: boolean; $correct: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${p => !p.$done ? 'rgba(255,255,255,0.15)' : p.$correct ? '#22c55e' : '#ef4444'};
  transition: background 0.3s;
`;

interface Props { onComplete: (points: number) => void; }

const ROUNDS = 6;

const SpeedReaction = ({ onComplete }: Props) => {
  const [round, setRound] = useState(0);
  const [active, setActive] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    setActive(false);
    setReactionMs(null);
    setTooEarly(false);
    setWaiting(true);
    const delay = 1200 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setActive(true);
      setWaiting(false);
      startRef.current = Date.now();
    }, delay);
  }, []);

  useEffect(() => {
    setRound(1);
    setTimeout(startRound, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startRound]);

  const handleClick = () => {
    if (!active) {
      if (waiting) {
        // too early
        if (timerRef.current) clearTimeout(timerRef.current);
        setTooEarly(true);
        setWaiting(false);
        const newResults = [...results, { correct: false }];
        setResults(newResults);
        const nextRound = round + 1;
        if (nextRound > ROUNDS) { onComplete(totalScore); return; }
        setRound(nextRound);
        setTimeout(startRound, 1200);
      }
      return;
    }
    const ms = Date.now() - startRef.current;
    setReactionMs(ms);
    setActive(false);
    const pts = Math.max(0, 1000 - ms);
    const newTotal = totalScore + pts;
    setTotalScore(newTotal);
    const newResults = [...results, { correct: ms < 900 }];
    setResults(newResults);
    const nextRound = round + 1;
    if (nextRound > ROUNDS) { onComplete(newTotal); return; }
    setRound(nextRound);
    setTimeout(startRound, 1000);
  };

  const msg = waiting ? 'Get ready …'
    : active ? '⚡ TAP NOW!'
    : tooEarly ? '⚠ Too early!'
    : reactionMs !== null ? `${reactionMs} ms`
    : '';

  return (
    <Wrapper>
      <Prompt>{msg}</Prompt>
      <Target $active={active} onClick={handleClick}>
        {active ? '⚡' : waiting ? '⏳' : '●'}
      </Target>
      {reactionMs !== null && (
        <ReactionBadge $good={reactionMs < 500}>
          {reactionMs < 300 ? '🔥 Blazing!' : reactionMs < 600 ? '✅ Fast!' : '🐢 Slow'}
        </ReactionBadge>
      )}
      <RoundDots>
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <Dot key={i} $done={i < results.length} $correct={results[i]?.correct ?? false} />
        ))}
      </RoundDots>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
        Round {Math.min(round, ROUNDS)}/{ROUNDS} · Score {totalScore}
      </div>
    </Wrapper>
  );
};

export default SpeedReaction;



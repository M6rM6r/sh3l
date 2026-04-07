import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface SyllogismEngineProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface Syllogism {
  premise1: string;
  premise2: string;
  conclusion: string;
  isValid: boolean;
  explanation: string;
  category: string;
}

const SYLLOGISMS: Syllogism[] = [
  { premise1: 'All mammals are warm-blooded', premise2: 'All dogs are mammals', conclusion: 'All dogs are warm-blooded', isValid: true, explanation: 'Valid: A→B, C→A, therefore C→B (Barbara)', category: 'Barbara' },
  { premise1: 'All birds can fly', premise2: 'Penguins are birds', conclusion: 'Penguins can fly', isValid: true, explanation: 'The syllogism is formally valid, even though the premise is factually false', category: 'Barbara' },
  { premise1: 'Some students are athletes', premise2: 'All athletes are healthy', conclusion: 'All students are healthy', isValid: false, explanation: 'Invalid: "Some A are B" + "All B are C" does not yield "All A are C"', category: 'Illicit Major' },
  { premise1: 'No reptiles are mammals', premise2: 'All snakes are reptiles', conclusion: 'No snakes are mammals', isValid: true, explanation: 'Valid: No A are B, All C are A, therefore No C are B (Celarent)', category: 'Celarent' },
  { premise1: 'All cats are animals', premise2: 'Some animals are pets', conclusion: 'Some cats are pets', isValid: false, explanation: 'Invalid: Undistributed middle — "animals" is not distributed in either premise properly', category: 'Undistributed Middle' },
  { premise1: 'No fish are birds', premise2: 'No birds are insects', conclusion: 'No fish are insects', isValid: false, explanation: 'Invalid: Two negative premises yield no valid conclusion', category: 'Exclusive Premises' },
  { premise1: 'All squares are rectangles', premise2: 'All rectangles have four sides', conclusion: 'All squares have four sides', isValid: true, explanation: 'Valid chain: A⊂B⊂C → A⊂C', category: 'Barbara' },
  { premise1: 'Some politicians are honest', premise2: 'Some honest people are kind', conclusion: 'Some politicians are kind', isValid: false, explanation: 'Invalid: Two particular premises cannot yield a valid conclusion', category: 'Particular Premises' },
  { premise1: 'All prime numbers are integers', premise2: 'Seven is a prime number', conclusion: 'Seven is an integer', isValid: true, explanation: 'Valid: Universal + Particular → Particular (Darii)', category: 'Darii' },
  { premise1: 'No heroes are cowards', premise2: 'Some soldiers are heroes', conclusion: 'Some soldiers are not cowards', isValid: true, explanation: 'Valid: No A are B, Some C are A → Some C are not B (Ferio)', category: 'Ferio' },
  { premise1: 'All roses are flowers', premise2: 'All flowers are beautiful', conclusion: 'Some beautiful things are roses', isValid: true, explanation: 'Valid: by conversion of the main conclusion "All roses are beautiful"', category: 'Bramantip' },
  { premise1: 'If it rains, the ground is wet', premise2: 'The ground is wet', conclusion: 'It rained', isValid: false, explanation: 'Affirming the consequent fallacy — sprinklers could cause wet ground', category: 'Affirming Consequent' },
  { premise1: 'If it rains, the ground is wet', premise2: 'The ground is not wet', conclusion: 'It did not rain', isValid: true, explanation: 'Valid: Modus Tollens — denying the consequent', category: 'Modus Tollens' },
  { premise1: 'Either the butler or maid did it', premise2: 'The butler did not do it', conclusion: 'The maid did it', isValid: true, explanation: 'Valid: Disjunctive Syllogism — eliminating one disjunct', category: 'Disjunctive' },
  { premise1: 'All geniuses are creative', premise2: 'Einstein was a genius', conclusion: 'Einstein was creative', isValid: true, explanation: 'Valid: Universal Instantiation (Barbara)', category: 'Barbara' },
  { premise1: 'No good deed goes unpunished', premise2: 'Helping the neighbor was a good deed', conclusion: 'Helping the neighbor went unpunished', isValid: false, explanation: 'Actually valid by Celarent, but the conclusion should be "did NOT go unpunished" — this reversal makes it invalid', category: 'Negation Error' },
];

const GAME_DURATION = 300;

const SyllogismEngine: React.FC<SyllogismEngineProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState<Syllogism | null>(null);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const nextPuzzle = useCallback(() => {
    const available = SYLLOGISMS.map((s, i) => ({ s, i })).filter(({ i }) => !usedIds.has(i));
    if (available.length === 0) { setUsedIds(new Set()); }
    const pool = available.length > 0 ? available : SYLLOGISMS.map((s, i) => ({ s, i }));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(pick.s);
    setUsedIds(prev => new Set(prev).add(pick.i));
    setAnswered(null);
  }, [usedIds]);

  useEffect(() => { if (gameState === 'playing') nextPuzzle(); }, [gameState]);
  
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    const t = setInterval(() => setTimeLeft(prev => {
      const next = prev - 1;
      onTimeChange?.(next);
      if (next <= 0) { setGameState('gameover'); clearInterval(t); }
      return Math.max(0, next);
    }), 1000);
    return () => clearInterval(t);
  }, [gameState, isPaused, onTimeChange]);

  useEffect(() => { onScoreChange?.(score); }, [score, onScoreChange]);

  const handleAnswer = (answer: boolean) => {
    if (!current || answered !== null) return;
    setAnswered(answer);
    setTotal(t => t + 1);
    if (answer === current.isValid) {
      const streakBonus = streak * 25;
      setScore(s => s + 200 + streakBonus);
      setCorrect(c => c + 1);
      setStreak(s => { const n = s + 1; if (n > bestStreak) setBestStreak(n); return n; });
      audioManager.playCorrect();
    } else {
      setStreak(0);
      audioManager.playWrong();
    }
    setTimeout(() => nextPuzzle(), 2500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚖️</div>
        <h2 style={{ color: '#ff6d00', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Syllogism Engine</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Evaluate logical arguments. Given two premises, determine if the conclusion
          logically follows. Beware of common fallacies!
        </p>
        <div style={{ background: 'rgba(255,109,0,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#ff6d00', fontWeight: 600 }}>🧠 INTJ Skills: Formal Logic • Fallacy Detection • Critical Reasoning</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #ff6d00, #ff9100)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          Begin Analysis →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#ff6d00' }}>Analysis Complete</h2>
        <p>Correct: <strong>{correct}/{total}</strong> ({total > 0 ? Math.round((correct / total) * 100) : 0}%)</p>
        <p>Best streak: <strong>{bestStreak}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  if (!current) return null;
  const isCorrectAnswer = answered !== null ? answered === current.isValid : null;

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <span>⚖️ {correct}/{total}</span>
        <span>🔥 Streak: {streak}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>PREMISE 1</div>
          <div style={{ fontSize: '1.05rem', padding: '0.5rem', background: 'rgba(255,109,0,0.1)', borderRadius: 8, borderLeft: '3px solid #ff6d00' }}>
            {current.premise1}
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>PREMISE 2</div>
          <div style={{ fontSize: '1.05rem', padding: '0.5rem', background: 'rgba(255,109,0,0.1)', borderRadius: 8, borderLeft: '3px solid #ff6d00' }}>
            {current.premise2}
          </div>
        </div>
        <div style={{ borderTop: '2px dashed #444', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>∴ CONCLUSION</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            {current.conclusion}
          </div>
        </div>
      </div>
      {answered === null ? (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => handleAnswer(true)} style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', fontWeight: 700, background: 'rgba(0,200,83,0.15)', border: '2px solid #00c853', borderRadius: 12, color: '#00c853', cursor: 'pointer' }}>
            ✓ Valid
          </button>
          <button onClick={() => handleAnswer(false)} style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', fontWeight: 700, background: 'rgba(255,82,82,0.15)', border: '2px solid #ff5252', borderRadius: 12, color: '#ff5252', cursor: 'pointer' }}>
            ✕ Invalid
          </button>
        </div>
      ) : (
        <div style={{ background: isCorrectAnswer ? 'rgba(0,200,83,0.1)' : 'rgba(255,82,82,0.1)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{isCorrectAnswer ? '✅ Correct!' : '❌ Wrong'}</div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.25rem' }}>
            <strong style={{ color: '#fff' }}>{current.category}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888' }}>{current.explanation}</div>
        </div>
      )}
    </div>
  );
});

export default SyllogismEngine;

import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface CryptogramProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface CryptogramPuzzle {
  original: string;
  author: string;
  encoded: string;
  mapping: Record<string, string>; // cipher → plain
}

const FAMOUS_QUOTES: { text: string; author: string }[] = [
  { text: 'BE THE CHANGE YOU WISH TO SEE IN THE WORLD', author: 'Gandhi' },
  { text: 'THE MIND IS EVERYTHING WHAT YOU THINK YOU BECOME', author: 'Buddha' },
  { text: 'STRIVE NOT TO BE A SUCCESS BUT RATHER TO BE OF VALUE', author: 'Einstein' },
  { text: 'LIFE IS WHAT HAPPENS WHEN YOU ARE BUSY MAKING OTHER PLANS', author: 'Lennon' },
  { text: 'THE ONLY IMPOSSIBLE JOURNEY IS THE ONE YOU NEVER BEGIN', author: 'Robbins' },
  { text: 'SUCCESS IS NOT FINAL FAILURE IS NOT FATAL IT IS THE COURAGE TO CONTINUE', author: 'Churchill' },
  { text: 'IT DOES NOT MATTER HOW SLOWLY YOU GO AS LONG AS YOU DO NOT STOP', author: 'Confucius' },
  { text: 'IN THREE WORDS I CAN SUM UP EVERYTHING ABOUT LIFE IT GOES ON', author: 'Frost' },
  { text: 'THE PURPOSE OF OUR LIVES IS TO BE HAPPY', author: 'Dalai Lama' },
  { text: 'YOU ONLY LIVE ONCE BUT IF YOU DO IT RIGHT ONCE IS ENOUGH', author: 'Mae West' },
  { text: 'KNOWING YOURSELF IS THE BEGINNING OF ALL WISDOM', author: 'Aristotle' },
  { text: 'THE ONLY TRUE WISDOM IS IN KNOWING YOU KNOW NOTHING', author: 'Socrates' },
];

function createCryptogram(level: number): CryptogramPuzzle {
  const q = FAMOUS_QUOTES[Math.floor(Math.random() * FAMOUS_QUOTES.length)];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const shuffled = [...letters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (let i = 0; i < 26; i++) {
    if (shuffled[i] === letters[i]) {
      [shuffled[i], shuffled[(i + 1) % 26]] = [shuffled[(i + 1) % 26], shuffled[i]];
    }
  }
  const encMap: Record<string, string> = {};
  const decMap: Record<string, string> = {};
  letters.forEach((l, i) => { encMap[l] = shuffled[i]; decMap[shuffled[i]] = l; });
  const encoded = q.text.split('').map(c => encMap[c] || c).join('');
  return { original: q.text, author: q.author, encoded, mapping: decMap };
}

const GAME_DURATION = 480;

const Cryptogram: React.FC<CryptogramProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [solved, setSolved] = useState(0);
  const [total, setTotal] = useState(0);
  const [puzzle, setPuzzle] = useState<CryptogramPuzzle | null>(null);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [selectedCipher, setSelectedCipher] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);

  const initPuzzle = useCallback(() => {
    const p = createCryptogram(level);
    setPuzzle(p);
    setGuesses({});
    setSelectedCipher(null);
    // Reveal a few letters for easier start
    const cipherLetters = [...new Set(p.encoded.replace(/[^A-Z]/g, '').split(''))];
    const revealCount = Math.max(1, 5 - level);
    const rev = new Set<string>();
    const initial: Record<string, string> = {};
    for (let i = 0; i < Math.min(revealCount, cipherLetters.length); i++) {
      rev.add(cipherLetters[i]);
      initial[cipherLetters[i]] = p.mapping[cipherLetters[i]];
    }
    setRevealed(rev);
    setGuesses(initial);
  }, [level]);

  useEffect(() => { if (gameState === 'playing') initPuzzle(); }, [gameState, initPuzzle]);

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

  const useHint = () => {
    if (!puzzle) return;
    const cipherLetters = [...new Set(puzzle.encoded.replace(/[^A-Z]/g, '').split(''))];
    const unrevealed = cipherLetters.filter(c => !revealed.has(c) && guesses[c] !== puzzle.mapping[c]);
    if (unrevealed.length === 0) return;
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setRevealed(prev => new Set(prev).add(pick));
    setGuesses(prev => ({ ...prev, [pick]: puzzle.mapping[pick] }));
    setHintsUsed(h => h + 1);
  };

  const handleGuess = (plain: string) => {
    if (!selectedCipher || !puzzle) return;
    if (revealed.has(selectedCipher)) return;
    const newGuesses = { ...guesses, [selectedCipher]: plain };
    setGuesses(newGuesses);
    setSelectedCipher(null);
    // Check completion
    const cipherLetters = [...new Set(puzzle.encoded.replace(/[^A-Z]/g, '').split(''))];
    const allCorrect = cipherLetters.every(c => newGuesses[c] === puzzle.mapping[c]);
    if (allCorrect) {
      const bonus = timeLeft * 2 - hintsUsed * 100;
      setScore(s => s + Math.max(200, 600 * level + bonus));
      setSolved(s => s + 1);
      setTotal(t => t + 1);
      setLevel(l => l + 1);
      audioManager.playLevelUp();
      setTimeout(() => initPuzzle(), 2000);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📜</div>
        <h2 style={{ color: '#ffab40', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Cryptogram</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Decode famous quotes where each letter has been substituted with another.
          Use pattern recognition and word structure to crack the code.
        </p>
        <div style={{ background: 'rgba(255,171,64,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#ffab40', fontWeight: 600 }}>🧠 INTJ Skills: Pattern Recognition • Language Analysis • Systematic Decryption</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #ffab40, #ff9100)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          Decode Quote →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = total > 0 ? Math.round((solved / Math.max(total, 1)) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#ffab40' }}>Cryptogram Complete</h2>
        <p>Quotes decoded: <strong>{solved}</strong></p>
        <p>Hints used: <strong>{hintsUsed}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  if (!puzzle) return null;
  const words = puzzle.encoded.split(' ');
  const usedPlain = new Set(Object.values(guesses));

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 650, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <span>📜 Level {level}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
        <button onClick={useHint} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255,171,64,0.2)', border: 'none', borderRadius: 6, color: '#ffab40', cursor: 'pointer' }}>
          💡 Hint
        </button>
      </div>
      {/* Quote display */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '12px 16px', justifyContent: 'center', lineHeight: 2.5 }}>
        {words.map((word, wi) => (
          <span key={wi} style={{ display: 'inline-flex', gap: 2 }}>
            {word.split('').map((c, ci) => {
              if (!/[A-Z]/.test(c)) return <span key={ci}>{c}</span>;
              const guess = guesses[c];
              const isCorrect = guess === puzzle.mapping[c];
              const isRev = revealed.has(c);
              const isSel = c === selectedCipher;
              return (
                <span key={ci} onClick={() => !isRev && setSelectedCipher(c)} style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: 24,
                  cursor: isRev ? 'default' : 'pointer',
                  background: isSel ? 'rgba(255,171,64,0.3)' : 'transparent',
                  borderBottom: `2px solid ${isRev ? '#00c853' : guess ? (isCorrect ? '#ffab40' : '#ff5252') : '#555'}`,
                  borderRadius: '2px 2px 0 0', padding: '0 1px',
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: isRev ? '#00c853' : guess ? '#fff' : '#555', minHeight: '1.2rem' }}>
                    {guess || '_'}
                  </span>
                  <span style={{ fontSize: '0.55rem', color: '#666' }}>{c}</span>
                </span>
              );
            })}
          </span>
        ))}
      </div>
      {puzzle.author && (
        <p style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', fontStyle: 'italic', marginBottom: '0.75rem' }}>— {puzzle.author}</p>
      )}
      {/* Letter keyboard */}
      {selectedCipher && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
            <button key={l} onClick={() => handleGuess(l)} style={{
              width: 34, height: 34, border: 'none', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              background: usedPlain.has(l) ? 'rgba(255,255,255,0.03)' : 'rgba(255,171,64,0.15)',
              color: usedPlain.has(l) ? '#444' : '#ffab40',
            }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
});

export default Cryptogram;

import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface CipherBreakerProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface CipherPuzzle {
  plaintext: string;
  ciphertext: string;
  mapping: Record<string, string>;
  hint: string;
  difficulty: number;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const QUOTES = [
  'THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO',
  'KNOWLEDGE IS POWER',
  'LOGIC WILL GET YOU FROM A TO Z',
  'THE UNEXAMINED LIFE IS NOT WORTH LIVING',
  'I THINK THEREFORE I AM',
  'TO BE OR NOT TO BE THAT IS THE QUESTION',
  'ALL THAT GLITTERS IS NOT GOLD',
  'THE TRUTH IS RARELY PURE AND NEVER SIMPLE',
  'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY',
  'ELEMENTARY MY DEAR WATSON',
  'IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE',
  'SCIENCE IS ORGANIZED KNOWLEDGE',
  'SIMPLICITY IS THE ULTIMATE SOPHISTICATION',
  'WHERE THERE IS A WILL THERE IS A WAY',
  'THE BEST WAY TO PREDICT THE FUTURE IS TO CREATE IT',
];

function generateCipher(difficulty: number): CipherPuzzle {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const letters = Array.from(ALPHABET);
  const shuffled = [...letters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Ensure no letter maps to itself
  for (let i = 0; i < 26; i++) {
    if (shuffled[i] === letters[i]) {
      const swap = (i + 1) % 26;
      [shuffled[i], shuffled[swap]] = [shuffled[swap], shuffled[i]];
    }
  }
  const mapping: Record<string, string> = {};
  const reverseMapping: Record<string, string> = {};
  letters.forEach((l, i) => {
    mapping[l] = shuffled[i];
    reverseMapping[shuffled[i]] = l;
  });
  const ciphertext = quote.split('').map(c => mapping[c] || c).join('');
  // Reveal some letters based on difficulty
  const revealCount = Math.max(2, 8 - difficulty * 2);
  const usedLetters = [...new Set(quote.replace(/[^A-Z]/g, '').split(''))];
  const hints = usedLetters.slice(0, revealCount);
  return { plaintext: quote, ciphertext, mapping: reverseMapping, hint: hints.join(', '), difficulty };
}

const GAME_DURATION = 420;

const CipherBreaker: React.FC<CipherBreakerProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'solved' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [puzzle, setPuzzle] = useState<CipherPuzzle | null>(null);
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});
  const [selectedCipher, setSelectedCipher] = useState<string | null>(null);
  const [revealedLetters, setRevealedLetters] = useState<Set<string>>(new Set());
  const [shakeWrong, setShakeWrong] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);

  const initPuzzle = useCallback(() => {
    const p = generateCipher(Math.min(level, 4));
    setPuzzle(p);
    setUserMapping({});
    setSelectedCipher(null);
    // Pre-reveal some letters as hints
    const hints = new Set<string>();
    const usedCiphers = [...new Set(p.ciphertext.replace(/[^A-Z]/g, '').split(''))];
    const revealCount = Math.max(1, 6 - level);
    for (let i = 0; i < Math.min(revealCount, usedCiphers.length); i++) {
      const c = usedCiphers[i];
      hints.add(c);
    }
    setRevealedLetters(hints);
    const initial: Record<string, string> = {};
    hints.forEach(c => { initial[c] = p.mapping[c]; });
    setUserMapping(initial);
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

  const handleCipherSelect = (cipher: string) => {
    if (revealedLetters.has(cipher)) return;
    setSelectedCipher(cipher);
  };

  const handleLetterGuess = (plain: string) => {
    if (!selectedCipher || !puzzle) return;
    const newMapping = { ...userMapping, [selectedCipher]: plain };
    setUserMapping(newMapping);
    setSelectedCipher(null);
    if (puzzle.mapping[selectedCipher] === plain) {
      setStreakCount(s => s + 1);
      audioManager.playCorrect();
    } else {
      setShakeWrong(selectedCipher);
      setStreakCount(0);
      setTimeout(() => setShakeWrong(null), 500);
      audioManager.playWrong();
    }
    // Check if puzzle is solved
    const cipherLetters = [...new Set(puzzle.ciphertext.replace(/[^A-Z]/g, '').split(''))];
    const allCorrect = cipherLetters.every(c => newMapping[c] === puzzle.mapping[c]);
    if (allCorrect) {
      const bonus = Math.max(0, timeLeft) * 2 + streakCount * 50;
      const pts = 500 * level + bonus;
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      setTotal(t => t + 1);
      setLevel(l => l + 1);
      audioManager.playLevelUp();
      setTimeout(() => initPuzzle(), 1500);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
        <h2 style={{ color: '#00e5ff', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Cipher Breaker</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Decode encrypted messages by figuring out the letter substitution cipher.
          Each letter in the cipher maps to exactly one real letter.
        </p>
        <div style={{ background: 'rgba(0,229,255,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#00e5ff', fontWeight: 600 }}>🧠 INTJ Skills: Pattern Analysis • Frequency Analysis • Systematic Deduction</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #00e5ff, #0091ea)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          Begin Decryption →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover' || gameState === 'solved') {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#00e5ff' }}>Mission Complete</h2>
        <p>Ciphers cracked: <strong>{correct}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
        <p>Highest level: <strong>{level}</strong></p>
      </div>
    );
  }

  if (!puzzle) return null;
  const cipherChars = puzzle.ciphertext.split('');
  const usedPlain = new Set(Object.values(userMapping));

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
        <span>🔐 Level {level}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score.toLocaleString()}</span>
      </div>
      {/* Cipher text display */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', fontFamily: 'monospace', lineHeight: 2.2, display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center' }}>
        {cipherChars.map((c, i) => {
          if (c === ' ') return <span key={i} style={{ width: 16 }}>&nbsp;</span>;
          if (!/[A-Z]/.test(c)) return <span key={i} style={{ fontSize: '1.2rem' }}>{c}</span>;
          const decoded = userMapping[c];
          const isCorrect = decoded === puzzle.mapping[c];
          const isSelected = c === selectedCipher;
          const isRevealed = revealedLetters.has(c);
          return (
            <span key={i} onClick={() => handleCipherSelect(c)} style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: 28, cursor: isRevealed ? 'default' : 'pointer',
              background: isSelected ? 'rgba(0,229,255,0.3)' : isRevealed ? 'rgba(0,200,83,0.15)' : 'rgba(255,255,255,0.05)',
              borderRadius: 4, padding: '2px', border: isSelected ? '2px solid #00e5ff' : '2px solid transparent',
              animation: shakeWrong === c ? 'shake 0.3s' : undefined,
            }}>
              <span style={{ fontSize: '0.65rem', color: '#666' }}>{c}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isRevealed ? '#00c853' : decoded ? (isCorrect ? '#00e5ff' : '#ff5252') : '#555', minHeight: '1.3rem' }}>
                {decoded || '_'}
              </span>
            </span>
          );
        })}
      </div>
      {/* Letter keyboard */}
      {selectedCipher && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>
            Assign a letter to <strong style={{ color: '#00e5ff' }}>{selectedCipher}</strong>:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {ALPHABET.split('').map(l => (
              <button key={l} onClick={() => handleLetterGuess(l)} style={{
                width: 36, height: 36, border: 'none', borderRadius: 6, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                background: usedPlain.has(l) ? 'rgba(255,255,255,0.05)' : 'rgba(0,229,255,0.15)',
                color: usedPlain.has(l) ? '#555' : '#00e5ff',
              }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Frequency hint */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
        Tip: E, T, A, O, I, N are the most common English letters
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }`}</style>
    </div>
  );
});

export default CipherBreaker;

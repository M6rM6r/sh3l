import { useState, useEffect } from 'react';

interface WordScrambleProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

const words = [
  'BRAIN', 'SMART', 'THINK', 'LEARN', 'MEMORY', 'FOCUS', 'LOGIC', 'PUZZLE',
  'GENIUS', 'WISDOM', 'KNOWLEDGE', 'MINDFUL', 'CREATIVE', 'SOLUTION', 'STRATEGY',
  'CHALLENGE', 'COGNITIVE', 'INTELLIGENCE', 'UNDERSTAND', 'CONCENTRATION'
];

export function WordScramble({ onComplete, onBack }: WordScrambleProps) {
  const [level, setLevel] = useState(1);
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    startNewRound();
  }, [level]);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [timeLeft, gameOver]);

  const startNewRound = () => {
    const availableWords = words.filter(w => w.length <= 6 + level);
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    setCurrentWord(word);
    setScrambledWord(scrambleWord(word));
    setUserInput('');
    setFeedback(null);
  };

  const scrambleWord = (word: string): string => {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const scrambled = arr.join('');
    return scrambled === word ? scrambleWord(word) : scrambled;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (userInput.toUpperCase() === currentWord) {
      setFeedback('correct');
      const newScore = score + level * 50 + timeLeft * 5;
      setScore(newScore);
      setTimeout(() => {
        setLevel(level + 1);
        setTimeLeft(Math.max(30 - level * 2, 10));
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
      }, 1000);
    }
  };

  const handleSkip = () => {
    startNewRound();
    setScore(Math.max(0, score - 25));
  };

  const endGame = () => {
    setGameOver(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setTimeout(() => onComplete(score, level, duration), 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F59E0B', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          color: 'white'
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#F59E0B',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>📝 Word Scramble</h1>
          <div style={{ width: '80px' }}></div>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '40px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '15px 25px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600'
          }}>
            Level: {level}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '15px 25px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600'
          }}>
            Score: {score}
          </div>
          <div style={{
            background: timeLeft < 10 ? '#EF4444' : 'rgba(255,255,255,0.2)',
            padding: '15px 25px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600',
            transition: 'background 0.3s'
          }}>
            Time: {timeLeft}s
          </div>
        </div>

        {!gameOver ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
              Unscramble this word:
            </p>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#F59E0B',
              marginBottom: '30px',
              letterSpacing: '5px'
            }}>
              {scrambledWord}
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                autoFocus
                disabled={feedback !== null}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '20px',
                  textAlign: 'center',
                  border: feedback === 'correct' ? '3px solid #10B981' :
                          feedback === 'wrong' ? '3px solid #EF4444' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={!userInput || feedback !== null}
                  style={{
                    flex: 1,
                    padding: '15px',
                    background: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: userInput && feedback === null ? 'pointer' : 'not-allowed',
                    opacity: userInput && feedback === null ? 1 : 0.5
                  }}
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={feedback !== null}
                  style={{
                    padding: '15px 30px',
                    background: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: feedback === null ? 'pointer' : 'not-allowed',
                    opacity: feedback === null ? 1 : 0.5
                  }}
                >
                  Skip (-25)
                </button>
              </div>
            </form>

            {feedback === 'correct' && (
              <div style={{
                marginTop: '20px',
                fontSize: '24px',
                color: '#10B981',
                fontWeight: '700'
              }}>
                ✓ Correct!
              </div>
            )}

            {feedback === 'wrong' && (
              <div style={{
                marginTop: '20px',
                fontSize: '24px',
                color: '#EF4444',
                fontWeight: '700'
              }}>
                ✗ Try again!
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏰</div>
            <h2 style={{ fontSize: '28px', color: '#F59E0B', margin: 0, marginBottom: '10px' }}>
              Time's Up!
            </h2>
            <p style={{ fontSize: '18px', color: '#666' }}>Final Score: {score}</p>
          </div>
        )}
      </div>
    </div>
  );
}

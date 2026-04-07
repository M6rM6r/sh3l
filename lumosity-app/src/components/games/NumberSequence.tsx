import { useState, useEffect } from 'react';

interface NumberSequenceProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function NumberSequence({ onComplete, onBack }: NumberSequenceProps) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [showSequence, setShowSequence] = useState(true);
  const [gameState, setGameState] = useState<'showing' | 'input' | 'correct' | 'wrong'>('showing');
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    startNewRound();
  }, [level]);

  const startNewRound = () => {
    const length = 3 + level;
    const newSequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
    setSequence(newSequence);
    setUserSequence([]);
    setShowSequence(true);
    setGameState('showing');

    setTimeout(() => {
      setShowSequence(false);
      setGameState('input');
    }, length * 1000);
  };

  const handleNumberClick = (num: number) => {
    if (gameState !== 'input') return;

    const newUserSequence = [...userSequence, num];
    setUserSequence(newUserSequence);

    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      setGameState('wrong');
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setTimeout(() => {
        onComplete(score, level, duration);
      }, 1500);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setGameState('correct');
      const newScore = score + level * 100;
      setScore(newScore);
      setTimeout(() => {
        setLevel(level + 1);
      }, 1000);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '15px', paddingBottom: '30px', touchAction: 'manipulation' }}>
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
              color: '#10B981',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>🔢 Number Sequence</h1>
          <div style={{ width: '80px' }}></div>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '40px',
          justifyContent: 'center'
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
        </div>

        {gameState === 'showing' && (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
              Memorize this sequence:
            </p>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#10B981',
              letterSpacing: '10px'
            }}>
              {showSequence ? sequence.join(' ') : ''}
            </div>
          </div>
        )}

        {gameState === 'input' && (
          <div>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              textAlign: 'center',
              marginBottom: '30px',
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                color: '#10B981',
                letterSpacing: '10px'
              }}>
                {userSequence.join(' ') || 'Enter sequence...'}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  style={{
                    padding: '20px',
                    minHeight: '70px',
                    fontSize: 'clamp(24px, 6vw, 32px)',
                    fontWeight: '700',
                    background: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#10B981',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'white';
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.background = '#f0fdf4';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === 'correct' && (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '10px' }}>✓</div>
            <h2 style={{ fontSize: '28px', color: '#10B981', margin: 0 }}>Correct!</h2>
          </div>
        )}

        {gameState === 'wrong' && (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '10px' }}>✗</div>
            <h2 style={{ fontSize: '28px', color: '#EF4444', margin: 0 }}>Game Over!</h2>
            <p style={{ fontSize: '18px', color: '#666', marginTop: '10px' }}>
              Final Score: {score}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

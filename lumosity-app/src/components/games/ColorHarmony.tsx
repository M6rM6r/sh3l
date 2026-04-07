import { useState, useEffect } from 'react';

interface ColorHarmonyProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function ColorHarmony({ onComplete, onBack }: ColorHarmonyProps) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 });
  const [userColor, setUserColor] = useState({ r: 128, g: 128, b: 128 });
  const [timeLeft, setTimeLeft] = useState(15);
  const [startTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    generateNewColor();
  }, [level]);

  useEffect(() => {
    if (timeLeft <= 0 && !gameOver) {
      setGameOver(true);
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setTimeout(() => onComplete(score, level, duration), 1500);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameOver]);

  const generateNewColor = () => {
    setTargetColor({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    });
    setUserColor({ r: 128, g: 128, b: 128 });
    setTimeLeft(15 - level);
  };

  const checkMatch = () => {
    const diff = Math.abs(targetColor.r - userColor.r) +
      Math.abs(targetColor.g - userColor.g) +
      Math.abs(targetColor.b - userColor.b);

    const accuracy = Math.max(0, 100 - Math.floor(diff / 7.65));

    if (accuracy >= 80) {
      const points = accuracy * level;
      setScore(score + points);
      setLevel(level + 1);
    } else {
      generateNewColor();
    }
  };

  const toHex = (color: { r: number; g: number; b: number }) =>
    `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button onClick={onBack} style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '8px',
            color: '#00ff9f',
            cursor: 'pointer',
            fontSize: '16px'
          }}>← Back</button>
          <h1 style={{ color: '#00ff9f', margin: 0, fontSize: '32px', fontWeight: 'bold' }}>🎨 Color Harmony</h1>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', justifyContent: 'center' }}>
          <div style={{
            padding: '15px 30px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Level: {level}</div>
          <div style={{
            padding: '15px 30px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Score: {score}</div>
          <div style={{
            padding: '15px 30px',
            background: timeLeft <= 5 ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${timeLeft <= 5 ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,159,0.3)'}`,
            borderRadius: '12px',
            fontSize: '18px',
            color: timeLeft <= 5 ? '#ff4444' : '#fff'
          }}>Time: {timeLeft}s</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,255,159,0.3)',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '30px'
        }}>
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h3 style={{ color: '#00ff9f', marginBottom: '15px' }}>Target Color</h3>
            <div style={{
              width: '100%',
              height: '120px',
              background: toHex(targetColor),
              borderRadius: '12px',
              border: '2px solid rgba(0,255,159,0.3)',
              boxShadow: `0 0 30px ${toHex(targetColor)}80`
            }} />
            <p style={{ color: '#999', marginTop: '10px', fontSize: '14px' }}>{toHex(targetColor).toUpperCase()}</p>
          </div>

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h3 style={{ color: '#00ff9f', marginBottom: '15px' }}>Your Color</h3>
            <div style={{
              width: '100%',
              height: '120px',
              background: toHex(userColor),
              borderRadius: '12px',
              border: '2px solid rgba(0,255,159,0.3)',
              boxShadow: `0 0 30px ${toHex(userColor)}80`
            }} />
            <p style={{ color: '#999', marginTop: '10px', fontSize: '14px' }}>{toHex(userColor).toUpperCase()}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>Red: {userColor.r}</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor.r}
              onChange={(e) => setUserColor({ ...userColor, r: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#ff0000' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>Green: {userColor.g}</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor.g}
              onChange={(e) => setUserColor({ ...userColor, g: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#00ff00' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '10px' }}>Blue: {userColor.b}</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor.b}
              onChange={(e) => setUserColor({ ...userColor, b: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#0000ff' }}
            />
          </div>

          <button
            onClick={checkMatch}
            disabled={gameOver}
            style={{
              width: '100%',
              padding: '18px',
              background: gameOver ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff9f 0%, #00cc7f 100%)',
              border: 'none',
              borderRadius: '12px',
              color: gameOver ? '#666' : '#0a0a0f',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: gameOver ? 'not-allowed' : 'pointer',
              boxShadow: gameOver ? 'none' : '0 4px 20px rgba(0,255,159,0.3)'
            }}
          >
            {gameOver ? 'Game Over!' : 'Check Match'}
          </button>
        </div>
      </div>
    </div>
  );
}

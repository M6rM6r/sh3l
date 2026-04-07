import { useEffect, useRef, useState } from 'react';
import './ColorHarmony.css';

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
  const targetSwatchRef = useRef<HTMLDivElement | null>(null);
  const userSwatchRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const targetHex = toHex(targetColor);
    if (targetSwatchRef.current) {
      targetSwatchRef.current.style.background = targetHex;
      targetSwatchRef.current.style.boxShadow = `0 0 30px ${targetHex}80`;
    }
  }, [targetColor]);

  useEffect(() => {
    const userHex = toHex(userColor);
    if (userSwatchRef.current) {
      userSwatchRef.current.style.background = userHex;
      userSwatchRef.current.style.boxShadow = `0 0 30px ${userHex}80`;
    }
  }, [userColor]);

  return (
    <div className="color-harmony">
      <div className="color-harmony__container">
        <div className="color-harmony__header">
          <button className="color-harmony__back-button" onClick={onBack}>← Back</button>
          <h1 className="color-harmony__title">🎨 Color Harmony</h1>
        </div>

        <div className="color-harmony__stats">
          <div className="color-harmony__stat-card">Level: {level}</div>
          <div className="color-harmony__stat-card">Score: {score}</div>
          <div className={`color-harmony__stat-card ${timeLeft <= 5 ? 'color-harmony__stat-card--danger' : ''}`}>Time: {timeLeft}s</div>
        </div>

        <div className="color-harmony__panel">
          <div className="color-harmony__swatch-section">
            <h3 className="color-harmony__section-title">Target Color</h3>
            <div ref={targetSwatchRef} className="color-harmony__swatch" />
            <p className="color-harmony__hex-value">{toHex(targetColor).toUpperCase()}</p>
          </div>

          <div className="color-harmony__swatch-section">
            <h3 className="color-harmony__section-title">Your Color</h3>
            <div ref={userSwatchRef} className="color-harmony__swatch" />
            <p className="color-harmony__hex-value">{toHex(userColor).toUpperCase()}</p>
          </div>

          <div className="color-harmony__control-group">
            <label htmlFor="color-harmony-red" className="color-harmony__label">Red: {userColor.r}</label>
            <input
              id="color-harmony-red"
              title="Adjust red channel"
              className="color-harmony__slider color-harmony__slider--red"
              type="range"
              min="0"
              max="255"
              value={userColor.r}
              onChange={(e) => setUserColor({ ...userColor, r: parseInt(e.target.value) })}
            />
          </div>

          <div className="color-harmony__control-group">
            <label htmlFor="color-harmony-green" className="color-harmony__label">Green: {userColor.g}</label>
            <input
              id="color-harmony-green"
              title="Adjust green channel"
              className="color-harmony__slider color-harmony__slider--green"
              type="range"
              min="0"
              max="255"
              value={userColor.g}
              onChange={(e) => setUserColor({ ...userColor, g: parseInt(e.target.value) })}
            />
          </div>

          <div className="color-harmony__control-group color-harmony__control-group--last">
            <label htmlFor="color-harmony-blue" className="color-harmony__label">Blue: {userColor.b}</label>
            <input
              id="color-harmony-blue"
              title="Adjust blue channel"
              className="color-harmony__slider color-harmony__slider--blue"
              type="range"
              min="0"
              max="255"
              value={userColor.b}
              onChange={(e) => setUserColor({ ...userColor, b: parseInt(e.target.value) })}
            />
          </div>

          <button
            className="color-harmony__check-button"
            onClick={checkMatch}
            disabled={gameOver}
          >
            {gameOver ? 'Game Over!' : 'Check Match'}
          </button>
        </div>
      </div>
    </div>
  );
}



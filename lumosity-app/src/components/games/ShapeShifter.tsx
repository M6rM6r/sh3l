import { useState, useEffect } from 'react';

interface ShapeShifterProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

type Shape = 'circle' | 'square' | 'triangle' | 'star' | 'diamond';

export function ShapeShifter({ onComplete, onBack }: ShapeShifterProps) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [targetShape, setTargetShape] = useState<Shape>('circle');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime] = useState(Date.now());
  const [lives, setLives] = useState(3);

  const allShapes: Shape[] = ['circle', 'square', 'triangle', 'star', 'diamond'];

  useEffect(() => {
    generateShapes();
  }, [level]);

  useEffect(() => {
    if (timeLeft <= 0 || lives <= 0) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setTimeout(() => onComplete(score, level, duration), 1500);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, lives]);

  const generateShapes = () => {
    const numShapes = 6 + level * 2;
    const target = allShapes[Math.floor(Math.random() * allShapes.length)];
    const newShapes: Shape[] = [];

    const targetCount = 3 + Math.floor(level / 2);
    for (let i = 0; i < targetCount; i++) {
      newShapes.push(target);
    }

    while (newShapes.length < numShapes) {
      const randomShape = allShapes[Math.floor(Math.random() * allShapes.length)];
      if (randomShape !== target) {
        newShapes.push(randomShape);
      }
    }

    for (let i = newShapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newShapes[i], newShapes[j]] = [newShapes[j], newShapes[i]];
    }

    setTargetShape(target);
    setShapes(newShapes);
  };

  const handleShapeClick = (shape: Shape, index: number) => {
    if (shape === targetShape) {
      setScore(score + 10 * level);
      const newShapes = shapes.filter((_, i) => i !== index);

      if (newShapes.filter(s => s === targetShape).length === 0) {
        setLevel(level + 1);
        setTimeLeft(timeLeft + 5);
      } else {
        setShapes(newShapes);
      }
    } else {
      setLives(lives - 1);
      const newShapes = shapes.filter((_, i) => i !== index);
      setShapes(newShapes);
    }
  };

  const renderShape = (shape: Shape) => {
    const baseStyle = {
      width: '80px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    switch (shape) {
      case 'circle':
        return <div style={{ ...baseStyle, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff9f, #00cc7f)' }} />;
      case 'square':
        return <div style={{ ...baseStyle, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }} />;
      case 'triangle':
        return <div style={{ ...baseStyle, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />;
      case 'star':
        return <div style={{ ...baseStyle, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }} />;
      case 'diamond':
        return <div style={{ ...baseStyle, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', background: 'linear-gradient(135deg, #a855f7, #9333ea)' }} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
          <h1 style={{ color: '#00ff9f', margin: 0, fontSize: '32px', fontWeight: 'bold' }}>⬡ Shape Shifter</h1>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Level: {level}</div>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Score: {score}</div>
          <div style={{
            padding: '15px 25px',
            background: lives <= 1 ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${lives <= 1 ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,159,0.3)'}`,
            borderRadius: '12px',
            fontSize: '18px',
            color: lives <= 1 ? '#ff4444' : '#fff'
          }}>❤️ {lives}</div>
          <div style={{
            padding: '15px 25px',
            background: timeLeft <= 10 ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${timeLeft <= 10 ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,159,0.3)'}`,
            borderRadius: '12px',
            fontSize: '18px',
            color: timeLeft <= 10 ? '#ff4444' : '#fff'
          }}>⏱ {timeLeft}s</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,255,159,0.3)',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#00ff9f', marginBottom: '20px', fontSize: '24px' }}>Find all:</h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <div style={{ transform: 'scale(1.5)' }}>
              {renderShape(targetShape)}
            </div>
          </div>
          <p style={{ color: '#fff', fontSize: '18px', textTransform: 'capitalize' }}>{targetShape}</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '20px',
          padding: '20px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,255,159,0.3)',
          borderRadius: '16px'
        }}>
          {shapes.map((shape, index) => (
            <div
              key={index}
              onClick={() => handleShapeClick(shape, index)}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '10px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderShape(shape)}
            </div>
          ))}
        </div>

        {lives <= 0 && (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            color: '#ff4444',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            Game Over! No more lives! 💔
          </div>
        )}
      </div>
    </div>
  );
}

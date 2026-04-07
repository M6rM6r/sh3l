import { useState, useEffect, useRef } from 'react';

interface RhythmBlocksProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function RhythmBlocks({ onComplete, onBack }: RhythmBlocksProps) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [blocks, setBlocks] = useState<{ id: number; lane: number; position: number }[]>([]);
  const [nextId, setNextId] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [startTime] = useState(Date.now());
  const animationRef = useRef<number | undefined>(undefined);

  const lanes = [0, 1, 2, 3];
  const keys = ['d', 'f', 'j', 'k'];

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (!gameOver) {
        const lane = Math.floor(Math.random() * 4);
        setBlocks(prev => [...prev, { id: nextId, lane, position: 0 }]);
        setNextId(nextId + 1);
      }
    }, 1500 - level * 50);

    return () => clearInterval(spawnInterval);
  }, [level, nextId, gameOver]);

  useEffect(() => {
    const animate = () => {
      setBlocks(prev => {
        const updated = prev.map(block => ({
          ...block,
          position: block.position + 2
        }));

        const missed = updated.filter(block => block.position > 100);
        if (missed.length > 0) {
          setCombo(0);
          if (combo > 10) {
            setGameOver(true);
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setTimeout(() => onComplete(score, level, duration), 1500);
          }
        }

        return updated.filter(block => block.position <= 100);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [combo, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const keyIndex = keys.indexOf(e.key.toLowerCase());
      if (keyIndex !== -1) {
        hitBlock(keyIndex);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [blocks]);

  const hitBlock = (lane: number) => {
    const targetBlocks = blocks.filter(b => b.lane === lane);
    if (targetBlocks.length === 0) return;

    const closest = targetBlocks.reduce((prev, curr) =>
      Math.abs(curr.position - 85) < Math.abs(prev.position - 85) ? curr : prev
    );

    const accuracy = 100 - Math.abs(closest.position - 85);

    if (accuracy > 30) {
      const points = Math.floor(accuracy * level * (1 + combo * 0.05));
      setScore(score + points);
      setCombo(combo + 1);
      setBlocks(prev => prev.filter(b => b.id !== closest.id));

      if (combo > 0 && combo % 10 === 0) {
        setLevel(Math.min(10, level + 1));
      }
    }
  };

  const getLaneColor = (lane: number) => {
    const colors = ['#00ff9f', '#3b82f6', '#f59e0b', '#ef4444'];
    return colors[lane];
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
          <h1 style={{ color: '#00ff9f', margin: 0, fontSize: '32px', fontWeight: 'bold' }}>🎵 Rhythm Blocks</h1>
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
            background: combo >= 10 ? 'rgba(0,255,159,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${combo >= 10 ? '#00ff9f' : 'rgba(0,255,159,0.3)'}`,
            borderRadius: '12px',
            fontSize: '18px',
            color: combo >= 10 ? '#00ff9f' : '#fff'
          }}>🔥 Combo: {combo}</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,255,159,0.3)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          position: 'relative',
          height: '500px',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', height: '100%', gap: '10px' }}>
            {lanes.map((lane) => (
              <div
                key={lane}
                style={{
                  flex: 1,
                  background: `linear-gradient(to bottom, transparent, ${getLaneColor(lane)}20)`,
                  border: `2px solid ${getLaneColor(lane)}40`,
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                <div style={{
                  position: 'absolute',
                  bottom: '50px',
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: getLaneColor(lane),
                  boxShadow: `0 0 10px ${getLaneColor(lane)}`
                }} />

                {blocks.filter(b => b.lane === lane).map(block => (
                  <div
                    key={block.id}
                    style={{
                      position: 'absolute',
                      top: `${block.position}%`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60px',
                      height: '30px',
                      background: getLaneColor(lane),
                      borderRadius: '6px',
                      boxShadow: `0 0 20px ${getLaneColor(lane)}`,
                      border: `2px solid ${getLaneColor(lane)}`
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {keys.map((key, index) => (
            <button
              key={key}
              onClick={() => hitBlock(index)}
              style={{
                padding: '20px 30px',
                background: `linear-gradient(135deg, ${getLaneColor(index)}, ${getLaneColor(index)}cc)`,
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${getLaneColor(index)}40`,
                textTransform: 'uppercase'
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#999' }}>
          Press D, F, J, K keys to hit blocks!
        </div>

        {gameOver && (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            color: '#ff4444',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            Game Over!
          </div>
        )}
      </div>
    </div>
  );
}

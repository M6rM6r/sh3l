import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GameResultScreenProps {
  score: number;
  accuracy: number;
  gameName: string;
  personalBest: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export default function GameResultScreen({
  score,
  accuracy,
  gameName,
  personalBest,
  onPlayAgain,
  onExit,
}: GameResultScreenProps) {
  const isNewBest = score > personalBest;
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    if (isNewBest) {
      const colors = ['#6c63ff', '#00d2ff', '#ff6b6b', '#ffd93d', '#6bff8e'];
      const count = window.innerWidth < 768 ? 12 : 24;
      setParticles(
        Array.from({ length: count }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 0.6,
          color: colors[i % colors.length],
        }))
      );
    }
  }, [isNewBest]);

  return (
    <div className="game-result">
      {/* Confetti particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="game-result-particle"
          style={{ left: `${p.x}%`, background: p.color }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: '100vh', opacity: 0, rotate: 360 }}
          transition={{ duration: 2 + Math.random(), delay: p.delay, ease: 'easeIn' }}
        />
      ))}

      <motion.div
        className="game-result-card"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="game-result-emoji">
          {isNewBest ? '🏆' : score >= 80 ? '🌟' : score >= 50 ? '👍' : '💪'}
        </div>

        <h2 className="game-result-title">
          {isNewBest ? 'New Personal Best!' : 'Game Complete!'}
        </h2>
        <p className="game-result-game">{gameName}</p>

        <div className="game-result-stats">
          <div className="game-result-stat">
            <span className="game-result-stat-value">{score}</span>
            <span className="game-result-stat-label">Score</span>
          </div>
          <div className="game-result-divider" />
          <div className="game-result-stat">
            <span className="game-result-stat-value">{Math.round(accuracy)}%</span>
            <span className="game-result-stat-label">Accuracy</span>
          </div>
          {personalBest > 0 && (
            <>
              <div className="game-result-divider" />
              <div className="game-result-stat">
                <span className="game-result-stat-value">{Math.max(personalBest, score)}</span>
                <span className="game-result-stat-label">Best</span>
              </div>
            </>
          )}
        </div>

        <div className="game-result-actions">
          <button className="game-result-btn primary" onClick={onPlayAgain}>
            🔄 Play Again
          </button>
          <button className="game-result-btn secondary" onClick={onExit}>
            ← Back to Games
          </button>
        </div>
      </motion.div>
    </div>
  );
}

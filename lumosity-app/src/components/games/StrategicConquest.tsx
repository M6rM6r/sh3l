import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface StrategicConquestProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type Owner = 'player' | 'ai' | 'neutral';

interface Territory {
  id: number;
  name: string;
  emoji: string;
  troops: number;
  owner: Owner;
  connections: number[];
  row: number;
  col: number;
  production: number;
}

function generateMap(level: number): Territory[] {
  const gridSize = Math.min(3 + Math.floor(level / 2), 5);
  const territories: Territory[] = [];
  const names = ['Plains', 'Forest', 'Mountain', 'Desert', 'Lake', 'Valley', 'Cliff', 'Marsh', 'Tundra', 'Cave',
    'River', 'Hill', 'Canyon', 'Oasis', 'Glacier', 'Volcano', 'Island', 'Jungle', 'Steppe', 'Ruins',
    'Fort', 'Mine', 'Port', 'Tower', 'Camp'];
  const emojis = ['🏜️', '🌲', '⛰️', '🏝️', '💧', '🌄', '🧱', '🌿', '❄️', '🕳️',
    '🏞️', '⛺', '🏔️', '🌴', '🧊', '🌋', '🏖️', '🌳', '🏕️', '🏚️',
    '🏰', '⛏️', '⚓', '🗼', '🎪'];

  let id = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const connections: number[] = [];
      if (r > 0) connections.push((r - 1) * gridSize + c);
      if (r < gridSize - 1) connections.push((r + 1) * gridSize + c);
      if (c > 0) connections.push(r * gridSize + (c - 1));
      if (c < gridSize - 1) connections.push(r * gridSize + (c + 1));
      territories.push({
        id: id, name: names[id % names.length], emoji: emojis[id % emojis.length],
        troops: Math.floor(Math.random() * 3) + 1,
        owner: 'neutral', connections, row: r, col: c,
        production: Math.floor(Math.random() * 2) + 1,
      });
      id++;
    }
  }

  // Assign starting positions
  territories[0].owner = 'player';
  territories[0].troops = 5;
  territories[territories.length - 1].owner = 'ai';
  territories[territories.length - 1].troops = 5;
  return territories;
}

const GAME_DURATION = 300;

const StrategicConquest: React.FC<StrategicConquestProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [playerMoves, setPlayerMoves] = useState(2);
  const [wins, setWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [message, setMessage] = useState('');

  const initMap = useCallback(() => {
    setTerritories(generateMap(level));
    setSelectedTerritory(null);
    setTurn(1);
    setPlayerMoves(2 + Math.floor(level / 3));
    setMessage('');
  }, [level]);

  useEffect(() => { if (gameState === 'playing') initMap(); }, [gameState, initMap]);

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

  const checkWinCondition = useCallback((terrs: Territory[]) => {
    const aiCount = terrs.filter(t => t.owner === 'ai').length;
    const playerCount = terrs.filter(t => t.owner === 'player').length;
    if (aiCount === 0) {
      setScore(s => s + 600 * level);
      setWins(w => w + 1);
      setTotalGames(t => t + 1);
      setMessage('🎉 Victory! You conquered all territories!');
      audioManager.playLevelUp();
      setTimeout(() => { setLevel(l => l + 1); initMap(); }, 2000);
      return true;
    }
    if (playerCount === 0) {
      setTotalGames(t => t + 1);
      setMessage('💀 Defeated! AI conquered your territories.');
      audioManager.playWrong();
      setTimeout(() => initMap(), 2000);
      return true;
    }
    return false;
  }, [level, initMap]);

  const aiTurn = useCallback((terrs: Territory[]) => {
    const newTerrs = terrs.map(t => ({ ...t }));
    // AI reinforcements
    const aiTerrs = newTerrs.filter(t => t.owner === 'ai');
    aiTerrs.forEach(t => { t.troops += t.production; });
    // AI attacks weakest adjacent
    for (const at of aiTerrs) {
      const targets = at.connections.map(id => newTerrs[id]).filter(t => t.owner !== 'ai');
      if (targets.length > 0 && at.troops > 2) {
        targets.sort((a, b) => a.troops - b.troops);
        const target = targets[0];
        if (at.troops > target.troops) {
          const attackForce = Math.floor(at.troops * 0.6);
          at.troops -= attackForce;
          const defenseRoll = Math.floor(Math.random() * target.troops);
          const attackRoll = Math.floor(Math.random() * attackForce);
          if (attackRoll > defenseRoll) {
            target.owner = 'ai';
            target.troops = attackForce - Math.floor(defenseRoll * 0.5);
          } else {
            target.troops = Math.max(1, target.troops - Math.floor(attackForce * 0.5));
          }
        }
      }
    }
    setTerritories(newTerrs);
    checkWinCondition(newTerrs);
  }, [checkWinCondition]);

  const handleAttack = (targetId: number) => {
    if (selectedTerritory === null || playerMoves <= 0) return;
    const src = territories[selectedTerritory];
    const tgt = territories[targetId];
    if (src.owner !== 'player' || tgt.owner === 'player' || !src.connections.includes(targetId) || src.troops <= 1) return;

    const newTerrs = territories.map(t => ({ ...t }));
    const attacker = newTerrs[selectedTerritory];
    const defender = newTerrs[targetId];
    const attackForce = Math.floor(attacker.troops * 0.7);
    attacker.troops -= attackForce;

    const attackRoll = Math.floor(Math.random() * attackForce) + Math.floor(attackForce * 0.3);
    const defenseRoll = Math.floor(Math.random() * defender.troops);

    if (attackRoll > defenseRoll) {
      defender.owner = 'player';
      defender.troops = Math.max(1, attackForce - Math.floor(defenseRoll * 0.3));
      setScore(s => s + 50);
      audioManager.playCorrect();
    } else {
      defender.troops = Math.max(1, defender.troops - Math.floor(attackForce * 0.4));
      audioManager.playWrong();
    }

    setTerritories(newTerrs);
    setPlayerMoves(m => m - 1);
    setSelectedTerritory(null);

    if (checkWinCondition(newTerrs)) return;
  };

  const endTurn = () => {
    // Player reinforcements
    const newTerrs = territories.map(t => ({ ...t }));
    newTerrs.filter(t => t.owner === 'player').forEach(t => { t.troops += t.production; });
    setTerritories(newTerrs);
    setTurn(t => t + 1);
    setPlayerMoves(2 + Math.floor(level / 3));
    setSelectedTerritory(null);
    // AI turn
    setTimeout(() => aiTurn(newTerrs), 500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚔️</div>
        <h2 style={{ color: '#e040fb', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Strategic Conquest</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Conquer territories by attacking adjacent regions with your troops.
          Manage resources, plan attacks, and outmaneuver the AI opponent.
        </p>
        <div style={{ background: 'rgba(224,64,251,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#e040fb', fontWeight: 600 }}>🧠 INTJ Skills: Strategic Planning • Resource Management • Tactical Analysis</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #e040fb, #d500f9)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Begin Campaign →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#e040fb' }}>Campaign Over</h2>
        <p>Victories: <strong>{wins}/{totalGames}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  const gridSize = Math.max(...territories.map(t => t.col)) + 1;
  const cellSize = Math.min(80, (window.innerWidth - 48) / gridSize);
  const playerTerrs = territories.filter(t => t.owner === 'player').length;
  const aiTerrs = territories.filter(t => t.owner === 'ai').length;

  return (
    <div style={{ padding: '0.75rem', color: '#e0e0e0', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
        <span>⚔️ Turn {turn}</span>
        <span>🟢 {playerTerrs} | 🔴 {aiTerrs}</span>
        <span>Moves: {playerMoves}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      {message && <p style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: '#e040fb', marginBottom: '0.5rem' }}>{message}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`, gap: 4, justifyContent: 'center', marginBottom: '0.75rem' }}>
        {territories.map(t => {
          const isSelected = selectedTerritory === t.id;
          const isAttackable = selectedTerritory !== null && territories[selectedTerritory].owner === 'player' && t.owner !== 'player' && territories[selectedTerritory].connections.includes(t.id);
          const colorMap: Record<Owner, string> = { player: 'rgba(0,200,83,0.25)', ai: 'rgba(255,82,82,0.25)', neutral: 'rgba(255,255,255,0.05)' };
          const borderColor: Record<Owner, string> = { player: '#00c853', ai: '#ff5252', neutral: '#555' };
          return (
            <div key={t.id} onClick={() => {
              if (isAttackable && playerMoves > 0) handleAttack(t.id);
              else if (t.owner === 'player') setSelectedTerritory(isSelected ? null : t.id);
            }} style={{
              width: cellSize, height: cellSize, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
              background: isAttackable ? 'rgba(255,152,0,0.3)' : colorMap[t.owner],
              border: `2px solid ${isSelected ? '#fff' : isAttackable ? '#ff9800' : borderColor[t.owner]}`,
              boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
            }}>
              <span style={{ fontSize: cellSize > 60 ? '1.2rem' : '0.9rem' }}>{t.emoji}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>⚔️{t.troops}</span>
              <span style={{ fontSize: '0.5rem', color: '#888' }}>+{t.production}/turn</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={endTurn} style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #e040fb, #d500f9)', color: '#fff' }}>
          End Turn →
        </button>
        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
          Select your territory, then tap an adjacent enemy to attack
        </p>
      </div>
    </div>
  );
});

export default StrategicConquest;

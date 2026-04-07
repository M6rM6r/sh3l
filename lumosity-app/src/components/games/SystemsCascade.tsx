import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface SystemsCascadeProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface SystemNode {
  id: string;
  label: string;
  emoji: string;
  x: number;
  y: number;
  state: 'active' | 'inactive' | 'cascading' | 'failed';
  connections: string[];
  threshold: number; // number of active inputs needed to cascade
}

interface Scenario {
  title: string;
  description: string;
  nodes: SystemNode[];
  question: string;
  triggerNode: string;
  expectedCascade: string[];
}

function generateScenario(level: number): Scenario {
  const scenarios: Scenario[] = [
    {
      title: 'Power Grid',
      description: 'A power plant failure cascades through the grid. Which systems will fail?',
      nodes: [
        { id: 'plant', label: 'Power Plant', emoji: '⚡', x: 50, y: 10, state: 'active', connections: ['grid'], threshold: 0 },
        { id: 'grid', label: 'Grid Hub', emoji: '🔌', x: 50, y: 30, state: 'active', connections: ['hospital', 'factory', 'homes'], threshold: 1 },
        { id: 'hospital', label: 'Hospital', emoji: '🏥', x: 20, y: 55, state: 'active', connections: ['backup'], threshold: 1 },
        { id: 'factory', label: 'Factory', emoji: '🏭', x: 50, y: 55, state: 'active', connections: ['supply'], threshold: 1 },
        { id: 'homes', label: 'Homes', emoji: '🏠', x: 80, y: 55, state: 'active', connections: [], threshold: 1 },
        { id: 'backup', label: 'Backup Gen', emoji: '🔋', x: 20, y: 80, state: 'active', connections: [], threshold: 2 },
        { id: 'supply', label: 'Supply Chain', emoji: '📦', x: 50, y: 80, state: 'active', connections: [], threshold: 1 },
      ],
      question: 'If the Power Plant fails, how many systems go down?',
      triggerNode: 'plant',
      expectedCascade: ['plant', 'grid', 'hospital', 'factory', 'homes', 'supply'],
    },
    {
      title: 'Ecosystem',
      description: 'A drought affects the water source. Predict the ecological cascade.',
      nodes: [
        { id: 'water', label: 'Water Source', emoji: '💧', x: 50, y: 10, state: 'active', connections: ['plants', 'fish'], threshold: 0 },
        { id: 'plants', label: 'Plants', emoji: '🌿', x: 25, y: 35, state: 'active', connections: ['insects', 'herbivores'], threshold: 1 },
        { id: 'fish', label: 'Fish', emoji: '🐟', x: 75, y: 35, state: 'active', connections: ['birds'], threshold: 1 },
        { id: 'insects', label: 'Insects', emoji: '🦗', x: 10, y: 60, state: 'active', connections: ['birds'], threshold: 1 },
        { id: 'herbivores', label: 'Herbivores', emoji: '🐰', x: 40, y: 60, state: 'active', connections: ['predators'], threshold: 1 },
        { id: 'birds', label: 'Birds', emoji: '🐦', x: 65, y: 60, state: 'active', connections: ['predators'], threshold: 1 },
        { id: 'predators', label: 'Predators', emoji: '🦊', x: 50, y: 85, state: 'active', connections: [], threshold: 2 },
      ],
      question: 'If the Water Source dries up, how many species are affected?',
      triggerNode: 'water',
      expectedCascade: ['water', 'plants', 'fish', 'insects', 'herbivores', 'birds', 'predators'],
    },
    {
      title: 'Software Architecture',
      description: 'A database server crashes. What services go offline?',
      nodes: [
        { id: 'db', label: 'Database', emoji: '🗄️', x: 50, y: 10, state: 'active', connections: ['api', 'cache'], threshold: 0 },
        { id: 'api', label: 'API Server', emoji: '🖥️', x: 30, y: 35, state: 'active', connections: ['frontend', 'mobile'], threshold: 1 },
        { id: 'cache', label: 'Cache', emoji: '⚡', x: 70, y: 35, state: 'active', connections: ['api'], threshold: 2 },
        { id: 'frontend', label: 'Frontend', emoji: '🌐', x: 15, y: 60, state: 'active', connections: ['users'], threshold: 1 },
        { id: 'mobile', label: 'Mobile App', emoji: '📱', x: 45, y: 60, state: 'active', connections: ['users'], threshold: 1 },
        { id: 'auth', label: 'Auth Service', emoji: '🔐', x: 75, y: 60, state: 'active', connections: [], threshold: 2 },
        { id: 'users', label: 'Users', emoji: '👥', x: 30, y: 85, state: 'active', connections: [], threshold: 1 },
      ],
      question: 'If the Database crashes, how many components fail?',
      triggerNode: 'db',
      expectedCascade: ['db', 'api', 'frontend', 'mobile', 'users'],
    },
  ];

  return scenarios[level % scenarios.length];
}

const GAME_DURATION = 300;

const SystemsCascade: React.FC<SystemsCascadeProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'cascading' | 'answering' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [cascadeStep, setCascadeStep] = useState(0);

  const initLevel = useCallback(() => {
    const s = generateScenario(level - 1);
    setScenario(s);
    setNodes(s.nodes.map(n => ({ ...n, state: 'active' as const })));
    setSelectedNodes(new Set());
    setShowResult(false);
    setCascadeStep(0);
    setGameState('playing');
  }, [level]);

  useEffect(() => { if (gameState === 'playing') initLevel(); }, [level]);

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'answering') return;
    if (isPaused) return;
    const t = setInterval(() => setTimeLeft(prev => {
      const next = prev - 1;
      onTimeChange?.(next);
      if (next <= 0) { setGameState('gameover'); clearInterval(t); }
      return Math.max(0, next);
    }), 1000);
    return () => clearInterval(t);
  }, [gameState, isPaused, onTimeChange]);

  useEffect(() => { onScoreChange?.(score); }, [score, onScoreChange]);

  const toggleNode = (id: string) => {
    if (showResult) return;
    setSelectedNodes(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const submitAnswer = () => {
    if (!scenario) return;
    setShowResult(true);
    setTotal(t => t + 1);
    const expected = new Set(scenario.expectedCascade);
    const isCorrect = expected.size === selectedNodes.size && [...expected].every(n => selectedNodes.has(n));
    if (isCorrect) {
      setScore(s => s + 300 * level);
      setCorrect(c => c + 1);
      audioManager.playLevelUp();
    } else {
      audioManager.playWrong();
    }
    // Animate cascade
    setGameState('cascading');
    let step = 0;
    const cascadeNodes = [...scenario.expectedCascade];
    const interval = setInterval(() => {
      step++;
      setCascadeStep(step);
      if (step >= cascadeNodes.length) {
        clearInterval(interval);
        setTimeout(() => {
          setLevel(l => l + 1);
          setGameState('playing');
        }, 2000);
      }
    }, 400);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌐</div>
        <h2 style={{ color: '#00bfa5', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Systems Cascade</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Analyze interconnected systems and predict which nodes will fail in a cascade.
          Select all nodes you think will be affected when the trigger node fails.
        </p>
        <div style={{ background: 'rgba(0,191,165,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#00bfa5', fontWeight: 600 }}>🧠 INTJ Skills: Systems Thinking • Cascade Analysis • Network Effects</p>
        </div>
        <button onClick={() => { setGameState('playing'); initLevel(); }} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #00bfa5, #1de9b6)', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          Analyze Systems →
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    onComplete(score, accuracy);
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ color: '#00bfa5' }}>Analysis Complete</h2>
        <p>Scenarios analyzed: <strong>{total}</strong> ({correct} correct)</p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  if (!scenario) return null;

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
        <span>🌐 Level {level}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ color: '#00bfa5', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{scenario.title}</h3>
        <p style={{ color: '#aaa', fontSize: '0.85rem' }}>{scenario.description}</p>
      </div>
      {/* Node graph visualization */}
      <div style={{ position: 'relative', height: 320, background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: '1rem', overflow: 'hidden' }}>
        {/* Draw connections */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {nodes.map(node => node.connections.map(connId => {
            const target = nodes.find(n => n.id === connId);
            if (!target) return null;
            const cascaded = showResult && scenario.expectedCascade.includes(node.id);
            return (
              <line key={`${node.id}-${connId}`} x1={`${node.x}%`} y1={`${node.y + 4}%`} x2={`${target.x}%`} y2={`${target.y}%`}
                stroke={cascaded ? '#ff5252' : '#444'} strokeWidth={cascaded ? 2.5 : 1.5} strokeDasharray={cascaded ? '' : '4,4'} />
            );
          }))}
        </svg>
        {/* Draw nodes */}
        {nodes.map(node => {
          const isSelected = selectedNodes.has(node.id);
          const isTrigger = node.id === scenario.triggerNode;
          const isCascaded = showResult && scenario.expectedCascade.slice(0, cascadeStep).includes(node.id);
          const shouldHavePicked = showResult && scenario.expectedCascade.includes(node.id);
          return (
            <div key={node.id} onClick={() => !isTrigger && toggleNode(node.id)} style={{
              position: 'absolute', left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)',
              width: 64, height: 64, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: isTrigger ? 'default' : 'pointer', transition: 'all 0.3s',
              background: isCascaded ? 'rgba(255,82,82,0.3)' : isTrigger ? 'rgba(255,152,0,0.3)' : isSelected ? 'rgba(0,191,165,0.3)' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${isCascaded ? '#ff5252' : showResult && shouldHavePicked && !isSelected ? '#ff9800' : isTrigger ? '#ff9800' : isSelected ? '#00bfa5' : '#555'}`,
              boxShadow: isCascaded ? '0 0 15px rgba(255,82,82,0.5)' : 'none',
            }}>
              <span style={{ fontSize: '1.3rem' }}>{node.emoji}</span>
              <span style={{ fontSize: '0.55rem', color: '#ccc', marginTop: 1 }}>{node.label}</span>
              {isTrigger && <span style={{ position: 'absolute', top: -8, fontSize: '0.6rem', color: '#ff9800', fontWeight: 700 }}>TRIGGER</span>}
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', color: '#00bfa5', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>{scenario.question}</p>
      {!showResult && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Tap nodes you think will be affected (trigger auto-included)</p>
          <button onClick={submitAnswer} disabled={selectedNodes.size === 0} style={{
            padding: '0.7rem 2rem', fontSize: '1rem', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: selectedNodes.size > 0 ? 'linear-gradient(135deg, #00bfa5, #1de9b6)' : '#333', color: selectedNodes.size > 0 ? '#000' : '#666',
          }}>
            Submit Prediction
          </button>
        </div>
      )}
      {showResult && (
        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#aaa' }}>
          Expected: <strong style={{ color: '#fff' }}>{scenario.expectedCascade.length}</strong> nodes affected
          {selectedNodes.size === new Set(scenario.expectedCascade).size && [...new Set(scenario.expectedCascade)].every(n => selectedNodes.has(n)) ?
            <span style={{ color: '#00c853', marginLeft: 8 }}>✅ Perfect!</span> :
            <span style={{ color: '#ff5252', marginLeft: 8 }}>❌ You selected {selectedNodes.size}</span>
          }
        </div>
      )}
    </div>
  );
});

export default SystemsCascade;

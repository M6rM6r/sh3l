import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface GraphPathfinderProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

interface GraphPuzzle {
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string;
  end: string;
  shortestPath: string[];
  shortestDistance: number;
}

function generateGraph(level: number): GraphPuzzle {
  const nodeCount = Math.min(5 + level, 10);
  const labels = 'ABCDEFGHIJ'.slice(0, nodeCount).split('');
  const nodes: GraphNode[] = labels.map((l, i) => {
    const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2;
    const radius = 35 + (i % 2) * 8;
    return { id: l, x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle), label: l };
  });

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  // Ensure connected graph
  for (let i = 1; i < nodeCount; i++) {
    const from = labels[i - 1], to = labels[i];
    const w = Math.floor(Math.random() * 8) + 1;
    edges.push({ from, to, weight: w });
    edgeSet.add(`${from}-${to}`);
    edgeSet.add(`${to}-${from}`);
  }
  // Add extra edges
  const extraEdges = Math.floor(nodeCount * 0.8);
  for (let i = 0; i < extraEdges; i++) {
    const a = labels[Math.floor(Math.random() * nodeCount)];
    const b = labels[Math.floor(Math.random() * nodeCount)];
    if (a !== b && !edgeSet.has(`${a}-${b}`)) {
      edges.push({ from: a, to: b, weight: Math.floor(Math.random() * 9) + 1 });
      edgeSet.add(`${a}-${b}`);
      edgeSet.add(`${b}-${a}`);
    }
  }

  const start = labels[0];
  const end = labels[nodeCount - 1];

  // Dijkstra
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();
  labels.forEach(l => { dist[l] = Infinity; prev[l] = null; });
  dist[start] = 0;

  for (let i = 0; i < nodeCount; i++) {
    let u = '';
    let minD = Infinity;
    labels.forEach(l => { if (!visited.has(l) && dist[l] < minD) { minD = dist[l]; u = l; } });
    if (!u) break;
    visited.add(u);
    edges.forEach(e => {
      const neighbor = e.from === u ? e.to : e.to === u ? e.from : null;
      if (neighbor && !visited.has(neighbor)) {
        const alt = dist[u] + e.weight;
        if (alt < dist[neighbor]) { dist[neighbor] = alt; prev[neighbor] = u; }
      }
    });
  }

  const path: string[] = [];
  let curr: string | null = end;
  while (curr) { path.unshift(curr); curr = prev[curr]; }

  return { nodes, edges, start, end, shortestPath: path, shortestDistance: dist[end] };
}

const GAME_DURATION = 300;

const GraphPathfinder: React.FC<GraphPathfinderProps> = memo(({ onComplete, isPaused, onScoreChange, onTimeChange }) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [puzzle, setPuzzle] = useState<GraphPuzzle | null>(null);
  const [userPath, setUserPath] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const initPuzzle = useCallback(() => {
    const p = generateGraph(level);
    setPuzzle(p);
    setUserPath([p.start]);
    setShowResult(false);
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

  const getNeighbors = (nodeId: string): string[] => {
    if (!puzzle) return [];
    const neighbors = new Set<string>();
    puzzle.edges.forEach(e => {
      if (e.from === nodeId) neighbors.add(e.to);
      if (e.to === nodeId) neighbors.add(e.from);
    });
    return [...neighbors];
  };

  const getEdgeWeight = (a: string, b: string): number => {
    if (!puzzle) return 0;
    const edge = puzzle.edges.find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    return edge?.weight ?? 0;
  };

  const userDistance = (): number => {
    let d = 0;
    for (let i = 1; i < userPath.length; i++) d += getEdgeWeight(userPath[i - 1], userPath[i]);
    return d;
  };

  const handleNodeClick = (nodeId: string) => {
    if (showResult || !puzzle) return;
    const lastNode = userPath[userPath.length - 1];
    if (nodeId === lastNode) return;

    // Allow undo by clicking previous node
    if (userPath.length > 1 && nodeId === userPath[userPath.length - 2]) {
      setUserPath(prev => prev.slice(0, -1));
      return;
    }

    // Must be neighbor
    if (!getNeighbors(lastNode).includes(nodeId)) return;
    const newPath = [...userPath, nodeId];
    setUserPath(newPath);

    if (nodeId === puzzle.end) {
      setShowResult(true);
      setTotal(t => t + 1);
      const ud = userDistance() + getEdgeWeight(lastNode, nodeId);
      const isOptimal = ud <= puzzle.shortestDistance;
      if (isOptimal) {
        setScore(s => s + 500 * level);
        setCorrect(c => c + 1);
        audioManager.playLevelUp();
      } else {
        const ratio = puzzle.shortestDistance / ud;
        setScore(s => s + Math.round(200 * level * ratio));
        audioManager.playCorrect();
      }
      setTimeout(() => { setLevel(l => l + 1); initPuzzle(); }, 2500);
    }
  };

  const resetPath = () => { if (puzzle) setUserPath([puzzle.start]); };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#e0e0e0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
        <h2 style={{ color: '#448aff', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Graph Pathfinder</h2>
        <p style={{ color: '#aaa', maxWidth: 500, margin: '0 auto 1rem' }}>
          Find the shortest path between two nodes in a weighted graph.
          Click nodes to build your path. Numbers on edges show the distance.
        </p>
        <div style={{ background: 'rgba(68,138,255,0.1)', borderRadius: 12, padding: '1rem', margin: '1rem auto', maxWidth: 400 }}>
          <p style={{ color: '#448aff', fontWeight: 600 }}>🧠 INTJ Skills: Graph Theory • Optimization • Strategic Pathfinding</p>
        </div>
        <button onClick={() => setGameState('playing')} style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #448aff, #2979ff)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Find Path →
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
        <h2 style={{ color: '#448aff' }}>Pathfinding Complete</h2>
        <p>Optimal paths: <strong>{correct}/{total}</strong></p>
        <p>Score: <strong>{score.toLocaleString()}</strong></p>
      </div>
    );
  }

  if (!puzzle) return null;
  const pathSet = new Set(userPath);
  const pathEdges = new Set<string>();
  for (let i = 1; i < userPath.length; i++) pathEdges.add(`${userPath[i - 1]}-${userPath[i]}`);

  return (
    <div style={{ padding: '1rem', color: '#e0e0e0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
        <span>🗺️ Level {level}</span>
        <span>Distance: {userDistance()}</span>
        <span>⏱ {formatTime(timeLeft)}</span>
        <span>⭐ {score}</span>
      </div>
      <div style={{ position: 'relative', height: 300, background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: '0.75rem' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {puzzle.edges.map(e => {
            const from = puzzle.nodes.find(n => n.id === e.from)!;
            const to = puzzle.nodes.find(n => n.id === e.to)!;
            const isOnPath = pathEdges.has(`${e.from}-${e.to}`) || pathEdges.has(`${e.to}-${e.from}`);
            const isOptimal = showResult && (puzzle.shortestPath.includes(e.from) && puzzle.shortestPath.includes(e.to) &&
              Math.abs(puzzle.shortestPath.indexOf(e.from) - puzzle.shortestPath.indexOf(e.to)) === 1);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            return (
              <g key={`${e.from}-${e.to}`}>
                <line x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={isOnPath ? '#448aff' : showResult && isOptimal ? '#00c853' : '#555'} strokeWidth={isOnPath ? 3 : 1.5} />
                <text x={`${midX}%`} y={`${midY}%`} fill={isOnPath ? '#fff' : '#aaa'} fontSize="11" textAnchor="middle" dominantBaseline="central"
                  style={{ background: '#000' }}>{e.weight}</text>
              </g>
            );
          })}
        </svg>
        {puzzle.nodes.map(node => {
          const isStart = node.id === puzzle.start;
          const isEnd = node.id === puzzle.end;
          const isOnPath = pathSet.has(node.id);
          const isCurrent = node.id === userPath[userPath.length - 1];
          const isNeighbor = !showResult && getNeighbors(userPath[userPath.length - 1]).includes(node.id);
          return (
            <div key={node.id} onClick={() => handleNodeClick(node.id)} style={{
              position: 'absolute', left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)',
              width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.95rem', fontWeight: 700, cursor: isNeighbor || isOnPath ? 'pointer' : 'default',
              background: isCurrent ? '#448aff' : isStart ? 'rgba(0,200,83,0.4)' : isEnd ? 'rgba(255,82,82,0.4)' : isOnPath ? 'rgba(68,138,255,0.3)' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${isCurrent ? '#fff' : isStart ? '#00c853' : isEnd ? '#ff5252' : isNeighbor ? '#448aff55' : '#555'}`,
              color: '#fff', transition: 'all 0.2s',
            }}>
              {node.label}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>
          Path: {userPath.join(' → ')}
        </span>
        <button onClick={resetPath} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'rgba(255,82,82,0.15)', border: 'none', borderRadius: 8, color: '#ff5252', cursor: 'pointer' }}>
          Reset
        </button>
      </div>
      {showResult && (
        <div style={{ textAlign: 'center', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.85rem' }}>
          Your distance: <strong>{userDistance()}</strong> | Optimal: <strong>{puzzle.shortestDistance}</strong>
          {userDistance() <= puzzle.shortestDistance ?
            <span style={{ color: '#00c853', marginLeft: 8 }}>🌟 Optimal!</span> :
            <span style={{ color: '#ff9800', marginLeft: 8 }}>Close! Try to match the green path</span>
          }
        </div>
      )}
    </div>
  );
});

export default GraphPathfinder;

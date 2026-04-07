import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface ResourceManagementProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type ResourceType = 'energy' | 'materials' | 'data' | 'labor' | 'time';

interface Resource {
  type: ResourceType;
  amount: number;
  max: number;
  production: number;
  consumption: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  costs: Partial<Record<ResourceType, number>>;
  rewards: Partial<Record<ResourceType, number>>;
  duration: number;
  progress: number;
  completed: boolean;
}

interface GameState {
  turn: number;
  maxTurns: number;
  resources: Resource[];
  projects: Project[];
  score: number;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
  energy: '⚡',
  materials: '🔩',
  data: '💾',
  labor: '👷',
  time: '⏱️'
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'solar_farm',
    name: 'Solar Farm',
    description: 'Generate sustainable energy',
    costs: { materials: 30, labor: 20 },
    rewards: { energy: 5 },
    duration: 3,
    progress: 0,
    completed: false
  },
  {
    id: 'data_center',
    name: 'Data Center',
    description: 'Process information faster',
    costs: { energy: 40, materials: 25 },
    rewards: { data: 8 },
    duration: 4,
    progress: 0,
    completed: false
  },
  {
    id: 'automation',
    name: 'Automation Hub',
    description: 'Reduce labor costs',
    costs: { energy: 50, data: 30 },
    rewards: { labor: -3, materials: 3 },
    duration: 5,
    progress: 0,
    completed: false
  },
  {
    id: 'research_lab',
    name: 'Research Lab',
    description: 'Advanced research capabilities',
    costs: { energy: 35, materials: 40, labor: 25 },
    rewards: { data: 10, energy: -2 },
    duration: 6,
    progress: 0,
    completed: false
  },
  {
    id: 'mining_operation',
    name: 'Mining Operation',
    description: 'Extract raw materials',
    costs: { energy: 25, labor: 15 },
    rewards: { materials: 6 },
    duration: 3,
    progress: 0,
    completed: false
  }
];

const GAME_DURATION = 300; // 5 minutes

const ResourceManagement: React.FC<ResourceManagementProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [turn, setTurn] = useState(1);
  const [maxTurns, setMaxTurns] = useState(15);
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [efficiency, setEfficiency] = useState(0);

  const initGame = useCallback(() => {
    const initialResources: Resource[] = [
      { type: 'energy', amount: 50, max: 100, production: 2, consumption: 1 },
      { type: 'materials', amount: 40, max: 80, production: 3, consumption: 2 },
      { type: 'data', amount: 20, max: 60, production: 1, consumption: 0 },
      { type: 'labor', amount: 10, max: 30, production: 0, consumption: 1 },
      { type: 'time', amount: maxTurns, max: maxTurns, production: 0, consumption: 1 }
    ];
    
    setResources(initialResources);
    setProjects(INITIAL_PROJECTS.map(p => ({ ...p, progress: 0, completed: false })));
    setTurn(1);
    setSelectedProject(null);
    setMessage('Initialize your first project. Balance resources wisely.');
    setEfficiency(0);
  }, [maxTurns]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrect(0);
    setTotal(0);
    setLevel(1);
    setMaxTurns(15);
    initGame();
  };

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, isPaused]);

  const canAffordProject = (project: Project): boolean => {
    return Object.entries(project.costs).every(([type, cost]) => {
      const resource = resources.find(r => r.type === type);
      return resource && resource.amount >= (cost || 0);
    });
  };

  const startProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || project.completed || !canAffordProject(project)) {
      audioManager.playWrong();
      setMessage('Insufficient resources to start this project.');
      return;
    }

    // Deduct costs
    const newResources = resources.map(r => {
      const cost = project.costs[r.type] || 0;
      return {
        ...r,
        amount: Math.max(0, r.amount - cost)
      };
    });

    setResources(newResources);
    setSelectedProject(projectId);
    setMessage(`Started: ${project.name}`);
    audioManager.playCorrect();
    setTotal(t => t + 1);
  };

  const nextTurn = () => {
    if (turn >= maxTurns) {
      setGameState('gameover');
      return;
    }

    // Update active project
    let projectCompleted = false;
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject && !p.completed) {
        const newProgress = p.progress + 1;
        if (newProgress >= p.duration) {
          projectCompleted = true;
          // Apply rewards
          setResources(prev => prev.map(r => {
            const reward = p.rewards[r.type] || 0;
            return {
              ...r,
              amount: Math.min(r.max, Math.max(0, r.amount + reward)),
              production: r.production + (reward > 0 && r.type !== 'labor' ? reward / 2 : 0)
            };
          }));
          return { ...p, progress: p.duration, completed: true };
        }
        return { ...p, progress: newProgress };
      }
      return p;
    });

    if (projectCompleted) {
      setCorrect(c => c + 1);
      setScore(s => s + 50);
      setSelectedProject(null);
      setMessage('Project completed! Resources increased.');
    }

    // Resource production
    const productionResources = resources.map(r => {
      if (r.type === 'time') {
        return { ...r, amount: Math.max(0, r.amount - r.consumption) };
      }
      const netChange = r.production - r.consumption;
      return {
        ...r,
        amount: Math.min(r.max, Math.max(0, r.amount + netChange))
      };
    });

    setResources(productionResources);
    setProjects(updatedProjects);
    setTurn(t => t + 1);

    // Calculate efficiency score
    const completedCount = updatedProjects.filter(p => p.completed).length;
    const newEfficiency = Math.round((completedCount / (turn + 1)) * 100);
    setEfficiency(newEfficiency);
  };

  useEffect(() => {
    if (gameState === 'gameover') {
      const completedProjects = projects.filter(p => p.completed).length;
      const totalProjects = projects.length;
      const accuracy = Math.round((completedProjects / totalProjects) * 100);
      const finalScore = score + (completedProjects * 100) + (efficiency * 2);
      onComplete(finalScore, accuracy);
    }
  }, [gameState, projects, score, efficiency, onComplete]);

  const getResourceColor = (resource: Resource): string => {
    const ratio = resource.amount / resource.max;
    if (ratio < 0.2) return 'critical';
    if (ratio < 0.5) return 'low';
    return 'good';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'intro') {
    return (
      <div className="resource-management-intro" role="alert" aria-live="polite">
        <h2>🏭 Strategic Resource Management</h2>
        <p>INTJ Challenge: Systems thinking and optimization under constraints.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>Manage 5 resources: Energy, Materials, Data, Labor, and Time</li>
            <li>Start projects that consume resources but provide long-term benefits</li>
            <li>Balance immediate needs with future gains</li>
            <li>Complete as many projects as possible within the time limit</li>
            <li>Each turn, resources are produced and consumed automatically</li>
          </ul>
          <div className="strategy-tips">
            <h4>INTJ Strategy Tips:</h4>
            <ul>
              <li>Start with projects that increase production (Solar Farm, Mining)</li>
              <li>Chain projects: Mining → Materials → Data Center</li>
              <li>Watch for resource caps - don't waste production</li>
              <li>Time is your most limited resource</li>
            </ul>
          </div>
        </div>
        <button className="start-button" onClick={startGame}>
          Begin Optimization
        </button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    const completedProjects = projects.filter(p => p.completed).length;
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Resource Management Complete</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Projects Completed: {completedProjects} / {projects.length}</div>
        <div className="final-stats">Efficiency: {efficiency}%</div>
        <div className="final-stats">Turns Used: {turn} / {maxTurns}</div>
        <p className="intj-quote">"The art of management is optimization under constraint."</p>
        <button onClick={startGame}>Optimize Again</button>
      </div>
    );
  }

  return (
    <div className="resource-management" role="application" aria-label="Resource Management Game">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Turn: {turn} / {maxTurns}</span>
        <span>Efficiency: {efficiency}%</span>
        <span>Time: {formatTime(timeLeft)}</span>
      </div>

      <div className="resources-panel">
        <h3>Resources</h3>
        <div className="resources-grid">
          {resources.filter(r => r.type !== 'time').map(resource => (
            <div 
              key={resource.type} 
              className={`resource-card ${getResourceColor(resource)}`}
            >
              <div className="resource-icon">{RESOURCE_ICONS[resource.type]}</div>
              <div className="resource-name">{resource.type}</div>
              <div className="resource-amount">
                {resource.amount} / {resource.max}
              </div>
              <div className="resource-bar">
                <div 
                  className="resource-fill" 
                  style={{ width: `${(resource.amount / resource.max) * 100}%` }}
                />
              </div>
              <div className="resource-flow">
                +{resource.production} / -{resource.consumption}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="projects-panel">
        <h3>Available Projects</h3>
        <div className="projects-list">
          {projects.map(project => {
            const canAfford = canAffordProject(project);
            const isActive = selectedProject === project.id;
            
            return (
              <div 
                key={project.id}
                className={`project-card ${project.completed ? 'completed' : ''} ${isActive ? 'active' : ''} ${!canAfford && !project.completed ? 'unaffordable' : ''}`}
                onClick={() => !project.completed && startProject(project.id)}
              >
                <div className="project-header">
                  <span className="project-name">{project.name}</span>
                  {project.completed && <span className="completed-badge">✓</span>}
                  {isActive && <span className="active-badge">▶</span>}
                </div>
                <p className="project-description">{project.description}</p>
                
                <div className="project-costs">
                  <span>Costs:</span>
                  {Object.entries(project.costs).map(([type, cost]) => (
                    <span key={type} className="cost-item">
                      {RESOURCE_ICONS[type as ResourceType]} {cost}
                    </span>
                  ))}
                </div>
                
                <div className="project-rewards">
                  <span>Rewards:</span>
                  {Object.entries(project.rewards).map(([type, reward]) => (
                    <span key={type} className="reward-item">
                      {RESOURCE_ICONS[type as ResourceType]} {reward > 0 ? '+' : ''}{reward}/turn
                    </span>
                  ))}
                </div>
                
                {isActive && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(project.progress / project.duration) * 100}%` }}
                    />
                    <span>{project.progress} / {project.duration} turns</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {message && (
        <div className="game-message" role="alert">
          {message}
        </div>
      )}

      <button 
        className="next-turn-button" 
        onClick={nextTurn}
        disabled={turn >= maxTurns}
      >
        {turn >= maxTurns ? 'Game Over' : 'Next Turn →'}
      </button>
    </div>
  );
});

export default ResourceManagement;

export type GameType = 'memory' | 'speed' | 'attention' | 'flexibility' | 'problemSolving' | 'math' | 'reaction' | 'word' | 'visual' | 'spatial';

export interface GameStats {
  highScore: number;
  totalPlays: number;
  totalScore: number;
  avgAccuracy: number;
}

export interface UserStats {
  lpi: number;
  gamesPlayed: number;
  totalScore: number;
  streakDays: number;
  cognitiveAreas: {
    memory: number;
    speed: number;
    attention: number;
    flexibility: number;
    problemSolving: number;
  };
  gameStats: Record<GameType, GameStats>;
  dailyStats: Record<string, { gamesPlayed: number; totalScore: number }>;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  totalGames: number;
}

export interface GameSession {
  id: string;
  gameType: GameType;
  score: number;
  accuracy: number;
  duration: number;
  timestamp: string;
  synced: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  token: string;
  cognitiveProfile: {
    memory: number;
    speed: number;
    attention: number;
    flexibility: number;
    problemSolving: number;
  };
}

export interface GameConfig {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  area: string;
  difficulty: number;
  estimatedDuration: number;
}

export const GAMES: GameConfig[] = [
  { id: 'memory', name: 'Memory Matrix', description: 'Remember patterns', icon: '🧠', color: '#ab47bc', area: 'Memory', difficulty: 1, estimatedDuration: 60 },
  { id: 'speed', name: 'Speed Match', description: 'Match quickly', icon: '⚡', color: '#ef5350', area: 'Speed', difficulty: 1, estimatedDuration: 60 },
  { id: 'attention', name: 'Train of Thought', description: 'Switch tracks', icon: '🧩', color: '#1e88e5', area: 'Attention', difficulty: 2, estimatedDuration: 90 },
  { id: 'flexibility', name: 'Color Match', description: 'Match colors', icon: '🎨', color: '#fb8c00', area: 'Flexibility', difficulty: 2, estimatedDuration: 60 },
  { id: 'problemSolving', name: 'Pattern Recall', description: 'Recall patterns', icon: '🔷', color: '#00acc1', area: 'Problem Solving', difficulty: 3, estimatedDuration: 120 },
  { id: 'math', name: 'Chalkboard', description: 'Solve math', icon: '📝', color: '#e91e63', area: 'Problem Solving', difficulty: 2, estimatedDuration: 90 },
  { id: 'reaction', name: 'Fish Food', description: 'Fast reaction', icon: '🐟', color: '#03a9f4', area: 'Speed', difficulty: 1, estimatedDuration: 45 },
  { id: 'word', name: 'Word Bubble', description: 'Word recall', icon: '💬', color: '#9c27b0', area: 'Memory', difficulty: 2, estimatedDuration: 75 },
  { id: 'visual', name: 'Lost in Migration', description: 'Visual focus', icon: '🐦', color: '#ff9800', area: 'Attention', difficulty: 3, estimatedDuration: 90 },
  { id: 'spatial', name: 'Rotation Recall', description: 'Spatial memory', icon: '🔄', color: '#607d8b', area: 'Problem Solving', difficulty: 3, estimatedDuration: 120 },
];



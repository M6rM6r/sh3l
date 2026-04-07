export type GameType = 'memory' | 'speed' | 'attention' | 'flexibility' | 'problemSolving' | 'math' | 'reaction' | 'word' | 'visual' | 'spatial' | 'memorySequence';

export interface GameStats {
  highScore: number;
  totalPlays: number;
  totalScore: number;
}

export interface DailyStats {
  gamesPlayed: number;
  totalScore: number;
  accuracy: number;
}

export interface CognitiveArea {
  score: number;
  gamesPlayed: number;
}

export interface UserStats {
  gameStats: Record<GameType, GameStats>;
  dailyStats: Record<string, DailyStats>;
  cognitiveAreas: {
    memory: CognitiveArea;
    attention: CognitiveArea;
    speed: CognitiveArea;
    flexibility: CognitiveArea;
    problemSolving: CognitiveArea;
  };
  iq?: number;
}

export interface GameConfig {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  area: string;
}



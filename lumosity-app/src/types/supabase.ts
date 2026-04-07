export interface Profile {
  id: string;
  username: string;
  total_points: number;
  games_played: number;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  game_type: GameType;
  score: number;
  level: number;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  game_type: GameType;
  high_score: number;
  updated_at: string;
  profiles?: {
    username: string;
  };
}

export type GameType = 'memory_match' | 'number_sequence' | 'pipe_connection' | 'pattern_recognition' | 'logic_grid' | 'code_breaker' | 'tower_of_hanoi' | 'color_harmony' | 'math_marathon' | 'shape_shifter' | 'rhythm_blocks' | 'maze_runner' | 'bubble_sort' | 'quick_reflexes';

export interface Game {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ============================================================
// @ygy/shared-types — Single source of truth for platform types
// Import from this package instead of duplicating locally:
//   import type { User, GameSession, GameType } from '@ygy/shared-types';
// ============================================================

// ---------------------------------------------------------------------------
// Game domain
// ---------------------------------------------------------------------------

export type CognitiveGameType =
  | 'memory_match'
  | 'number_sequence'
  | 'pipe_connection'
  | 'pattern_recognition'
  | 'logic_grid'
  | 'code_breaker'
  | 'tower_of_hanoi'
  | 'color_harmony'
  | 'math_marathon'
  | 'shape_shifter'
  | 'rhythm_blocks'
  | 'maze_runner'
  | 'bubble_sort'
  | 'quick_reflexes'
  | 'chess'
  | 'word_scramble'
  | 'memory'
  | 'speed'
  | 'attention'
  | 'logic'
  | 'math'
  | 'reaction'
  | 'word'
  | 'visual'
  | 'spatial'
  | 'memorySequence'
  | 'flexibility'
  | 'problemSolving';

/** Alias kept for back-compat */
export type GameType = CognitiveGameType;

export interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface GameConfig extends Game {
  area: CognitiveAreaKey;
  unlocked?: boolean;
}

// ---------------------------------------------------------------------------
// User & Profile
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email: string;
  level: number;
  totalScore: number;
}

export interface Profile {
  id: string;
  username: string;
  total_points: number;
  games_played: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Game sessions & scores
// ---------------------------------------------------------------------------

export interface GameSession {
  id: string;
  user_id: string;
  game_type: CognitiveGameType;
  score: number;
  level: number;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
}

export interface GameStats {
  highScore: number;
  totalPlays: number;
  totalScore: number;
}

export interface DailyStats {
  date: string;
  gamesPlayed: number;
  totalScore: number;
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Cognitive areas
// ---------------------------------------------------------------------------

export type CognitiveAreaKey =
  | 'memory'
  | 'attention'
  | 'speed'
  | 'flexibility'
  | 'problemSolving';

export interface CognitiveArea {
  score: number;
  gamesPlayed: number;
}

export interface CognitiveProfile extends Record<CognitiveAreaKey, CognitiveArea> {
  memory: CognitiveArea;
  attention: CognitiveArea;
  speed: CognitiveArea;
  flexibility: CognitiveArea;
  problemSolving: CognitiveArea;
}

export interface UserStats {
  gameStats: Partial<Record<CognitiveGameType, GameStats>>;
  dailyStats: Record<string, DailyStats>;
  cognitiveAreas: CognitiveProfile;
  iq?: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  game_type: CognitiveGameType;
  high_score: number;
  updated_at: string;
  profiles?: { username: string };
}

export interface LeaderboardEntrySchema {
  rank: number;
  username: string;
  score: number;
  is_current_user: boolean;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface CognitiveScore {
  area: string;
  score: number;
  timestamp: string;
}

export interface AnalyticsSummaryDto {
  total_games: number;
  total_score: number;
  avg_accuracy: number;
  current_streak: number;
  best_streak: number;
  cognitive_profile: Record<string, number>;
  weekly_activity: Array<{ date: string; games: number; score: number }>;
  monthly_activity: Array<{ date: string; games: number; score: number }>;
  improvement_trend: number;
  percentile_rank: number;
  time_spent_minutes: number;
}

export interface AnalyticsData {
  dailyActivity: Array<{ date: string; games: number; score: number }>;
  cognitiveAreas: Array<{ area: string; score: number; improvement: number }>;
  gamePerformance: Array<{ game: string; avgScore: number; plays: number }>;
  globalStats: { totalUsers: number; totalGames: number; avgScore: number };
}

// ---------------------------------------------------------------------------
// AI / Recommendations
// ---------------------------------------------------------------------------

export interface GameRecommendationDto {
  game_type: string;
  priority: number;
  reason: string;
  predicted_improvement: number;
  estimated_duration: number;
}

// ---------------------------------------------------------------------------
// API shared responses
// ---------------------------------------------------------------------------

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

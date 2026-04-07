// Re-export canonical types from the shared package.
// New code should import directly from '@ygy/shared-types'.
export type {
  CognitiveGameType,
  GameType,
  Game,
  GameConfig,
  GameStats,
  DailyStats,
  CognitiveArea,
  CognitiveAreaKey,
  CognitiveProfile,
  UserStats,
  User,
  Profile,
  GameSession,
  LeaderboardEntry,
  LeaderboardEntrySchema,
  CognitiveScore,
  AnalyticsSummaryDto,
  AnalyticsData,
  GameRecommendationDto,
  ApiError,
  PaginatedResponse,
} from '../../packages/shared-types/src';

// Legacy aliases kept for backward compatibility
export type OldGameType = 'memory' | 'speed' | 'attention' | 'flexibility' | 'problemSolving' | 'math' | 'reaction' | 'word' | 'visual' | 'spatial' | 'memorySequence';

export type NewGameType =
  | 'memory_match' | 'number_sequence' | 'pipe_connection' | 'pattern_recognition'
  | 'logic_grid' | 'code_breaker' | 'tower_of_hanoi' | 'color_harmony'
  | 'math_marathon' | 'shape_shifter' | 'rhythm_blocks' | 'maze_runner'
  | 'bubble_sort' | 'quick_reflexes' | 'chess'
  | 'voice_command' | 'voice_math' | 'voice_memory' | 'voice_spelling';


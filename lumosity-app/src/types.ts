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

// ── Game sub-type unions ─────────────────────────────────────────────────────
// 11 original games: full tutorial/pause/practice support
export type OldGameType = 'memory' | 'speed' | 'attention' | 'flexibility' | 'problemSolving' | 'math' | 'reaction' | 'word' | 'visual' | 'spatial' | 'memorySequence';

// 15 arcade games: score + level + duration callback
export type NewGameType =
  | 'memory_match' | 'number_sequence' | 'pipe_connection' | 'pattern_recognition'
  | 'logic_grid' | 'code_breaker' | 'tower_of_hanoi' | 'color_harmony'
  | 'math_marathon' | 'shape_shifter' | 'rhythm_blocks' | 'maze_runner'
  | 'bubble_sort' | 'quick_reflexes' | 'chess';

// 4 voice games: points-only callback
export type VoiceGameType = 'voice_command' | 'voice_math' | 'voice_memory' | 'voice_spelling';

// 6 simple games: points-only callback (same interface as voice)
export type SimpleGameType = 'focus_grid' | 'word_unscramble' | 'sliding_puzzle' | 'attention_grid' | 'speed_reaction' | 'math_blitz';

// 20 advanced/INTJ games: score + accuracy callback (no practice/pause)
export type AdvancedGameType =
  | 'dual_n_back' | 'map_navigator' | 'mental_rotation_3d' | 'perspective_shift'
  | 'stroop_challenge' | 'task_switcher' | 'tower_planner'
  | 'logic_grid_puzzle' | 'chess_tactics' | 'pattern_sequence' | 'resource_management' | 'deduction_chain'
  | 'cipher_breaker' | 'sudoku' | 'syllogism_engine' | 'systems_cascade'
  | 'binary_matrix' | 'graph_pathfinder' | 'cryptogram' | 'strategic_conquest';





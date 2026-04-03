import type { GameType, UserStats } from '../types';

const WORKOUT_KEY = 'ygy_daily_workout';
const WORKOUT_PROGRESS_KEY = 'ygy_workout_progress';

export interface WorkoutGame {
  gameType: GameType;
  reason: string;
  estimatedTime: number;
}

export interface DailyWorkout {
  date: string;
  games: WorkoutGame[];
  totalEstimatedTime: number;
  focusArea: string;
}

export interface WorkoutProgress {
  date: string;
  completedGames: GameType[];
  totalScore: number;
  isComplete: boolean;
}

const gameAreas: Record<GameType, string> = {
  memory: 'Memory',
  speed: 'Speed',
  attention: 'Attention',
  flexibility: 'Flexibility',
  problemSolving: 'Problem Solving',
  math: 'Problem Solving',
  reaction: 'Speed',
  word: 'Memory',
  visual: 'Attention',
  spatial: 'Problem Solving',
  memorySequence: 'Memory'
};

/**
 * Generate a personalized daily workout based on user's cognitive profile
 * - Prioritizes weakest areas
 * - Ensures variety
 * - Balances difficulty
 */
export const generateDailyWorkout = (userStats: UserStats): DailyWorkout => {
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate area scores and find weakest
  const areaScores = Object.entries(userStats.cognitiveAreas).map(([area, data]) => ({
    area,
    score: data.score,
    gamesPlayed: data.gamesPlayed
  }));
  
  // Sort by score (ascending) to find weakest areas
  const sortedAreas = areaScores.sort((a, b) => a.score - b.score);
  const weakestArea = sortedAreas[0];
  const secondWeakest = sortedAreas[1];
  
  // Find games for each area
  const getGameForArea = (areaName: string): GameType | null => {
    const entry = Object.entries(gameAreas).find(([, a]) => a.toLowerCase() === areaName.toLowerCase());
    return entry ? entry[0] as GameType : null;
  };
  
  // Build workout (3-5 games)
  const workoutGames: WorkoutGame[] = [];
  const usedGames = new Set<GameType>();
  
  // 1. Focus game - weakest area
  const focusGame = getGameForArea(weakestArea.area);
  if (focusGame) {
    workoutGames.push({
      gameType: focusGame,
      reason: `Improve your ${gameAreas[focusGame]} (${Math.round(weakestArea.score)} LPI)`,
      estimatedTime: 60
    });
    usedGames.add(focusGame);
  }
  
  // 2. Secondary focus - second weakest
  const secondaryGame = getGameForArea(secondWeakest.area);
  if (secondaryGame && !usedGames.has(secondaryGame)) {
    workoutGames.push({
      gameType: secondaryGame,
      reason: `Strengthen ${gameAreas[secondaryGame]}`,
      estimatedTime: 60
    });
    usedGames.add(secondaryGame);
  }
  
  // 3. Favorite game (most played)
  const gamePlayCounts = Object.entries(userStats.gameStats).map(([type, stats]) => ({
    type: type as GameType,
    plays: stats.totalPlays
  }));
  
  if (gamePlayCounts.length > 0) {
    const favorite = gamePlayCounts.sort((a, b) => b.plays - a.plays)[0];
    if (!usedGames.has(favorite.type)) {
      workoutGames.push({
        gameType: favorite.type,
        reason: 'Your favorite - keep it up!',
        estimatedTime: 60
      });
      usedGames.add(favorite.type);
    }
  }
  
  // 4. Random variety game (not played today)
  const allGames: GameType[] = ['memory', 'speed', 'attention', 'flexibility', 'problemSolving'];
  const availableGames = allGames.filter(g => !usedGames.has(g));
  
  if (availableGames.length > 0) {
    const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
    workoutGames.push({
      gameType: randomGame,
      reason: 'Variety training',
      estimatedTime: 60
    });
    usedGames.add(randomGame);
  }
  
  // 5. Bonus game if weak area is significantly behind
  if (weakestArea.score < 60 && workoutGames.length < 5) {
    const bonusGame = getGameForArea(sortedAreas[2]?.area || '');
    if (bonusGame && !usedGames.has(bonusGame)) {
      workoutGames.push({
        gameType: bonusGame,
        reason: 'Extra practice for balance',
        estimatedTime: 60
      });
    }
  }
  
  const workout: DailyWorkout = {
    date: today,
    games: workoutGames,
    totalEstimatedTime: workoutGames.length * 60,
    focusArea: gameAreas[focusGame || 'memory']
  };
  
  // Save workout
  localStorage.setItem(WORKOUT_KEY, JSON.stringify(workout));
  
  // Reset progress for new day
  const progress: WorkoutProgress = {
    date: today,
    completedGames: [],
    totalScore: 0,
    isComplete: false
  };
  localStorage.setItem(WORKOUT_PROGRESS_KEY, JSON.stringify(progress));
  
  return workout;
};

/**
 * Get today's workout or generate a new one
 */
export const getDailyWorkout = (userStats: UserStats): DailyWorkout => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(WORKOUT_KEY);
  
  if (stored) {
    const workout: DailyWorkout = JSON.parse(stored);
    if (workout.date === today) {
      return workout;
    }
  }
  
  return generateDailyWorkout(userStats);
};

/**
 * Get workout progress
 */
export const getWorkoutProgress = (): WorkoutProgress => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(WORKOUT_PROGRESS_KEY);
  
  if (stored) {
    const progress: WorkoutProgress = JSON.parse(stored);
    if (progress.date === today) {
      return progress;
    }
  }
  
  return {
    date: today,
    completedGames: [],
    totalScore: 0,
    isComplete: false
  };
};

/**
 * Mark a game as completed in the workout
 */
export const completeWorkoutGame = (gameType: GameType, score: number): WorkoutProgress => {
  const progress = getWorkoutProgress();
  const today = new Date().toISOString().split('T')[0];
  
  if (progress.date !== today) {
    progress.date = today;
    progress.completedGames = [];
    progress.totalScore = 0;
  }
  
  if (!progress.completedGames.includes(gameType)) {
    progress.completedGames.push(gameType);
    progress.totalScore += score;
  }
  
  // Check if workout is complete
  const workoutData = JSON.parse(localStorage.getItem(WORKOUT_KEY) || '{}');
  if (workoutData.games) {
    progress.isComplete = workoutData.games.every((g: WorkoutGame) => 
      progress.completedGames.includes(g.gameType)
    );
  }
  
  localStorage.setItem(WORKOUT_PROGRESS_KEY, JSON.stringify(progress));
  return progress;
};

/**
 * Get next recommended game from workout
 */
export const getNextWorkoutGame = (userStats: UserStats): WorkoutGame | null => {
  const workout = getDailyWorkout(userStats);
  const progress = getWorkoutProgress();
  
  const nextGame = workout.games.find(g => !progress.completedGames.includes(g.gameType));
  return nextGame || null;
};

/**
 * Get workout completion percentage
 */
export const getWorkoutCompletion = (userStats: UserStats): { completed: number; total: number; percentage: number } => {
  const workout = getDailyWorkout(userStats);
  const progress = getWorkoutProgress();
  
  return {
    completed: progress.completedGames.length,
    total: workout.games.length,
    percentage: Math.round((progress.completedGames.length / workout.games.length) * 100)
  };
};

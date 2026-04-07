import type { GameType } from '../types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: UserProgress) => boolean;
}

export interface UserProgress {
  totalGamesPlayed: number;
  totalScore: number;
  gamesPlayedToday: number;
  currentStreak: number;
  bestStreak: number;
  gameStats: Record<GameType, { highScore: number; totalPlays: number }>;
  lastPlayedDate: string;
}

export const achievements: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first brain game',
    icon: '👣',
    condition: (stats) => stats.totalGamesPlayed >= 1
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Score 500+ points in Speed Match',
    icon: '⚡',
    condition: (stats) => stats.gameStats.speed?.highScore >= 500
  },
  {
    id: 'memory_master',
    name: 'Memory Master',
    description: 'Reach level 10 in Memory Matrix',
    icon: '🧠',
    condition: (_stats) => false // Tracked separately in game
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Complete 5 games in one day',
    icon: '⭐',
    condition: (stats) => stats.gamesPlayedToday >= 5
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Earn a total of 10,000 points',
    icon: '💯',
    condition: (stats) => stats.totalScore >= 10000
  },
  {
    id: 'daily_devoted',
    name: 'Daily Devoted',
    description: 'Play for 30 days straight',
    icon: '📅',
    condition: (stats) => stats.currentStreak >= 30
  },
  {
    id: 'game_explorer',
    name: 'Game Explorer',
    description: 'Play all 5 brain games',
    icon: '🎮',
    condition: (stats) => {
      const games = Object.keys(stats.gameStats);
      return games.length >= 5;
    }
  },
  {
    id: 'high_achiever',
    name: 'High Achiever',
    description: 'Score 1000+ points in any game',
    icon: '🏆',
    condition: (stats) => {
      return Object.values(stats.gameStats).some(g => g.highScore >= 1000);
    }
  },
  {
    id: 'persistent_player',
    name: 'Persistent Player',
    description: 'Play 50 total games',
    icon: '🎯',
    condition: (stats) => stats.totalGamesPlayed >= 50
  }
];

const ACHIEVEMENTS_KEY = 'Ygy_achievements';
const STREAK_KEY = 'Ygy_streak';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string;
  totalGamesPlayed: number;
  totalScore: number;
}

export const getStreakData = (): StreakData => {
  const stored = localStorage.getItem(STREAK_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: '',
    totalGamesPlayed: 0,
    totalScore: 0
  };
};

export const saveStreakData = (data: StreakData): void => {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
};

export const updateStreakOnGameComplete = (score: number): StreakData => {
  const data = getStreakData();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  data.totalGamesPlayed += 1;
  data.totalScore += score;
  
  if (data.lastPlayedDate === today) {
    // Already played today, streak continues
  } else if (data.lastPlayedDate === yesterday) {
    // Played yesterday, streak increases
    data.currentStreak += 1;
    data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
  } else {
    // Streak broken
    data.currentStreak = 1;
  }
  
  data.lastPlayedDate = today;
  saveStreakData(data);
  
  return data;
};

export const getUnlockedAchievements = (): string[] => {
  const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

export const checkAndUnlockAchievements = (): string[] => {
  const streakData = getStreakData();
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: string[] = [];
  
  // Get game stats from storage
  const statsStr = localStorage.getItem('Ygy_stats');
  const gameStats = statsStr ? JSON.parse(statsStr).gameStats : {};
  
  const userProgress: UserProgress = {
    totalGamesPlayed: streakData.totalGamesPlayed,
    totalScore: streakData.totalScore,
    gamesPlayedToday: 0, // Would need to track separately
    currentStreak: streakData.currentStreak,
    bestStreak: streakData.bestStreak,
    gameStats,
    lastPlayedDate: streakData.lastPlayedDate
  };
  
  achievements.forEach(achievement => {
    if (!unlocked.includes(achievement.id) && achievement.condition(userProgress)) {
      unlocked.push(achievement.id);
      newlyUnlocked.push(achievement.id);
    }
  });
  
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  
  return newlyUnlocked;
};

export const resetAchievements = (): void => {
  localStorage.removeItem(ACHIEVEMENTS_KEY);
  localStorage.removeItem(STREAK_KEY);
};




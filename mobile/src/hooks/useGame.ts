import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameType, GameSession, UserStats, StreakData } from '../types';
import { apiService } from '../services/api';

interface GameState {
  sessions: GameSession[];
  pendingSync: GameSession[];
  userStats: UserStats;
  streakData: StreakData;
  currentGame: GameType | null;
  isPlaying: boolean;
  score: number;
  timeLeft: number;
  
  startGame: (gameType: GameType) => void;
  endGame: (score: number, accuracy: number, duration: number) => Promise<void>;
  updateScore: (points: number) => void;
  updateTime: (time: number) => void;
  loadOfflineData: () => Promise<void>;
  syncPendingSessions: () => Promise<void>;
  getRecommendedGames: () => GameType[];
}

const defaultUserStats: UserStats = {
  lpi: 500,
  gamesPlayed: 0,
  totalScore: 0,
  streakDays: 0,
  cognitiveAreas: {
    memory: 50,
    speed: 50,
    attention: 50,
    flexibility: 50,
    problemSolving: 50,
  },
  gameStats: {} as Record<GameType, any>,
  dailyStats: {},
};

const defaultStreakData: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  totalGames: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      sessions: [],
      pendingSync: [],
      userStats: defaultUserStats,
      streakData: defaultStreakData,
      currentGame: null,
      isPlaying: false,
      score: 0,
      timeLeft: 60,

      startGame: (gameType: GameType) => {
        set({
          currentGame: gameType,
          isPlaying: true,
          score: 0,
          timeLeft: 60,
        });
      },

      endGame: async (score: number, accuracy: number, duration: number) => {
        const { currentGame, sessions, pendingSync, userStats, streakData } = get();
        if (!currentGame) return;

        const newSession: GameSession = {
          id: Date.now().toString(),
          gameType: currentGame,
          score,
          accuracy,
          duration,
          timestamp: new Date().toISOString(),
          synced: false,
        };

        // Update local stats
        const updatedStats = { ...userStats };
        updatedStats.gamesPlayed += 1;
        updatedStats.totalScore += score;
        
        if (!updatedStats.gameStats[currentGame]) {
          updatedStats.gameStats[currentGame] = {
            highScore: score,
            totalPlays: 1,
            totalScore: score,
            avgAccuracy: accuracy,
          };
        } else {
          const gameStat = updatedStats.gameStats[currentGame];
          gameStat.highScore = Math.max(gameStat.highScore, score);
          gameStat.totalPlays += 1;
          gameStat.totalScore += score;
          gameStat.avgAccuracy = (gameStat.avgAccuracy * (gameStat.totalPlays - 1) + accuracy) / gameStat.totalPlays;
        }

        // Update streak
        const today = new Date().toISOString().split('T')[0];
        const updatedStreak = { ...streakData };
        
        if (updatedStreak.lastPlayedDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (updatedStreak.lastPlayedDate === yesterdayStr) {
            updatedStreak.currentStreak += 1;
          } else {
            updatedStreak.currentStreak = 1;
          }
          updatedStreak.bestStreak = Math.max(updatedStreak.bestStreak, updatedStreak.currentStreak);
          updatedStreak.lastPlayedDate = today;
        }
        updatedStreak.totalGames += 1;

        // Try to sync immediately
        let synced = false;
        try {
          await apiService.recordGameSession(newSession);
          synced = true;
        } catch {
          // Will sync later when online
        }

        const finalSession = { ...newSession, synced };

        set({
          sessions: [...sessions, finalSession],
          pendingSync: synced ? pendingSync : [...pendingSync, finalSession],
          userStats: updatedStats,
          streakData: updatedStreak,
          currentGame: null,
          isPlaying: false,
        });
      },

      updateScore: (points: number) => {
        set((state) => ({ score: state.score + points }));
      },

      updateTime: (time: number) => {
        set({ timeLeft: time });
      },

      loadOfflineData: async () => {
        // Data is loaded automatically by persist middleware
      },

      syncPendingSessions: async () => {
        const { pendingSync } = get();
        const stillPending: GameSession[] = [];

        for (const session of pendingSync) {
          try {
            await apiService.recordGameSession(session);
          } catch {
            stillPending.push(session);
          }
        }

        set({ pendingSync: stillPending });
      },

      getRecommendedGames: () => {
        const { userStats } = get();
        const areas = Object.entries(userStats.cognitiveAreas);
        areas.sort((a, b) => a[1] - b[1]);
        
        const mapping: Record<string, GameType[]> = {
          memory: ['memory', 'word'],
          speed: ['speed', 'reaction'],
          attention: ['attention', 'visual'],
          flexibility: ['flexibility'],
          problemSolving: ['problemSolving', 'math', 'spatial'],
        };

        const recommendations: GameType[] = [];
        for (const [area] of areas.slice(0, 3)) {
          const games = mapping[area] || ['memory'];
          recommendations.push(...games);
        }

        return recommendations.slice(0, 5);
      },
    }),
    {
      name: 'game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);



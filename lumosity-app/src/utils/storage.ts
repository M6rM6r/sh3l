import type { UserStats, GameType, GameStats } from '../types';

const STORAGE_KEY = 'ygy_stats';
const TUTORIAL_KEY = 'ygy_tutorials';
const OFFLINE_QUEUE_KEY = 'ygy_offline_queue';

export interface QueuedAction {
  id: string;
  type: 'game_session' | 'achievement' | 'analytics';
  payload: unknown;
  timestamp: number;
  retries: number;
}

// Safe JSON parse with fallback
const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getUserStats = (): UserStats => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return safeJsonParse<UserStats>(stored, {
      gameStats: {} as Record<GameType, GameStats>,
      dailyStats: {},
      cognitiveAreas: {
        memory: { score: 50, gamesPlayed: 0 },
        attention: { score: 50, gamesPlayed: 0 },
        speed: { score: 50, gamesPlayed: 0 },
        flexibility: { score: 50, gamesPlayed: 0 },
        problemSolving: { score: 50, gamesPlayed: 0 }
      }
    });
  }
  
  return {
    gameStats: {} as Record<GameType, GameStats>,
    dailyStats: {},
    cognitiveAreas: {
      memory: { score: 50, gamesPlayed: 0 },
      attention: { score: 50, gamesPlayed: 0 },
      speed: { score: 50, gamesPlayed: 0 },
      flexibility: { score: 50, gamesPlayed: 0 },
      problemSolving: { score: 50, gamesPlayed: 0 }
    }
  };
};

export const saveUserStats = (stats: UserStats): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const hasSeenTutorial = (gameType: GameType): boolean => {
  const seen = localStorage.getItem(TUTORIAL_KEY);
  const tutorials = safeJsonParse<Record<string, boolean>>(seen, {});
  return tutorials[gameType] === true;
};

export const markTutorialSeen = (gameType: GameType): void => {
  const seen = localStorage.getItem(TUTORIAL_KEY);
  const tutorials = safeJsonParse<Record<string, boolean>>(seen, {});
  tutorials[gameType] = true;
  localStorage.setItem(TUTORIAL_KEY, JSON.stringify(tutorials));
};

export const resetTutorials = (): void => {
  localStorage.removeItem(TUTORIAL_KEY);
};

// Offline queue management for background sync
export const getOfflineQueue = (): QueuedAction[] => {
  const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return safeJsonParse<QueuedAction[]>(stored, []);
};

export const addToOfflineQueue = (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): void => {
  const queue = getOfflineQueue();
  const newAction: QueuedAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(newAction);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const removeFromOfflineQueue = (id: string): void => {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const updateOfflineQueueItem = (id: string, updates: Partial<QueuedAction>): void => {
  const queue = getOfflineQueue().map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const clearOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};



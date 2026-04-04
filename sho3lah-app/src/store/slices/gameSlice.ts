import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type GameType = 'memory' | 'speed' | 'attention' | 'logic' | 'math';

interface GameState {
  currentGame: GameType | null;
  score: number;
  streak: number;
  level: number;
  timeRemaining: number;
  isPlaying: boolean;
  isPaused: boolean;
  games: {
    id: GameType;
    name: string;
    description: string;
    icon: string;
    color: string;
    unlocked: boolean;
    highScore: number;
    timesPlayed: number;
  }[];
  dailyProgress: {
    date: string;
    gamesPlayed: number;
    totalScore: number;
    targetGames: number;
  };
}

const initialState: GameState = {
  currentGame: null,
  score: 0,
  streak: 0,
  level: 1,
  timeRemaining: 60,
  isPlaying: false,
  isPaused: false,
  games: [
    {
      id: 'memory',
      name: 'الذاكرة',
      description: 'اختبر قدرتك على تذكر الأنماط',
      icon: '🧠',
      color: '#9b59b6',
      unlocked: true,
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'speed',
      name: 'السرعة',
      description: 'اختبر سرعة استجابتك',
      icon: '⚡',
      color: '#f39c12',
      unlocked: true,
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'attention',
      name: 'التركيز',
      description: 'حسّن قدرتك على التركيز',
      icon: '🎯',
      color: '#e74c3c',
      unlocked: true,
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'logic',
      name: 'المنطق',
      description: 'حل الألغاز المنطقية',
      icon: '🧩',
      color: '#3498db',
      unlocked: true,
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'math',
      name: 'الحساب',
      description: 'تمرن على العمليات الحسابية',
      icon: '🔢',
      color: '#2ecc71',
      unlocked: true,
      highScore: 0,
      timesPlayed: 0,
    },
  ],
  dailyProgress: {
    date: new Date().toISOString().split('T')[0],
    gamesPlayed: 0,
    totalScore: 0,
    targetGames: 5,
  },
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<GameType>) => {
      state.currentGame = action.payload;
      state.score = 0;
      state.streak = 0;
      state.level = 1;
      state.timeRemaining = 60;
      state.isPlaying = true;
      state.isPaused = false;
    },
    endGame: (state) => {
      state.isPlaying = false;
      state.isPaused = false;
      state.dailyProgress.gamesPlayed += 1;
      state.dailyProgress.totalScore += state.score;
    },
    pauseGame: (state) => {
      state.isPaused = true;
    },
    resumeGame: (state) => {
      state.isPaused = false;
    },
    updateScore: (state, action: PayloadAction<number>) => {
      state.score += action.payload;
      if (action.payload > 0) {
        state.streak += 1;
      } else {
        state.streak = 0;
      }
    },
    nextLevel: (state) => {
      state.level += 1;
      state.timeRemaining = Math.max(30, 60 - state.level * 2);
    },
    updateTime: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    updateHighScore: (state, action: PayloadAction<{ gameId: GameType; score: number }>) => {
      const game = state.games.find((g) => g.id === action.payload.gameId);
      if (game) {
        game.highScore = Math.max(game.highScore, action.payload.score);
        game.timesPlayed += 1;
      }
    },
    resetDailyProgress: (state) => {
      state.dailyProgress = {
        date: new Date().toISOString().split('T')[0],
        gamesPlayed: 0,
        totalScore: 0,
        targetGames: 5,
      };
    },
  },
});

export const {
  startGame,
  endGame,
  pauseGame,
  resumeGame,
  updateScore,
  nextLevel,
  updateTime,
  updateHighScore,
  resetDailyProgress,
} = gameSlice.actions;

export default gameSlice.reducer;

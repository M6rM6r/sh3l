import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type GameType = 'memory' | 'language' | 'focus' | 'math' | 'logic';

interface Game {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  highScore: number;
  timesPlayed: number;
}

interface GameState {
  games: Game[];
  currentGame: GameType | null;
  score: number;
  level: number;
  timeRemaining: number;
  isPlaying: boolean;
}

const initialState: GameState = {
  games: [
    {
      id: 'memory',
      name: 'Memory Match',
      description: 'Match pairs and test your memory',
      icon: '🧠',
      color: '#8b5cf6',
      category: 'Memory',
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'language',
      name: 'Word Flow',
      description: 'Build vocabulary and language skills',
      icon: '📝',
      color: '#ec4899',
      category: 'Language',
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'focus',
      name: 'Focus Zone',
      description: 'Train attention and concentration',
      icon: '🎯',
      color: '#22c55e',
      category: 'Focus',
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'math',
      name: 'Quick Math',
      description: 'Solve problems fast',
      icon: '🔢',
      color: '#f59e0b',
      category: 'Math',
      highScore: 0,
      timesPlayed: 0,
    },
    {
      id: 'logic',
      name: 'Puzzle Master',
      description: 'Solve logic puzzles',
      icon: '🧩',
      color: '#6366f1',
      category: 'Logic',
      highScore: 0,
      timesPlayed: 0,
    },
  ],
  currentGame: null,
  score: 0,
  level: 1,
  timeRemaining: 60,
  isPlaying: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<GameType>) => {
      state.currentGame = action.payload;
      state.score = 0;
      state.level = 1;
      state.timeRemaining = 60;
      state.isPlaying = true;
    },
    endGame: (state) => {
      state.isPlaying = false;
      state.currentGame = null;
    },
    updateScore: (state, action: PayloadAction<number>) => {
      state.score += action.payload;
    },
    nextLevel: (state) => {
      state.level += 1;
      state.timeRemaining = 60;
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
  },
});

export const { startGame, endGame, updateScore, nextLevel, updateTime, updateHighScore } = gameSlice.actions;
export default gameSlice.reducer;

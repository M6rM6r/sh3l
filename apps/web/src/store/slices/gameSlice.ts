import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface GameState {
  currentGame: string | null;
  score: number;
  accuracy: number;
  timeRemaining: number;
  isPlaying: boolean;
  difficulty: {
    level: number;
    timeLimit: number;
    complexity: number;
    hintsAvailable: number;
  };
  sessionData: {
    startTime: number | null;
    endTime: number | null;
    moves: number;
    correctMoves: number;
  };
}

const initialState: GameState = {
  currentGame: null,
  score: 0,
  accuracy: 0,
  timeRemaining: 0,
  isPlaying: false,
  difficulty: {
    level: 1,
    timeLimit: 30,
    complexity: 1,
    hintsAvailable: 3
  },
  sessionData: {
    startTime: null,
    endTime: null,
    moves: 0,
    correctMoves: 0
  }
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<{ gameType: string; difficulty: GameState['difficulty'] }>) => {
      state.currentGame = action.payload.gameType;
      state.difficulty = action.payload.difficulty;
      state.isPlaying = true;
      state.timeRemaining = action.payload.difficulty.timeLimit;
      state.score = 0;
      state.accuracy = 0;
      state.sessionData = {
        startTime: Date.now(),
        endTime: null,
        moves: 0,
        correctMoves: 0
      };
    },
    updateScore: (state, action: PayloadAction<{ score: number; accuracy: number }>) => {
      state.score = action.payload.score;
      state.accuracy = action.payload.accuracy;
    },
    updateTime: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    recordMove: (state, action: PayloadAction<boolean>) => {
      state.sessionData.moves += 1;
      if (action.payload) {
        state.sessionData.correctMoves += 1;
      }
      state.accuracy = (state.sessionData.correctMoves / state.sessionData.moves) * 100;
    },
    endGame: (state) => {
      state.isPlaying = false;
      state.sessionData.endTime = Date.now();
    },
    resetGame: () => initialState
  }
});

export const { startGame, updateScore, updateTime, recordMove, endGame, resetGame } = gameSlice.actions;
export default gameSlice.reducer;


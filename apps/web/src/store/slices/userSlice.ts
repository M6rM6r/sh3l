import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  id: string | null;
  username: string | null;
  email: string | null;
  cognitiveProfile: {
    memory: number;
    speed: number;
    attention: number;
    flexibility: number;
    problemSolving: number;
  };
  isAuthenticated: boolean;
  streak: number;
  totalSessions: number;
}

const initialState: UserState = {
  id: null,
  username: null,
  email: null,
  cognitiveProfile: {
    memory: 50,
    speed: 50,
    attention: 50,
    flexibility: 50,
    problemSolving: 50
  },
  isAuthenticated: false,
  streak: 0,
  totalSessions: 0
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (_state, action: PayloadAction<UserState>) => {
      return { ...action.payload };
    },
    updateCognitiveProfile: (state, action: PayloadAction<Partial<UserState['cognitiveProfile']>>) => {
      state.cognitiveProfile = { ...state.cognitiveProfile, ...action.payload };
    },
    updateStreak: (state, action: PayloadAction<number>) => {
      state.streak = action.payload;
    },
    incrementSessions: (state) => {
      state.totalSessions += 1;
    },
    logout: () => initialState
  }
});

export const { setUser, updateCognitiveProfile, updateStreak, incrementSessions, logout } = userSlice.actions;
export default userSlice.reducer;


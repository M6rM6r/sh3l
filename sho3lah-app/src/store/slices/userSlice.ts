import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  profile: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    iqScore: number;
    totalGamesPlayed: number;
    totalScore: number;
    currentStreak: number;
    bestStreak: number;
    level: number;
    xp: number;
    achievements: string[];
  };
  cognitiveProfile: {
    memory: number;
    speed: number;
    attention: number;
    logic: number;
    math: number;
  };
  leaderboard: {
    global: { rank: number; total: number };
    friends: { rank: number; total: number };
  };
}

const initialState: UserState = {
  profile: {
    id: '',
    name: '',
    email: '',
    avatar: '',
    iqScore: 100,
    totalGamesPlayed: 0,
    totalScore: 0,
    currentStreak: 0,
    bestStreak: 0,
    level: 1,
    xp: 0,
    achievements: [],
  },
  cognitiveProfile: {
    memory: 50,
    speed: 50,
    attention: 50,
    logic: 50,
    math: 50,
  },
  leaderboard: {
    global: { rank: 1, total: 1000 },
    friends: { rank: 1, total: 10 },
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<UserState['profile']>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateCognitiveProfile: (state, action: PayloadAction<Partial<UserState['cognitiveProfile']>>) => {
      state.cognitiveProfile = { ...state.cognitiveProfile, ...action.payload };
    },
    addXp: (state, action: PayloadAction<number>) => {
      state.profile.xp += action.payload;
      const newLevel = Math.floor(state.profile.xp / 1000) + 1;
      if (newLevel > state.profile.level) {
        state.profile.level = newLevel;
      }
    },
    updateStreak: (state) => {
      state.profile.currentStreak += 1;
      state.profile.bestStreak = Math.max(state.profile.bestStreak, state.profile.currentStreak);
    },
    resetStreak: (state) => {
      state.profile.currentStreak = 0;
    },
    addAchievement: (state, action: PayloadAction<string>) => {
      if (!state.profile.achievements.includes(action.payload)) {
        state.profile.achievements.push(action.payload);
      }
    },
    updateLeaderboard: (state, action: PayloadAction<UserState['leaderboard']>) => {
      state.leaderboard = action.payload;
    },
  },
});

export const {
  updateProfile,
  updateCognitiveProfile,
  addXp,
  updateStreak,
  resetStreak,
  addAchievement,
  updateLeaderboard,
} = userSlice.actions;

export default userSlice.reducer;

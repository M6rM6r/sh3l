import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface CognitiveProfile {
  memory: number;
  language: number;
  focus: number;
  math: number;
  logic: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  totalGamesPlayed: number;
  cognitiveProfile: CognitiveProfile;
  achievements: string[];
}

interface DailyProgress {
  date: string;
  gamesCompleted: number;
  targetGames: number;
  xpEarned: number;
}

interface UserState {
  profile: UserProfile;
  dailyProgress: DailyProgress;
}

const initialState: UserState = {
  profile: {
    id: '1',
    name: 'Player',
    email: 'player@example.com',
    avatar: '🧠',
    level: 1,
    xp: 0,
    streak: 1,
    totalGamesPlayed: 0,
    cognitiveProfile: {
      memory: 50,
      language: 50,
      focus: 50,
      math: 50,
      logic: 50,
    },
    achievements: ['Getting Started'],
  },
  dailyProgress: {
    date: new Date().toISOString().split('T')[0],
    gamesCompleted: 0,
    targetGames: 3,
    xpEarned: 0,
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    addXp: (state, action: PayloadAction<number>) => {
      state.profile.xp += action.payload;
      state.dailyProgress.xpEarned += action.payload;
      const newLevel = Math.floor(state.profile.xp / 1000) + 1;
      if (newLevel > state.profile.level) {
        state.profile.level = newLevel;
      }
    },
    incrementGamesPlayed: (state) => {
      state.profile.totalGamesPlayed += 1;
      state.dailyProgress.gamesCompleted += 1;
    },
    updateCognitiveSkill: (state, action: PayloadAction<{ skill: keyof CognitiveProfile; value: number }>) => {
      const { skill, value } = action.payload;
      state.profile.cognitiveProfile[skill] = Math.min(100, Math.max(0, value));
    },
    addAchievement: (state, action: PayloadAction<string>) => {
      if (!state.profile.achievements.includes(action.payload)) {
        state.profile.achievements.push(action.payload);
      }
    },
    resetDailyProgress: (state) => {
      state.dailyProgress = {
        date: new Date().toISOString().split('T')[0],
        gamesCompleted: 0,
        targetGames: 3,
        xpEarned: 0,
      };
    },
  },
});

export const { updateProfile, addXp, incrementGamesPlayed, updateCognitiveSkill, addAchievement, resetDailyProgress } = userSlice.actions;
export default userSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AnalyticsState {
  dailyStats: {
    date: string;
    sessions: number;
    totalScore: number;
    averageAccuracy: number;
    timeSpent: number;
  }[];
  weeklyProgress: {
    week: string;
    memory: number;
    speed: number;
    attention: number;
    flexibility: number;
    problemSolving: number;
  }[];
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    icon: string;
  }[];
  insights: {
    type: 'improvement' | 'stagnation' | 'recommendation';
    message: string;
    gameType?: string;
    timestamp: string;
  }[];
}

const initialState: AnalyticsState = {
  dailyStats: [],
  weeklyProgress: [],
  achievements: [],
  insights: []
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    addDailyStat: (state, action: PayloadAction<AnalyticsState['dailyStats'][0]>) => {
      const existingIndex = state.dailyStats.findIndex(stat => stat.date === action.payload.date);
      if (existingIndex >= 0) {
        state.dailyStats[existingIndex] = action.payload;
      } else {
        state.dailyStats.push(action.payload);
      }
      // Keep only last 30 days
      state.dailyStats = state.dailyStats.slice(-30);
    },
    updateWeeklyProgress: (state, action: PayloadAction<AnalyticsState['weeklyProgress'][0]>) => {
      const existingIndex = state.weeklyProgress.findIndex(progress => progress.week === action.payload.week);
      if (existingIndex >= 0) {
        state.weeklyProgress[existingIndex] = action.payload;
      } else {
        state.weeklyProgress.push(action.payload);
      }
      // Keep only last 12 weeks
      state.weeklyProgress = state.weeklyProgress.slice(-12);
    },
    unlockAchievement: (state, action: PayloadAction<AnalyticsState['achievements'][0]>) => {
      if (!state.achievements.find(a => a.id === action.payload.id)) {
        state.achievements.push(action.payload);
      }
    },
    addInsight: (state, action: PayloadAction<AnalyticsState['insights'][0]>) => {
      state.insights.push(action.payload);
      // Keep only last 50 insights
      state.insights = state.insights.slice(-50);
    },
    clearInsights: (state) => {
      state.insights = [];
    }
  }
});

export const { addDailyStat, updateWeeklyProgress, unlockAchievement, addInsight, clearInsights } = analyticsSlice.actions;
export default analyticsSlice.reducer;
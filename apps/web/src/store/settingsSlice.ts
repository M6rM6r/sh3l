import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  language: string;
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

const initialState: SettingsState = {
  language: localStorage.getItem('ygy_language') || 'en',
  theme: 'dark',
  soundEnabled: true,
  notificationsEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem('ygy_language', action.payload);
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
    },
  },
});

export const { setLanguage, setTheme, toggleSound, toggleNotifications } = settingsSlice.actions;
export default settingsSlice.reducer;

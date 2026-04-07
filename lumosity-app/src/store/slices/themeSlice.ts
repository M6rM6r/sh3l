import { createSlice } from '@reduxjs/toolkit';

interface ThemeState {
  theme: 'dark';
}

const initialState: ThemeState = {
  theme: 'dark',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {},
});

export default themeSlice.reducer;



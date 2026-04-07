# Ygy Mobile App

React Native mobile application for cognitive training.

## Features

- 10 Cognitive Training Games
- Offline Support with AsyncStorage
- Push Notifications
- Real-time Analytics
- Adaptive Difficulty
- JWT Authentication
- Background Sync

## Tech Stack

- React Native + Expo
- TypeScript
- Zustand (State Management)
- React Navigation
- TensorFlow.js
- FastAPI Backend Integration

## Getting Started

1. Install dependencies:
   `ash
   npm install
   `

2. Configure environment:
   - Update API endpoint in src/services/api.ts
   - Configure push notifications in pp.json

3. Start development:
   `ash
   npm run android  # For Android
   npm run ios      # For iOS
   npm run start    # Expo start
   `

## Project Structure

`
src/
  components/
    games/          # Game components
  screens/          # Screen components
  services/         # API & notifications
  hooks/            # State management
  types/            # TypeScript types
  utils/            # Utilities
`

## Games

- Memory Matrix - Pattern memorization
- Speed Match - Rapid decision making
- Train of Thought - Attention switching
- And 7 more cognitive training games

## Backend Integration

Connects to FastAPI backend at http://localhost:8000
Supports offline queue for game sessions.




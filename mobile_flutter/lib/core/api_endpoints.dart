class ApiEndpoints {
  static const String baseUrl = 'https://api.yourbrain.app';
  static const String wsUrl = 'wss://ws.yourbrain.app';

  // Auth
  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';
  static const String refresh = '/api/auth/refresh';
  static const String me = '/api/users/me';

  // Games
  static const String games = '/api/games';
  static const String gameSession = '/api/game-sessions';
  static const String recommendations = '/api/recommendations';

  // Analytics
  static const String stats = '/api/users/{id}/stats';
  static const String dashboard = '/api/analytics/dashboard';
  static const String leaderboard = '/api/leaderboard';

  // Cognitive
  static const String cognitiveProfile = '/api/cognitive/profile';
  static const String skillGaps = '/api/cognitive/skill-gaps';
  static const String spacedRepetition = '/api/cognitive/spaced-repetition';

  // Multiplayer
  static const String createRoom = '/api/multiplayer/rooms';
  static const String joinRoom = '/api/multiplayer/rooms/join';
  static String roomWs(String roomId) => '$wsUrl/rooms/$roomId';

  // Achievements
  static const String achievements = '/api/achievements';
}



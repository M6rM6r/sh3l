import 'package:flutter/foundation.dart';
import '../models/achievement.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class UserProvider with ChangeNotifier {
  // ────────────────────────────────────
  //  Auth state
  // ────────────────────────────────────
  bool _isAuthenticated = false;
  bool _authChecked = false;  // whether we've checked SharedPreferences yet

  bool get isAuthenticated => _isAuthenticated;
  bool get authChecked => _authChecked;

  /// Call once at app start. Returns true if a token exists.
  Future<bool> initAuth() async {
    ApiService.instance.onUnauthorized = logout;
    final token = await ApiService.instance.getToken();
    _isAuthenticated = token != null;
    _authChecked = true;
    if (_isAuthenticated) {
      await _loadProfileFromApi();
    }
    notifyListeners();
    return _isAuthenticated;
  }

  Future<bool> login(String email, String password) async {
    final data = await ApiService.instance.login(email, password);
    if (data == null) return false;
    _isAuthenticated = true;
    if (data['user'] != null) {
      _applyApiProfile(data['user'] as Map<String, dynamic>);
    }
    notifyListeners();
    return true;
  }

  Future<bool> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final data = await ApiService.instance.register(
      username: username,
      email: email,
      password: password,
    );
    if (data == null) return false;
    _isAuthenticated = true;
    _user.username = username;
    notifyListeners();
    return true;
  }

  void logout() async {
    await ApiService.instance.clearToken();
    _isAuthenticated = false;
    _user.totalSessions = 0;
    _user.streak = 0;
    _user.username = 'Player';
    notifyListeners();
  }

  Future<void> _loadProfileFromApi() async {
    final data = await ApiService.instance.getUserProfile('me');
    if (data != null) _applyApiProfile(data);
  }

  void _applyApiProfile(Map<String, dynamic> data) {
    if (data['username'] != null) _user.username = data['username'] as String;
    if (data['streak'] != null) _user.streak = (data['streak'] as num).toInt();
    if (data['totalSessions'] != null) {
      _user.totalSessions = (data['totalSessions'] as num).toInt();
    }
  }

  // ────────────────────────────────────
  //  User data
  // ────────────────────────────────────
  final User _user = User(
    id: '1',
    username: 'Player',
    cognitiveProfile: CognitiveProfile(
      memory: 50,
      speed: 50,
      attention: 50,
      flexibility: 50,
      problemSolving: 50,
    ),
    streak: 0,
    totalSessions: 0,
  );

  final List<Achievement> _achievements = [
    Achievement(
      id: '1',
      title: 'First Steps',
      description: 'Complete your first game',
      type: 'games',
      unlocked: false,
    ),
    Achievement(
      id: '2',
      title: 'Speed Demon',
      description: 'Score over 1000 in speed games',
      type: 'score',
      unlocked: false,
    ),
    Achievement(
      id: '3',
      title: 'Memory Master',
      description: 'Achieve 95% accuracy in memory games',
      type: 'accuracy',
      unlocked: false,
    ),
    Achievement(
      id: '4',
      title: 'Streak Champion',
      description: 'Maintain a 7-day streak',
      type: 'streak',
      unlocked: false,
    ),
  ];

  User get user => _user;
  List<Achievement> get achievements => _achievements;

  // Convenience getters for UI screens
  String get userName => _user.username;
  int get totalGamesPlayed => _user.totalSessions;
  int get currentStreak => _user.streak;
  int get bestScore => (_user.cognitiveProfile.memory + _user.cognitiveProfile.speed).round();
  int get level => (_user.totalSessions ~/ 10).clamp(1, 100) + 1;
  int get xp => _user.totalSessions * 50;

  void updateCognitiveProfile(String area, double value) {
    switch (area) {
      case 'memory':
        _user.cognitiveProfile.memory = value;
        break;
      case 'speed':
        _user.cognitiveProfile.speed = value;
        break;
      case 'attention':
        _user.cognitiveProfile.attention = value;
        break;
      case 'flexibility':
        _user.cognitiveProfile.flexibility = value;
        break;
      case 'problemSolving':
        _user.cognitiveProfile.problemSolving = value;
        break;
    }
    notifyListeners();
  }

  void incrementSessions() {
    _user.totalSessions++;
    _checkAchievements();
    notifyListeners();
  }

  void updateStreak(int streak) {
    _user.streak = streak;
    _checkAchievements();
    notifyListeners();
  }

  void _checkAchievements() {
    for (var achievement in _achievements) {
      if (!achievement.unlocked) {
        bool shouldUnlock = false;
        switch (achievement.type) {
          case 'games':
            shouldUnlock = _user.totalSessions >= 1;
            break;
          case 'score':
            // Would check high scores
            shouldUnlock = false; // Placeholder
            break;
          case 'accuracy':
            // Would check accuracy
            shouldUnlock = false; // Placeholder
            break;
          case 'streak':
            shouldUnlock = _user.streak >= 7;
            break;
        }
        if (shouldUnlock) {
          achievement.unlocked = true;
        }
      }
    }
  }
}
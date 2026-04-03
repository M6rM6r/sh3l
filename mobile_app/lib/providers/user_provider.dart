import 'package:flutter/foundation.dart';
import '../models/achievement.dart';
import '../models/user.dart';

class UserProvider with ChangeNotifier {
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
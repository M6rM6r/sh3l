class CognitiveProfile {
  double memory;
  double speed;
  double attention;
  double flexibility;
  double problemSolving;

  CognitiveProfile({
    required this.memory,
    required this.speed,
    required this.attention,
    required this.flexibility,
    required this.problemSolving,
  });
}

class User {
  String id;
  String username;
  CognitiveProfile cognitiveProfile;
  int streak;
  int totalSessions;

  User({
    required this.id,
    required this.username,
    required this.cognitiveProfile,
    required this.streak,
    required this.totalSessions,
  });
}


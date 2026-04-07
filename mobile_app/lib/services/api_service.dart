import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String _baseUrl = 'http://10.0.2.2:8000'; // Android emulator → host
  static const Duration _timeout = Duration(seconds: 15);
  static const String _tokenKey = 'ygy_token';

  // Singleton
  ApiService._internal();
  static final ApiService instance = ApiService._internal();

  // Optional logout callback — set by UserProvider
  Function()? onUnauthorized;

  // ────────────────────────────────────
  //  Token helpers
  // ────────────────────────────────────
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<Map<String, String>> get _authHeaders async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Map<String, String> get _jsonHeaders => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  void _checkUnauthorized(http.Response response) {
    if (response.statusCode == 401) {
      clearToken();
      onUnauthorized?.call();
    }
  }

  // ────────────────────────────────────
  //  Auth
  // ────────────────────────────────────
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final body = 'username=${Uri.encodeComponent(email)}&password=${Uri.encodeComponent(password)}';
      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/auth/login'),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            body: body,
          )
          .timeout(_timeout);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['access_token'] != null) {
          await saveToken(data['access_token'] as String);
        }
        return data;
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>?> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/auth/register'),
            headers: _jsonHeaders,
            body: jsonEncode({
              'username': username,
              'email': email,
              'password': password,
            }),
          )
          .timeout(_timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['access_token'] != null) {
          await saveToken(data['access_token'] as String);
        }
        return data;
      }
    } catch (_) {}
    return null;
  }

  // ────────────────────────────────────
  //  Game sessions
  // ────────────────────────────────────
  Future<bool> submitGameSession({
    required String gameType,
    required int score,
    required double accuracy,
    int? levelReached,
    int? durationSeconds,
  }) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/game/session'),
            headers: headers,
            body: jsonEncode({
              'game_type': gameType,
              'score': score,
              'accuracy': accuracy,
              if (levelReached != null) 'level': levelReached,
              if (durationSeconds != null) 'duration': durationSeconds,
            }),
          )
          .timeout(_timeout);
      _checkUnauthorized(response);
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // ────────────────────────────────────
  //  User stats
  // ────────────────────────────────────
  Future<Map<String, dynamic>?> fetchUserStats() async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/analytics/overview'), headers: headers)
          .timeout(_timeout);
      _checkUnauthorized(response);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  Future<List<Map<String, dynamic>>> fetchLeaderboard(String gameType) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(
            Uri.parse('$_baseUrl/api/leaderboard?game_type=$gameType&limit=20'),
            headers: headers,
          )
          .timeout(_timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data as List);
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>?> getAnalytics(String userId) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/analytics/overview'), headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  Future<List<Map<String, dynamic>>> getLeaderboard(String gameType) async =>
      fetchLeaderboard(gameType);

  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/users/me'), headers: headers)
          .timeout(_timeout);
      _checkUnauthorized(response);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  Future<bool> saveScore({
    required String gameType,
    required int score,
    required double accuracy,
    String? userId,
  }) =>
      submitGameSession(gameType: gameType, score: score, accuracy: accuracy);

  Future<Map<String, dynamic>?> getRecommendations(String userId) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/recommendations'), headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  Future<List<Map<String, dynamic>>> getGoals(String userId) async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/goals'), headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data as List);
      }
    } catch (_) {}
    return [];
  }

  // ────────────────────────────────────
  //  Subscription
  // ────────────────────────────────────
  Future<Map<String, dynamic>?> getSubscriptionStatus() async {
    try {
      final headers = await _authHeaders;
      final response = await http
          .get(Uri.parse('$_baseUrl/api/subscription/status'), headers: headers)
          .timeout(_timeout);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }
}


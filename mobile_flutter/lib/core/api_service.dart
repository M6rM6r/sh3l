import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_endpoints.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  String? _token;

  void initialize() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        if (kDebugMode) {
          print('Request: ${options.method} ${options.path}');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          print('Response: ${response.statusCode} ${response.data}');
        }
        return handler.next(response);
      },
      onError: (error, handler) async {
        if (kDebugMode) {
          print('Error: ${error.response?.statusCode} ${error.message}');
        }

        if (error.response?.statusCode == 401) {
          // Token expired, try to refresh
          final refreshed = await _refreshToken();
          if (refreshed) {
            error.requestOptions.headers['Authorization'] = 'Bearer $_token';
            return handler.resolve(await _dio.fetch(error.requestOptions));
          }
        }

        return handler.next(error);
      },
    ));
  }

  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    return _token;
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(ApiEndpoints.refresh, data: {
        'refresh_token': refreshToken,
      });

      if (response.statusCode == 200) {
        final newToken = response.data['access_token'];
        await setToken(newToken);
        if (response.data['refresh_token'] != null) {
          await _setRefreshToken(response.data['refresh_token']);
        }
        return true;
      }
    } catch (e) {
      if (kDebugMode) print('Token refresh failed: $e');
    }
    return false;
  }

  Future<String?> _getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refresh_token');
  }

  Future<void> _setRefreshToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('refresh_token', token);
  }

  // Auth APIs
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post(ApiEndpoints.login, data: {
      'email': email,
      'password': password,
    });

    if (response.statusCode == 200) {
      await setToken(response.data['access_token']);
      if (response.data['refresh_token'] != null) {
        await _setRefreshToken(response.data['refresh_token']);
      }
    }

    return response.data;
  }

  Future<Map<String, dynamic>> register(String email, String password, String username) async {
    final response = await _dio.post(ApiEndpoints.register, data: {
      'email': email,
      'password': password,
      'username': username,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get(ApiEndpoints.me);
    return response.data;
  }

  // Game APIs
  Future<List<Map<String, dynamic>>> getGames() async {
    final response = await _dio.get(ApiEndpoints.games);
    return List<Map<String, dynamic>>.from(response.data['games'] ?? []);
  }

  Future<Map<String, dynamic>> submitGameSession(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiEndpoints.gameSession, data: data);
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getRecommendations() async {
    final response = await _dio.get(ApiEndpoints.recommendations);
    return List<Map<String, dynamic>>.from(response.data['recommendations'] ?? []);
  }

  // Analytics APIs
  Future<Map<String, dynamic>> getUserStats(int userId) async {
    final response = await _dio.get(ApiEndpoints.stats.replaceFirst('{id}', userId.toString()));
    return response.data;
  }

  Future<Map<String, dynamic>> getDashboard(int userId, {String period = '30d'}) async {
    final response = await _dio.get(
      '/api/analytics/dashboard',
      queryParameters: {'user_id': userId, 'period': period},
    );
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getLeaderboard({String type = 'global', String? gameType}) async {
    final response = await _dio.get(
      ApiEndpoints.leaderboard,
      queryParameters: {
        'type': type,
        if (gameType != null) 'game_type': gameType,
      },
    );
    return List<Map<String, dynamic>>.from(response.data['leaderboard'] ?? []);
  }

  // Cognitive APIs
  Future<Map<String, dynamic>> getCognitiveProfile(int userId) async {
    final response = await _dio.get('/api/cognitive/profile/$userId');
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getSkillGaps(int userId) async {
    final response = await _dio.get('/api/cognitive/skill-gaps/$userId');
    return List<Map<String, dynamic>>.from(response.data['skill_gaps'] ?? []);
  }

  Future<List<Map<String, dynamic>>> getSpacedRepetition(int userId) async {
    final response = await _dio.get('/api/cognitive/spaced-repetition/$userId');
    return List<Map<String, dynamic>>.from(response.data['schedule'] ?? []);
  }

  // Multiplayer APIs
  Future<Map<String, dynamic>> createMultiplayerRoom(String gameType, {int maxPlayers = 4}) async {
    final response = await _dio.post(ApiEndpoints.createRoom, data: {
      'game_type': gameType,
      'max_players': maxPlayers,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> joinMultiplayerRoom(String joinCode) async {
    final response = await _dio.post(ApiEndpoints.joinRoom, data: {
      'join_code': joinCode,
    });
    return response.data;
  }

  Dio get dio => _dio;
}



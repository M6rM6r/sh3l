import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// A persistent FIFO queue backed by SharedPreferences.
/// Stores game sessions that failed to submit while offline.
class OfflineQueue {
  static const String _queueKey = 'offline_game_queue';

  OfflineQueue._internal();
  static final OfflineQueue instance = OfflineQueue._internal();

  Future<void> enqueue(Map<String, dynamic> item) async {
    final prefs = await SharedPreferences.getInstance();
    final current = _load(prefs);
    current.add(item);
    await prefs.setString(_queueKey, jsonEncode(current));
  }

  /// Returns all queued items and clears the queue.
  Future<List<Map<String, dynamic>>> drain() async {
    final prefs = await SharedPreferences.getInstance();
    final items = _load(prefs);
    await prefs.remove(_queueKey);
    return items;
  }

  Future<int> get length async {
    final prefs = await SharedPreferences.getInstance();
    return _load(prefs).length;
  }

  List<Map<String, dynamic>> _load(SharedPreferences prefs) {
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      return List<Map<String, dynamic>>.from(jsonDecode(raw) as List);
    } catch (_) {
      return [];
    }
  }
}



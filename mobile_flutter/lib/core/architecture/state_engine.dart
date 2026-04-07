import 'dart:async';
import 'package:flutter/foundation.dart';

/// Absolute State Purity: Immutable Application State Engine for Flutter.
/// Designed for zero-latency UI updates and rigid state transitions.

@immutable
class AppState {
  final Map<String, dynamic> _gameMemory;
  final bool isSynchronized;
  final int entropyLevel;

  const AppState({
    required Map<String, dynamic> gameMemory,
    required this.isSynchronized,
    required this.entropyLevel,
  }) : _gameMemory = gameMemory;

  AppState copyWith({
    Map<String, dynamic>? gameMemory,
    bool? isSynchronized,
    int? entropyLevel,
  }) {
    return AppState(
      gameMemory: gameMemory ?? Map.unmodifiable(this._gameMemory),
      isSynchronized: isSynchronized ?? this.isSynchronized,
      entropyLevel: entropyLevel ?? this.entropyLevel,
    );
  }

  dynamic readMemory(String key) => _gameMemory[key];
}

abstract class Intent {}

class UpdateMemoryIntent extends Intent {
  final String key;
  final dynamic value;
  UpdateMemoryIntent(this.key, this.value);
}

class SynchronizationIntent extends Intent {
  final bool status;
  SynchronizationIntent(this.status);
}

/// Uni-directional Data Flow Engine
class UnidirectionalStateEngine {
  AppState _currentState;
  final _stateController = StreamController<AppState>.broadcast();

  UnidirectionalStateEngine(this._currentState);

  Stream<AppState> get stateStream => _stateController.stream;
  AppState get snapshot => _currentState;

  void dispatch(Intent intent) {
    if (intent is UpdateMemoryIntent) {
      final newMemory = Map<String, dynamic>.from(_currentState._gameMemory);
      newMemory[intent.key] = intent.value;
      _transition(_currentState.copyWith(gameMemory: Map.unmodifiable(newMemory)));
    } else if (intent is SynchronizationIntent) {
      _transition(_currentState.copyWith(isSynchronized: intent.status));
    } else {
      throw Exception("Unrecognized Architectural Intent");
    }
  }

  void _transition(AppState newState) {
    _currentState = newState;
    _stateController.add(_currentState);
  }

  void dispose() {
    _stateController.close();
  }
}



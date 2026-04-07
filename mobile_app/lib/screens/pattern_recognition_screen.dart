import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class PatternRecognitionScreen extends StatefulWidget {
  const PatternRecognitionScreen({super.key});

  @override
  State<PatternRecognitionScreen> createState() => _PatternRecognitionScreenState();
}

enum _Phase { memorize, recall, feedback }

class _PatternRecognitionScreenState extends State<PatternRecognitionScreen> {
  static const _gridSize = 4;
  static const _totalRounds = 5;
  static const _memorizeSeconds = 3;

  final _rng = Random();

  bool _gameStarted = false;
  bool _gameOver = false;

  int _round = 0;
  int _score = 0;
  int _correct = 0;

  _Phase _phase = _Phase.memorize;
  late Set<int> _pattern;
  final Set<int> _playerSelection = {};
  int _numCells = 4;
  int _countdown = _memorizeSeconds;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startGame() {
    setState(() {
      _gameStarted = true;
      _gameOver = false;
      _round = 0;
      _score = 0;
      _correct = 0;
      _numCells = 4;
    });
    _nextRound();
  }

  void _nextRound() {
    _round++;
    _playerSelection.clear();
    final total = _gridSize * _gridSize;
    final indices = List.generate(total, (i) => i)..shuffle(_rng);
    _pattern = indices.take(_numCells).toSet();
    setState(() => _phase = _Phase.memorize);
    _startCountdown();
  }

  void _startCountdown() {
    _countdown = _memorizeSeconds;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) {
        t.cancel();
        setState(() => _phase = _Phase.recall);
      } else {
        setState(() => _countdown--);
      }
    });
  }

  void _onCellTap(int index) {
    if (_phase != _Phase.recall) return;
    setState(() {
      if (_playerSelection.contains(index)) {
        _playerSelection.remove(index);
      } else {
        _playerSelection.add(index);
      }
    });
  }

  void _onSubmit() {
    if (_phase != _Phase.recall) return;
    final correct = _playerSelection.length == _pattern.length &&
        _playerSelection.every(_pattern.contains);
    setState(() {
      _phase = _Phase.feedback;
      if (correct) {
        _score += _numCells * 12;
        _correct++;
        _numCells = (_numCells + 1).clamp(4, 12);
      }
    });

    Future.delayed(const Duration(milliseconds: 1200), () {
      if (_round >= _totalRounds) {
        setState(() => _gameOver = true);
        context.read<UserProvider>().addScore(_score);
      } else {
        _nextRound();
      }
    });
  }

  Color _cellColor(int index) {
    final inPattern = _pattern.contains(index);
    final selected = _playerSelection.contains(index);

    switch (_phase) {
      case _Phase.memorize:
        return inPattern ? const Color(0xFF880E4F) : const Color(0xFF1A2A4A);
      case _Phase.recall:
        return selected ? const Color(0xFF880E4F).withOpacity(0.7) : const Color(0xFF1A2A4A);
      case _Phase.feedback:
        if (inPattern && selected) return Colors.green;
        if (inPattern && !selected) return Colors.red.withOpacity(0.7);
        if (!inPattern && selected) return Colors.orange.withOpacity(0.7);
        return const Color(0xFF1A2A4A);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        title: const Text('Pattern Recognition', style: TextStyle(fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: _gameOver
          ? _buildResultScreen()
          : _gameStarted
              ? _buildGameScreen()
              : _buildStartScreen(),
    );
  }

  Widget _buildStartScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🔷', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          const Text('Pattern Recognition',
              style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const Text(
            'Memorize the highlighted cells,\nthen recreate the pattern!\n5 rounds — patterns get bigger!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white60, fontSize: 16),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _startGame,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF880E4F),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            child: const Text('Start', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildGameScreen() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Round $_round/$_totalRounds',
                  style: const TextStyle(color: Colors.white60)),
              Text('Score: $_score',
                  style: const TextStyle(color: Color(0xFF4FC3F7), fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          _buildPhaseLabel(),
          const SizedBox(height: 16),
          AspectRatio(
            aspectRatio: 1,
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: _gridSize,
                mainAxisSpacing: 6,
                crossAxisSpacing: 6,
              ),
              itemCount: _gridSize * _gridSize,
              itemBuilder: (context, index) {
                return GestureDetector(
                  onTap: () => _onCellTap(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: _cellColor(index),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF2A3A5A)),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
          if (_phase == _Phase.recall)
            ElevatedButton.icon(
              onPressed: _onSubmit,
              icon: const Icon(Icons.check),
              label: const Text('Submit Pattern'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF880E4F),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
            ),
          if (_phase == _Phase.feedback)
            Text(
              _playerSelection.length == _pattern.length &&
                      _playerSelection.every(_pattern.contains)
                  ? '✅ Perfect!'
                  : '❌ Not quite!',
              style: TextStyle(
                color: _playerSelection.length == _pattern.length &&
                        _playerSelection.every(_pattern.contains)
                    ? Colors.green
                    : Colors.red,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildPhaseLabel() {
    switch (_phase) {
      case _Phase.memorize:
        return Text(
          'Memorize! ($_countdown s)',
          style: const TextStyle(color: Colors.amber, fontSize: 18, fontWeight: FontWeight.bold),
        );
      case _Phase.recall:
        return Text(
          'Tap $_numCells cells to recreate the pattern',
          style: const TextStyle(color: Colors.white70, fontSize: 16),
        );
      case _Phase.feedback:
        return const SizedBox.shrink();
    }
  }

  Widget _buildResultScreen() {
    final accuracy = _totalRounds > 0
        ? (_correct / _totalRounds * 100).toStringAsFixed(1)
        : '0.0';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🔷', style: TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            const Text('Round Complete!',
                style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _resultRow('Score', '$_score pts'),
            _resultRow('Correct', '$_correct / $_totalRounds'),
            _resultRow('Accuracy', '$accuracy%'),
            _resultRow('Max Cells', '$_numCells'),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white60),
                  child: const Text('Exit'),
                ),
                ElevatedButton(
                  onPressed: _startGame,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF880E4F),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Play Again'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 16)),
          Text(value,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}



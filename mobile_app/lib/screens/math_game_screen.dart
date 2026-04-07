import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class MathGameScreen extends StatefulWidget {
  const MathGameScreen({super.key});

  @override
  State<MathGameScreen> createState() => _MathGameScreenState();
}

class _MathGameScreenState extends State<MathGameScreen> {
  static const _gameDuration = 30;
  static const _correctPoints = 10;
  static const _incorrectPenalty = 3;

  int _score = 0;
  int _correct = 0;
  int _incorrect = 0;
  int _secondsLeft = _gameDuration;
  bool _gameStarted = false;
  bool _gameOver = false;

  int _operandA = 0;
  int _operandB = 0;
  String _operator = '+';
  int _correctAnswer = 0;
  List<int> _choices = [];

  Timer? _timer;
  final _rng = Random();

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startGame() {
    setState(() {
      _gameStarted = true;
      _gameOver = false;
      _score = 0;
      _correct = 0;
      _incorrect = 0;
      _secondsLeft = _gameDuration;
    });
    _nextQuestion();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft <= 1) {
        _timer?.cancel();
        setState(() => _gameOver = true);
        _recordSession();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  void _nextQuestion() {
    final ops = ['+', '-', '×'];
    _operator = ops[_rng.nextInt(ops.length)];
    switch (_operator) {
      case '+':
        _operandA = _rng.nextInt(50) + 1;
        _operandB = _rng.nextInt(50) + 1;
        _correctAnswer = _operandA + _operandB;
      case '-':
        _operandA = _rng.nextInt(50) + 10;
        _operandB = _rng.nextInt(_operandA) + 1;
        _correctAnswer = _operandA - _operandB;
      case '×':
        _operandA = _rng.nextInt(12) + 1;
        _operandB = _rng.nextInt(12) + 1;
        _correctAnswer = _operandA * _operandB;
    }

    final wrongAnswers = <int>{};
    while (wrongAnswers.length < 3) {
      final delta = _rng.nextInt(10) + 1;
      final wrong = _rng.nextBool() ? _correctAnswer + delta : _correctAnswer - delta;
      if (wrong != _correctAnswer) wrongAnswers.add(wrong);
    }

    _choices = [...wrongAnswers, _correctAnswer]..shuffle(_rng);
    setState(() {});
  }

  void _onAnswer(int answer) {
    if (_gameOver) return;
    if (answer == _correctAnswer) {
      setState(() {
        _score += _correctPoints;
        _correct++;
      });
    } else {
      setState(() {
        _score = (_score - _incorrectPenalty).clamp(0, 9999);
        _incorrect++;
      });
    }
    _nextQuestion();
  }

  void _recordSession() {
    context.read<UserProvider>().addScore(_score);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        title: const Text('Math Marathon', style: TextStyle(fontWeight: FontWeight.w900)),
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
          const Text('➕', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          const Text(
            'Math Marathon',
            style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Text(
            'Solve as many problems as you can\nin 30 seconds!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white60, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Text(
            'Correct: +$_correctPoints pts  |  Wrong: -$_incorrectPenalty pts',
            style: const TextStyle(color: Color(0xFF4FC3F7), fontSize: 13),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _startGame,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2E7D32),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            child: const Text('Start Game', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _statChip('⏱', '$_secondsLeft s', const Color(0xFFE53935)),
              _statChip('🏆', '$_score', const Color(0xFF4FC3F7)),
              _statChip('✅', '$_correct', const Color(0xFF2E7D32)),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 32),
            decoration: BoxDecoration(
              color: const Color(0xFF1A2A4A),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '$_operandA  $_operator  $_operandB  =  ?',
              style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
            ),
          ),
          const Spacer(),
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 2.5,
            children: _choices.map((c) {
              return ElevatedButton(
                onPressed: () => _onAnswer(c),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A2A4A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('$c', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              );
            }).toList(),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildResultScreen() {
    final accuracy = (_correct + _incorrect) > 0
        ? (_correct / (_correct + _incorrect) * 100).toStringAsFixed(1)
        : '0.0';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🏁', style: TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            const Text('Time\'s Up!', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _resultRow('Score', '$_score pts'),
            _resultRow('Correct', '$_correct'),
            _resultRow('Incorrect', '$_incorrect'),
            _resultRow('Accuracy', '$accuracy%'),
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
                    backgroundColor: const Color(0xFF2E7D32),
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

  Widget _statChip(String icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text('$icon $label', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
    );
  }

  Widget _resultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 16)),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}



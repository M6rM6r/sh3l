import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class LogicGameScreen extends StatefulWidget {
  const LogicGameScreen({super.key});

  @override
  State<LogicGameScreen> createState() => _LogicGameScreenState();
}

class _LogicGameScreenState extends State<LogicGameScreen> {
  static const _totalQuestions = 10;

  final _rng = Random();

  int _questionIndex = 0;
  int _score = 0;
  int _correct = 0;
  bool _gameStarted = false;
  bool _gameOver = false;
  bool? _lastAnswerCorrect;

  late List<int> _sequence;
  late int _correctAnswer;
  late List<int> _choices;

  @override
  void initState() {
    super.initState();
  }

  void _startGame() {
    setState(() {
      _gameStarted = true;
      _gameOver = false;
      _questionIndex = 0;
      _score = 0;
      _correct = 0;
      _lastAnswerCorrect = null;
    });
    _generateQuestion();
  }

  void _generateQuestion() {
    // Pick a random sequence type
    final type = _rng.nextInt(4);
    int start;
    int step;
    switch (type) {
      case 0: // arithmetic +
        start = _rng.nextInt(10) + 1;
        step = _rng.nextInt(9) + 2;
        _sequence = List.generate(4, (i) => start + i * step);
        _correctAnswer = start + 4 * step;
      case 1: // arithmetic -
        start = 50 + _rng.nextInt(50);
        step = _rng.nextInt(9) + 2;
        _sequence = List.generate(4, (i) => start - i * step);
        _correctAnswer = start - 4 * step;
      case 2: // multiply
        start = _rng.nextInt(3) + 2;
        final factor = _rng.nextInt(3) + 2;
        _sequence = List.generate(4, (i) => start * pow(factor, i).toInt());
        _correctAnswer = start * pow(factor, 4).toInt();
      case 3: // Fibonacci-ish
        final a = _rng.nextInt(5) + 1;
        final b = _rng.nextInt(5) + 2;
        _sequence = [a, b, a + b, a + 2 * b];
        _correctAnswer = 2 * a + 3 * b;
      default:
        start = _rng.nextInt(10) + 1;
        step = _rng.nextInt(9) + 2;
        _sequence = List.generate(4, (i) => start + i * step);
        _correctAnswer = start + 4 * step;
    }

    final wrong = <int>{};
    while (wrong.length < 3) {
      final delta = _rng.nextInt(10) + 1;
      final w = _rng.nextBool() ? _correctAnswer + delta : _correctAnswer - delta;
      if (w != _correctAnswer) wrong.add(w);
    }
    _choices = [...wrong, _correctAnswer]..shuffle(_rng);
    setState(() {});
  }

  void _onAnswer(int answer) {
    final correct = answer == _correctAnswer;
    setState(() {
      _lastAnswerCorrect = correct;
      if (correct) {
        _score += 15;
        _correct++;
      }
      _questionIndex++;
    });

    Future.delayed(const Duration(milliseconds: 500), () {
      if (_questionIndex >= _totalQuestions) {
        setState(() => _gameOver = true);
        context.read<UserProvider>().addScore(_score);
      } else {
        setState(() => _lastAnswerCorrect = null);
        _generateQuestion();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        title: const Text('Logic Grid', style: TextStyle(fontWeight: FontWeight.w900)),
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
          const Text('🔲', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          const Text('Logic Grid', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const Text(
            'Complete the number sequence!\n10 questions, 15 pts each.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white60, fontSize: 16),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _startGame,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE65100),
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
    final Color? feedbackColor = _lastAnswerCorrect == null
        ? null
        : (_lastAnswerCorrect! ? Colors.green : Colors.red);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          LinearProgressIndicator(
            value: _questionIndex / _totalQuestions,
            backgroundColor: const Color(0xFF1A2A4A),
            color: const Color(0xFFE65100),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Q ${_questionIndex + 1}/$_totalQuestions',
                  style: const TextStyle(color: Colors.white60)),
              Text('Score: $_score', style: const TextStyle(color: Color(0xFF4FC3F7), fontWeight: FontWeight.bold)),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: feedbackColor != null
                  ? feedbackColor.withOpacity(0.15)
                  : const Color(0xFF1A2A4A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: feedbackColor ?? const Color(0xFF2A3A5A),
                width: 2,
              ),
            ),
            child: Column(
              children: [
                const Text('What comes next?', style: TextStyle(color: Colors.white60, fontSize: 14)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ..._sequence.map((n) => _sequenceBox('$n')),
                    _sequenceBox('?', highlight: true),
                  ],
                ),
              ],
            ),
          ),
          const Spacer(),
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 2.2,
            children: _choices.map((c) {
              return ElevatedButton(
                onPressed: _lastAnswerCorrect != null ? null : () => _onAnswer(c),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A2A4A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('$c', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              );
            }).toList(),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _sequenceBox(String label, {bool highlight = false}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: highlight ? const Color(0xFFE65100).withOpacity(0.2) : const Color(0xFF2A3A5A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: highlight ? const Color(0xFFE65100) : Colors.transparent),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: highlight ? const Color(0xFFE65100) : Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildResultScreen() {
    final accuracy = _totalQuestions > 0
        ? (_correct / _totalQuestions * 100).toStringAsFixed(1)
        : '0.0';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_correct >= 8 ? '🧠' : _correct >= 5 ? '👍' : '💪', style: const TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            const Text('Game Over!', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _resultRow('Score', '$_score pts'),
            _resultRow('Correct', '$_correct / $_totalQuestions'),
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
                    backgroundColor: const Color(0xFFE65100),
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
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

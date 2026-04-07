import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class NumberSequenceScreen extends StatefulWidget {
  const NumberSequenceScreen({super.key});

  @override
  State<NumberSequenceScreen> createState() => _NumberSequenceScreenState();
}

enum _Phase { memorize, recall, feedback }

class _NumberSequenceScreenState extends State<NumberSequenceScreen> {
  static const _totalRounds = 5;
  static const _memorizeSeconds = 3;

  final _rng = Random();

  bool _gameStarted = false;
  bool _gameOver = false;

  int _round = 0;
  int _score = 0;
  int _correct = 0;

  _Phase _phase = _Phase.memorize;
  late List<int> _sequence;
  final List<int> _playerInput = [];
  int _seqLength = 4;
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
      _seqLength = 4;
    });
    _nextRound();
  }

  void _nextRound() {
    _round++;
    _playerInput.clear();
    _sequence = List.generate(_seqLength, (_) => _rng.nextInt(9) + 1);
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

  void _onDigit(int digit) {
    if (_phase != _Phase.recall) return;
    setState(() => _playerInput.add(digit));

    if (_playerInput.length == _sequence.length) {
      _checkAnswer();
    }
  }

  void _onBackspace() {
    if (_playerInput.isNotEmpty) setState(() => _playerInput.removeLast());
  }

  void _checkAnswer() {
    final correct = _playerInput.join() == _sequence.join();
    setState(() {
      _phase = _Phase.feedback;
      if (correct) {
        _score += _seqLength * 10;
        _correct++;
        _seqLength = (_seqLength + 1).clamp(4, 9);
      }
    });

    Future.delayed(const Duration(milliseconds: 900), () {
      if (_round >= _totalRounds) {
        setState(() => _gameOver = true);
        context.read<UserProvider>().addScore(_score);
      } else {
        _nextRound();
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
        title: const Text('Number Sequence', style: TextStyle(fontWeight: FontWeight.w900)),
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
          const Text('🔢', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 24),
          const Text('Number Sequence',
              style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const Text(
            'Memorize the digits, then reproduce them.\n5 rounds — sequences get longer!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white60, fontSize: 16),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _startGame,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00838F),
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
          const SizedBox(height: 24),
          _buildPhasePanel(),
          const Spacer(),
          _buildNumpad(),
        ],
      ),
    );
  }

  Widget _buildPhasePanel() {
    if (_phase == _Phase.memorize) {
      return Column(
        children: [
          Text('Memorize! ($_countdown s)',
              style: const TextStyle(color: Colors.amber, fontSize: 18)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: _sequence
                .map((d) => _digitBox('$d', const Color(0xFF00838F)))
                .toList(),
          ),
        ],
      );
    } else if (_phase == _Phase.recall) {
      return Column(
        children: [
          const Text('Reproduce the sequence:',
              style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_sequence.length, (i) {
              final filled = i < _playerInput.length;
              return _digitBox(filled ? '${_playerInput[i]}' : '_',
                  filled ? const Color(0xFF00838F) : const Color(0xFF1A2A4A));
            }),
          ),
        ],
      );
    } else {
      // feedback
      final correct = _playerInput.join() == _sequence.join();
      return Column(
        children: [
          Text(correct ? '✅ Correct!' : '❌ Wrong!',
              style: TextStyle(
                  color: correct ? Colors.green : Colors.red, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (!correct) ...[
            const Text('The sequence was:', style: TextStyle(color: Colors.white60)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _sequence.map((d) => _digitBox('$d', Colors.red.withOpacity(0.7))).toList(),
            ),
          ],
        ],
      );
    }
  }

  Widget _digitBox(String label, Color color) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      width: 40,
      height: 48,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color, width: 2),
      ),
      alignment: Alignment.center,
      child: Text(label, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildNumpad() {
    final digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return Column(
      children: [
        GridView.count(
          shrinkWrap: true,
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.8,
          physics: const NeverScrollableScrollPhysics(),
          children: digits.map((d) {
            return ElevatedButton(
              onPressed: _phase == _Phase.recall ? () => _onDigit(d) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1A2A4A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text('$d', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: _phase == _Phase.recall ? () => _onDigit(0) : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A2A4A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('0', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                onPressed: _phase == _Phase.recall ? _onBackspace : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A2A4A),
                  foregroundColor: Colors.red,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Icon(Icons.backspace_outlined),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
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
            const Text('🔢', style: TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            const Text('Well Done!',
                style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            _resultRow('Score', '$_score pts'),
            _resultRow('Correct', '$_correct / $_totalRounds'),
            _resultRow('Accuracy', '$accuracy%'),
            _resultRow('Max Sequence', '$_seqLength digits'),
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
                    backgroundColor: const Color(0xFF00838F),
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



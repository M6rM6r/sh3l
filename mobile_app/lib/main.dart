import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:math';
import 'providers/user_provider.dart';
import 'screens/achievements_screen.dart';

void main() {
  runApp(const LumosityCloneApp());
}

class LumosityCloneApp extends StatelessWidget {
  const LumosityCloneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => UserProvider(),
      child: MaterialApp(
        title: 'Lumosity Clone - Brain Training',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
          fontFamily: 'Roboto',
        ),
        home: const HomeScreen(),
        routes: {
          '/games': (context) => const GamesScreen(),
          '/progress': (context) => const ProgressScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/achievements': (context) => const AchievementsScreen(),
          '/memory-game': (context) => const MemoryGameScreen(),
          '/speed-match': (context) => const SpeedMatchGameScreen(),
        },
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _brainAnimationController;
  late Animation<double> _brainAnimation;
  Map<String, dynamic>? _userData;
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _brainAnimationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _brainAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _brainAnimationController, curve: Curves.easeInOut),
    );

    _loadUserData();
    _setupConnectivityListener();
  }

  @override
  void dispose() {
    _brainAnimationController.dispose();
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('userData');
    if (userDataString != null) {
      setState(() {
        _userData = json.decode(userDataString);
      });
    } else {
      // Load default data or prompt for setup
      _userData = {
        'name': 'Brain Trainer',
        'level': 1,
        'totalScore': 0,
        'gamesPlayed': 0,
        'streak': 0,
      };
    }
  }

  void _setupConnectivityListener() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
      (List<ConnectivityResult> results) {
        setState(() {
          _isOnline = results.any((result) => result != ConnectivityResult.none);
        });
      },
    );
  }

  Future<void> _syncData() async {
    if (!_isOnline) return;

    try {
      final response = await http.post(
        Uri.parse('http://localhost:8000/api/sync'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(_userData),
      );

      if (response.statusCode == 200) {
        final syncedData = json.decode(response.body);
        setState(() {
          _userData = syncedData;
        });
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userData', json.encode(syncedData));
      }
    } catch (e) {
      // Handle sync error
      print('Sync failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Brain Training Hub'),
        actions: [
          IconButton(
            icon: Icon(_isOnline ? Icons.wifi : Icons.wifi_off),
            onPressed: _syncData,
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.blue, Colors.purple],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedBuilder(
                animation: _brainAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _brainAnimation.value,
                    child: const Icon(
                      Icons.psychology,
                      size: 100,
                      color: Colors.white,
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
              Text(
                'Welcome${_userData != null ? ', ${_userData!['name']}' : ''}!',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Level ${_userData?['level'] ?? 1} • ${_userData?['totalScore'] ?? 0} Points',
                style: const TextStyle(fontSize: 16, color: Colors.white70),
              ),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, '/games'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.blue,
                  padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: const Text('Start Training', style: TextStyle(fontSize: 18)),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildQuickActionButton(
                    icon: Icons.show_chart,
                    label: 'Progress',
                    onPressed: () => Navigator.pushNamed(context, '/progress'),
                  ),
                  _buildQuickActionButton(
                    icon: Icons.person,
                    label: 'Profile',
                    onPressed: () => Navigator.pushNamed(context, '/profile'),
                  ),
                  _buildQuickActionButton(
                    icon: Icons.settings,
                    label: 'Settings',
                    onPressed: () => Navigator.pushNamed(context, '/settings'),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              if (!_isOnline)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.warning, color: Colors.white),
                      SizedBox(width: 8),
                      Text(
                        'Offline Mode',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return Column(
      children: [
        ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            shape: const CircleBorder(),
            padding: const EdgeInsets.all(20),
            backgroundColor: Colors.white.withAlpha(51), // 0.2 * 255 = 51
            foregroundColor: Colors.white,
          ),
          child: Icon(icon, size: 30),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }
}

class GamesScreen extends StatefulWidget {
  const GamesScreen({super.key});

  @override
  _GamesScreenState createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  final List<Map<String, dynamic>> _games = [
    {
      'name': 'Memory Matrix',
      'description': 'Test your visual memory',
      'icon': Icons.grid_on,
      'difficulty': 'Medium',
      'category': 'Memory',
    },
    {
      'name': 'Speed Match',
      'description': 'Quick pattern recognition',
      'icon': Icons.flash_on,
      'difficulty': 'Easy',
      'category': 'Speed',
    },
    {
      'name': 'Word Bubbles',
      'description': 'Vocabulary building',
      'icon': Icons.bubble_chart,
      'difficulty': 'Hard',
      'category': 'Language',
    },
    {
      'name': 'Number Crunch',
      'description': 'Mental math challenges',
      'icon': Icons.calculate,
      'difficulty': 'Hard',
      'category': 'Logic',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Brain Games')),
      body: ListView.builder(
        itemCount: _games.length,
        itemBuilder: (context, index) {
          final game = _games[index];
          return Card(
            margin: const EdgeInsets.all(8),
            child: ListTile(
              leading: Icon(game['icon'], size: 40, color: Colors.blue),
              title: Text(game['name']),
              subtitle: Text(game['description']),
              trailing: Chip(
                label: Text(game['difficulty']),
                backgroundColor: _getDifficultyColor(game['difficulty']),
              ),
              onTap: () => _startGame(game),
            ),
          );
        },
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case 'Easy':
        return Colors.green;
      case 'Medium':
        return Colors.orange;
      case 'Hard':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _startGame(Map<String, dynamic> game) {
    if (game['name'] == 'Memory Matrix') {
      Navigator.pushNamed(context, '/memory-game');
    } else if (game['name'] == 'Speed Match') {
      Navigator.pushNamed(context, '/speed-match');
    } else {
      // Navigate to specific game screen
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Starting ${game['name']}...')),
      );
    }
  }
}

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  _ProgressScreenState createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> {
  Map<String, dynamic>? _progressData;

  @override
  void initState() {
    super.initState();
    _loadProgressData();
  }

  Future<void> _loadProgressData() async {
    // Load progress data from local storage or API
    final prefs = await SharedPreferences.getInstance();
    final progressString = prefs.getString('progressData');
    if (progressString != null) {
      setState(() {
        _progressData = json.decode(progressString);
      });
    } else {
      // Default progress data
      _progressData = {
        'totalGames': 0,
        'averageScore': 0,
        'bestStreak': 0,
        'cognitiveAreas': {
          'Memory': 0,
          'Speed': 0,
          'Language': 0,
          'Logic': 0,
        },
      };
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your Progress')),
      body: _progressData == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildProgressCard('Total Games Played', _progressData!['totalGames'].toString()),
                  _buildProgressCard('Average Score', _progressData!['averageScore'].toString()),
                  _buildProgressCard('Best Streak', _progressData!['bestStreak'].toString()),
                  const SizedBox(height: 20),
                  const Text(
                    'Cognitive Areas',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView(
                      children: (_progressData!['cognitiveAreas'] as Map<String, dynamic>)
                          .entries
                          .map((entry) => _buildCognitiveAreaCard(entry.key, entry.value))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildProgressCard(String title, String value) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(fontSize: 16)),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildCognitiveAreaCard(String area, int score) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(area, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: score / 100,
              backgroundColor: Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                score > 70 ? Colors.green : score > 40 ? Colors.orange : Colors.red,
              ),
            ),
            const SizedBox(height: 4),
            Text('$score/100', style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _nameController = TextEditingController();
  Map<String, dynamic>? _userData;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userDataString = prefs.getString('userData');
    if (userDataString != null) {
      final data = json.decode(userDataString);
      setState(() {
        _userData = data;
        _nameController.text = data['name'] ?? '';
      });
    }
  }

  Future<void> _saveProfile() async {
    final updatedData = {
      ...?_userData,
      'name': _nameController.text,
    };

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userData', json.encode(updatedData));

    setState(() {
      _userData = updatedData;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile updated successfully!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(
              radius: 50,
              child: Icon(Icons.person, size: 50),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            if (_userData != null) ...[
              _buildProfileInfo('Level', _userData!['level'].toString()),
              _buildProfileInfo('Total Score', _userData!['totalScore'].toString()),
              _buildProfileInfo('Games Played', _userData!['gamesPlayed'].toString()),
              _buildProfileInfo('Current Streak', _userData!['streak'].toString()),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _saveProfile,
              child: const Text('Save Profile'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfo(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16)),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _soundEnabled = true;
  String _difficulty = 'Medium';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _notificationsEnabled = prefs.getBool('notificationsEnabled') ?? true;
      _soundEnabled = prefs.getBool('soundEnabled') ?? true;
      _difficulty = prefs.getString('difficulty') ?? 'Medium';
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notificationsEnabled', _notificationsEnabled);
    await prefs.setBool('soundEnabled', _soundEnabled);
    await prefs.setString('difficulty', _difficulty);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            SwitchListTile(
              title: const Text('Enable Notifications'),
              value: _notificationsEnabled,
              onChanged: (value) {
                setState(() {
                  _notificationsEnabled = value;
                });
              },
            ),
            SwitchListTile(
              title: const Text('Enable Sound'),
              value: _soundEnabled,
              onChanged: (value) {
                setState(() {
                  _soundEnabled = value;
                });
              },
            ),
            ListTile(
              title: const Text('Default Difficulty'),
              trailing: DropdownButton<String>(
                value: _difficulty,
                onChanged: (value) {
                  setState(() {
                    _difficulty = value!;
                  });
                },
                items: ['Easy', 'Medium', 'Hard'].map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _saveSettings,
              child: const Text('Save Settings'),
            ),
          ],
        ),
      ),
    );
  }
}

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Achievements')),
      body: const Center(
        child: Text('Achievements coming soon!'),
      ),
    );
  }
}

class MemoryGameScreen extends StatefulWidget {
  const MemoryGameScreen({super.key});

  @override
  _MemoryGameScreenState createState() => _MemoryGameScreenState();
}

class _MemoryGameScreenState extends State<MemoryGameScreen> {
  List<String> _cards = [];
  List<bool> _cardFlips = [];
  List<bool> _cardMatches = [];
  int _firstCardIndex = -1;
  int _secondCardIndex = -1;
  bool _canFlip = true;
  int _score = 0;
  int _moves = 0;
  Timer? _timer;
  int _timeElapsed = 0;

  @override
  void initState() {
    super.initState();
    _initializeGame();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _initializeGame() {
    // Create pairs of cards
    List<String> symbols = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'];
    _cards = [...symbols, ...symbols]..shuffle();
    _cardFlips = List.filled(_cards.length, false);
    _cardMatches = List.filled(_cards.length, false);
    _firstCardIndex = -1;
    _secondCardIndex = -1;
    _canFlip = true;
    _score = 0;
    _moves = 0;
    _timeElapsed = 0;
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _timeElapsed++;
      });
    });
  }

  void _flipCard(int index) {
    if (!_canFlip || _cardFlips[index] || _cardMatches[index]) return;

    setState(() {
      _cardFlips[index] = true;

      if (_firstCardIndex == -1) {
        _firstCardIndex = index;
      } else {
        _secondCardIndex = index;
        _moves++;
        _checkMatch();
      }
    });
  }

  void _checkMatch() {
    _canFlip = false;

    if (_cards[_firstCardIndex] == _cards[_secondCardIndex]) {
      // Match found
      setState(() {
        _cardMatches[_firstCardIndex] = true;
        _cardMatches[_secondCardIndex] = true;
        _score += 10;
        _firstCardIndex = -1;
        _secondCardIndex = -1;
        _canFlip = true;
      });

      if (_cardMatches.every((match) => match)) {
        // Game completed
        _timer?.cancel();
        _showGameCompleteDialog();
      }
    } else {
      // No match
      Future.delayed(const Duration(seconds: 1), () {
        setState(() {
          _cardFlips[_firstCardIndex] = false;
          _cardFlips[_secondCardIndex] = false;
          _firstCardIndex = -1;
          _secondCardIndex = -1;
          _canFlip = true;
        });
      });
    }
  }

  void _showGameCompleteDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Congratulations!'),
        content: Text(
          'You completed the game!\n\nScore: $_score\nMoves: $_moves\nTime: ${_timeElapsed}s',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _initializeGame();
              _startTimer();
            },
            child: const Text('Play Again'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(); // Go back to games screen
            },
            child: const Text('Back to Games'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory Matrix'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Score: $_score'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Moves: $_moves'),
                Text('Time: ${_timeElapsed}s'),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16.0),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 8.0,
                mainAxisSpacing: 8.0,
              ),
              itemCount: _cards.length,
              itemBuilder: (context, index) {
                return GestureDetector(
                  onTap: () => _flipCard(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      color: _cardFlips[index] || _cardMatches[index]
                          ? Colors.white
                          : Colors.blue,
                      borderRadius: BorderRadius.circular(8.0),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          spreadRadius: 1,
                          blurRadius: 3,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: _cardFlips[index] || _cardMatches[index]
                          ? Text(
                              _cards[index],
                              style: const TextStyle(fontSize: 32),
                            )
                          : Container(),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton(
              onPressed: () {
                _timer?.cancel();
                _initializeGame();
                _startTimer();
              },
              child: const Text('Restart Game'),
            ),
          ),
        ],
      ),
    );
  }
}
class SpeedMatchGameScreen extends StatefulWidget {
  const SpeedMatchGameScreen({super.key});

  @override
  _SpeedMatchGameScreenState createState() => _SpeedMatchGameScreenState();
}

class _SpeedMatchGameScreenState extends State<SpeedMatchGameScreen> {
  String _currentColor = '';
  String _currentWord = '';
  bool _isMatch = false;
  int _score = 0;
  int _lives = 3;
  int _timeLeft = 30;
  Timer? _gameTimer;
  Timer? _countdownTimer;
  bool _gameStarted = false;
  final List<String> _colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

  @override
  void initState() {
    super.initState();
    _generateNewChallenge();
  }

  @override
  void dispose() {
    _gameTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _generateNewChallenge() {
    final random = Random();
    _currentColor = _colors[random.nextInt(_colors.length)];
    _currentWord = _colors[random.nextInt(_colors.length)];
    _isMatch = _currentColor == _currentWord;
  }

  void _startGame() {
    setState(() {
      _gameStarted = true;
      _score = 0;
      _lives = 3;
      _timeLeft = 30;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _timeLeft--;
        if (_timeLeft <= 0) {
          _endGame();
        }
      });
    });

    _generateNewChallenge();
  }

  void _endGame() {
    _countdownTimer?.cancel();
    _gameTimer?.cancel();
    setState(() {
      _gameStarted = false;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Game Over!'),
        content: Text('Final Score: $_score\nTime\'s up!'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _startGame();
            },
            child: const Text('Play Again'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(); // Go back to games screen
            },
            child: const Text('Back to Games'),
          ),
        ],
      ),
    );
  }

  void _checkAnswer(bool userSaidMatch) {
    if (!_gameStarted) return;

    bool correct = userSaidMatch == _isMatch;
    setState(() {
      if (correct) {
        _score += 10;
      } else {
        _lives--;
        if (_lives <= 0) {
          _endGame();
          return;
        }
      }
    });

    _generateNewChallenge();
  }

  Color _getColorFromName(String colorName) {
    switch (colorName) {
      case 'Red':
        return Colors.red;
      case 'Blue':
        return Colors.blue;
      case 'Green':
        return Colors.green;
      case 'Yellow':
        return Colors.yellow;
      case 'Purple':
        return Colors.purple;
      case 'Orange':
        return Colors.orange;
      default:
        return Colors.black;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Speed Match'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Score: $_score'),
          ),
        ],
      ),
      body: _gameStarted
          ? _buildGameScreen()
          : _buildStartScreen(),
    );
  }

  Widget _buildStartScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'Speed Match',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          const Text(
            'Tap MATCH if the word color matches the text,\nNO MATCH if they don\'t match.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _startGame,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 15),
            ),
            child: const Text('Start Game', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
  }

  Widget _buildGameScreen() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Lives: ${_lives.toString().padLeft(2, '0')}'),
              Text('Time: ${_timeLeft.toString().padLeft(2, '0')}'),
            ],
          ),
        ),
        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _currentWord,
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: _getColorFromName(_currentColor),
                  ),
                ),
                const SizedBox(height: 60),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton(
                      onPressed: () => _checkAnswer(false),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                      ),
                      child: const Text('NO MATCH', style: TextStyle(fontSize: 18)),
                    ),
                    ElevatedButton(
                      onPressed: () => _checkAnswer(true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                      ),
                      child: const Text('MATCH', style: TextStyle(fontSize: 18)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
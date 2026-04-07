import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';

class GamesScreen extends StatefulWidget {
  const GamesScreen({super.key});

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  String _selectedCategory = 'All';

  static const _categories = ['All', 'Memory', 'Speed', 'Math', 'Logic'];

  static const _games = [
    {'name': 'Memory Match', 'emoji': '🧠', 'category': 'Memory', 'color': Color(0xFF1565C0), 'route': '/memory-game'},
    {'name': 'Quick Reflexes', 'emoji': '⚡', 'category': 'Speed', 'color': Color(0xFF6A1B9A), 'route': '/speed-match'},
    {'name': 'Math Marathon', 'emoji': '➕', 'category': 'Math', 'color': Color(0xFF2E7D32), 'route': '/math-game'},
    {'name': 'Logic Grid', 'emoji': '🔲', 'category': 'Logic', 'color': Color(0xFFE65100), 'route': '/logic-game'},
    {'name': 'Number Sequence', 'emoji': '🔢', 'category': 'Math', 'color': Color(0xFF00838F), 'route': '/number-game'},
    {'name': 'Pattern Recognition', 'emoji': '🔷', 'category': 'Logic', 'color': Color(0xFF880E4F), 'route': '/pattern-game'},
  ];

  List<Map<String, dynamic>> get _filteredGames => _selectedCategory == 'All'
      ? List<Map<String, dynamic>>.from(_games)
      : List<Map<String, dynamic>>.from(
          _games.where((g) => g['category'] == _selectedCategory));

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Brain Games', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Category tabs
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isActive = cat == _selectedCategory;
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategory = cat),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    decoration: BoxDecoration(
                      color: isActive ? const Color(0xFF4FC3F7) : const Color(0xFF1A2A4A),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive ? const Color(0xFF4FC3F7) : const Color(0xFF2A3A5A),
                      ),
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        color: isActive ? const Color(0xFF0A1628) : Colors.white70,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          // Games grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
              ),
              itemCount: _filteredGames.length,
              itemBuilder: (context, index) {
                final game = _filteredGames[index];
                return _GameCard(game: game);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _GameCard extends StatelessWidget {
  final Map<String, dynamic> game;
  const _GameCard({required this.game});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        final route = game['route'] as String?;
        if (route != null && Navigator.canPop(context)) {
          Navigator.pushNamed(context, route);
        }
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [game['color'] as Color, (game['color'] as Color).withOpacity(0.75)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: (game['color'] as Color).withOpacity(0.35), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(game['emoji'] as String, style: const TextStyle(fontSize: 44)),
            const SizedBox(height: 8),
            Text(
              game['name'] as String,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                game['category'] as String,
                style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}



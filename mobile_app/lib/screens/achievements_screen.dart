import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/achievement.dart';
import '../providers/user_provider.dart';

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userProvider = Provider.of<UserProvider>(context);
    final earned = userProvider.achievements.where((a) => a.unlocked).toList();
    final locked = userProvider.achievements.where((a) => !a.unlocked).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Achievements', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── Earned ──────────────────────────────────────
          if (earned.isNotEmpty) ...[
            _SectionHeader(
              label: 'Earned',
              count: earned.length,
              color: const Color(0xFFFFD700),
            ),
            const SizedBox(height: 10),
            ...earned.map((a) => _AchievementCard(achievement: a)),
            const SizedBox(height: 24),
          ],

          // ── Locked ──────────────────────────────────────
          _SectionHeader(
            label: 'Locked',
            count: locked.length,
            color: Colors.white38,
          ),
          const SizedBox(height: 10),
          ...locked.map((a) => _AchievementCard(achievement: a)),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _SectionHeader({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(label, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text('$count', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

class _AchievementCard extends StatelessWidget {
  final Achievement achievement;
  const _AchievementCard({required this.achievement});

  @override
  Widget build(BuildContext context) {
    final unlocked = achievement.unlocked;
    final accent = unlocked ? const Color(0xFFFFD700) : Colors.white24;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: unlocked ? const Color(0xFF1a1a2e) : const Color(0xFF111122),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withOpacity(0.3), width: 1),
      ),
      child: Row(
        children: [
          // Icon badge
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: accent.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(_iconFor(achievement.type), color: accent, size: 26),
          ),
          const SizedBox(width: 14),
          // Title + description
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  achievement.title,
                  style: TextStyle(
                    color: unlocked ? Colors.white : Colors.white54,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  achievement.description,
                  style: TextStyle(color: unlocked ? Colors.white54 : Colors.white30, fontSize: 12),
                ),
                if (!unlocked) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _progressFor(achievement),
                      backgroundColor: Colors.white12,
                      color: const Color(0xFF6c63ff),
                      minHeight: 4,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          Icon(
            unlocked ? Icons.check_circle_rounded : Icons.lock_rounded,
            color: unlocked ? const Color(0xFFFFD700) : Colors.white24,
            size: 22,
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'streak': return Icons.local_fire_department_rounded;
      case 'score': return Icons.star_rounded;
      case 'games': return Icons.games_rounded;
      case 'accuracy': return Icons.precision_manufacturing_rounded;
      default: return Icons.emoji_events_rounded;
    }
  }

  double _progressFor(Achievement achievement) {
    // Placeholder progress estimates for locked achievements
    switch (achievement.type) {
      case 'games': return 0.0;      // first game not played
      case 'streak': return 0.14;    // 1/7 days
      case 'score': return 0.3;
      case 'accuracy': return 0.5;
      default: return 0.1;
    }
  }
}



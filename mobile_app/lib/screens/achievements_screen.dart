import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';

class AchievementsScreen extends StatelessWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userProvider = Provider.of<UserProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Achievements'),
        backgroundColor: Theme.of(context).primaryColor,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: userProvider.achievements.length,
        itemBuilder: (context, index) {
          final achievement = userProvider.achievements[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: Icon(
                _getAchievementIcon(achievement.type),
                color: achievement.unlocked ? Colors.amber : Colors.grey,
                size: 40,
              ),
              title: Text(
                achievement.title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: achievement.unlocked ? Colors.black : Colors.grey,
                ),
              ),
              subtitle: Text(
                achievement.description,
                style: TextStyle(
                  color: achievement.unlocked ? Colors.black54 : Colors.grey,
                ),
              ),
              trailing: achievement.unlocked
                  ? const Icon(Icons.check_circle, color: Colors.green)
                  : const Icon(Icons.lock, color: Colors.grey),
            ),
          );
        },
      ),
    );
  }

  IconData _getAchievementIcon(String type) {
    switch (type) {
      case 'streak':
        return Icons.local_fire_department;
      case 'score':
        return Icons.star;
      case 'games':
        return Icons.games;
      case 'accuracy':
        return Icons.precision_manufacturing;
      default:
        return Icons.emoji_events;
    }
  }
}
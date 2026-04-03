import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../hooks/useGame';
import { GAMES } from '../types';

export default function DashboardScreen({ navigation }: any) {
  const { userStats, streakData } = useGameStore();

  const cognitiveData = [
    { name: 'Memory', value: userStats.cognitiveAreas.memory, color: '#ab47bc', icon: '🧠' },
    { name: 'Speed', value: userStats.cognitiveAreas.speed, color: '#ef5350', icon: '⚡' },
    { name: 'Attention', value: userStats.cognitiveAreas.attention, color: '#1e88e5', icon: '🎯' },
    { name: 'Flexibility', value: userStats.cognitiveAreas.flexibility, color: '#fb8c00', icon: '🎨' },
    { name: 'Problem Solving', value: userStats.cognitiveAreas.problemSolving, color: '#00acc1', icon: '🔷' },
  ];

  const gameStats = Object.entries(userStats.gameStats).map(([gameId, stats]) => {
    const game = GAMES.find(g => g.id === gameId);
    return {
      name: game?.name || gameId,
      icon: game?.icon || '🎮',
      plays: stats.totalPlays,
      highScore: stats.highScore,
    };
  }).sort((a, b) => b.plays - a.plays);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>📊 Your Progress</Text>

          {/* Streak Card */}
          <View style={styles.streakCard}>
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakValue}>{streakData.currentStreak}</Text>
                <Text style={styles.streakLabel}>Current Streak</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>🏆</Text>
                <Text style={styles.streakValue}>{streakData.bestStreak}</Text>
                <Text style={styles.streakLabel}>Best Streak</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>🎮</Text>
                <Text style={styles.streakValue}>{streakData.totalGames}</Text>
                <Text style={styles.streakLabel}>Total Games</Text>
              </View>
            </View>
          </View>

          {/* Cognitive Areas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cognitive Areas</Text>
            {cognitiveData.map((area) => (
              <View key={area.name} style={styles.cognitiveCard}>
                <View style={styles.cognitiveHeader}>
                  <Text style={styles.cognitiveIcon}>{area.icon}</Text>
                  <Text style={styles.cognitiveName}>{area.name}</Text>
                  <Text style={[styles.cognitiveScore, { color: area.color }]}>
                    {Math.round(area.value)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${area.value}%`, backgroundColor: area.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Game Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Statistics</Text>
            {gameStats.slice(0, 5).map((game, index) => (
              <View key={game.name} style={styles.statRow}>
                <Text style={styles.statRank}>#{index + 1}</Text>
                <Text style={styles.statIcon}>{game.icon}</Text>
                <View style={styles.statInfo}>
                  <Text style={styles.statName}>{game.name}</Text>
                  <Text style={styles.statPlays}>{game.plays} plays</Text>
                </View>
                <Text style={styles.statScore}>{game.highScore.toLocaleString()}</Text>
              </View>
            ))}
            {gameStats.length === 0 && (
              <Text style={styles.emptyText}>Play some games to see stats!</Text>
            )}
          </View>

          {/* Analytics Button */}
          <TouchableOpacity
            style={styles.analyticsBtn}
            onPress={() => navigation.navigate('Analytics')}
          >
            <LinearGradient
              colors={['rgba(79, 195, 247, 0.2)', 'rgba(79, 195, 247, 0.1)']}
              style={styles.analyticsGradient}
            >
              <Text style={styles.analyticsText}>📈 View Detailed Analytics</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flex: 1, padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  streakCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4fc3f7',
  },
  streakLabel: {
    fontSize: 12,
    color: '#8b9bb4',
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  cognitiveCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cognitiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cognitiveIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  cognitiveName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cognitiveScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 39, 68, 0.6)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  statRank: {
    width: 30,
    fontSize: 14,
    fontWeight: '700',
    color: '#4fc3f7',
  },
  statIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statPlays: {
    fontSize: 12,
    color: '#8b9bb4',
  },
  statScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4fc3f7',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8b9bb4',
    padding: 20,
  },
  analyticsBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  analyticsGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4fc3f7',
  },
});

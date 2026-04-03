import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../hooks/useGame';
import { GAMES } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { userStats, streakData, getRecommendedGames } = useGameStore();
  const recommendedGames = getRecommendedGames();
  const today = new Date().toISOString().split('T')[0];
  const todayGames = userStats.dailyStats[today]?.gamesPlayed || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🧠 Lumosity</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streakData.currentStreak}</Text>
            </View>
          </View>

          {/* LPI Score */}
          <View style={styles.lpiCard}>
            <Text style={styles.lpiLabel}>Lumosity Performance Index</Text>
            <Text style={styles.lpiValue}>{userStats.lpi}</Text>
            <View style={styles.lpiBar}>
              <View style={[styles.lpiFill, { width: `${(userStats.lpi / 2000) * 100}%` }]} />
            </View>
          </View>

          {/* Daily Progress */}
          <View style={styles.progressCard}>
            <Text style={styles.cardTitle}>Today's Progress</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{todayGames}</Text>
                <Text style={styles.progressLabel}>Games</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{userStats.streakDays}</Text>
                <Text style={styles.progressLabel}>Day Streak</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{userStats.totalScore.toLocaleString()}</Text>
                <Text style={styles.progressLabel}>Total Points</Text>
              </View>
            </View>
          </View>

          {/* Recommended Games */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            {recommendedGames.slice(0, 3).map((gameId) => {
              const game = GAMES.find((g) => g.id === gameId);
              if (!game) return null;
              return (
                <TouchableOpacity
                  key={game.id}
                  style={[styles.gameCard, { borderLeftColor: game.color, borderLeftWidth: 4 }]}
                  onPress={() => navigation.navigate(game.id.charAt(0).toUpperCase() + game.id.slice(1))}
                >
                  <Text style={styles.gameIcon}>{game.icon}</Text>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDesc}>{game.description}</Text>
                  </View>
                  <Text style={styles.gameArrow}>→</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Start */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => navigation.navigate('Games')}
          >
            <LinearGradient
              colors={['#4fc3f7', '#29b6f6']}
              style={styles.playGradient}
            >
              <Text style={styles.playText}>🎮 Start Training</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4fc3f7',
  },
  streakBadge: {
    backgroundColor: 'rgba(239, 83, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    color: '#ef5350',
    fontWeight: '700',
    fontSize: 16,
  },
  lpiCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  lpiLabel: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 8,
  },
  lpiValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4fc3f7',
    marginBottom: 12,
  },
  lpiBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  lpiFill: {
    height: '100%',
    backgroundColor: '#4fc3f7',
    borderRadius: 4,
  },
  progressCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4fc3f7',
  },
  progressLabel: {
    fontSize: 12,
    color: '#8b9bb4',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  gameIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  gameDesc: {
    fontSize: 13,
    color: '#8b9bb4',
  },
  gameArrow: {
    fontSize: 20,
    color: '#4fc3f7',
    fontWeight: '700',
  },
  playButton: {
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  playGradient: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  playText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a1628',
  },
});

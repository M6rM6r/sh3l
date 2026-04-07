import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GAMES, GameConfig } from '../types';

export default function GamesScreen({ navigation }: any) {
  const cognitiveAreas = [
    { name: 'Memory', color: '#ab47bc', games: GAMES.filter(g => g.area === 'Memory') },
    { name: 'Speed', color: '#ef5350', games: GAMES.filter(g => g.area === 'Speed') },
    { name: 'Attention', color: '#1e88e5', games: GAMES.filter(g => g.area === 'Attention') },
    { name: 'Flexibility', color: '#fb8c00', games: GAMES.filter(g => g.area === 'Flexibility') },
    { name: 'Problem Solving', color: '#00acc1', games: GAMES.filter(g => g.area === 'Problem Solving') },
  ];

  const navigateToGame = (game: GameConfig) => {
    const screenName = game.id.charAt(0).toUpperCase() + game.id.slice(1);
    navigation.navigate(screenName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>🎮 All Games</Text>
          <Text style={styles.subtitle}>Train your brain with 10 cognitive games</Text>

          {cognitiveAreas.map((area) => (
            <View key={area.name} style={styles.section}>
              <View style={[styles.areaHeader, { borderLeftColor: area.color, borderLeftWidth: 4 }]}>
                <Text style={styles.areaName}>{area.name}</Text>
                <Text style={[styles.areaCount, { color: area.color }]}>{area.games.length} games</Text>
              </View>

              {area.games.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  onPress={() => navigateToGame(game)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${game.color}20` }]}>
                    <Text style={styles.gameIcon}>{game.icon}</Text>
                  </View>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDesc}>{game.description}</Text>
                    <View style={styles.gameMeta}>
                      <Text style={[styles.difficulty, { color: game.color }]}>
                        {'★'.repeat(game.difficulty)}
                      </Text>
                      <Text style={styles.duration}>⏱️ {game.estimatedDuration}s</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.playBtn, { backgroundColor: game.color }]}
                    onPress={() => navigateToGame(game)}
                  >
                    <Text style={styles.playBtnText}>▶</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))}

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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    marginBottom: 12,
  },
  areaName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  areaCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gameIcon: {
    fontSize: 28,
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
    marginBottom: 6,
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficulty: {
    fontSize: 12,
    marginRight: 12,
  },
  duration: {
    fontSize: 12,
    color: '#8b9bb4',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: {
    fontSize: 16,
    color: '#fff',
  },
});



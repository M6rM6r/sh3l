import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GAMES } from '../types';

export default function GamePlayScreen({ route, navigation }: any) {
  const { gameId } = route.params || {};
  const game = GAMES.find((g) => g.id === gameId) || GAMES[0];

  const startGame = () => {
    const screenName = game.id.charAt(0).toUpperCase() + game.id.slice(1);
    navigation.navigate(screenName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn}>←</Text>
            </TouchableOpacity>
          </View>

          {/* Game Info */}
          <View style={styles.gameInfo}>
            <View style={[styles.iconContainer, { backgroundColor: `${game.color}20` }]}>
              <Text style={styles.gameIcon}>{game.icon}</Text>
            </View>
            <Text style={styles.gameName}>{game.name}</Text>
            <Text style={styles.gameDesc}>{game.description}</Text>
            <View style={styles.metaContainer}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🧠</Text>
                <Text style={styles.metaText}>{game.area}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={styles.metaText}>{game.estimatedDuration}s</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📊</Text>
                <Text style={styles.metaText}>{'★'.repeat(game.difficulty)}</Text>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to Play</Text>
            <Text style={styles.instructionsText}>
              {getInstructions(game.id)}
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Cognitive Benefits</Text>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Improves {game.area.toLowerCase()} skills</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Trains brain plasticity</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Builds cognitive reserve</Text>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <LinearGradient colors={[game.color, game.color + 'dd']} style={styles.startGradient}>
              <Text style={styles.startText}>▶ Start Training</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function getInstructions(gameId: string): string {
  const instructions: Record<string, string> = {
    memory: 'Watch the pattern of tiles that light up. When they fade, tap the tiles in the same order. The pattern gets longer each level.',
    speed: 'Decide quickly: Is the current shape the same as the previous one? Tap YES or NO. Speed and accuracy both matter!',
    attention: 'Switch tracks to match the target color. Tap the track when your train should switch. Stay focused!',
    flexibility: 'Match the meaning of the word or the color of the ink. Be flexible in your thinking!',
    problemSolving: 'Remember the pattern and recreate it. Patterns get more complex as you progress.',
    math: 'Solve the math problems as quickly and accurately as possible. Challenge your calculation skills!',
    reaction: 'Tap as fast as you can when you see the target. Test your reflexes!',
    word: 'Create words from the given letters. Longer words score more points!',
    visual: 'Track the target among distractions. Keep your eyes on the prize!',
    spatial: 'Rotate and match the 3D shapes. Test your spatial reasoning!',
  };
  return instructions[gameId] || 'Follow the on-screen instructions to complete the game.';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flex: 1, padding: 20 },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    fontSize: 24,
    color: '#8b9bb4',
    width: 40,
  },
  gameInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameIcon: {
    fontSize: 50,
  },
  gameName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  gameDesc: {
    fontSize: 16,
    color: '#8b9bb4',
    textAlign: 'center',
    marginBottom: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#8b9bb4',
  },
  instructionsCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 15,
    color: '#8b9bb4',
    lineHeight: 22,
  },
  benefitsCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#66bb6a',
    marginRight: 10,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 14,
    color: '#8b9bb4',
  },
  startButton: {
    borderRadius: 12,
  },
  startGradient: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

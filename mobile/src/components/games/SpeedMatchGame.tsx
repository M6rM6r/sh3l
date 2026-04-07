import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../hooks/useGame';

const SHAPES = ['🔵', '🟦', '🔷', '🟣', '🟪', '🔶'];
const GAME_DURATION = 60;

export default function SpeedMatchGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentShape, setCurrentShape] = useState(0);
  const [previousShape, setPreviousShape] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { endGame, updateScore } = useGameStore();

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setStreak(0);
    setIsPlaying(true);
    setPreviousShape(Math.floor(Math.random() * SHAPES.length));
    setCurrentShape(Math.floor(Math.random() * SHAPES.length));
  };

  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleMatch = (isMatch: boolean) => {
    if (!isPlaying) return;

    const correct = (currentShape === previousShape) === isMatch;
    
    if (correct) {
      const points = 100 + streak * 10;
      setScore((s) => s + points);
      updateScore(points);
      setStreak((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setPreviousShape(currentShape);
    setCurrentShape(Math.floor(Math.random() * SHAPES.length));
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = (score / (GAME_DURATION * 10)) * 100;
    await endGame(score, Math.min(accuracy, 100), GAME_DURATION);
    navigation.navigate('Dashboard');
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>⚡</Text>
            <Text style={styles.startTitle}>Speed Match</Text>
            <Text style={styles.startDesc}>
              Is the current shape the same as the previous one?{'\n'}
              Tap YES or NO as fast as you can!
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={['#ef5350', '#e53935']} style={styles.startGradient}>
                <Text style={styles.startBtnText}>▶ Start Game</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGameEnd}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Speed Match</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${(timeLeft / GAME_DURATION) * 100}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Game Area */}
        <View style={styles.gameArea}>
          {/* Previous Shape */}
          <View style={styles.shapeContainer}>
            <Text style={styles.shapeLabel}>Previous</Text>
            <Text style={styles.shape}>{SHAPES[previousShape]}</Text>
          </View>

          {/* Current Shape */}
          <View style={[styles.shapeContainer, styles.currentContainer]}>
            <Text style={styles.shapeLabel}>Current</Text>
            <Text style={[styles.shape, styles.currentShape]}>{SHAPES[currentShape]}</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>
            {streak > 2 ? '🔥'.repeat(Math.min(streak, 5)) : ''}
          </Text>
          <Text style={styles.streakValue}>Streak: {streak}x</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.noBtn]}
            onPress={() => handleMatch(false)}
          >
            <Text style={styles.controlText}>👎 NO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, styles.yesBtn]}
            onPress={() => handleMatch(true)}
          >
            <Text style={styles.controlText}>👍 YES</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  startIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  startDesc: {
    fontSize: 16,
    color: '#8b9bb4',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  startBtn: {
    borderRadius: 12,
    marginBottom: 20,
  },
  startGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  backBtn: {
    padding: 12,
  },
  backText: {
    fontSize: 16,
    color: '#8b9bb4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backBtnText: {
    fontSize: 24,
    color: '#8b9bb4',
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4fc3f7',
    width: 100,
    textAlign: 'right',
  },
  timerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timerBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 8,
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#ef5350',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 14,
    color: '#8b9bb4',
    textAlign: 'center',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 40,
  },
  shapeContainer: {
    alignItems: 'center',
    opacity: 0.5,
  },
  currentContainer: {
    opacity: 1,
  },
  shapeLabel: {
    fontSize: 12,
    color: '#8b9bb4',
    marginBottom: 8,
  },
  shape: {
    fontSize: 60,
  },
  currentShape: {
    fontSize: 80,
    transform: [{ scale: 1.2 }],
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakText: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 16,
    color: '#ef5350',
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    padding: 20,
    paddingBottom: 40,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noBtn: {
    backgroundColor: '#ef5350',
  },
  yesBtn: {
    backgroundColor: '#66bb6a',
  },
  controlText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});



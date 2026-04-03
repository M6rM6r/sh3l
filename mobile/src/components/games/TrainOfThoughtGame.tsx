import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../hooks/useGame';

const GAME_DURATION = 90;
const COLORS = [
  { name: 'red', color: '#ef5350', icon: '🔴' },
  { name: 'blue', color: '#1e88e5', icon: '🔵' },
  { name: 'green', color: '#66bb6a', icon: '🟢' },
  { name: 'yellow', color: '#ffca28', icon: '🟡' },
];

export default function TrainOfThoughtGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  
  // Track the path
  const [tracks, setTracks] = useState<{ id: number; color: string; x: number }[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [nextColor, setNextColor] = useState('');
  
  const { endGame, updateScore } = useGameStore();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setIsPlaying(true);
    setCurrentTrack(0);
    generateLevel(1);
  };

  const generateLevel = (lvl: number) => {
    const numTracks = Math.min(2 + Math.floor(lvl / 3), 4);
    const newTracks = Array.from({ length: numTracks }, (_, i) => ({
      id: i,
      color: COLORS[i].name,
      x: 0,
    }));
    
    setTracks(newTracks);
    setNextColor(COLORS[Math.floor(Math.random() * numTracks)].name);
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

    // Animate tracks
    const animateInterval = setInterval(() => {
      setTracks((prev) =>
        prev.map((t) => ({
          ...t,
          x: (t.x + 2) % 100,
        }))
      );
    }, 50);

    return () => {
      clearInterval(timer);
      clearInterval(animateInterval);
    };
  }, [isPlaying]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSwitch = (trackIndex: number) => {
    if (!isPlaying) return;

    const currentColor = tracks[currentTrack].color;
    
    if (currentColor === nextColor) {
      const points = 50 + level * 10;
      setScore((s) => s + points);
      updateScore(points);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Level up every 5 correct switches
      if (score > 0 && score % 250 === 0) {
        const newLevel = level + 1;
        setLevel(newLevel);
        generateLevel(newLevel);
      } else {
        setNextColor(COLORS[Math.floor(Math.random() * tracks.length)].name);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScore((s) => Math.max(0, s - 25));
    }
    
    setCurrentTrack(trackIndex);
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = (score / (GAME_DURATION * 5)) * 100;
    await endGame(score, Math.min(accuracy, 100), GAME_DURATION);
    navigation.navigate('Dashboard');
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🧩</Text>
            <Text style={styles.startTitle}>Train of Thought</Text>
            <Text style={styles.startDesc}>
              Switch tracks to match the target color!{'\n'}
              Tap the track when it matches the displayed color.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={['#1e88e5', '#1565c0']} style={styles.startGradient}>
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
          <Text style={styles.title}>Train of Thought</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${(timeLeft / GAME_DURATION) * 100}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s • Level {level}</Text>
        </View>

        {/* Target Color */}
        <View style={styles.targetContainer}>
          <Text style={styles.targetLabel}>Match This Color:</Text>
          <Animated.View style={[styles.targetIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.targetEmoji}>
              {COLORS.find((c) => c.name === nextColor)?.icon || '⚪'}
            </Text>
          </Animated.View>
        </View>

        {/* Tracks */}
        <View style={styles.tracksContainer}>
          {tracks.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.track,
                { backgroundColor: COLORS.find((c) => c.name === track.color)?.color + '30' },
                currentTrack === index && styles.trackActive,
              ]}
              onPress={() => handleSwitch(index)}
            >
              <View style={styles.trackHeader}>
                <Text style={styles.trackIcon}>
                  {COLORS.find((c) => c.name === track.color)?.icon}
                </Text>
                {currentTrack === index && <Text style={styles.trainIcon}>🚂</Text>}
              </View>
              <View style={styles.trackLine}>
                <View
                  style={[
                    styles.trackBall,
                    {
                      backgroundColor: COLORS.find((c) => c.name === track.color)?.color,
                      left: `${track.x}%`,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Track Indicator */}
        <View style={styles.currentTrackContainer}>
          <Text style={styles.currentTrackText}>
            Current: {COLORS.find((c) => c.name === tracks[currentTrack]?.color)?.icon} {tracks[currentTrack]?.color}
          </Text>
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
    backgroundColor: '#1e88e5',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 14,
    color: '#8b9bb4',
    textAlign: 'center',
  },
  targetContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  targetLabel: {
    fontSize: 16,
    color: '#8b9bb4',
    marginBottom: 16,
  },
  targetIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetEmoji: {
    fontSize: 48,
  },
  tracksContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12,
  },
  track: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  trackActive: {
    borderColor: '#4fc3f7',
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackIcon: {
    fontSize: 24,
  },
  trainIcon: {
    fontSize: 24,
  },
  trackLine: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    position: 'relative',
  },
  trackBall: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
  },
  currentTrackContainer: {
    padding: 20,
    alignItems: 'center',
  },
  currentTrackText: {
    fontSize: 16,
    color: '#8b9bb4',
    textTransform: 'capitalize',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../hooks/useGame';

const { width } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = (width - 80) / GRID_SIZE;

export default function MemoryMatrixGame({ navigation }: any) {
  const [phase, setPhase] = React.useState<'memorize' | 'recall' | 'result'>('memorize');
  const [level, setLevel] = React.useState(1);
  const [pattern, setPattern] = React.useState<number[]>([]);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [showingPattern, setShowingPattern] = React.useState(true);
  
  const { endGame, updateScore } = useGameStore();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const generatePattern = (size: number) => {
    const indices: number[] = [];
    while (indices.length < size) {
      const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  };

  useEffect(() => {
    startLevel(1);
  }, []);

  const startLevel = (lvl: number) => {
    setPhase('memorize');
    setLevel(lvl);
    setSelected([]);
    setShowingPattern(true);
    const newPattern = generatePattern(Math.min(3 + Math.floor(lvl / 2), 12));
    setPattern(newPattern);

    // Show pattern then hide
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShowingPattern(false);
        setPhase('recall');
      }, 1500 + lvl * 200);
    });
  };

  const handleCellPress = async (index: number) => {
    if (phase !== 'recall' || selected.includes(index)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSelected = [...selected, index];
    setSelected(newSelected);

    // Check if complete
    if (newSelected.length === pattern.length) {
      const correct = pattern.every((p) => newSelected.includes(p)) &&
                      newSelected.every((s) => pattern.includes(s));
      
      if (correct) {
        const points = level * 100;
        setScore((s) => s + points);
        updateScore(points);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => startLevel(level + 1), 500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const newLives = lives - 1;
        setLives(newLives);
        
        if (newLives <= 0) {
          handleGameEnd();
        } else {
          setTimeout(() => startLevel(level), 1000);
        }
      }
    }
  };

  const handleGameEnd = async () => {
    const accuracy = (score / (level * 100)) * 100;
    await endGame(score, Math.min(accuracy, 100), level * 30);
    navigation.navigate('Dashboard');
  };

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const isPattern = pattern.includes(i);
      const isSelected = selected.includes(i);
      const showActive = (phase === 'memorize' && showingPattern && isPattern) || 
                          (phase === 'recall' && isSelected);

      cells.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.cell,
            showActive && styles.cellActive,
          ]}
          onPress={() => handleCellPress(i)}
          disabled={phase !== 'recall' || isSelected}
        >
          {showActive && <View style={styles.cellInner} />}
        </TouchableOpacity>
      );
    }
    return cells;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Memory Matrix</Text>
          <Text style={styles.score}>Score: {score}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{'❤️'.repeat(lives)}</Text>
          </View>
        </View>

        {/* Phase Indicator */}
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseText}>
            {phase === 'memorize' ? '👀 Memorize the pattern' : phase === 'recall' ? '🎯 Tap the pattern' : ''}
          </Text>
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.grid}>{renderGrid()}</View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {selected.length} / {pattern.length} tiles
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${(selected.length / pattern.length) * 100}%` }]}
            />
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backBtn: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#4fc3f7',
    width: 80,
    textAlign: 'right',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8b9bb4',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  phaseContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  phaseText: {
    fontSize: 16,
    color: '#4fc3f7',
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE * GRID_SIZE + 12,
    gap: 4,
  },
  cell: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellActive: {
    backgroundColor: '#4fc3f7',
  },
  cellInner: {
    width: '60%',
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  progressContainer: {
    padding: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 8,
  },
  progressBar: {
    width: width - 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4fc3f7',
    borderRadius: 2,
  },
});

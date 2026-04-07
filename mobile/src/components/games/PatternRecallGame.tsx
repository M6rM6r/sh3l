import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameStore } from "../../hooks/useGame";

const GRID_SIZES = [3, 4, 5, 5, 6, 6];
const GAME_DURATION = 120;

export default function PatternRecallGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(0);
  const [phase, setPhase] = useState<"show" | "recall">("show");
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  
  const { endGame, updateScore } = useGameStore();
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const gridSize = GRID_SIZES[Math.min(level, GRID_SIZES.length - 1)];
  const totalCells = gridSize * gridSize;

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(0);
    setLives(3);
    setIsPlaying(true);
    startLevel(0);
  };

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setPhase("show");
    setUserPattern([]);
    
    // Generate pattern (2 + level tiles)
    const patternLength = Math.min(2 + lvl, Math.floor(totalCells * 0.6));
    const newPattern: number[] = [];
    while (newPattern.length < patternLength) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!newPattern.includes(idx)) newPattern.push(idx);
    }
    setPattern(newPattern.sort((a, b) => a - b));

    // Show pattern then switch to recall
    setTimeout(() => {
      setPhase("recall");
    }, 1500 + lvl * 200);
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

  const handleCellPress = (index: number) => {
    if (phase !== "recall" || userPattern.includes(index)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newUserPattern = [...userPattern, index];
    setUserPattern(newUserPattern);

    // Check if complete
    if (newUserPattern.length === pattern.length) {
      const correct = pattern.every((p) => newUserPattern.includes(p)) &&
                      newUserPattern.every((u) => pattern.includes(u));
      
      if (correct) {
        const points = (level + 1) * 150;
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
    setIsPlaying(false);
    const accuracy = level > 0 ? (score / ((level + 1) * 150)) * 100 : 0;
    await endGame(score, Math.min(accuracy, 100), GAME_DURATION - timeLeft);
    navigation.navigate("Dashboard");
  };

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const isPattern = pattern.includes(i);
      const isSelected = userPattern.includes(i);
      const showActive = (phase === "show" && isPattern) || 
                          (phase === "recall" && isSelected);

      cells.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.cell,
            { width: 300 / gridSize - 4, height: 300 / gridSize - 4 },
            showActive && styles.cellActive,
          ]}
          onPress={() => handleCellPress(i)}
          disabled={phase !== "recall" || isSelected}
        />
      );
    }
    return cells;
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🔷</Text>
            <Text style={styles.startTitle}>Pattern Recall</Text>
            <Text style={styles.startDesc}>
              Remember the pattern and recreate it!{"\n\n"}
              Watch the tiles light up, then tap them in any order.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#00acc1", "#0097a7"]} style={styles.startGradient}>
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
      <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGameEnd}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pattern Recall</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level + 1}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{"❤️".repeat(lives)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{timeLeft}s</Text>
          </View>
        </View>

        {/* Phase Indicator */}
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseText}>
            {phase === "show" ? "👀 Memorize the pattern" : "🎯 Tap the pattern"}
          </Text>
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: 300, height: 300 }]}>
            {renderGrid()}
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {userPattern.length} / {pattern.length} tiles
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
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  startIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  startDesc: {
    fontSize: 16,
    color: "#8b9bb4",
    textAlign: "center",
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
    fontWeight: "700",
    color: "#fff",
  },
  backBtn: {
    padding: 12,
  },
  backText: {
    fontSize: 16,
    color: "#8b9bb4",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  backBtnText: {
    fontSize: 24,
    color: "#8b9bb4",
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  score: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4fc3f7",
    width: 80,
    textAlign: "right",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#8b9bb4",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  phaseContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  phaseText: {
    fontSize: 16,
    color: "#00acc1",
    fontWeight: "600",
  },
  gridContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  cell: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  cellActive: {
    backgroundColor: "#00acc1",
  },
  progressContainer: {
    padding: 20,
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    color: "#8b9bb4",
  },
});



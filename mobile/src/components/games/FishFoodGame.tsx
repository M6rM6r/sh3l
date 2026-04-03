import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameStore } from "../../hooks/useGame";

const { width, height } = Dimensions.get("window");
const GAME_DURATION = 45;

interface Fish {
  id: number;
  x: number;
  y: number;
  type: "target" | "distractor";
  color: string;
  size: number;
}

export default function FishFoodGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [fish, setFish] = useState<Fish[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lastFishTime, setLastFishTime] = useState<number>(0);
  
  const { endGame, updateScore } = useGameStore();

  const generateFish = useCallback((lvl: number): Fish => {
    const isTarget = Math.random() > 0.3; // 70% chance of target
    const colors = ["#ef5350", "#1e88e5", "#66bb6a", "#ffca28", "#ab47bc", "#fb8c00"];
    const targetColor = "#03a9f4"; // Light blue for target
    
    const numFish = Math.min(3 + Math.floor(lvl / 3), 8);
    const id = Date.now() + Math.random();
    
    return {
      id,
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height * 0.5) + 150,
      type: isTarget ? "target" : "distractor",
      color: isTarget ? targetColor : colors[Math.floor(Math.random() * colors.length)],
      size: 40 + Math.random() * 20,
    };
  }, []);

  const spawnFish = useCallback(() => {
    if (!isPlaying) return;
    
    const newFish = generateFish(level);
    setFish((prev) => [...prev.slice(-5), newFish]); // Keep last 6 fish
    setLastFishTime(Date.now());
    
    // Remove fish after time based on level
    const timeout = Math.max(1500 - level * 100, 600);
    setTimeout(() => {
      setFish((prev) => prev.filter((f) => f.id !== newFish.id));
    }, timeout);
  }, [isPlaying, level, generateFish]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setFish([]);
    setReactionTimes([]);
    setIsPlaying(true);
    setLastFishTime(Date.now());
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

  useEffect(() => {
    if (!isPlaying) return;
    
    const spawnInterval = Math.max(800 - level * 50, 400);
    const interval = setInterval(spawnFish, spawnInterval);
    
    return () => clearInterval(interval);
  }, [isPlaying, level, spawnFish]);

  const handleFishPress = (f: Fish) => {
    if (!isPlaying) return;

    const reactionTime = Date.now() - lastFishTime;
    setReactionTimes((prev) => [...prev, reactionTime]);

    if (f.type === "target") {
      const points = Math.max(100 - Math.floor(reactionTime / 10), 50);
      setScore((s) => s + points);
      updateScore(points);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Level up every 500 points
      if (score > 0 && score % 500 < 100) {
        setLevel((l) => Math.min(l + 1, 10));
      }
    } else {
      // Penalty for hitting distractor
      setScore((s) => Math.max(0, s - 50));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setFish((prev) => prev.filter((fish) => fish.id !== f.id));
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const avgReaction = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;
    const accuracy = Math.max(0, 100 - avgReaction / 10);
    await endGame(score, accuracy, GAME_DURATION);
    navigation.navigate("Dashboard");
  };

  const avgReactionTime = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🐟</Text>
            <Text style={styles.startTitle}>Fish Food</Text>
            <Text style={styles.startDesc}>
              Tap the light blue fish as fast as you can!{"\n\n"}
              Avoid the other colored fish. Speed is everything!
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#03a9f4", "#0288d1"]} style={styles.startGradient}>
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
          <Text style={styles.title}>Fish Food</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{timeLeft}s</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={styles.statValue}>{avgReactionTime}ms</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Tap the 🔵 blue fish!</Text>
        </View>

        {/* Fish */}
        {fish.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.fish,
              {
                left: f.x,
                top: f.y,
                width: f.size,
                height: f.size,
                backgroundColor: f.color,
              },
            ]}
            onPress={() => handleFishPress(f)}
            activeOpacity={0.8}
          >
            <Text style={styles.fishEmoji}>🐟</Text>
          </TouchableOpacity>
        ))}
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
    width: 100,
    textAlign: "right",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 10,
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
  instructionContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: "#03a9f4",
    fontWeight: "600",
  },
  fish: {
    position: "absolute",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fishEmoji: {
    fontSize: 24,
  },
});

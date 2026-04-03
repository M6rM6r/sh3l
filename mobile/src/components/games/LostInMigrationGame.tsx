import React, { useEffect, useState } from "react";
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
const GAME_DURATION = 60;

interface Bird {
  id: number;
  x: number;
  y: number;
  direction: "left" | "right";
  isTarget: boolean;
  color: string;
}

export default function LostInMigrationGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [targetDirection, setTargetDirection] = useState<"left" | "right">("left");
  const [round, setRound] = useState(0);
  
  const { endGame, updateScore } = useGameStore();

  const generateRound = (lvl: number) => {
    const numBirds = Math.min(5 + lvl, 15);
    const newBirds: Bird[] = [];
    const targetDir: "left" | "right" = Math.random() > 0.5 ? "left" : "right";
    
    // Determine target color (one unique color for target birds)
    const targetColor = "#ffeb3b"; // Yellow target
    const distractorColor = "#64b5f6"; // Blue distractors
    
    for (let i = 0; i < numBirds; i++) {
      const isTarget = Math.random() > 0.6; // 40% target birds
      newBirds.push({
        id: i,
        x: Math.random() * (width - 80) + 40,
        y: Math.random() * (height * 0.4) + 200,
        direction: Math.random() > 0.5 ? "left" : "right",
        isTarget,
        color: isTarget ? targetColor : distractorColor,
      });
    }
    
    setBirds(newBirds);
    setTargetDirection(targetDir);
    setRound((r) => r + 1);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setRound(0);
    setIsPlaying(true);
    generateRound(1);
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

  const handleBirdPress = (bird: Bird) => {
    if (!isPlaying) return;

    // Check if bird is flying in target direction
    const isCorrect = bird.direction === targetDirection;

    if (isCorrect) {
      const points = 100 + level * 20;
      setScore((s) => s + points);
      updateScore(points);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Remove bird
      setBirds((prev) => prev.filter((b) => b.id !== bird.id));
      
      // Check if all target birds cleared
      const remaining = birds.filter((b) => b.id !== bird.id && b.direction === targetDirection);
      if (remaining.length === 0) {
        setLevel((l) => l + 1);
        setTimeout(() => generateRound(level + 1), 500);
      }
    } else {
      // Penalty for wrong bird
      setScore((s) => Math.max(0, s - 50));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = round > 0 ? Math.min((score / (round * 100)) * 100, 100) : 0;
    await endGame(score, accuracy, GAME_DURATION);
    navigation.navigate("Dashboard");
  };

  const getDirectionArrow = (dir: "left" | "right") => {
    return dir === "left" ? "←" : "→";
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🐦</Text>
            <Text style={styles.startTitle}>Lost in Migration</Text>
            <Text style={styles.startDesc}>
              Find birds flying in the target direction!{"\n\n"}
              Watch the arrow, then tap all birds flying that way. Ignore the others!
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#64b5f6", "#1976d2"]} style={styles.startGradient}>
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
          <Text style={styles.title}>Lost in Migration</Text>
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
            <Text style={styles.statLabel}>Birds</Text>
            <Text style={styles.statValue}>{birds.length}</Text>
          </View>
        </View>

        {/* Target Direction */}
        <View style={styles.targetContainer}>
          <Text style={styles.targetLabel}>Tap birds flying:</Text>
          <Text style={styles.targetArrow}>{getDirectionArrow(targetDirection)}</Text>
        </View>

        {/* Birds */}
        <View style={styles.birdsContainer}>
          {birds.map((bird) => (
            <TouchableOpacity
              key={bird.id}
              style={[
                styles.bird,
                {
                  left: bird.x,
                  top: bird.y,
                  backgroundColor: bird.color,
                },
              ]}
              onPress={() => handleBirdPress(bird)}
              activeOpacity={0.8}
            >
              <Text style={styles.birdArrow}>{getDirectionArrow(bird.direction)}</Text>
            </TouchableOpacity>
          ))}
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
  targetContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255, 235, 59, 0.2)",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  targetLabel: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
  targetArrow: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ffeb3b",
  },
  birdsContainer: {
    flex: 1,
    position: "relative",
  },
  bird: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  birdArrow: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameStore } from "../../hooks/useGame";

const GAME_DURATION = 90;
const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon"];
const ROTATIONS = [0, 90, 180, 270];

interface ShapeItem {
  id: number;
  type: string;
  rotation: number;
  isTarget: boolean;
}

export default function RotationRecallGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<"memorize" | "rotate" | "recall">("memorize");
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [originalRotations, setOriginalRotations] = useState<Map<number, number>>(new Map());
  const [streak, setStreak] = useState(0);
  const [selectedShape, setSelectedShape] = useState<number | null>(null);
  
  const { endGame, updateScore } = useGameStore();

  const generateRound = (lvl: number) => {
    const numShapes = Math.min(3 + Math.floor(lvl / 2), 7);
    const newShapes: ShapeItem[] = [];
    const targetIndex = Math.floor(Math.random() * numShapes);
    
    for (let i = 0; i < numShapes; i++) {
      const rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
      newShapes.push({
        id: i,
        type: SHAPES[i % SHAPES.length],
        rotation,
        isTarget: i === targetIndex,
      });
    }
    
    setShapes(newShapes);
    
    // Store original rotations
    const originals = new Map<number, number>();
    newShapes.forEach((s) => originals.set(s.id, s.rotation));
    setOriginalRotations(originals);
    
    // Start phases
    setPhase("memorize");
    
    setTimeout(() => {
      setPhase("rotate");
      // Rotate shapes randomly
      setShapes((prev) =>
        prev.map((s) => ({
          ...s,
          rotation: ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)],
        }))
      );
      
      setTimeout(() => {
        setPhase("recall");
      }, 2000);
    }, 3000 + lvl * 200);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setStreak(0);
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

  const handleShapePress = (shape: ShapeItem) => {
    if (phase !== "recall") return;

    const originalRotation = originalRotations.get(shape.id);
    const isCorrect = shape.rotation === originalRotation;

    if (isCorrect && shape.isTarget) {
      const points = 150 + level * 30 + streak * 20;
      setScore((s) => s + points);
      updateScore(points);
      setStreak((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setLevel((l) => l + 1);
      setTimeout(() => generateRound(level + 1), 500);
    } else {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = level > 1 ? Math.min((score / ((level - 1) * 150)) * 100, 100) : 0;
    await endGame(score, accuracy, GAME_DURATION);
    navigation.navigate("Dashboard");
  };

  const getShapeIcon = (type: string) => {
    switch (type) {
      case "circle": return "●";
      case "square": return "■";
      case "triangle": return "▲";
      case "diamond": return "◆";
      case "star": return "★";
      case "hexagon": return "⬡";
      default: return "●";
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case "memorize": return "👀 Memorize the rotations";
      case "rotate": return "🔄 Shapes are rotating...";
      case "recall": return "🎯 Tap the ORIGINAL rotation";
      default: return "";
    }
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🔄</Text>
            <Text style={styles.startTitle}>Rotation Recall</Text>
            <Text style={styles.startDesc}>
              Remember how shapes are rotated!{"\n\n"}
              Watch the shapes, then identify which one is in its original position.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#8bc34a", "#689f38"]} style={styles.startGradient}>
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
          <Text style={styles.title}>Rotation Recall</Text>
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
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streak}x</Text>
          </View>
        </View>

        {/* Phase Indicator */}
        <View style={styles.phaseContainer}>
          <Text style={styles.phaseText}>{getPhaseText()}</Text>
        </View>

        {/* Shapes Grid */}
        <View style={styles.shapesContainer}>
          <View style={styles.shapesGrid}>
            {shapes.map((shape) => (
              <TouchableOpacity
                key={shape.id}
                style={[
                  styles.shape,
                  shape.isTarget && phase === "recall" && styles.shapeTarget,
                ]}
                onPress={() => handleShapePress(shape)}
                disabled={phase !== "recall"}
              >
                <Text
                  style={[
                    styles.shapeIcon,
                    { transform: [{ rotate: `${shape.rotation}deg` }] },
                  ]}
                >
                  {getShapeIcon(shape.type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    fontSize: 18,
    fontWeight: "700",
    color: "#8bc34a",
    backgroundColor: "rgba(139, 195, 74, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shapesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shapesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    maxWidth: 300,
  },
  shape: {
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeTarget: {
    backgroundColor: "rgba(139, 195, 74, 0.2)",
    borderWidth: 2,
    borderColor: "#8bc34a",
  },
  shapeIcon: {
    fontSize: 40,
    color: "#fff",
  },
});



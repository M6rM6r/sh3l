import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameStore } from "../../hooks/useGame";

const GAME_DURATION = 75;

const WORDS = [
  "BRAIN", "THINK", "LEARN", "SMART", "FOCUS", "MEMORY", "SKILL", "TRAIN",
  "COGNITIVE", "MENTAL", "PUZZLE", "LOGIC", "REASON", "SOLVE", "QUICK",
  "SHARP", "AGILE", "ADAPT", "GROW", "MIND", "SPEED", "POWER", "BOOST"
];

export default function WordBubbleGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [userInput, setUserInput] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  
  const { endGame, updateScore } = useGameStore();

  const shuffleWord = (word: string): string => {
    return word.split("").sort(() => Math.random() - 0.5).join("");
  };

  const generateRound = () => {
    // Select 3-5 words
    const numWords = Math.floor(Math.random() * 3) + 3;
    const selected: string[] = [];
    const used = new Set<string>();
    
    while (selected.length < numWords) {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      if (!used.has(word)) {
        used.add(word);
        selected.push(word);
      }
    }
    
    setAvailableWords(selected);
    
    // Combine all letters and shuffle
    const allLetters = selected.join("").split("").sort(() => Math.random() - 0.5).join("");
    setCurrentWord(allLetters);
    setUserInput("");
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setFoundWords([]);
    setStreak(0);
    setIsPlaying(true);
    generateRound();
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

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    
    const guess = userInput.toUpperCase().trim();
    
    if (availableWords.includes(guess) && !foundWords.includes(guess)) {
      const points = guess.length * 20 + streak * 10;
      setScore((s) => s + points);
      updateScore(points);
      setFoundWords((prev) => [...prev, guess]);
      setStreak((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Check if all words found
      if (foundWords.length + 1 >= availableWords.length) {
        setTimeout(() => generateRound(), 500);
      }
    } else if (foundWords.includes(guess)) {
      // Already found
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Wrong word
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    setUserInput("");
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = foundWords.length > 0 
      ? Math.min((foundWords.length / (foundWords.length + Math.max(0, 10 - foundWords.length))) * 100, 100)
      : 0;
    await endGame(score, accuracy, GAME_DURATION);
    navigation.navigate("Dashboard");
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>💬</Text>
            <Text style={styles.startTitle}>Word Bubble</Text>
            <Text style={styles.startDesc}>
              Find words from scrambled letters!{"\n\n"}
              Type words using the available letters. Longer words score more!
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#9c27b0", "#7b1fa2"]} style={styles.startGradient}>
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
          <Text style={styles.title}>Word Bubble</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{timeLeft}s</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Found</Text>
            <Text style={styles.statValue}>{foundWords.length}/{availableWords.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streak}x</Text>
          </View>
        </View>

        {/* Letters Display */}
        <View style={styles.lettersContainer}>
          <View style={styles.lettersBubble}>
            {currentWord.split("").map((letter, index) => (
              <View key={index} style={styles.letterTile}>
                <Text style={styles.letterText}>{letter}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
            onSubmitEditing={handleSubmit}
            placeholder="Type a word..."
            placeholderTextColor="#8b9bb4"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>✓</Text>
          </TouchableOpacity>
        </View>

        {/* Found Words */}
        <View style={styles.foundContainer}>
          <Text style={styles.foundTitle}>Found Words:</Text>
          <View style={styles.foundWords}>
            {foundWords.map((word, index) => (
              <View key={index} style={styles.foundWord}>
                <Text style={styles.foundWordText}>{word}</Text>
              </View>
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
  lettersContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  lettersBubble: {
    backgroundColor: "rgba(156, 39, 176, 0.2)",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    maxWidth: 320,
  },
  letterTile: {
    width: 40,
    height: 40,
    backgroundColor: "#9c27b0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  letterText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  submitBtn: {
    width: 50,
    height: 50,
    backgroundColor: "#9c27b0",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "700",
  },
  foundContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foundTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  foundWords: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  foundWord: {
    backgroundColor: "rgba(156, 39, 176, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  foundWordText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
});



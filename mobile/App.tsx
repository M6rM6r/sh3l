import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import GamesScreen from "./src/screens/GamesScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import GamePlayScreen from "./src/screens/GamePlayScreen";

// Games
import MemoryMatrixGame from "./src/components/games/MemoryMatrixGame";
import SpeedMatchGame from "./src/components/games/SpeedMatchGame";
import TrainOfThoughtGame from "./src/components/games/TrainOfThoughtGame";
import ColorMatchGame from "./src/components/games/ColorMatchGame";
import PatternRecallGame from "./src/components/games/PatternRecallGame";
import ChalkboardGame from "./src/components/games/ChalkboardGame";
import FishFoodGame from "./src/components/games/FishFoodGame";
import WordBubbleGame from "./src/components/games/WordBubbleGame";
import LostInMigrationGame from "./src/components/games/LostInMigrationGame";
import RotationRecallGame from "./src/components/games/RotationRecallGame";

// Hooks
import { useAuthStore } from "./src/hooks/useAuth";
import { useGameStore } from "./src/hooks/useGame";

// Services
import { NotificationService } from "./src/services/notifications";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a1628",
          borderTopColor: "#1a2744",
          height: 60,
        },
        tabBarActiveTintColor: "#4fc3f7",
        tabBarInactiveTintColor: "#8b9bb4",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎮</Text>,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="GamePlay" component={GamePlayScreen} />
      
      {/* Game Routes */}
      <Stack.Screen name="MemoryMatrix" component={MemoryMatrixGame} />
      <Stack.Screen name="SpeedMatch" component={SpeedMatchGame} />
      <Stack.Screen name="TrainOfThought" component={TrainOfThoughtGame} />
      <Stack.Screen name="ColorMatch" component={ColorMatchGame} />
      <Stack.Screen name="PatternRecall" component={PatternRecallGame} />
      <Stack.Screen name="Chalkboard" component={ChalkboardGame} />
      <Stack.Screen name="FishFood" component={FishFoodGame} />
      <Stack.Screen name="WordBubble" component={WordBubbleGame} />
      <Stack.Screen name="LostInMigration" component={LostInMigrationGame} />
      <Stack.Screen name="RotationRecall" component={RotationRecallGame} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { checkAuth } = useAuthStore();
  const { syncOfflineSessions } = useGameStore();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await NotificationService.initialize();
      await NotificationService.scheduleDailyReminder();
      await syncOfflineSessions();
      setIsLoading(false);
    };

    init();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <View style={{ flex: 1, backgroundColor: "#0a1628", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 48, fontWeight: "800", color: "#4fc3f7" }}>Lumosity</Text>
            <Text style={{ fontSize: 16, color: "#8b9bb4", marginTop: 8 }}>Training your brain...</Text>
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <MainStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

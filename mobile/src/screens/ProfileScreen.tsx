import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../hooks/useAuth';
import { useGameStore } from '../hooks/useGame';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const { userStats, streakData, syncPendingSessions, pendingSync } = useGameStore();
  const [syncing, setSyncing] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleSync = async () => {
    if (pendingSync.length === 0) {
      Alert.alert('Up to date', 'All data is synced');
      return;
    }
    setSyncing(true);
    await syncPendingSessions();
    setSyncing(false);
    Alert.alert('Sync Complete', `Synced ${pendingSync.length} sessions`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <Text style={styles.username}>{user?.username || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>⭐ Level {Math.floor(userStats.totalScore / 10000) + 1}</Text>
            </View>
          </View>

          {/* Stats Overview */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.gamesPlayed}</Text>
                <Text style={styles.statLabel}>Games</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streakData.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.totalScore.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSync}>
              <Text style={styles.menuIcon}>🔄</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Sync Data</Text>
                {pendingSync.length > 0 && (
                  <Text style={styles.pendingBadge}>{pendingSync.length} pending</Text>
                )}
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.menuIcon}>📈</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Analytics</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🏆</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Achievements</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Settings</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🔔</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🌙</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Dark Mode</Text>
              </View>
              <View style={styles.toggle}>
                <View style={styles.toggleActive} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>❓</Text>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flex: 1, padding: 20 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 50,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    color: '#ffc107',
    fontWeight: '700',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4fc3f7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8b9bb4',
  },
  menuSection: {
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b9bb4',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 39, 68, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  menuArrow: {
    fontSize: 18,
    color: '#8b9bb4',
  },
  pendingBadge: {
    backgroundColor: 'rgba(239, 83, 80, 0.2)',
    color: '#ef5350',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: 'rgba(79, 195, 247, 0.3)',
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  toggleActive: {
    width: 20,
    height: 20,
    backgroundColor: '#4fc3f7',
    borderRadius: 10,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 83, 80, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
  },
  logoutText: {
    color: '#ef5350',
    fontSize: 16,
    fontWeight: '600',
  },
});



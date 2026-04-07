import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { useGameStore } from '../hooks/useGame';

export default function AnalyticsScreen({ navigation }: any) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userStats } = useGameStore();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4fc3f7" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadAnalytics}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const cognitiveAreas = analytics?.cognitive_profile || userStats.cognitiveAreas;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0a1628', '#1a2744']} style={styles.gradient}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📊 Analytics</Text>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics?.total_games || 0}</Text>
                <Text style={styles.summaryLabel}>Total Games</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{analytics?.avg_accuracy?.toFixed(1) || '0'}%</Text>
                <Text style={styles.summaryLabel}>Avg Accuracy</Text>
              </View>
            </View>
          </View>

          {/* Cognitive Profile */}
          <Text style={styles.sectionTitle}>Cognitive Profile</Text>
          <View style={styles.cognitiveCard}>
            {Object.entries(cognitiveAreas).map(([area, score]: [string, any]) => (
              <View key={area} style={styles.cognitiveRow}>
                <Text style={styles.cognitiveName}>
                  {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <View style={styles.cognitiveBarContainer}>
                  <View style={styles.cognitiveBar}>
                    <View
                      style={[
                        styles.cognitiveFill,
                        { width: `${typeof score === 'number' ? score : 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.cognitiveScore}>
                    {typeof score === 'number' ? Math.round(score) : 0}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Weekly Activity */}
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <View style={styles.activityCard}>
            {analytics?.weekly_activity?.length > 0 ? (
              analytics.weekly_activity.map((day: any, index: number) => (
                <View key={index} style={styles.activityRow}>
                  <Text style={styles.activityDate}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <View style={styles.activityBar}>
                    <View
                      style={[
                        styles.activityFill,
                        { width: `${Math.min(100, (day.games / 10) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.activityValue}>{day.games} games</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No activity data yet</Text>
            )}
          </View>

          {/* Improvement Trend */}
          {analytics?.improvement_trend !== undefined && (
            <View style={styles.trendCard}>
              <Text style={styles.trendLabel}>Improvement Trend</Text>
              <Text
                style={[
                  styles.trendValue,
                  analytics.improvement_trend > 0 ? styles.trendPositive : styles.trendNegative,
                ]}
              >
                {analytics.improvement_trend > 0 ? '+' : ''}
                {analytics.improvement_trend.toFixed(1)}%
              </Text>
              <Text style={styles.trendDesc}>
                {analytics.improvement_trend > 0
                  ? 'You are improving! Keep it up!'
                  : 'Keep practicing to improve your scores'}
              </Text>
            </View>
          )}

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b9bb4',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 16,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#4fc3f7',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    color: '#4fc3f7',
    fontSize: 16,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4fc3f7',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#8b9bb4',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  cognitiveCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  cognitiveRow: {
    marginBottom: 16,
  },
  cognitiveName: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  cognitiveBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cognitiveBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginRight: 12,
  },
  cognitiveFill: {
    height: '100%',
    backgroundColor: '#4fc3f7',
    borderRadius: 4,
  },
  cognitiveScore: {
    width: 40,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'right',
  },
  activityCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityDate: {
    width: 50,
    fontSize: 13,
    color: '#8b9bb4',
  },
  activityBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  activityFill: {
    height: '100%',
    backgroundColor: '#4fc3f7',
    borderRadius: 4,
  },
  activityValue: {
    width: 80,
    fontSize: 13,
    color: '#fff',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8b9bb4',
    padding: 20,
  },
  trendCard: {
    backgroundColor: 'rgba(26, 39, 68, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 14,
    color: '#8b9bb4',
    marginBottom: 8,
  },
  trendValue: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  trendPositive: {
    color: '#66bb6a',
  },
  trendNegative: {
    color: '#ef5350',
  },
  trendDesc: {
    fontSize: 14,
    color: '#8b9bb4',
    textAlign: 'center',
  },
});



import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../providers/user_provider.dart';
import '../services/api_service.dart';

class ProgressScreen extends StatefulWidget {
  const ProgressScreen({super.key});

  @override
  State<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends State<ProgressScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = true;
  Map<String, dynamic>? _stats;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchStats();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchStats() async {
    final data = await ApiService.instance.fetchUserStats();
    if (mounted) setState(() { _stats = data; _loading = false; });
  }

  List<FlSpot> get _scoreTrend {
    final history = _stats?['score_history'] as List?;
    if (history != null && history.isNotEmpty) {
      return List.generate(history.length.clamp(0, 7), (i) {
        final v = (history[i] as num?)?.toDouble() ?? 0;
        return FlSpot(i.toDouble(), v.clamp(0, 100));
      });
    }
    return List.generate(7, (i) {
      final score = (50 + i * 7 + (i % 3 == 0 ? -5 : 3)).toDouble().clamp(0.0, 100.0);
      return FlSpot(i.toDouble(), score);
    });
  }

  Map<String, double> get _cognitiveAreas {
    final profile = _stats?['cognitive_profile'] as Map?;
    if (profile != null) {
      return {
        'Memory': (profile['memory'] as num?)?.toDouble() ?? 50,
        'Speed': (profile['speed'] as num?)?.toDouble() ?? 50,
        'Math': (profile['math'] as num?)?.toDouble() ?? 50,
        'Focus': (profile['attention'] as num?)?.toDouble() ?? 50,
        'Logic': (profile['logic'] as num?)?.toDouble() ?? 50,
      };
    }
    return {'Memory': 72, 'Speed': 65, 'Math': 80, 'Focus': 58, 'Logic': 74};
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    final spotData = _scoreTrend;
    final cognitiveAreas = _cognitiveAreas;

    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('My Progress', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white54),
            onPressed: () { setState(() => _loading = true); _fetchStats(); },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF4FC3F7),
          labelColor: const Color(0xFF4FC3F7),
          unselectedLabelColor: Colors.white38,
          tabs: const [Tab(text: 'Score Trend'), Tab(text: 'Cognitive Areas')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4FC3F7)))
          : TabBarView(
              controller: _tabController,
              children: [
                // Score trend line chart
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Last 7 Days', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 20),
                      SizedBox(
                        height: 240,
                        child: LineChart(
                          LineChartData(
                            gridData: FlGridData(
                              show: true,
                              getDrawingHorizontalLine: (_) => FlLine(color: Colors.white12, strokeWidth: 1),
                              getDrawingVerticalLine: (_) => FlLine(color: Colors.white12, strokeWidth: 1),
                            ),
                            titlesData: FlTitlesData(
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  getTitlesWidget: (value, _) {
                                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                    final idx = value.toInt();
                                    return idx >= 0 && idx < days.length
                                        ? Text(days[idx], style: const TextStyle(color: Colors.white38, fontSize: 10))
                                        : const SizedBox.shrink();
                                  },
                                ),
                              ),
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  getTitlesWidget: (v, _) => Text(v.toInt().toString(), style: const TextStyle(color: Colors.white38, fontSize: 10)),
                                  interval: 20,
                                ),
                              ),
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            ),
                            borderData: FlBorderData(show: false),
                            minY: 0,
                            maxY: 100,
                            lineBarsData: [
                              LineChartBarData(
                                spots: spotData,
                                isCurved: true,
                                color: const Color(0xFF4FC3F7),
                                barWidth: 3,
                                dotData: const FlDotData(show: true),
                                belowBarData: BarAreaData(
                                  show: true,
                                  color: const Color(0xFF4FC3F7).withOpacity(0.15),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _StatRow(label: 'Total Games Played', value: (_stats?['total_sessions'] as num?)?.toInt().toString() ?? user.totalGamesPlayed.toString()),
                      _StatRow(label: 'Current Streak', value: '${(_stats?['streak'] as num?)?.toInt() ?? user.currentStreak} days'),
                      _StatRow(label: 'Best Score', value: (_stats?['best_score'] as num?)?.toInt().toString() ?? user.bestScore.toString()),
                      _StatRow(label: 'Average Accuracy', value: '${((_stats?['avg_accuracy'] as num?)?.toDouble() ?? 0).toStringAsFixed(1)}%'),
                    ],
                  ),
                ),
                // Radar / cognitive areas
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      SizedBox(
                        height: 280,
                        child: RadarChart(
                          RadarChartData(
                            radarBackgroundColor: Colors.transparent,
                            borderData: FlBorderData(show: false),
                            radarBorderData: const BorderSide(color: Colors.white12),
                            gridBorderData: const BorderSide(color: Colors.white12, width: 1),
                            tickCount: 5,
                            ticksTextStyle: const TextStyle(color: Colors.white38, fontSize: 9),
                            tickBorderData: const BorderSide(color: Colors.transparent),
                            titleTextStyle: const TextStyle(color: Colors.white60, fontSize: 12, fontWeight: FontWeight.w700),
                            getTitle: (index, angle) {
                              final keys = cognitiveAreas.keys.toList();
                              return RadarChartTitle(text: index < keys.length ? keys[index] : '');
                            },
                            dataSets: [
                              RadarDataSet(
                                fillColor: const Color(0xFF4FC3F7).withOpacity(0.25),
                                borderColor: const Color(0xFF4FC3F7),
                                borderWidth: 2,
                                dataEntries: cognitiveAreas.values.map((v) => RadarEntry(value: v)).toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...cognitiveAreas.entries.map((e) => _AreaBar(name: e.key, score: e.value)),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  const _StatRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 14)),
          Text(value, style: const TextStyle(color: Color(0xFF4FC3F7), fontSize: 16, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _AreaBar extends StatelessWidget {
  final String name;
  final double score;
  const _AreaBar({required this.name, required this.score});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w700)),
              Text('${score.toInt()}%', style: const TextStyle(color: Color(0xFF4FC3F7), fontSize: 13, fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: score / 100,
            backgroundColor: Colors.white12,
            color: const Color(0xFF4FC3F7),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
        ],
      ),
    );
  }
}



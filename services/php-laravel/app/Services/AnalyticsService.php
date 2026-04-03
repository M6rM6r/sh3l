<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function generateDashboard(int $userId, string $period): array
    {
        $cacheKey = "analytics:dashboard:{$userId}:{$period}";
        
        if ($cached = Redis::get($cacheKey)) {
            return json_decode($cached, true);
        }

        $days = match($period) {
            '7d' => 7,
            '30d' => 30,
            '90d' => 90,
            '1y' => 365,
            default => 30,
        };

        $startDate = now()->subDays($days);

        // Fetch data from Python backend
        try {
            $response = Http::timeout(30)
                ->get(config('services.python_api.url') . "/api/users/{$userId}/stats");

            if (!$response->successful()) {
                return $this->getEmptyDashboard();
            }

            $data = $response->json();

            $dashboard = [
                'summary' => $this->calculateSummary($data, $startDate),
                'trends' => $this->calculateTrends($data, $days),
                'cognitive_areas' => $this->analyzeCognitiveAreas($data),
                'game_performance' => $this->analyzeGamePerformance($data),
                'activity_heatmap' => $this->generateActivityHeatmap($data, $days),
                'improvement_rate' => $this->calculateImprovementRate($data),
                'comparison' => $this->generateComparison($userId, $data),
            ];

            Redis::setex($cacheKey, 3600, json_encode($dashboard));

            return $dashboard;
        } catch (\Exception $e) {
            \Log::error('Analytics dashboard generation failed: ' . $e->getMessage());
            return $this->getEmptyDashboard();
        }
    }

    public function getLeaderboard(string $type, ?string $gameType, string $period): array
    {
        $cacheKey = "leaderboard:{$type}:{$gameType}:{$period}";
        
        if ($cached = Redis::get($cacheKey)) {
            return json_decode($cached, true);
        }

        try {
            $params = [
                'period' => $period,
                'type' => $type,
            ];
            
            if ($gameType) {
                $params['game_type'] = $gameType;
            }

            $response = Http::timeout(30)
                ->get(config('services.python_api.url') . '/api/leaderboard', $params);

            if (!$response->successful()) {
                return [];
            }

            $leaderboard = $response->json('leaderboard', []);
            
            Redis::setex($cacheKey, 300, json_encode($leaderboard)); // 5 min cache

            return $leaderboard;
        } catch (\Exception $e) {
            \Log::error('Leaderboard fetch failed: ' . $e->getMessage());
            return [];
        }
    }

    public function getUserRank(int $userId, string $type, string $period): ?array
    {
        try {
            $response = Http::timeout(30)
                ->get(config('services.python_api.url') . "/api/users/{$userId}/rank", [
                    'period' => $period,
                    'type' => $type,
                ]);

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            \Log::error('User rank fetch failed: ' . $e->getMessage());
        }

        return null;
    }

    private function calculateSummary(array $data, $startDate): array
    {
        $sessions = collect($data['recent_sessions'] ?? [])
            ->filter(fn($s) => strtotime($s['played_at']) >= $startDate->timestamp);

        if ($sessions->isEmpty()) {
            return [
                'total_games' => 0,
                'total_score' => 0,
                'average_score' => 0,
                'average_accuracy' => 0,
                'total_time_minutes' => 0,
                'streak_days' => 0,
            ];
        }

        $totalTime = $sessions->sum('duration_seconds') / 60;

        // Calculate streak
        $playDates = $sessions
            ->pluck('played_at')
            ->map(fn($date) => date('Y-m-d', strtotime($date)))
            ->unique()
            ->sort()
            ->values();

        $streak = 0;
        $currentDate = now();
        foreach ($playDates->reverse() as $date) {
            if ($date === $currentDate->format('Y-m-d')) {
                $streak++;
                $currentDate->subDay();
            } else {
                break;
            }
        }

        return [
            'total_games' => $sessions->count(),
            'total_score' => $sessions->sum('score'),
            'average_score' => round($sessions->avg('score'), 2),
            'average_accuracy' => round($sessions->avg('accuracy'), 2),
            'total_time_minutes' => round($totalTime, 2),
            'streak_days' => $streak,
        ];
    }

    private function calculateTrends(array $data, int $days): array
    {
        $sessions = collect($data['recent_sessions'] ?? []);
        
        $trends = [];
        $groupSize = max(1, (int)($days / 5)); // Group into ~5 periods

        $grouped = $sessions->groupBy(fn($s) => 
            floor((now()->timestamp - strtotime($s['played_at'])) / ($groupSize * 86400))
        );

        foreach ($grouped as $period => $periodSessions) {
            $trends[] = [
                'period' => $period,
                'average_score' => round($periodSessions->avg('score'), 2),
                'average_accuracy' => round($periodSessions->avg('accuracy'), 2),
                'games_played' => $periodSessions->count(),
            ];
        }

        return array_reverse($trends);
    }

    private function analyzeCognitiveAreas(array $data): array
    {
        $sessions = collect($data['recent_sessions'] ?? []);
        
        $areas = $sessions->groupBy('cognitive_area');

        return $areas->map(fn($areaSessions, $area) => [
            'area' => $area,
            'games_played' => $areaSessions->count(),
            'average_score' => round($areaSessions->avg('score'), 2),
            'average_accuracy' => round($areaSessions->avg('accuracy'), 2),
            'best_score' => $areaSessions->max('score'),
            'improvement' => $this->calculateAreaImprovement($areaSessions),
        ])->values()->all();
    }

    private function analyzeGamePerformance(array $data): array
    {
        $sessions = collect($data['recent_sessions'] ?? []);
        
        $byGame = $sessions->groupBy('game_type');

        return $byGame->map(fn($gameSessions, $gameType) => [
            'game_type' => $gameType,
            'games_played' => $gameSessions->count(),
            'average_score' => round($gameSessions->avg('score'), 2),
            'high_score' => $gameSessions->max('score'),
            'average_time' => round($gameSessions->avg('duration_seconds'), 2),
            'mastery_level' => $this->calculateMastery($gameSessions),
        ])->sortByDesc('games_played')->values()->take(5)->all();
    }

    private function generateActivityHeatmap(array $data, int $days): array
    {
        $sessions = collect($data['recent_sessions'] ?? []);
        
        $heatmap = [];
        $endDate = now();
        $startDate = now()->subDays($days);

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->format('Y-m-d');
            $daySessions = $sessions->filter(
                fn($s) => date('Y-m-d', strtotime($s['played_at'])) === $dateStr
            );

            $heatmap[] = [
                'date' => $dateStr,
                'games' => $daySessions->count(),
                'total_score' => $daySessions->sum('score'),
                'intensity' => min(4, ceil($daySessions->count() / 2)), // 0-4 scale
            ];
        }

        return $heatmap;
    }

    private function calculateImprovementRate(array $data): array
    {
        $sessions = collect($data['recent_sessions'] ?? [])
            ->sortBy('played_at')
            ->values();

        if ($sessions->count() < 10) {
            return [
                'rate' => null,
                'confidence' => 'low',
                'message' => 'Play more games to see improvement trends',
            ];
        }

        // Split into first and second half
        $half = (int)($sessions->count() / 2);
        $firstHalf = $sessions->slice(0, $half);
        $secondHalf = $sessions->slice($half);

        $firstAvg = $firstHalf->avg('score');
        $secondAvg = $secondHalf->avg('score');

        $improvement = (($secondAvg - $firstAvg) / max(1, $firstAvg)) * 100;

        return [
            'rate' => round($improvement, 2),
            'confidence' => $sessions->count() > 30 ? 'high' : 'medium',
            'direction' => $improvement > 5 ? 'improving' : 
                          ($improvement < -5 ? 'declining' : 'stable'),
            'first_half_average' => round($firstAvg, 2),
            'second_half_average' => round($secondAvg, 2),
        ];
    }

    private function generateComparison(int $userId, array $data): array
    {
        try {
            $response = Http::timeout(30)
                ->get(config('services.python_api.url') . "/api/users/{$userId}/percentile");

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            \Log::error('Percentile fetch failed: ' . $e->getMessage());
        }

        return [
            'global_percentile' => 50,
            'message' => 'Keep playing to see your ranking',
        ];
    }

    private function calculateAreaImprovement($sessions): string
    {
        if ($sessions->count() < 5) {
            return 'insufficient_data';
        }

        $half = (int)($sessions->count() / 2);
        $first = $sessions->slice(0, $half)->avg('score');
        $second = $sessions->slice($half)->avg('score');

        $diff = $second - $first;
        
        if ($diff > 10) return 'improving';
        if ($diff < -10) return 'declining';
        return 'stable';
    }

    private function calculateMastery($sessions): string
    {
        $count = $sessions->count();
        $avgScore = $sessions->avg('score');

        if ($count >= 50 && $avgScore >= 90) return 'master';
        if ($count >= 30 && $avgScore >= 80) return 'expert';
        if ($count >= 15 && $avgScore >= 70) return 'advanced';
        if ($count >= 5 && $avgScore >= 60) return 'intermediate';
        return 'beginner';
    }

    private function getEmptyDashboard(): array
    {
        return [
            'summary' => [
                'total_games' => 0,
                'total_score' => 0,
                'average_score' => 0,
                'average_accuracy' => 0,
                'total_time_minutes' => 0,
                'streak_days' => 0,
            ],
            'trends' => [],
            'cognitive_areas' => [],
            'game_performance' => [],
            'activity_heatmap' => [],
            'improvement_rate' => [
                'rate' => null,
                'confidence' => 'low',
                'message' => 'Start playing to see your analytics',
            ],
            'comparison' => [
                'global_percentile' => 50,
                'message' => 'Start playing to see your ranking',
            ],
        ];
    }
}

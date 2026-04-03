<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CognitiveAnalysisService
{
    private string $pythonApiUrl;
    private int $cacheTtl;

    public function __construct()
    {
        $this->pythonApiUrl = config('services.python_api.url', 'http://api:8000');
        $this->cacheTtl = 3600; // 1 hour
    }

    public function analyzeUserPerformance(int $userId): array
    {
        $cacheKey = "cognitive_analysis:{$userId}";
        
        if ($cached = Redis::get($cacheKey)) {
            return json_decode($cached, true);
        }

        try {
            $response = Http::timeout(30)
                ->get("{$this->pythonApiUrl}/api/users/{$userId}/stats");

            if ($response->successful()) {
                $data = $response->json();
                
                $analysis = [
                    'cognitive_profile' => $this->calculateCognitiveProfile($data),
                    'skill_gaps' => $this->identifySkillGaps($data),
                    'improvement_trends' => $this->analyzeTrends($data),
                    'recommendations' => $this->generateRecommendations($data),
                    'difficulty_adjustment' => $this->calculateDifficultyAdjustment($data),
                    'spaced_repetition_schedule' => $this->generateSpacedRepetition($userId, $data),
                ];

                Redis::setex($cacheKey, $this->cacheTtl, json_encode($analysis));
                
                return $analysis;
            }
        } catch (\Exception $e) {
            Log::error('Cognitive analysis failed: ' . $e->getMessage());
        }

        return $this->getDefaultAnalysis();
    }

    private function calculateCognitiveProfile(array $data): array
    {
        $areas = ['memory', 'attention', 'speed', 'flexibility', 'problem_solving'];
        $profile = [];

        foreach ($areas as $area) {
            $sessions = collect($data['recent_sessions'] ?? [])
                ->where('cognitive_area', $area);

            if ($sessions->isEmpty()) {
                $profile[$area] = ['level' => 1, 'score' => 50, 'trend' => 'neutral'];
                continue;
            }

            $avgScore = $sessions->avg('score');
            $avgAccuracy = $sessions->avg('accuracy');
            $trend = $this->calculateTrend($sessions);

            $profile[$area] = [
                'level' => $this->calculateLevel($avgScore),
                'score' => round($avgScore, 2),
                'accuracy' => round($avgAccuracy, 2),
                'trend' => $trend,
                'strength' => $avgScore > 80 ? 'high' : ($avgScore > 50 ? 'medium' : 'low'),
            ];
        }

        return $profile;
    }

    private function identifySkillGaps(array $data): array
    {
        $profile = $data['cognitive_profile'] ?? [];
        $gaps = [];

        foreach ($profile as $area => $metrics) {
            if (($metrics['score'] ?? 0) < 60) {
                $gaps[] = [
                    'area' => $area,
                    'severity' => $metrics['score'] < 40 ? 'critical' : 'moderate',
                    'recommended_games' => $this->getGamesForArea($area),
                    'priority' => 100 - ($metrics['score'] ?? 0),
                ];
            }
        }

        return collect($gaps)->sortByDesc('priority')->values()->all();
    }

    private function analyzeTrends(array $data): array
    {
        $sessions = collect($data['recent_sessions'] ?? [])
            ->sortBy('played_at')
            ->groupBy('cognitive_area');

        $trends = [];

        foreach ($sessions as $area => $areaSessions) {
            if ($areaSessions->count() < 3) {
                continue;
            }

            $scores = $areaSessions->pluck('score')->toArray();
            $trend = $this->calculateLinearRegression($scores);

            $trends[$area] = [
                'direction' => $trend['slope'] > 0.5 ? 'improving' : 
                              ($trend['slope'] < -0.5 ? 'declining' : 'stable'),
                'confidence' => $trend['r_squared'],
                'slope' => round($trend['slope'], 3),
            ];
        }

        return $trends;
    }

    private function calculateDifficultyAdjustment(array $data): array
    {
        $adjustments = [];
        $recentSessions = collect($data['recent_sessions'] ?? [])
            ->groupBy('game_type');

        foreach ($recentSessions as $gameType => $sessions) {
            if ($sessions->count() < 3) {
                continue;
            }

            $avgScore = $sessions->avg('score');
            $avgAccuracy = $sessions->avg('accuracy');
            $currentDifficulty = $sessions->last()['difficulty_level'] ?? 1;

            // Adaptive difficulty algorithm
            if ($avgScore > 85 && $avgAccuracy > 90) {
                $newDifficulty = min($currentDifficulty + 1, 10);
                $reason = 'excellent_performance';
            } elseif ($avgScore < 40 || $avgAccuracy < 60) {
                $newDifficulty = max($currentDifficulty - 1, 1);
                $reason = 'poor_performance';
            } else {
                $newDifficulty = $currentDifficulty;
                $reason = 'stable_performance';
            }

            $adjustments[$gameType] = [
                'current' => $currentDifficulty,
                'recommended' => $newDifficulty,
                'reason' => $reason,
                'confidence' => min($sessions->count() / 10, 1.0),
            ];
        }

        return $adjustments;
    }

    private function generateSpacedRepetition(int $userId, array $data): array
    {
        $schedule = [];
        $weakAreas = $this->identifySkillGaps($data);
        
        // Spaced repetition intervals (in hours)
        $intervals = [1, 3, 8, 24, 72, 168, 336];
        
        foreach ($weakAreas as $gap) {
            $area = $gap['area'];
            $games = $gap['recommended_games'];
            
            foreach ($intervals as $i => $hours) {
                $schedule[] = [
                    'area' => $area,
                    'game_type' => $games[array_rand($games)] ?? 'memory_match',
                    'due_at' => now()->addHours($hours)->toIso8601String(),
                    'priority' => $gap['priority'] * (1 - ($i * 0.1)),
                    'repetition_number' => $i + 1,
                ];
            }
        }

        return collect($schedule)
            ->sortBy('due_at')
            ->groupBy('due_at')
            ->map(fn($items) => $items->sortByDesc('priority')->first())
            ->values()
            ->take(20)
            ->all();
    }

    private function generateRecommendations(array $data): array
    {
        $recommendations = [];
        $gaps = $this->identifySkillGaps($data);
        $trends = $this->analyzeTrends($data);

        foreach ($gaps as $gap) {
            $recommendations[] = [
                'type' => 'skill_improvement',
                'area' => $gap['area'],
                'message' => "Focus on {$gap['area']} exercises to strengthen this cognitive area",
                'priority' => $gap['priority'],
                'games' => $gap['recommended_games'],
            ];
        }

        foreach ($trends as $area => $trend) {
            if ($trend['direction'] === 'declining') {
                $recommendations[] = [
                    'type' => 'trend_alert',
                    'area' => $area,
                    'message' => "Your {$area} skills are declining. Consider daily practice.",
                    'priority' => 85,
                    'games' => $this->getGamesForArea($area),
                ];
            }
        }

        return collect($recommendations)
            ->sortByDesc('priority')
            ->take(5)
            ->values()
            ->all();
    }

    private function calculateTrend($sessions): string
    {
        if ($sessions->count() < 2) {
            return 'neutral';
        }

        $scores = $sessions->pluck('score')->toArray();
        $firstHalf = array_slice($scores, 0, count($scores) / 2);
        $secondHalf = array_slice($scores, count($scores) / 2);

        $firstAvg = array_sum($firstHalf) / count($firstHalf);
        $secondAvg = array_sum($secondHalf) / count($secondHalf);

        $diff = $secondAvg - $firstAvg;

        if ($diff > 10) return 'improving';
        if ($diff < -10) return 'declining';
        return 'stable';
    }

    private function calculateLevel(float $score): int
    {
        return min(10, max(1, (int)($score / 10)));
    }

    private function getGamesForArea(string $area): array
    {
        $mapping = [
            'memory' => ['memory_match', 'pattern_recall', 'sequence_memory'],
            'attention' => ['focus_challenge', 'distraction_filter', 'sustained_attention'],
            'speed' => ['speed_match', 'rapid_math', 'quick_reflexes'],
            'flexibility' => ['task_switch', 'color_word', 'cognitive_flexibility'],
            'problem_solving' => ['logic_puzzle', 'math_challenge', 'pattern_completion'],
        ];

        return $mapping[$area] ?? ['memory_match'];
    }

    private function calculateLinearRegression(array $values): array
    {
        $n = count($values);
        if ($n < 2) {
            return ['slope' => 0, 'r_squared' => 0];
        }

        $x = range(0, $n - 1);
        $meanX = array_sum($x) / $n;
        $meanY = array_sum($values) / $n;

        $numerator = 0;
        $denominatorX = 0;
        $denominatorY = 0;

        for ($i = 0; $i < $n; $i++) {
            $diffX = $x[$i] - $meanX;
            $diffY = $values[$i] - $meanY;
            $numerator += $diffX * $diffY;
            $denominatorX += $diffX * $diffX;
            $denominatorY += $diffY * $diffY;
        }

        $slope = $denominatorX != 0 ? $numerator / $denominatorX : 0;
        $r = $denominatorX != 0 && $denominatorY != 0 ? 
             $numerator / sqrt($denominatorX * $denominatorY) : 0;

        return [
            'slope' => $slope,
            'r_squared' => $r * $r,
        ];
    }

    private function getDefaultAnalysis(): array
    {
        return [
            'cognitive_profile' => [],
            'skill_gaps' => [],
            'improvement_trends' => [],
            'recommendations' => [],
            'difficulty_adjustment' => [],
            'spaced_repetition_schedule' => [],
        ];
    }
}

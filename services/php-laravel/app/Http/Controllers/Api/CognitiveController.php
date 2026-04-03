<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CognitiveAnalysisService;
use App\Services\MultiplayerService;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CognitiveController extends Controller
{
    private CognitiveAnalysisService $analysisService;
    private MultiplayerService $multiplayerService;
    private AnalyticsService $analyticsService;

    public function __construct(
        CognitiveAnalysisService $analysisService,
        MultiplayerService $multiplayerService,
        AnalyticsService $analyticsService
    ) {
        $this->analysisService = $analysisService;
        $this->multiplayerService = $multiplayerService;
        $this->analyticsService = $analyticsService;
    }

    public function getProfile(Request $request, int $userId)
    {
        $analysis = $this->analysisService->analyzeUserPerformance($userId);
        
        return response()->json([
            'user_id' => $userId,
            'analysis' => $analysis,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function getRecommendations(Request $request, int $userId)
    {
        $analysis = $this->analysisService->analyzeUserPerformance($userId);
        
        return response()->json([
            'recommendations' => $analysis['recommendations'] ?? [],
            'spaced_repetition' => $analysis['spaced_repetition_schedule'] ?? [],
            'difficulty_adjustments' => $analysis['difficulty_adjustment'] ?? [],
        ]);
    }

    public function getSkillGaps(Request $request, int $userId)
    {
        $analysis = $this->analysisService->analyzeUserPerformance($userId);
        
        return response()->json([
            'skill_gaps' => $analysis['skill_gaps'] ?? [],
            'priority_areas' => collect($analysis['skill_gaps'] ?? [])
                ->where('severity', 'critical')
                ->pluck('area')
                ->toArray(),
        ]);
    }

    public function createMultiplayerRoom(Request $request)
    {
        $validated = $request->validate([
            'game_type' => 'required|string',
            'max_players' => 'integer|min:2|max:8',
            'is_private' => 'boolean',
        ]);

        $room = $this->multiplayerService->createRoom(
            $request->user()->id,
            $validated['game_type'],
            $validated['max_players'] ?? 4,
            $validated['is_private'] ?? false
        );

        return response()->json([
            'room_id' => $room['id'],
            'join_code' => $room['join_code'],
            'websocket_url' => config('app.websocket_url') . '/rooms/' . $room['id'],
        ]);
    }

    public function joinMultiplayerRoom(Request $request, string $joinCode)
    {
        try {
            $room = $this->multiplayerService->joinRoom(
                $request->user()->id,
                $joinCode
            );

            return response()->json([
                'room_id' => $room['id'],
                'players' => $room['players'],
                'game_type' => $room['game_type'],
                'websocket_url' => config('app.websocket_url') . '/rooms/' . $room['id'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function getAnalyticsDashboard(Request $request, int $userId)
    {
        $period = $request->get('period', '30d');
        
        $dashboard = $this->analyticsService->generateDashboard($userId, $period);
        
        return response()->json($dashboard);
    }

    public function getLeaderboard(Request $request)
    {
        $type = $request->get('type', 'global');
        $gameType = $request->get('game_type');
        $period = $request->get('period', 'weekly');

        $leaderboard = $this->analyticsService->getLeaderboard($type, $gameType, $period);

        return response()->json([
            'leaderboard' => $leaderboard,
            'user_rank' => $request->user() ? 
                $this->analyticsService->getUserRank($request->user()->id, $type, $period) : null,
        ]);
    }

    public function submitGameSession(Request $request)
    {
        $validated = $request->validate([
            'game_type' => 'required|string',
            'score' => 'required|integer',
            'accuracy' => 'required|numeric|between:0,100',
            'duration_seconds' => 'required|integer',
            'difficulty_level' => 'required|integer|between:1,10',
            'cognitive_area' => 'required|string',
            'metadata' => 'array',
        ]);

        // Send to Python backend for processing
        try {
            $response = \Http::timeout(10)
                ->post(config('services.python_api.url') . '/api/game-sessions', [
                    ...$validated,
                    'user_id' => $request->user()->id,
                ]);

            if ($response->successful()) {
                // Clear cache to force recalculation
                Redis::del("cognitive_analysis:{$request->user()->id}");
                Redis::del("recommendations:{$request->user()->id}");

                return response()->json([
                    'success' => true,
                    'session_id' => $response->json('id'),
                    'achievements_unlocked' => $response->json('achievements', []),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to submit game session: ' . $e->getMessage());
        }

        return response()->json([
            'error' => 'Failed to process game session',
        ], 500);
    }

    public function getSpacedRepetitionSchedule(Request $request, int $userId)
    {
        $analysis = $this->analysisService->analyzeUserPerformance($userId);
        $schedule = $analysis['spaced_repetition_schedule'] ?? [];

        // Get upcoming sessions
        $upcoming = collect($schedule)
            ->where('due_at', '>=', now()->toIso8601String())
            ->where('due_at', '<=', now()->addDays(7)->toIso8601String())
            ->sortBy('due_at')
            ->values();

        return response()->json([
            'schedule' => $upcoming,
            'total_pending' => count($schedule),
            'next_session' => $upcoming->first(),
        ]);
    }
}

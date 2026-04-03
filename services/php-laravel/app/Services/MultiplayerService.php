<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class MultiplayerService
{
    private string $redisPrefix = 'multiplayer:';

    public function createRoom(int $hostId, string $gameType, int $maxPlayers, bool $isPrivate): array
    {
        $roomId = uniqid('room_', true);
        $joinCode = $isPrivate ? $this->generateJoinCode() : null;

        $room = [
            'id' => $roomId,
            'host_id' => $hostId,
            'game_type' => $gameType,
            'max_players' => $maxPlayers,
            'is_private' => $isPrivate,
            'join_code' => $joinCode,
            'status' => 'waiting',
            'players' => [
                [
                    'id' => $hostId,
                    'is_host' => true,
                    'is_ready' => false,
                    'joined_at' => now()->toIso8601String(),
                ]
            ],
            'created_at' => now()->toIso8601String(),
            'started_at' => null,
            'ended_at' => null,
        ];

        Redis::setex(
            $this->redisPrefix . 'room:' . $roomId,
            3600, // 1 hour TTL
            json_encode($room)
        );

        if ($joinCode) {
            Redis::setex(
                $this->redisPrefix . 'join_code:' . $joinCode,
                3600,
                $roomId
            );
        }

        // Add to active rooms list
        Redis::sadd($this->redisPrefix . 'active_rooms', $roomId);

        return $room;
    }

    public function joinRoom(int $userId, string $joinCode): array
    {
        $roomId = Redis::get($this->redisPrefix . 'join_code:' . $joinCode);
        
        if (!$roomId) {
            throw new \Exception('Invalid join code');
        }

        return $this->addPlayerToRoom($userId, $roomId);
    }

    public function joinRoomById(int $userId, string $roomId): array
    {
        return $this->addPlayerToRoom($userId, $roomId);
    }

    private function addPlayerToRoom(int $userId, string $roomId): array
    {
        $roomKey = $this->redisPrefix . 'room:' . $roomId;
        $roomJson = Redis::get($roomKey);

        if (!$roomJson) {
            throw new \Exception('Room not found');
        }

        $room = json_decode($roomJson, true);

        if ($room['status'] !== 'waiting') {
            throw new \Exception('Game already in progress');
        }

        if (count($room['players']) >= $room['max_players']) {
            throw new \Exception('Room is full');
        }

        // Check if player already in room
        foreach ($room['players'] as $player) {
            if ($player['id'] === $userId) {
                throw new \Exception('Already in room');
            }
        }

        $room['players'][] = [
            'id' => $userId,
            'is_host' => false,
            'is_ready' => false,
            'joined_at' => now()->toIso8601String(),
        ];

        Redis::setex($roomKey, 3600, json_encode($room));

        // Notify other players via WebSocket
        $this->broadcastToRoom($roomId, [
            'type' => 'player_joined',
            'player_id' => $userId,
            'total_players' => count($room['players']),
        ]);

        return $room;
    }

    public function setPlayerReady(string $roomId, int $userId, bool $isReady): array
    {
        $roomKey = $this->redisPrefix . 'room:' . $roomId;
        $roomJson = Redis::get($roomKey);

        if (!$roomJson) {
            throw new \Exception('Room not found');
        }

        $room = json_decode($roomJson, true);

        foreach ($room['players'] as &$player) {
            if ($player['id'] === $userId) {
                $player['is_ready'] = $isReady;
                break;
            }
        }

        Redis::setex($roomKey, 3600, json_encode($room));

        $this->broadcastToRoom($roomId, [
            'type' => 'player_ready',
            'player_id' => $userId,
            'is_ready' => $isReady,
        ]);

        // Check if all players ready and auto-start
        $allReady = count($room['players']) > 1 && 
                    collect($room['players'])->every(fn($p) => $p['is_ready']);

        if ($allReady && $room['status'] === 'waiting') {
            $this->startGame($roomId);
        }

        return $room;
    }

    public function startGame(string $roomId): array
    {
        $roomKey = $this->redisPrefix . 'room:' . $roomId;
        $roomJson = Redis::get($roomKey);

        if (!$roomJson) {
            throw new \Exception('Room not found');
        }

        $room = json_decode($roomJson, true);

        if ($room['status'] !== 'waiting') {
            throw new \Exception('Game already started');
        }

        if (count($room['players']) < 2) {
            throw new \Exception('Need at least 2 players');
        }

        $room['status'] = 'playing';
        $room['started_at'] = now()->toIso8601String();

        // Generate game session configuration
        $room['game_config'] = $this->generateGameConfig($room['game_type']);

        Redis::setex($roomKey, 3600, json_encode($room));

        // Initialize game state
        $initialState = $this->initializeGameState($room);
        Redis::setex(
            $this->redisPrefix . 'game_state:' . $roomId,
            3600,
            json_encode($initialState)
        );

        $this->broadcastToRoom($roomId, [
            'type' => 'game_started',
            'game_config' => $room['game_config'],
            'start_time' => $room['started_at'],
        ]);

        return $room;
    }

    public function submitScore(string $roomId, int $userId, array $scoreData): array
    {
        $stateKey = $this->redisPrefix . 'game_state:' . $roomId;
        $stateJson = Redis::get($stateKey);

        if (!$stateJson) {
            throw new \Exception('Game not found');
        }

        $state = json_decode($stateJson, true);

        $state['scores'][$userId] = [
            'score' => $scoreData['score'],
            'accuracy' => $scoreData['accuracy'],
            'time_ms' => $scoreData['time_ms'],
            'submitted_at' => now()->toIso8601String(),
        ];

        Redis::setex($stateKey, 3600, json_encode($state));

        $this->broadcastToRoom($roomId, [
            'type' => 'score_update',
            'player_id' => $userId,
            'score' => $scoreData['score'],
        ]);

        // Check if all players finished
        if (count($state['scores']) === count($state['players'])) {
            $this->endGame($roomId);
        }

        return $state;
    }

    public function endGame(string $roomId): array
    {
        $roomKey = $this->redisPrefix . 'room:' . $roomId;
        $stateKey = $this->redisPrefix . 'game_state:' . $roomId;

        $roomJson = Redis::get($roomKey);
        $stateJson = Redis::get($stateKey);

        if (!$roomJson || !$stateJson) {
            throw new \Exception('Game not found');
        }

        $room = json_decode($roomJson, true);
        $state = json_decode($stateJson, true);

        $room['status'] = 'finished';
        $room['ended_at'] = now()->toIso8601String();

        // Calculate rankings
        $rankings = collect($state['scores'])
            ->sortByDesc('score')
            ->map(fn($score, $userId) => [
                'player_id' => (int) $userId,
                'score' => $score['score'],
                'accuracy' => $score['accuracy'],
                'time_ms' => $score['time_ms'],
            ])
            ->values()
            ->all();

        $results = [
            'rankings' => $rankings,
            'winner' => $rankings[0] ?? null,
        ];

        $room['results'] = $results;

        Redis::setex($roomKey, 3600, json_encode($room));

        $this->broadcastToRoom($roomId, [
            'type' => 'game_ended',
            'results' => $results,
        ]);

        // Persist to database
        $this->persistGameResults($room, $state);

        return $results;
    }

    public function leaveRoom(string $roomId, int $userId): void
    {
        $roomKey = $this->redisPrefix . 'room:' . $roomId;
        $roomJson = Redis::get($roomKey);

        if (!$roomJson) {
            return;
        }

        $room = json_decode($roomJson, true);

        $room['players'] = collect($room['players'])
            ->reject(fn($p) => $p['id'] === $userId)
            ->values()
            ->all();

        if (count($room['players']) === 0) {
            // Delete room if empty
            Redis::del($roomKey);
            Redis::srem($this->redisPrefix . 'active_rooms', $roomId);
            if ($room['join_code']) {
                Redis::del($this->redisPrefix . 'join_code:' . $room['join_code']);
            }
        } else {
            // Transfer host if host left
            if ($room['host_id'] === $userId && count($room['players']) > 0) {
                $room['host_id'] = $room['players'][0]['id'];
                $room['players'][0]['is_host'] = true;
            }

            Redis::setex($roomKey, 3600, json_encode($room));

            $this->broadcastToRoom($roomId, [
                'type' => 'player_left',
                'player_id' => $userId,
            ]);
        }
    }

    public function getActiveRooms(): array
    {
        $roomIds = Redis::smembers($this->redisPrefix . 'active_rooms');
        $rooms = [];

        foreach ($roomIds as $roomId) {
            $roomJson = Redis::get($this->redisPrefix . 'room:' . $roomId);
            if ($roomJson) {
                $room = json_decode($roomJson, true);
                if ($room['status'] === 'waiting' && !$room['is_private']) {
                    $rooms[] = [
                        'id' => $room['id'],
                        'game_type' => $room['game_type'],
                        'players' => count($room['players']),
                        'max_players' => $room['max_players'],
                        'host_id' => $room['host_id'],
                    ];
                }
            }
        }

        return $rooms;
    }

    private function generateJoinCode(): string
    {
        return strtoupper(substr(uniqid(), -6));
    }

    private function generateGameConfig(string $gameType): array
    {
        $configs = [
            'memory_match' => [
                'grid_size' => [4, 4],
                'time_limit' => 60,
                'max_moves' => 20,
            ],
            'speed_match' => [
                'rounds' => 10,
                'time_per_round' => 3,
            ],
            'math_challenge' => [
                'problems' => 15,
                'time_limit' => 120,
                'difficulty' => 'adaptive',
            ],
        ];

        return $configs[$gameType] ?? ['time_limit' => 60];
    }

    private function initializeGameState(array $room): array
    {
        return [
            'room_id' => $room['id'],
            'game_type' => $room['game_type'],
            'players' => collect($room['players'])->pluck('id')->all(),
            'scores' => [],
            'started_at' => now()->toIso8601String(),
            'game_data' => $this->generateGameData($room['game_type']),
        ];
    }

    private function generateGameData(string $gameType): array
    {
        switch ($gameType) {
            case 'memory_match':
                $cards = array_merge(range(1, 8), range(1, 8));
                shuffle($cards);
                return ['cards' => $cards];

            case 'math_challenge':
                $problems = [];
                for ($i = 0; $i < 15; $i++) {
                    $a = rand(1, 20);
                    $b = rand(1, 20);
                    $op = rand(0, 1) ? '+' : '-';
                    $problems[] = [
                        'a' => $a,
                        'b' => $b,
                        'operator' => $op,
                        'answer' => $op === '+' ? $a + $b : $a - $b,
                    ];
                }
                return ['problems' => $problems];

            default:
                return [];
        }
    }

    private function broadcastToRoom(string $roomId, array $message): void
    {
        // This will be handled by WebSocket server
        Redis::publish('room:' . $roomId, json_encode($message));
    }

    private function persistGameResults(array $room, array $state): void
    {
        // Queue for background processing
        \Http::async()->post(config('services.python_api.url') . '/api/multiplayer/results', [
            'room_id' => $room['id'],
            'game_type' => $room['game_type'],
            'players' => $room['players'],
            'scores' => $state['scores'],
            'started_at' => $room['started_at'],
            'ended_at' => $room['ended_at'],
        ]);
    }
}

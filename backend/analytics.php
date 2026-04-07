<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';

class AnalyticsAPI {
    private $conn;

    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($this->conn->connect_error) {
            die(json_encode(['error' => 'Database connection failed']));
        }
    }

    public function getUserAnalytics($userId) {
        $stmt = $this->conn->prepare("
            SELECT area, AVG(score) as avg_score, COUNT(*) as games_played
            FROM cognitive_scores
            WHERE user_id = ?
            GROUP BY area
            ORDER BY avg_score DESC
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        $analytics = [];
        while ($row = $result->fetch_assoc()) {
            $analytics[] = $row;
        }

        return $analytics;
    }

    public function getGlobalStats() {
        $result = $this->conn->query("
            SELECT
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) as total_games,
                AVG(score) as avg_score
            FROM cognitive_scores
        ");

        return $result->fetch_assoc();
    }

    /**
     * Engagement funnel: visit → game_start → game_complete → return_visit
     * Tracks conversion rates between each stage per day.
     */
    public function getEngagementFunnel(int $days = 30): array {
        $stmt = $this->conn->prepare("
            SELECT
                DATE(created_at) as day,
                COUNT(DISTINCT CASE WHEN event = 'visit' THEN user_id END) as visits,
                COUNT(DISTINCT CASE WHEN event = 'game_start' THEN user_id END) as starts,
                COUNT(DISTINCT CASE WHEN event = 'game_complete' THEN user_id END) as completions,
                COUNT(DISTINCT CASE WHEN event = 'return_visit' THEN user_id END) as returns
            FROM engagement_events
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY day DESC
        ");
        $stmt->bind_param("i", $days);
        $stmt->execute();
        $result = $stmt->get_result();

        $funnel = [];
        while ($row = $result->fetch_assoc()) {
            $row['start_rate'] = $row['visits'] > 0
                ? round($row['starts'] / $row['visits'] * 100, 1) : 0;
            $row['completion_rate'] = $row['starts'] > 0
                ? round($row['completions'] / $row['starts'] * 100, 1) : 0;
            $row['retention_rate'] = $row['visits'] > 0
                ? round($row['returns'] / $row['visits'] * 100, 1) : 0;
            $funnel[] = $row;
        }

        return $funnel;
    }

    /**
     * Session heatmap: hourly activity distribution (0-23h × 7 days).
     */
    public function getSessionHeatmap(int $userId = null): array {
        $where = $userId ? "WHERE user_id = ?" : "";
        $sql = "
            SELECT
                DAYOFWEEK(created_at) as dow,
                HOUR(created_at) as hour,
                COUNT(*) as sessions
            FROM cognitive_scores
            $where
            GROUP BY DAYOFWEEK(created_at), HOUR(created_at)
        ";
        $stmt = $this->conn->prepare($sql);
        if ($userId) {
            $stmt->bind_param("i", $userId);
        }
        $stmt->execute();
        $result = $stmt->get_result();

        // Initialize 7×24 grid
        $heatmap = array_fill(0, 7, array_fill(0, 24, 0));
        while ($row = $result->fetch_assoc()) {
            $heatmap[$row['dow'] - 1][$row['hour']] = (int)$row['sessions'];
        }

        return $heatmap;
    }

    /**
     * Cognitive improvement velocity: score delta per area over rolling window.
     */
    public function getImprovementVelocity(int $userId, int $windowDays = 14): array {
        $stmt = $this->conn->prepare("
            SELECT area,
                AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN score END) as recent_avg,
                AVG(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
                     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN score END) as previous_avg,
                COUNT(*) as total_sessions
            FROM cognitive_scores
            WHERE user_id = ?
            GROUP BY area
        ");
        $doubleWindow = $windowDays * 2;
        $stmt->bind_param("iiii", $windowDays, $windowDays, $doubleWindow, $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        $velocity = [];
        while ($row = $result->fetch_assoc()) {
            $recent = (float)($row['recent_avg'] ?? 0);
            $previous = (float)($row['previous_avg'] ?? 0);
            $delta = $previous > 0 ? round(($recent - $previous) / $previous * 100, 1) : 0;
            $velocity[] = [
                'area' => $row['area'],
                'recent_avg' => round($recent, 1),
                'previous_avg' => round($previous, 1),
                'delta_pct' => $delta,
                'direction' => $delta > 2 ? 'improving' : ($delta < -2 ? 'declining' : 'stable'),
                'total_sessions' => (int)$row['total_sessions'],
            ];
        }

        usort($velocity, fn($a, $b) => $b['delta_pct'] <=> $a['delta_pct']);
        return $velocity;
    }

    /**
     * Record an engagement event (visit, game_start, game_complete, return_visit).
     */
    public function recordEvent(string $event, int $userId = null, array $meta = []): bool {
        $allowed = ['visit', 'game_start', 'game_complete', 'return_visit'];
        if (!in_array($event, $allowed, true)) {
            return false;
        }

        $metaJson = !empty($meta) ? json_encode($meta) : null;
        $stmt = $this->conn->prepare("
            INSERT INTO engagement_events (event, user_id, meta, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->bind_param("sis", $event, $userId, $metaJson);
        return $stmt->execute();
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$api = new AnalyticsAPI();

switch ($method) {
    case 'GET':
        if (isset($_GET['user_id'])) {
            $userId = intval($_GET['user_id']);
            echo json_encode($api->getUserAnalytics($userId));
        } elseif (isset($_GET['global'])) {
            echo json_encode($api->getGlobalStats());
        } elseif (isset($_GET['funnel'])) {
            $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
            echo json_encode($api->getEngagementFunnel($days));
        } elseif (isset($_GET['heatmap'])) {
            $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
            echo json_encode($api->getSessionHeatmap($userId));
        } elseif (isset($_GET['velocity'])) {
            if (!isset($_GET['user_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'user_id required']);
                break;
            }
            $userId = intval($_GET['user_id']);
            $window = isset($_GET['window']) ? intval($_GET['window']) : 14;
            echo json_encode($api->getImprovementVelocity($userId, $window));
        }
        break;
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['event'])) {
            $userId = isset($input['user_id']) ? intval($input['user_id']) : null;
            $meta = $input['meta'] ?? [];
            $ok = $api->recordEvent($input['event'], $userId, $meta);
            echo json_encode(['success' => $ok]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'event field required']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>


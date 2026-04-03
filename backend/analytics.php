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
        }
        break;
    default:
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
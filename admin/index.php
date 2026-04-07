<?php
session_start();
require_once 'config.php';

// Simple auth check
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

// Connect to database
$db = new PDO("pgsql:host={$config['db_host']};dbname={$config['db_name']}", $config['db_user'], $config['db_pass']);

// Get stats
$stats = [
    'total_users' => $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'total_games' => $db->query("SELECT COUNT(*) FROM game_sessions")->fetchColumn(),
    'today_games' => $db->query("SELECT COUNT(*) FROM game_sessions WHERE DATE(played_at) = CURRENT_DATE")->fetchColumn(),
    'active_today' => $db->query("SELECT COUNT(DISTINCT user_id) FROM game_sessions WHERE DATE(played_at) = CURRENT_DATE")->fetchColumn()
];

// Get recent users
$recent_users = $db->query("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);

// Get top games
$top_games = $db->query("
    SELECT game_type, COUNT(*) as plays, AVG(score) as avg_score 
    FROM game_sessions 
    GROUP BY game_type 
    ORDER BY plays DESC
")->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Ygy Admin Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a1628; color: #fff; }
        .header { background: #1a2744; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 24px; }
        .logout { color: #ef5350; text-decoration: none; }
        .container { padding: 40px; max-width: 1400px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #1a2744; border-radius: 12px; padding: 24px; }
        .stat-card h3 { font-size: 14px; color: #8b9bb4; margin-bottom: 8px; text-transform: uppercase; }
        .stat-value { font-size: 36px; font-weight: 700; color: #4fc3f7; }
        .section { background: #1a2744; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .section h2 { font-size: 18px; margin-bottom: 20px; color: #fff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #2a3754; }
        th { color: #8b9bb4; font-weight: 600; font-size: 12px; text-transform: uppercase; }
        tr:hover { background: #243350; }
        .badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-success { background: rgba(79, 195, 247, 0.2); color: #4fc3f7; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Ygy Admin Dashboard</h1>
        <a href="logout.php" class="logout">Logout</a>
    </div>
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="stat-value"><?php echo number_format($stats['total_users']); ?></div>
            </div>
            <div class="stat-card">
                <h3>Total Games</h3>
                <div class="stat-value"><?php echo number_format($stats['total_games']); ?></div>
            </div>
            <div class="stat-card">
                <h3>Games Today</h3>
                <div class="stat-value"><?php echo number_format($stats['today_games']); ?></div>
            </div>
            <div class="stat-card">
                <h3>Active Users Today</h3>
                <div class="stat-value"><?php echo number_format($stats['active_today']); ?></div>
            </div>
        </div>

        <div class="section">
            <h2>Recent Users</h2>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Joined</th>
                </tr>
                <?php foreach ($recent_users as $user): ?>
                <tr>
                    <td><?php echo htmlspecialchars($user['id']); ?></td>
                    <td><?php echo htmlspecialchars($user['username']); ?></td>
                    <td><?php echo htmlspecialchars($user['email']); ?></td>
                    <td><?php echo htmlspecialchars(date('Y-m-d', strtotime($user['created_at']))); ?></td>
                </tr>
                <?php endforeach; ?>
            </table>
        </div>

        <div class="section">
            <h2>Game Statistics</h2>
            <table>
                <tr>
                    <th>Game Type</th>
                    <th>Total Plays</th>
                    <th>Average Score</th>
                </tr>
                <?php foreach ($top_games as $game): ?>
                <tr>
                    <td><?php echo htmlspecialchars($game['game_type']); ?></td>
                    <td><span class="badge badge-success"><?php echo number_format($game['plays']); ?></span></td>
                    <td><?php echo number_format($game['avg_score'], 1); ?></td>
                </tr>
                <?php endforeach; ?>
            </table>
        </div>
    </div>
</body>
</html>



import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { UserStats } from '../types';

interface ProgressChartProps {
  userStats: UserStats;
  type: 'cognitive' | 'daily' | 'games';
}

const ProgressChart: React.FC<ProgressChartProps> = ({ userStats, type }) => {
  const getCognitiveData = () => {
    return (Object.entries(userStats.cognitiveAreas) as Array<[string, UserStats['cognitiveAreas'][keyof UserStats['cognitiveAreas']]]>).map(([area, data]) => ({
      name: area.charAt(0).toUpperCase() + area.slice(1),
      score: Math.round(data.score),
      games: data.gamesPlayed,
      color: getAreaColor(area)
    }));
  };

  const getDailyData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const stats = userStats.dailyStats[dateStr] || { gamesPlayed: 0, totalScore: 0 };
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        games: stats.gamesPlayed,
        score: stats.totalScore
      };
    });
    return last7Days;
  };

  const getGamesData = () => {
    return (Object.entries(userStats.gameStats) as Array<[string, NonNullable<(typeof userStats.gameStats)[keyof typeof userStats.gameStats]>]>).map(([game, stats]) => ({
      name: game.charAt(0).toUpperCase() + game.slice(1),
      highScore: stats.highScore,
      totalPlays: stats.totalPlays,
      avgScore: Math.round(stats.totalScore / stats.totalPlays) || 0
    })).sort((a, b) => b.highScore - a.highScore);
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      memory: '#ab47bc',
      speed: '#43a047',
      attention: '#1e88e5',
      flexibility: '#fb8c00',
      problemSolving: '#00acc1'
    };
    return colors[area] || '#666';
  };

  const renderChart = () => {
    switch (type) {
      case 'cognitive':
        const cognitiveData = getCognitiveData();
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cognitiveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 22, 40, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar
                dataKey="score"
                fill="#4fc3f7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'daily':
        const dailyData = getDailyData();
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 22, 40, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Line
                type="monotone"
                dataKey="games"
                stroke="#4fc3f7"
                strokeWidth={3}
                dot={{ fill: '#4fc3f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#4fc3f7', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'games':
        const gamesData = getGamesData().slice(0, 5); // Top 5 games
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gamesData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 22, 40, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar
                dataKey="highScore"
                fill="#4fc3f7"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="progress-chart">
      <div className="chart-container">
        {renderChart()}
      </div>
    </div>
  );
};

export default ProgressChart;
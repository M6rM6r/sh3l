import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Medal, Award } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { apiService } from '../services/api';
import type { LeaderboardEntrySchema } from '../services/api';

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntrySchema[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('memory');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGame]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiService.getLeaderboard(selectedGame);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={20} />;
      case 2:
        return <Medal className="text-gray-400" size={20} />;
      case 3:
        return <Award className="text-amber-600" size={20} />;
      default:
        return <span className="text-gray-600 font-bold">#{rank}</span>;
    }
  };

  return (
    <div className="leaderboard">
      <nav className="nav">
        <Link to="/" className="logo">
          Ygy
        </Link>
        <ul className="nav-links">
          <li><Link to="/">{t('nav.home')}</Link></li>
          <li><Link to="/dashboard">{t('nav.dashboard')}</Link></li>
          <li><Link to="/insights">{t('nav.insights')}</Link></li>
          <li><Link to="/analytics">{t('nav.analytics')}</Link></li>
          <li><Link to="/leaderboard" className="active">{t('nav.leaderboard')}</Link></li>
          <li><LanguageSwitcher /></li>
        </ul>
      </nav>

      <div className="dashboard-content">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('nav.leaderboard')}</h2>

        <div className="filters mb-6 flex justify-center space-x-4">
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="memory">{t('cognitive.memory')}</option>
            <option value="speed">{t('cognitive.speed')}</option>
            <option value="attention">{t('cognitive.attention')}</option>
            <option value="flexibility">{t('cognitive.flexibility')}</option>
            <option value="problemSolving">{t('cognitive.problemSolving')}</option>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'daily' | 'weekly' | 'allTime')}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="daily">{t('common.daily')}</option>
            <option value="weekly">{t('common.weekly')}</option>
            <option value="allTime">{t('common.allTime')}</option>
          </select>
        </div>

        <div className="leaderboard-list bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <div className="grid grid-cols-4 gap-4 font-semibold text-gray-700">
              <div>Rank</div>
              <div>Player</div>
              <div>Score</div>
              <div>Game</div>
            </div>
          </div>

          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className="px-6 py-4 border-b hover:bg-gray-50 transition-colors"
            >
              <div className="grid grid-cols-4 gap-4 items-center">
                <div className="flex items-center space-x-2">
                  {getRankIcon(index + 1)}
                </div>
                <div className="font-medium">
                  {entry.username}
                </div>
                <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                <div className="text-gray-600 capitalize">{entry.gameType}</div>
              </div>
            </div>
          ))}
        </div>

        {false && (
          <div className="mt-6 text-center">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              View Your Stats
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;


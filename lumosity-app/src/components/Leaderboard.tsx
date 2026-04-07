import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { apiService } from '../services/api';
import { getLeaderboardFromSupabase } from '../services/supabase';
import { useYgyWebSocket } from '../hooks/useYgyWebSocket';
import type { RootState } from '../store/store';
import type { LeaderboardEntrySchema } from '../services/api';

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntrySchema[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('memory');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'allTime'>('weekly');
  const [loading, setLoading] = useState(true);
  const [liveFlash, setLiveFlash] = useState(false);
  const { t } = useTranslation();

  const userId = useSelector((state: RootState) => state.user.id);
  const { lastMessage, readyState } = useYgyWebSocket(userId);

  // Refresh leaderboard from server when a live update arrives
  useEffect(() => {
    if (lastMessage?.type === 'leaderboard_update') {
      setLiveFlash(true);
      fetchLeaderboard();
      setTimeout(() => setLiveFlash(false), 1500);
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGame]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // 1. Try Supabase first (real data)
      const supabaseData = await getLeaderboardFromSupabase(selectedGame, userId);
      if (supabaseData && supabaseData.length > 0) {
        setLeaderboard(supabaseData);
        return;
      }

      // 2. Fall back to REST API
      const data = await apiService.getLeaderboard(selectedGame);
      setLeaderboard(data);
    } catch (error) {
      // 3. In development, show mock data; in production show empty
      if (import.meta.env.DEV) {
        const data = await apiService.getLeaderboard(selectedGame).catch(() => []);
        setLeaderboard(data);
      } else {
        setLeaderboard([]);
      }
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
        <div className="flex items-center justify-center gap-12 mb-6">
          <h2 className="text-2xl font-bold">{t('nav.leaderboard')}</h2>
          <span
            className={[
              'inline-flex items-center gap-1.5 text-xs rounded-full py-1 px-2.5 border',
              readyState === WebSocket.OPEN
                ? 'text-green-500 bg-green-500/10 border-green-500/30'
                : 'text-gray-500 bg-gray-500/10 border-gray-500/30',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block w-2 h-2 rounded-full',
                liveFlash ? 'ws-live' : '',
                readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-gray-500',
              ].join(' ')}
            />
            {readyState === WebSocket.OPEN ? '🔴 LIVE' : 'Connecting…'}
          </span>
        </div>

        <div className="filters mb-6 flex justify-center space-x-4">
          <select
            title="Select game type"
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
            title="Select timeframe"
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

          {loading && (
            <div className="px-6 py-8 text-center text-gray-500">Loading…</div>
          )}

          <AnimatePresence>
            {leaderboard.map((entry, index) => (
              <motion.div
                key={`${entry.username}-${entry.rank}`}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
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
                  <div className="text-gray-600 capitalize">{selectedGame}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
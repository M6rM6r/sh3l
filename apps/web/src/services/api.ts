import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '../config/env'

const REFRESH_KEY = 'ygy_refresh_token'

export interface User {
  id: number
  username: string
  email: string
  level: number
  totalScore: number
}

export interface CognitiveScore {
  area: string
  score: number
  timestamp: string
}

export interface GameRecommendationDto {
  game_type: string
  priority: number
  reason: string
  predicted_improvement: number
  estimated_duration: number
}

export interface AnalyticsSummaryDto {
  total_games: number
  total_score: number
  avg_accuracy: number
  current_streak: number
  best_streak: number
  cognitive_profile: Record<string, number>
  weekly_activity: Array<{ date: string; games: number; score: number }>
  monthly_activity: Array<{ date: string; games: number; score: number }>
  improvement_trend: number
  percentile_rank: number
  time_spent_minutes: number
}

export interface LeaderboardEntrySchema {
  rank: number
  username: string
  score: number
  is_current_user: boolean
}

export interface AnalyticsData {
  dailyActivity: Array<{ date: string; games: number; score: number }>
  cognitiveAreas: Array<{ area: string; score: number; improvement: number }>
  gamePerformance: Array<{ game: string; avgScore: number; plays: number }>
  globalStats: { totalUsers: number; totalGames: number; avgScore: number }
}

class ApiService {
  private axiosInstance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  constructor() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
        if (error.response?.status === 401 && original && !original._retry) {
          original._retry = true
          const refreshed = await this.tryRefreshToken()
          if (refreshed) {
            const token = localStorage.getItem('authToken')
            if (token) {
              original.headers.Authorization = `Bearer ${token}`
              return this.axiosInstance(original)
            }
          }
          localStorage.removeItem('authToken')
          localStorage.removeItem(REFRESH_KEY)
          if (window.location.pathname !== '/') {
            window.location.href = '/'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (!refresh) return false
    try {
      const { data } = await axios.post<{ access_token: string; expires_in: number }>(
        `${apiBaseUrl}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refresh}` } }
      )
      localStorage.setItem('authToken', data.access_token)
      return true
    } catch {
      return false
    }
  }

  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { data } = await this.axiosInstance.post('/api/auth/login', { email, password })
    localStorage.setItem('authToken', data.access_token)
    localStorage.setItem(REFRESH_KEY, data.refresh_token)
    return data
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { data } = await this.axiosInstance.post('/api/auth/register', {
      username,
      email,
      password,
    })
    localStorage.setItem('authToken', data.access_token)
    localStorage.setItem(REFRESH_KEY, data.refresh_token)
    return data
  }

  logout(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem(REFRESH_KEY)
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummaryDto> {
    const { data } = await this.axiosInstance.get<AnalyticsSummaryDto>('/api/analytics/summary')
    return data
  }

  async getRecommendations(): Promise<GameRecommendationDto[]> {
    const { data } = await this.axiosInstance.get<GameRecommendationDto[]>('/api/recommendations')
    return data
  }

  async getGlobalStatsFromApi(): Promise<{
    total_users: number
    total_games_played: number
    total_points_earned: number
    average_accuracy: number
  }> {
    const { data } = await this.axiosInstance.get('/api/stats/global')
    return data
  }

  async recordGameSession(body: {
    game_type: string
    score: number
    accuracy: number
    duration_seconds?: number
    difficulty_level?: number
    cognitive_area?: string
  }): Promise<{ status: string; session_id: number }> {
    const { data } = await this.axiosInstance.post('/api/games/session', body)
    return data
  }

  generateMockAnalytics(): AnalyticsData {
    const now = new Date()
    const dailyActivity = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        games: Math.floor(Math.random() * 10) + 1,
        score: Math.floor(Math.random() * 500) + 800,
      }
    })

    const cognitiveAreas = [
      { area: 'Memory', score: Math.floor(Math.random() * 30) + 70, improvement: Math.floor(Math.random() * 20) + 5 },
      { area: 'Speed', score: Math.floor(Math.random() * 30) + 70, improvement: Math.floor(Math.random() * 20) + 5 },
      { area: 'Attention', score: Math.floor(Math.random() * 30) + 70, improvement: Math.floor(Math.random() * 20) + 5 },
      { area: 'Flexibility', score: Math.floor(Math.random() * 30) + 70, improvement: Math.floor(Math.random() * 20) + 5 },
      { area: 'Problem Solving', score: Math.floor(Math.random() * 30) + 70, improvement: Math.floor(Math.random() * 20) + 5 },
    ]

    const gamePerformance = [
      { game: 'Memory Matrix', avgScore: Math.floor(Math.random() * 500) + 1000, plays: Math.floor(Math.random() * 50) + 20 },
      { game: 'Speed Match', avgScore: Math.floor(Math.random() * 500) + 800, plays: Math.floor(Math.random() * 50) + 20 },
      { game: 'Train of Thought', avgScore: Math.floor(Math.random() * 500) + 1200, plays: Math.floor(Math.random() * 50) + 20 },
      { game: 'Color Match', avgScore: Math.floor(Math.random() * 500) + 700, plays: Math.floor(Math.random() * 50) + 20 },
      { game: 'Pattern Recall', avgScore: Math.floor(Math.random() * 500) + 900, plays: Math.floor(Math.random() * 50) + 20 },
    ]

    const globalStats = {
      totalUsers: Math.floor(Math.random() * 10000) + 15000,
      totalGames: Math.floor(Math.random() * 50000) + 80000,
      avgScore: Math.floor(Math.random() * 200) + 900,
    }

    return {
      dailyActivity,
      cognitiveAreas,
      gamePerformance,
      globalStats,
    }
  }

  async getLeaderboard(gameType: string): Promise<LeaderboardEntrySchema[]> {
    try {
      const response = await this.axiosInstance.get(`/api/leaderboard/${gameType}`)
      return response.data
    } catch (error) {
      console.warn('Failed to fetch leaderboard, using mock data:', error)
      return this.generateMockLeaderboard(gameType)
    }
  }

  private generateMockLeaderboard(gameType: string): LeaderboardEntrySchema[] {
    const mockUsers = [
      'BrainMaster', 'SpeedDemon', 'FocusKing', 'LogicLord', 'QuickThink',
      'MindSharp', 'NeuroNinja', 'Cognitiv', 'SmartPlay', 'BrainWave'
    ]
    
    return mockUsers.map((username, index) => ({
      rank: index + 1,
      username,
      score: Math.floor(Math.random() * 2000) + 8000 - (index * 200),
      is_current_user: index === 0,
    }))
  }
}

export const apiService = new ApiService()

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { GameSession, User, GameType } from '../types';

const API_BASE_URL = 'http://localhost:8000/api'; // Change to your backend URL

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    this.token = await SecureStore.getItemAsync('auth_token');
  }

  private getHeaders() {
    return {
      'Authorization': this.token ? `Bearer ${this.token}` : '',
      'Content-Type': 'application/json',
    };
  }

  async login(email: string, password: string): Promise<User> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    
    const { access_token, refresh_token } = response.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);
    this.token = access_token;
    
    return this.getCurrentUser();
  }

  async register(email: string, username: string, password: string): Promise<User> {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      username,
      password,
    });
    
    const { access_token, refresh_token } = response.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);
    this.token = access_token;
    
    return this.getCurrentUser();
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async recordGameSession(session: Omit<GameSession, 'id' | 'synced'>): Promise<void> {
    const netInfo = await NetInfo.fetch();
    
    if (netInfo.isConnected) {
      try {
        await axios.post(`${API_BASE_URL}/games/session`, {
          game_type: session.gameType,
          score: session.score,
          accuracy: session.accuracy,
          duration_seconds: session.duration,
          cognitive_area: this.getCognitiveArea(session.gameType),
        }, {
          headers: this.getHeaders(),
        });
      } catch (error) {
        console.error('Failed to sync session:', error);
        throw error;
      }
    } else {
      throw new Error('Offline - session queued for sync');
    }
  }

  async getAnalytics(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/analytics/summary`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getRecommendations(): Promise<any[]> {
    const response = await axios.get(`${API_BASE_URL}/recommendations`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getAchievements(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/achievements`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getLeaderboard(gameType: GameType): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/leaderboard/${gameType}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  private getCognitiveArea(gameType: GameType): string {
    const mapping: Record<GameType, string> = {
      memory: 'memory',
      word: 'memory',
      speed: 'speed',
      reaction: 'speed',
      attention: 'attention',
      visual: 'attention',
      flexibility: 'flexibility',
      problemSolving: 'problem_solving',
      math: 'problem_solving',
      spatial: 'problem_solving',
    };
    return mapping[gameType] || 'memory';
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    this.token = null;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
      headers: { 'Authorization': `Bearer ${refreshToken}` },
    });
    
    const { access_token } = response.data;
    await SecureStore.setItemAsync('auth_token', access_token);
    this.token = access_token;
  }
}

export const apiService = new ApiService();



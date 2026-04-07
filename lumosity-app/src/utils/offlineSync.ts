/**
 * Enhanced Offline Sync Manager
 * Provides intelligent offline-first functionality with background sync,
 * conflict resolution, and queue management.
 */

import type { UserStats, GameType, GameStats } from '../types';

const STORAGE_KEYS = {
  STATS: 'ygy_stats_v2',
  QUEUE: 'ygy_offline_queue_v2',
  SYNC_STATE: 'ygy_sync_state',
  CACHE_VERSION: 'ygy_cache_version',
  LAST_SYNC: 'ygy_last_sync',
  PENDING_SESSIONS: 'ygy_pending_sessions',
  CONFLICTS: 'ygy_sync_conflicts',
  NETWORK_STATUS: 'ygy_network_status'
};

// Queue action types
export type QueueActionType = 
  | 'game_session' 
  | 'achievement' 
  | 'analytics' 
  | 'user_profile'
  | 'settings_update'
  | 'progress_save';

export interface QueueAction {
  id: string;
  type: QueueActionType;
  payload: unknown;
  timestamp: number;
  retries: number;
  priority: 'high' | 'medium' | 'low';
  expiresAt?: number;
  dependencies?: string[];
  resolveConflict?: (local: unknown, remote: unknown) => unknown;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncAttempt: number;
  lastSuccessfulSync: number;
  syncErrors: number;
  conflictsPending: number;
}

export interface GameSessionPayload {
  gameType: GameType;
  score: number;
  accuracy: number;
  duration: number;
  difficulty: number;
  cognitiveArea: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class OfflineSyncManager {
  private syncInProgress: boolean = false;
  private networkStatus: boolean = true;
  private syncInterval: number | null = null;
  private maxRetries: number = 5;
  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    
    // Check initial network status
    this.networkStatus = navigator.onLine;
    
    // Set up periodic sync (every 30 seconds when online)
    this.syncInterval = window.setInterval(() => {
      if (this.networkStatus && !this.syncInProgress) {
        this.processQueue();
      }
    }, 30000);
    
    // Listen for visibility changes (sync when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.networkStatus) {
        this.processQueue();
      }
    });

    // Register with service worker for background sync
    this.registerWithServiceWorker();
  }

  private async registerWithServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETED') {
          this.handleSyncCompleted(event.data.payload);
        }
      });

      // Register for background sync if available
      if ('sync' in registration) {
        try {
          const syncReg = registration.sync as { register: (tag: string) => Promise<void> };
          await syncReg.register('sync-game-sessions');
          await syncReg.register('sync-analytics');
        } catch (err) {
          console.log('Background sync not available');
        }
      }
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.networkStatus = isOnline;
    this.saveNetworkStatus();
    
    if (isOnline) {
      console.log('[OfflineSync] Network restored, processing queue...');
      this.processQueue();
      
      // Notify listeners
      this.notifyListeners();
      
      // Show notification if we have pending items
      const queue = this.getQueue();
      if (queue.length > 0) {
        this.showSyncNotification(queue.length);
      }
    } else {
      console.log('[OfflineSync] Network lost, entering offline mode');
      this.notifyListeners();
    }
  }

  private saveNetworkStatus() {
    localStorage.setItem(
      STORAGE_KEYS.NETWORK_STATUS, 
      JSON.stringify({ 
        isOnline: this.networkStatus, 
        timestamp: Date.now() 
      })
    );
  }

  // Queue Management

  public queueAction(
    type: QueueActionType, 
    payload: unknown, 
    priority: 'high' | 'medium' | 'low' = 'medium',
    options?: {
      expiresIn?: number;
      dependencies?: string[];
    }
  ): string {
    const id = this.generateId();
    
    const action: QueueAction = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      priority,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      dependencies: options?.dependencies
    };
    
    const queue = this.getQueue();
    
    // Insert based on priority
    const insertIndex = queue.findIndex(item => this.getPriorityValue(item.priority) < this.getPriorityValue(priority));
    if (insertIndex === -1) {
      queue.push(action);
    } else {
      queue.splice(insertIndex, 0, action);
    }
    
    this.saveQueue(queue);
    this.notifyListeners();
    
    // Try to sync immediately if online
    if (this.networkStatus && !this.syncInProgress) {
      this.processQueue();
    }
    
    return id;
  }

  private getPriorityValue(priority: string): number {
    const values = { high: 3, medium: 2, low: 1 };
    return values[priority as keyof typeof values] || 1;
  }

  public queueGameSession(session: GameSessionPayload): string {
    // Also save to local storage immediately for redundancy
    this.savePendingSession(session);
    
    // Queue for sync
    return this.queueAction('game_session', session, 'high', {
      expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  public queueAnalytics(event: Record<string, unknown>): string {
    return this.queueAction('analytics', event, 'low', {
      expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }

  public async processQueue(): Promise<void> {
    if (this.syncInProgress || !this.networkStatus) return;
    
    this.syncInProgress = true;
    this.notifyListeners();
    
    try {
      const queue = this.getQueue();
      const expiredActions = queue.filter(action => 
        action.expiresAt && action.expiresAt < Date.now()
      );
      
      // Remove expired actions
      for (const action of expiredActions) {
        this.removeFromQueue(action.id);
      }
      
      const activeQueue = queue.filter(action => 
        !action.expiresAt || action.expiresAt >= Date.now()
      );
      
      // Check dependencies
      const completedIds = new Set<string>();
      const failedIds = new Set<string>();
      
      for (const action of activeQueue) {
        // Skip if dependencies not met
        if (action.dependencies?.some(dep => !completedIds.has(dep) || failedIds.has(dep))) {
          continue;
        }
        
        if (action.retries >= this.maxRetries) {
          failedIds.add(action.id);
          continue;
        }
        
        try {
          const success = await this.syncAction(action);
          
          if (success) {
            this.removeFromQueue(action.id);
            completedIds.add(action.id);
          } else {
            this.incrementRetry(action.id);
            failedIds.add(action.id);
          }
        } catch (error) {
          console.error('[OfflineSync] Sync failed for action:', action.id, error);
          this.incrementRetry(action.id);
          failedIds.add(action.id);
        }
      }
      
      // Update last sync time
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify({
        timestamp: Date.now(),
        itemsProcessed: completedIds.size,
        itemsFailed: failedIds.size
      }));
      
      this.notifyListeners();
      
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncAction(action: QueueAction): Promise<boolean> {
    const endpoints: Record<QueueActionType, string> = {
      game_session: '/api/game-sessions',
      achievement: '/api/achievements',
      analytics: '/api/analytics',
      user_profile: '/api/user/profile',
      settings_update: '/api/user/settings',
      progress_save: '/api/progress'
    };
    
    const endpoint = endpoints[action.type];
    if (!endpoint) return false;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Action': action.id
      },
      body: JSON.stringify(action.payload)
    });
    
    if (response.status === 409) {
      // Conflict - handle it
      const remoteData = await response.json();
      await this.handleConflict(action, remoteData);
      return true;
    }
    
    return response.ok;
  }

  private async handleConflict(action: QueueAction, remoteData: unknown): Promise<void> {
    // Store conflict for manual resolution
    const conflicts = this.getConflicts();
    conflicts.push({
      actionId: action.id,
      local: action.payload,
      remote: remoteData,
      timestamp: Date.now()
    });
    
    localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
    
    // Try automatic resolution if available
    if (action.resolveConflict) {
      const resolved = action.resolveConflict(action.payload, remoteData);
      
      // Update the action with resolved data
      this.updateQueueItem(action.id, { payload: resolved });
    }
    
    this.notifyListeners();
  }

  public resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merged',
    mergedData?: unknown
  ): void {
    const conflicts = this.getConflicts();
    const conflictIndex = conflicts.findIndex(c => c.actionId === conflictId);
    
    if (conflictIndex === -1) return;
    
    const conflict = conflicts[conflictIndex];
    
    let resolvedPayload: unknown;
    switch (resolution) {
      case 'local':
        resolvedPayload = conflict.local;
        break;
      case 'remote':
        resolvedPayload = conflict.remote;
        break;
      case 'merged':
        resolvedPayload = mergedData || this.mergeConflictData(conflict.local, conflict.remote);
        break;
    }
    
    // Update the queue item
    this.updateQueueItem(conflictId, { payload: resolvedPayload });
    
    // Remove conflict
    conflicts.splice(conflictIndex, 1);
    localStorage.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
    
    // Try to sync again
    this.processQueue();
    this.notifyListeners();
  }

  private mergeConflictData(local: unknown, remote: unknown): unknown {
    // Simple merge strategy - can be customized per data type
    if (typeof local === 'object' && typeof remote === 'object') {
      return { ...remote as object, ...local as object };
    }
    return local;
  }

  // Storage Helpers

  private getQueue(): QueueAction[] {
    return this.safeJsonParse(localStorage.getItem(STORAGE_KEYS.QUEUE), []);
  }

  private saveQueue(queue: QueueAction[]): void {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  private removeFromQueue(id: string): void {
    const queue = this.getQueue().filter(item => item.id !== id);
    this.saveQueue(queue);
  }

  private incrementRetry(id: string): void {
    const queue = this.getQueue().map(item => 
      item.id === id ? { ...item, retries: item.retries + 1 } : item
    );
    this.saveQueue(queue);
  }

  private updateQueueItem(id: string, updates: Partial<QueueAction>): void {
    const queue = this.getQueue().map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    this.saveQueue(queue);
  }

  private savePendingSession(session: GameSessionPayload): void {
    const sessions = this.safeJsonParse<GameSessionPayload[]>(
      localStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS), 
      []
    );
    sessions.push(session);
    localStorage.setItem(STORAGE_KEYS.PENDING_SESSIONS, JSON.stringify(sessions));
  }

  private getConflicts(): Array<{ actionId: string; local: unknown; remote: unknown; timestamp: number }> {
    return this.safeJsonParse(localStorage.getItem(STORAGE_KEYS.CONFLICTS), []);
  }

  private safeJsonParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API

  public getSyncState(): SyncState {
    const queue = this.getQueue();
    const lastSync = this.safeJsonParse<{ timestamp?: number; itemsProcessed?: number; itemsFailed?: number }>(
      localStorage.getItem(STORAGE_KEYS.LAST_SYNC), 
      {}
    );
    const conflicts = this.getConflicts();
    
    return {
      isOnline: this.networkStatus,
      isSyncing: this.syncInProgress,
      queueLength: queue.length,
      lastSyncAttempt: lastSync.timestamp || 0,
      lastSuccessfulSync: lastSync.itemsProcessed && lastSync.itemsProcessed > 0 ? (lastSync.timestamp || 0) : 0,
      syncErrors: lastSync.itemsFailed || 0,
      conflictsPending: conflicts.length
    };
  }

  public subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    // Send initial state
    listener(this.getSyncState());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getSyncState();
    this.listeners.forEach(listener => listener(state));
  }

  public forceSync(): Promise<void> {
    return this.processQueue();
  }

  public isOnline(): boolean {
    return this.networkStatus;
  }

  public getPendingCount(): number {
    return this.getQueue().length;
  }

  public getConflictCount(): number {
    return this.getConflicts().length;
  }

  public clearQueue(): void {
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
    this.notifyListeners();
  }

  public clearPendingSessions(): void {
    localStorage.removeItem(STORAGE_KEYS.PENDING_SESSIONS);
  }

  public getPendingSessions(): GameSessionPayload[] {
    return this.safeJsonParse(
      localStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS), 
      []
    );
  }

  private showSyncNotification(count: number): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    new Notification('Ygy Brain Training', {
      body: `${count} game sessions synced successfully`,
      icon: '/assets/images/logo.svg',
      silent: true
    });
  }

  private handleSyncCompleted(payload: unknown): void {
    console.log('[OfflineSync] Background sync completed:', payload);
    this.notifyListeners();
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', () => this.handleNetworkChange(true));
    window.removeEventListener('offline', () => this.handleNetworkChange(false));
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();

// React Hook for sync state
export function useSyncState() {
  const [state, setState] = useState<SyncState>(offlineSyncManager.getSyncState());
  
  useEffect(() => {
    return offlineSyncManager.subscribe(setState);
  }, []);
  
  return state;
}

// Helper functions for direct use
export const queueGameSession = (session: GameSessionPayload) => 
  offlineSyncManager.queueGameSession(session);

export const queueAnalytics = (event: Record<string, unknown>) => 
  offlineSyncManager.queueAnalytics(event);

export const forceSync = () => offlineSyncManager.forceSync();

export const isOnline = () => offlineSyncManager.isOnline();

// Need to import useState and useEffect
import { useState, useEffect } from 'react';

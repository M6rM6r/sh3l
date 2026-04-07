import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiService } from '../services/api'
import { queryKeys } from './queryKeys'
import { addToOfflineQueue, removeFromOfflineQueue, getOfflineQueue } from '../utils/storage'
import type { QueuedAction } from '../utils/storage'

interface GameSessionInput {
  game_type: string
  score: number
  accuracy: number
  duration_seconds?: number
  difficulty_level?: number
  cognitive_area?: string
}

export function useRecordGameSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: GameSessionInput) => apiService.recordGameSession(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary })
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations })
    },
    onError: (_err, variables) => {
      // Queue for offline sync
      addToOfflineQueue({
        type: 'game_session',
        payload: variables,
      })
      console.warn('Game session queued for offline sync')
    },
  })
}

export function useOfflineQueue() {
  return useMutation({
    mutationFn: async (action: QueuedAction) => {
      if (action.type === 'game_session') {
        await apiService.recordGameSession(action.payload as GameSessionInput)
      }
      return action.id
    },
    onSuccess: (id) => {
      removeFromOfflineQueue(id)
    },
  })
}

export function useSyncOfflineQueue() {
  const queueMutation = useOfflineQueue()

  return async () => {
    const queue = getOfflineQueue()
    const results = await Promise.allSettled(
      queue.map((action) => queueMutation.mutateAsync(action))
    )
    return results
  }
}



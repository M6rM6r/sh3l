import { useQuery } from '@tanstack/react-query'
import { apiService } from '../services/api'
import type { AnalyticsSummaryDto, GameRecommendationDto } from '../services/api'
import { queryKeys } from './queryKeys'

export function useAnalyticsSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: () => apiService.getAnalyticsSummary(),
    enabled: enabled && Boolean(typeof window !== 'undefined' && localStorage.getItem('authToken')),
    staleTime: 120_000,
  })
}

export function useRecommendations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: () => apiService.getRecommendations(),
    enabled: enabled && Boolean(typeof window !== 'undefined' && localStorage.getItem('authToken')),
    staleTime: 180_000,
  })
}

export function useGlobalStats() {
  return useQuery({
    queryKey: queryKeys.globalStats,
    queryFn: () => apiService.getGlobalStatsFromApi(),
    staleTime: 300_000,
  })
}

export type { AnalyticsSummaryDto, GameRecommendationDto }



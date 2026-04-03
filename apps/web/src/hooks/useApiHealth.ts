import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { apiBaseUrl } from '../config/env'
import { queryKeys } from './queryKeys'

export function useApiReadiness(pollMs = 60_000) {
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: async () => {
      const { data } = await axios.get<{ status: string; database: boolean; redis: boolean }>(
        `${apiBaseUrl}/api/health/ready`,
        { timeout: 5000 }
      )
      return data
    },
    refetchInterval: pollMs,
    retry: 2,
    staleTime: 30_000,
  })
}

export function useApiLiveness() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const { data } = await axios.get<{ status: string; timestamp: string }>(
        `${apiBaseUrl}/api/health`,
        { timeout: 5000 }
      )
      return data
    },
    staleTime: 60_000,
  })
}

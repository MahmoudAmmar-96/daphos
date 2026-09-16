/**
 * Typed fetch functions and TanStack Query hooks for the forecast-week feature. All
 * server state lives here. Components only read these hooks, never fetch directly.
 */

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import type { CorrectionUpsert, DayView, Ward, WeeklySummary } from './types'

const queryKeys = {
  wards: () => ['wards', 'list'] as const,
  forecasts: (wardId: number | null, week: string) =>
    ['wards', wardId, 'forecasts', week] as const,
  summary: (wardId: number | null, week: string) => ['wards', wardId, 'summary', week] as const,
}

function fetchWards(): Promise<Ward[]> {
  return apiClient.get<Ward[]>('/wards')
}

function fetchForecasts(wardId: number, week: string): Promise<DayView[]> {
  return apiClient.get<DayView[]>(`/wards/${wardId}/forecasts?week=${encodeURIComponent(week)}`)
}

function fetchSummary(wardId: number, week: string): Promise<WeeklySummary> {
  return apiClient.get<WeeklySummary>(`/wards/${wardId}/summary?week=${encodeURIComponent(week)}`)
}

function putCorrection(wardId: number, date: string, payload: CorrectionUpsert): Promise<DayView> {
  return apiClient.put<DayView>(
    `/wards/${wardId}/forecasts/${encodeURIComponent(date)}/correction`,
    payload,
  )
}

export function useWards() {
  return useQuery({ queryKey: queryKeys.wards(), queryFn: fetchWards })
}

export function useWardForecasts(wardId: number | null, week: string) {
  return useQuery({
    queryKey: queryKeys.forecasts(wardId, week),
    queryFn: wardId === null ? skipToken : () => fetchForecasts(wardId, week),
  })
}

export function useWardSummary(wardId: number | null, week: string) {
  return useQuery({
    queryKey: queryKeys.summary(wardId, week),
    queryFn: wardId === null ? skipToken : () => fetchSummary(wardId, week),
  })
}

export function useUpsertCorrection(wardId: number, week: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, payload }: { date: string; payload: CorrectionUpsert }) =>
      putCorrection(wardId, date, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.forecasts(wardId, week) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary(wardId, week) })
    },
  })
}

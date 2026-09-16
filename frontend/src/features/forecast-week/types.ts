/**
 * Mirrors the backend's response shapes exactly (see backend/app/schemas.py and
 * routers/wards.py, routers/corrections.py). Single source of truth for these shapes.
 */

export interface Ward {
  id: number
  name: string
  code: string
}

export interface Correction {
  corrected_demand: number
  reason: string | null
  corrected_by: string
  corrected_at: string
  updated_at: string
}

export interface DayView {
  date: string
  forecast_demand: number
  confidence: number
  planned_staffing: number
  correction: Correction | null
  effective_demand: number
  is_understaffed: boolean
  is_past: boolean
}

export interface WeeklySummary {
  total_understaffing: number
  correction_count: number
  avg_deviation: number
}

export interface CorrectionUpsert {
  corrected_demand: number
  reason?: string
}

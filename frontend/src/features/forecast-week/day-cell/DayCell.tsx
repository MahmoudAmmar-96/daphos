/**
 * One day in the week grid. This is presentational, and every bit of state
 * lives in WeekView.
 */

import { cn } from 'cn'
import { TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ForecastGlyph } from './ForecastGlyph'
import type { DayView } from '../types'

interface DayCellProps {
  day: DayView
  scaleMax: number
  onSelect: (day: DayView) => void
}

export function DayCell({ day, scaleMax, onSelect }: DayCellProps) {
  const confidencePercent = Math.round(day.confidence * 100)

  const date = new Date(`${day.date}T00:00:00`)
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  const dayAndMonth = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors',
        'hover:border-foreground/25 hover:bg-muted/40',
        day.is_past && 'opacity-60',
      )}
    >
      <p className="text-sm font-medium">
        {weekday} <span className="text-muted-foreground">{dayAndMonth}</span>
      </p>

      <ForecastGlyph day={day} scaleMax={scaleMax} />

      <div className="text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{day.forecast_demand}</span>{' '}
          forecast · {day.planned_staffing} planned
        </p>
        {day.correction && <p>{day.effective_demand} effective</p>}
        <p>Confidence: {confidencePercent}%</p>
      </div>

      <div className="flex min-h-5 flex-wrap gap-1">
        {day.is_understaffed && (
          <Badge variant="destructive">
            <TriangleAlert aria-hidden />
            Understaffed
          </Badge>
        )}
        {day.correction && (
          <Badge variant="secondary">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            Corrected
          </Badge>
        )}
        {day.is_past && <Badge variant="outline">Past</Badge>}
      </div>
    </button>
  )
}

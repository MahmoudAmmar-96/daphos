/**
 * The inline glyph inside a DayCell: forecast marker, correction dot, uncertainty bandwidth, 
 * and the planned-staffing bar, all on one shared x-scale.
 */

import type { DayView } from '../types'

const GLYPH_WIDTH = 120
const GLYPH_HEIGHT = 40
const BAND_BASE = 56
const MIN_BAND = 4

interface ForecastGlyphProps {
  day: DayView
  scaleMax: number
}

export function ForecastGlyph({ day, scaleMax }: ForecastGlyphProps) {
  const scaleX = (value: number) => (value / scaleMax) * GLYPH_WIDTH

  const forecastX = scaleX(day.forecast_demand)
  const confidencePercent = Math.round(day.confidence * 100)

  const bandWidth = Math.max(MIN_BAND, BAND_BASE * (1 - day.confidence))
  const bandLeft = Math.max(0, forecastX - bandWidth / 2)
  const bandRight = Math.min(GLYPH_WIDTH, forecastX + bandWidth / 2)

  return (
    <svg
      viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Forecast ${day.forecast_demand}, ${confidencePercent}% confidence, planned staffing ${day.planned_staffing}`}
    >
      <rect x={bandLeft} y={4} width={bandRight - bandLeft} height={12} className="fill-foreground/10" />
      <line x1={bandLeft} y1={10} x2={bandRight} y2={10} strokeWidth={1.5} className="stroke-foreground/50" />
      <line x1={bandLeft} y1={4} x2={bandLeft} y2={16} strokeWidth={1.5} className="stroke-foreground/50" />
      <line x1={bandRight} y1={4} x2={bandRight} y2={16} strokeWidth={1.5} className="stroke-foreground/50" />

      <polygon
        points={`${forecastX - 5},18 ${forecastX + 5},18 ${forecastX},27`}
        className="fill-foreground"
      />

      {day.correction && (
        <circle
          cx={scaleX(day.correction.corrected_demand)}
          cy={22}
          r={4}
          strokeWidth={1.5}
          className="fill-foreground stroke-card"
        />
      )}

      <rect x={0} y={31} width={GLYPH_WIDTH} height={7} rx={3.5} className="fill-muted" />
      <rect
        x={0}
        y={31}
        width={scaleX(day.planned_staffing)}
        height={7}
        rx={3.5}
        className="fill-foreground/60"
      />
    </svg>
  )
}

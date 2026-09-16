/**
 * Container for the whole review screen: which ward, which week, and which day
 * (if any) is open in the correction dialog. Server state comes from api.ts.
 */

import { cn } from 'cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { CONTROL_CLASS } from '@/lib/controlClass'
import { getCurrentIsoWeek, shiftIsoWeek } from '@/lib/isoWeek'
import { useWardForecasts, useWards } from './api'
import { CorrectionDialog } from './correction-dialog/CorrectionDialog'
import { DayCell } from './day-cell/DayCell'
import { WardSummary } from './WardSummary'

export function WeekView() {
  const wards = useWards()
  const [chosenWardId, setChosenWardId] = useState<number | null>(null)
  const [week, setWeek] = useState(getCurrentIsoWeek)
  const [openDate, setOpenDate] = useState<string | null>(null)

  const wardId = chosenWardId ?? wards.data?.[0]?.id ?? null
  const forecasts = useWardForecasts(wardId, week)
  const days = forecasts.data ?? []
  const openDay = days.find((day) => day.date === openDate) ?? null

  const scaleMax =
    Math.max(
      1,
      ...days.map((day) =>
        Math.max(day.planned_staffing, day.effective_demand, day.forecast_demand),
      ),
    ) * 1.1

  const weekLabel =
    days.length > 0 ? formatRange(days[0].date, days[days.length - 1].date) : 'No Forecast'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={wardId ?? ''}
          onChange={(event) => setChosenWardId(Number(event.target.value))}
          aria-label="Ward"
          className={cn(CONTROL_CLASS, 'h-8 px-2')}
        >
          {wards.data?.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous week"
            onClick={() => setWeek((current) => shiftIsoWeek(current, -1))}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium tabular-nums">{weekLabel}</span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next week"
            onClick={() => setWeek((current) => shiftIsoWeek(current, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <WardSummary wardId={wardId} week={week} />

      <p className="text-xs text-muted-foreground">
        Bar = planned staffing · tick = forecast demand · dot = corrected demand · band width =
        forecast uncertainty (wider means less confident).
      </p>

      {forecasts.isError ? (
        <p className="text-sm text-destructive">{forecasts.error.message}</p>
      ) : forecasts.isPending ? (
        <p className="text-sm text-muted-foreground">Loading week…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              scaleMax={scaleMax}
              onSelect={(selected) => setOpenDate(selected.date)}
            />
          ))}
        </div>
      )}

      {openDay && wardId !== null && (
        <CorrectionDialog
          day={openDay}
          wardId={wardId}
          week={week}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  )
}

function formatRange(startDate: string, endDate: string): string {
  const dayMonth = { day: 'numeric', month: 'short' } as const
  const start = new Date(`${startDate}T00:00:00`).toLocaleDateString('en-GB', dayMonth)
  const end = new Date(`${endDate}T00:00:00`).toLocaleDateString('en-GB', {
    ...dayMonth,
    year: 'numeric',
  })
  return `${start} - ${end}`
}

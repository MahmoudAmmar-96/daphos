/**
 * The cell stays glanceable, this carries the exact numbers and the edit form.
 * Past days get the numbers only, and the server rejects corrections
 * for them, so we don't offer a form that can't succeed.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Correction, DayView } from '../types'
import { CorrectionForm } from './CorrectionForm'

interface CorrectionDialogProps {
  day: DayView
  wardId: number
  week: string
  onClose: () => void
}

export function CorrectionDialog({ day, wardId, week, onClose }: CorrectionDialogProps) {
  const fullDate = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fullDate}</DialogTitle>
          <DialogDescription>
            {day.is_past
              ? 'This day has passed. You can view its correction but cannot modify it.'
              : 'Review the forecast and correct it if the ward needs different cover.'}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Fact label="Forecast demand" value={`${day.forecast_demand}`} />
          <Fact label="Confidence" value={`${Math.round(day.confidence * 100)}%`} />
          <Fact label="Planned staffing" value={`${day.planned_staffing}`} />
          <Fact label="Effective demand" value={`${day.effective_demand}`} />
        </dl>

        {day.correction && <CorrectionNote correction={day.correction} />}

        {day.is_past ? (
          <DialogFooter showCloseButton />
        ) : (
          <CorrectionForm day={day} wardId={wardId} week={week} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function CorrectionNote({ correction }: { correction: Correction }) {
  const savedAt = new Date(correction.updated_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const reason = correction.reason || 'no reason given'

  return (
    <p className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
      Corrected to <strong className="text-foreground">{correction.corrected_demand}</strong>{' '}
      by {correction.corrected_by} on {savedAt}. Reason: {reason}
    </p>
  )
}


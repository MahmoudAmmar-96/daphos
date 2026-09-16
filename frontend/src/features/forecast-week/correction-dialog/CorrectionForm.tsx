/**
 * The correction edit form. Kept apart from CorrectionDialog so a past day, which the
 * server would reject anyway, never mounts the form, its resolver or its mutation.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from 'cn'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { CONTROL_CLASS } from '@/lib/controlClass'
import { requiresReason } from '@/lib/deviation'
import { useUpsertCorrection } from '../api'
import type { DayView } from '../types'
import { correctionSchema, type CorrectionFormValues } from './correctionSchema'
import { Field } from './Field'

interface CorrectionFormProps {
  day: DayView
  wardId: number
  week: string
  onClose: () => void
}

export function CorrectionForm({ day, wardId, week, onClose }: CorrectionFormProps) {
  const upsert = useUpsertCorrection(wardId, week)
  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema(day.forecast_demand)),
    defaultValues: {
      corrected_demand: day.correction?.corrected_demand ?? day.forecast_demand,
      reason: day.correction?.reason ?? '',
    },
  })

  const correctedDemand = useWatch({ control: form.control, name: 'corrected_demand' })
  const reasonRequired = requiresReason(day.forecast_demand, correctedDemand)

  const onSubmit = form.handleSubmit((values) => {
    upsert.mutate(
      {
        date: day.date,
        payload: { corrected_demand: values.corrected_demand, reason: values.reason || undefined },
      },
      { onSuccess: onClose },
    )
  })

  const { errors } = form.formState

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field
        id="corrected_demand"
        label="Corrected demand"
        error={errors.corrected_demand?.message}
      >
        {(control) => (
          <input
            {...control}
            type="number"
            min="0"
            autoFocus
            className={cn(CONTROL_CLASS, 'h-8 px-2.5')}
            {...form.register('corrected_demand', { valueAsNumber: true })}
          />
        )}
      </Field>

      <Field
        id="reason"
        label={
          <>
            Reason{' '}
            <span className="font-normal text-muted-foreground">
              {reasonRequired ? '(required for this change)' : '(optional)'}
            </span>
          </>
        }
        error={errors.reason?.message}
      >
        {(control) => (
          <textarea
            {...control}
            rows={2}
            className={cn(CONTROL_CLASS, 'p-2')}
            {...form.register('reason')}
          />
        )}
      </Field>

      {upsert.isError && <p className="text-xs text-destructive">{upsert.error.message}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save correction'}
        </Button>
      </DialogFooter>
    </form>
  )
}

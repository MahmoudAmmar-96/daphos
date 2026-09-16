/**
 * The correction form's validation rules, mirroring the server so a manager sees a
 * rejection before the round-trip. The threshold itself lives in lib/deviation.ts.
 */

import { z } from 'zod'

import { DEVIATION_JUSTIFICATION_THRESHOLD, requiresReason } from '@/lib/deviation'

const THRESHOLD_PERCENT = Math.round(DEVIATION_JUSTIFICATION_THRESHOLD * 100)

export function correctionSchema(forecastDemand: number) {
  return z
    .object({
      corrected_demand: z
        .number({ error: 'Enter a number.' })
        .int('Corrected demand is a headcount, so it must be a whole number.')
        .min(0, 'Corrected demand cannot be negative.'),
      reason: z.string().trim().optional(),
    })
    .refine(
      (values) =>
        Boolean(values.reason) || !requiresReason(forecastDemand, values.corrected_demand),
      {
        path: ['reason'],
        error: `A reason is required for corrections deviating more than ${THRESHOLD_PERCENT}% from the forecast.`,
      },
    )
}

export type CorrectionFormValues = z.output<ReturnType<typeof correctionSchema>>

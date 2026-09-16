/**
 * The reason-required rule, mirrored from the backend so the form can warn before
 * submitting. Must stay in sync with DEVIATION_JUSTIFICATION_THRESHOLD in
 * backend/app/config.py. The server is still the authority, this only saves a round-trip.
 */

export const DEVIATION_JUSTIFICATION_THRESHOLD = 0.2

export function requiresReason(forecastDemand: number, correctedDemand: number): boolean {
  if (forecastDemand === 0) {
    return correctedDemand !== 0
  }
  const deviation = Math.abs(correctedDemand - forecastDemand) / forecastDemand
  return deviation > DEVIATION_JUSTIFICATION_THRESHOLD
}

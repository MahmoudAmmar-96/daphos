/**
 * ISO week <-> date helpers.
 */

import { addWeeks, getISOWeek, getISOWeekYear, setISOWeek, setISOWeekYear } from 'date-fns'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toIsoWeekString(date: Date): string {
  return `${getISOWeekYear(date)}-W${pad2(getISOWeek(date))}`
}

function isoWeekDate(year: number, week: number): Date {
  return setISOWeek(setISOWeekYear(new Date(), year), week)
}

export function getCurrentIsoWeek(): string {
  return toIsoWeekString(new Date())
}

export function shiftIsoWeek(week: string, delta: number): string {
  const [year, weekNumber] = week.split('-W').map(Number)
  return toIsoWeekString(addWeeks(isoWeekDate(year, weekNumber), delta))
}

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DayCell } from './DayCell'
import type { DayView } from '../types'

const wellStaffedDay: DayView = {
  date: '2026-09-17',
  forecast_demand: 18,
  confidence: 0.92,
  planned_staffing: 22,
  correction: null,
  effective_demand: 18,
  is_understaffed: false,
  is_past: false,
}

function renderDay(overrides: Partial<DayView> = {}) {
  render(
    <DayCell day={{ ...wellStaffedDay, ...overrides }} scaleMax={30} onSelect={() => {}} />,
  )
}

describe('DayCell', () => {
  it('shows no risk or correction markers on a well-staffed day', () => {
    renderDay()

    expect(screen.getByText(/confidence: 92%/i)).toBeInTheDocument()
    expect(screen.queryByText(/understaffed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/corrected/i)).not.toBeInTheDocument()
  })

  it('labels an understaffed day in words', () => {
    renderDay({ is_understaffed: true })

    expect(screen.getByText(/understaffed/i)).toBeInTheDocument()
  })

  it('shows the confidence percentage', () => {
    renderDay({ confidence: 0.58 })

    expect(screen.getByText(/confidence: 58%/i)).toBeInTheDocument()
  })

  it('marks a corrected day and shows its effective demand', () => {
    renderDay({
      correction: {
        corrected_demand: 24,
        reason: 'Flu wave expected',
        corrected_by: 'Mahmoud Ammar',
        corrected_at: '2026-09-15T09:00:00',
        updated_at: '2026-09-15T09:00:00',
      },
      effective_demand: 24,
    })

    expect(screen.getByText(/corrected/i)).toBeInTheDocument()
    expect(screen.getByText(/24 effective/i)).toBeInTheDocument()
  })

  it('marks past days so they read as read-only', () => {
    renderDay({ date: '2026-09-10', is_past: true })

    expect(screen.getByText(/past/i)).toBeInTheDocument()
  })

  it('shows all three badges when a day is understaffed, corrected, and past at once', () => {
    renderDay({
      date: '2026-09-10',
      is_understaffed: true,
      is_past: true,
      correction: {
        corrected_demand: 24,
        reason: 'Flu wave expected',
        corrected_by: 'Mahmoud Ammar',
        corrected_at: '2026-09-15T09:00:00',
        updated_at: '2026-09-15T09:00:00',
      },
      effective_demand: 24,
    })

    expect(screen.getByText(/understaffed/i)).toBeInTheDocument()
    expect(screen.getByText(/corrected/i)).toBeInTheDocument()
    expect(screen.getByText(/past/i)).toBeInTheDocument()
  })
})

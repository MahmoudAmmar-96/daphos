"""Request/response shapes, kept separate from the tables where the domain differs.

The write schema excludes every server-set field (who corrected, when), and the read
shapes are assembled views that do not exist as tables at all.
"""

import datetime as dt

from pydantic import BaseModel


class CorrectionUpsert(BaseModel):
    """What a manager sends. 'corrected_by' and the timestamps are server-set."""

    corrected_demand: int
    reason: str | None = None


class CorrectionRead(BaseModel):
    """A correction as the client sees it."""

    corrected_demand: int
    reason: str | None
    corrected_by: str
    corrected_at: dt.datetime
    updated_at: dt.datetime


class DayFacts(BaseModel):
    """One ward-day: the forecast joined to the roster, plus any correction.

    The business rules in forecast_service operate on this.
    """

    date: dt.date
    forecast_demand: int
    confidence: float
    planned_staffing: int
    correction: CorrectionRead | None = None


class DayView(DayFacts):
    """A day as the client sees it: the facts plus the derived values."""

    effective_demand: int
    is_understaffed: bool
    is_past: bool


class WeeklySummary(BaseModel):
    """The week's three headline numbers for a ward."""

    total_understaffing: int
    correction_count: int
    avg_deviation: float


class WeekView(BaseModel):
    """A ward's whole week: the bounds, each day, and the summary."""

    ward_id: int
    week_start: dt.date
    week_end: dt.date
    days: list[DayView]
    summary: WeeklySummary

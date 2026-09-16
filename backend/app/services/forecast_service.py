"""Read-side business rules: assembling ward-days and summarising a week."""

import datetime as dt

from sqlmodel import Session, select

from app.config import get_today
from app.models import DemandCorrection, DemandForecast, PlannedStaffing
from app.schemas import CorrectionRead, DayFacts, DayView, WeeklySummary, WeekView

DAYS_IN_WEEK = 7


def week_bounds(anchor: dt.date) -> tuple[dt.date, dt.date]:
    """Return the Monday-Sunday ISO week containing 'anchor'."""
    monday = anchor - dt.timedelta(days=anchor.weekday())
    return monday, monday + dt.timedelta(days=DAYS_IN_WEEK - 1)


def understaffed(day: DayFacts) -> bool:
    """Based on the original forecast: it flags what the model saw, not what the
    manager decided afterwards."""
    return day.forecast_demand > day.planned_staffing


def effective_demand(day: DayFacts) -> int:
    if day.correction is not None:
        return day.correction.corrected_demand
    return day.forecast_demand


def get_days(
    session: Session, ward_id: int, week_start: dt.date, week_end: dt.date
) -> list[DayFacts]:
    """Join forecast, roster and correction into the per-day view model.

    Every other rule in this module operates on the result. A day exists only where both
    a forecast and a roster entry exist for that (ward, date).
    """
    statement = (
        select(DemandForecast, PlannedStaffing, DemandCorrection)
        .join(
            PlannedStaffing,
            (PlannedStaffing.ward_id == DemandForecast.ward_id)
            & (PlannedStaffing.date == DemandForecast.date),
        )
        .outerjoin(DemandCorrection, DemandCorrection.forecast_id == DemandForecast.id)
        .where(
            DemandForecast.ward_id == ward_id,
            DemandForecast.date >= week_start,
            DemandForecast.date <= week_end,
        )
        .order_by(DemandForecast.date)
    )
    return [
        DayFacts(
            date=forecast.date,
            forecast_demand=forecast.forecast_demand,
            confidence=forecast.confidence,
            planned_staffing=roster.planned_staffing,
            correction=(
                CorrectionRead.model_validate(correction, from_attributes=True)
                if correction is not None
                else None
            ),
        )
        for forecast, roster, correction in session.exec(statement).all()
    ]


def to_day_view(day: DayFacts, today: dt.date) -> DayView:
    """Attach the derived, client-facing fields to an assembled day."""
    return DayView(
        **day.model_dump(),
        effective_demand=effective_demand(day),
        is_understaffed=understaffed(day),
        is_past=day.date < today,
    )


def find_forecast_id(session: Session, ward_id: int, date: dt.date) -> int | None:
    """Resolve the forecast being corrected from its (ward, date). What the PUT
    correction endpoint needs before it can call correction_service."""
    return session.exec(
        select(DemandForecast.id).where(
            DemandForecast.ward_id == ward_id, DemandForecast.date == date
        )
    ).one_or_none()


def get_day(session: Session, ward_id: int, date: dt.date) -> DayFacts | None:
    """The single assembled day for (ward, date)."""
    days = get_days(session, ward_id, date, date)
    return days[0] if days else None


def summarise_week(days: list[DayFacts]) -> WeeklySummary:
    if not days:
        return WeeklySummary(total_understaffing=0, correction_count=0, avg_deviation=0.0)

    total_understaffing = sum(max(0, day.forecast_demand - day.planned_staffing) for day in days)
    deviations = [abs(effective_demand(day) - day.forecast_demand) for day in days]
    return WeeklySummary(
        total_understaffing=total_understaffing,
        correction_count=sum(1 for day in days if day.correction is not None),
        avg_deviation=sum(deviations) / len(days),
    )


def get_week(session: Session, ward_id: int, week_start: dt.date) -> WeekView:
    """The week view for a ward, for the ISO week containing `week_start`."""
    today = get_today()
    start, end = week_bounds(week_start)
    days = get_days(session, ward_id, start, end)
    return WeekView(
        ward_id=ward_id,
        week_start=start,
        week_end=end,
        days=[to_day_view(day, today) for day in days],
        summary=summarise_week(days),
    )

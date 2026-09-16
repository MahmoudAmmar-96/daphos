"""GET /wards, GET /wards/{ward_id}/forecasts, GET /wards/{ward_id}/summary.

Thin: parse the request, call forecast_service, return its result. No
business rules live here.
"""

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.date_utils import parse_iso_week
from app.db import get_session
from app.models import Ward
from app.schemas import DayView, WeeklySummary
from app.services import forecast_service

router = APIRouter(prefix="/wards", tags=["wards"])


def _week_anchor(week: str) -> dt.date:
    """Turn a '?week=YYYY-Www' into the Monday to view."""
    try:
        return parse_iso_week(week)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[Ward])
def list_wards(session: Session = Depends(get_session)) -> list[Ward]:
    return list(session.exec(select(Ward)).all())


@router.get("/{ward_id}/forecasts", response_model=list[DayView])
def list_forecasts(
    ward_id: int,
    week: str = Query(description="ISO week, e.g. 2026-W38"),
    session: Session = Depends(get_session),
) -> list[DayView]:
    week_view = forecast_service.get_week(session, ward_id, week_start=_week_anchor(week))
    return week_view.days


@router.get("/{ward_id}/summary", response_model=WeeklySummary)
def week_summary(
    ward_id: int,
    week: str = Query(description="ISO week, e.g. 2026-W38"),
    session: Session = Depends(get_session),
) -> WeeklySummary:
    week_view = forecast_service.get_week(session, ward_id, week_start=_week_anchor(week))
    return week_view.summary

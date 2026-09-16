"""PUT /wards/{ward_id}/forecasts/{date}/correction.

Thin: resolve the forecast, call correction_service's upsert, translate its
plain exceptions to HTTP, and return the day in the same shape the forecasts list uses.
"""

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.config import CURRENT_USER, get_today
from app.db import get_session
from app.schemas import CorrectionUpsert, DayView
from app.services import forecast_service
from app.services.correction_service import CorrectionRejected, ForecastNotFound, upsert_correction

router = APIRouter(prefix="/wards", tags=["corrections"])


@router.put("/{ward_id}/forecasts/{date}/correction", response_model=DayView)
def correct_forecast(
    ward_id: int,
    date: dt.date,
    payload: CorrectionUpsert,
    session: Session = Depends(get_session),
) -> DayView:
    forecast_id = forecast_service.find_forecast_id(session, ward_id, date)
    if forecast_id is None:
        raise HTTPException(status_code=404, detail=f"No forecast for ward {ward_id} on {date}.")

    try:
        upsert_correction(session, forecast_id, payload, corrected_by=CURRENT_USER)
    except ForecastNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CorrectionRejected as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    day = forecast_service.get_day(session, ward_id, date)
    if day is None:
        raise HTTPException(status_code=500, detail="Correction saved but day could not be reloaded.")
    return forecast_service.to_day_view(day, get_today())

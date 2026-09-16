"""Write-side business rules: validating and upserting a manager's correction.
"""

import datetime as dt

from sqlmodel import Session, select

from app.config import DEVIATION_JUSTIFICATION_THRESHOLD, get_today
from app.models import DemandCorrection, DemandForecast
from app.schemas import CorrectionUpsert


class CorrectionError(Exception):
    """Base class for correction failures the router translates to a 4xx response."""


class ForecastNotFound(CorrectionError):
    """No such forecast to correct (-> 404)."""


class CorrectionRejected(CorrectionError):
    """The correction broke a business rule (-> 422)."""


def requires_reason(forecast_demand: int, corrected_demand: int) -> bool:
    """True when the correction deviates far enough to need a written justification."""
    if forecast_demand == 0:
        return corrected_demand != 0
    deviation = abs(corrected_demand - forecast_demand) / forecast_demand
    return deviation > DEVIATION_JUSTIFICATION_THRESHOLD


def validate_correction(forecast: DemandForecast, payload: CorrectionUpsert) -> None:
    """Raise CorrectionRejected if the correction may not be stored."""
    if payload.corrected_demand < 0:
        raise CorrectionRejected("Corrected demand cannot be negative.")

    if forecast.date < get_today():
        raise CorrectionRejected(f"Cannot correct {forecast.date}: the day is in the past.")

    reason = (payload.reason or "").strip()
    if not reason and requires_reason(forecast.forecast_demand, payload.corrected_demand):
        threshold_pct = round(DEVIATION_JUSTIFICATION_THRESHOLD * 100)
        raise CorrectionRejected(
            f"A reason is required for corrections deviating more than {threshold_pct}% "
            "from the forecast."
        )


def upsert_correction(
    session: Session,
    forecast_id: int,
    payload: CorrectionUpsert,
    corrected_by: str,
) -> DemandCorrection:
    """Create the correction for a forecast, or edit the existing one in place."""
    forecast = session.get(DemandForecast, forecast_id)
    if forecast is None:
        raise ForecastNotFound(f"No forecast with id {forecast_id}.")

    validate_correction(forecast, payload)

    reason = (payload.reason or "").strip() or None
    now = dt.datetime.now(dt.timezone.utc)
    correction = session.exec(
        select(DemandCorrection).where(DemandCorrection.forecast_id == forecast_id)
    ).one_or_none()

    if correction is None:
        correction = DemandCorrection(
            forecast_id=forecast_id,
            corrected_demand=payload.corrected_demand,
            reason=reason,
            corrected_by=corrected_by,
            corrected_at=now,
            updated_at=now,
        )
    else:
        correction.corrected_demand = payload.corrected_demand
        correction.reason = reason
        correction.corrected_by = corrected_by
        correction.updated_at = now

    session.add(correction)
    session.commit()
    session.refresh(correction)
    return correction

"""Correction validation rules, exercised directly against the service."""

import datetime as dt
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models import DemandForecast, Ward
from app.schemas import CorrectionUpsert
from app.services.correction_service import (
    CorrectionRejected,
    ForecastNotFound,
    requires_reason,
    upsert_correction,
)

TODAY = "2026-09-15"
FORECAST_DEMAND = 10
FUTURE_DATE = dt.date(2026, 9, 17)
PAST_DATE = dt.date(2026, 9, 10)
MANAGER = "Mahmoud Ammar"


@pytest.mark.parametrize(
    "forecast_demand, corrected_demand, expected",
    [
        pytest.param(0, 0, False, id="zero_forecast_unchanged"),
        pytest.param(0, 5, True, id="zero_forecast_any_move_needs_reason"),
        pytest.param(10, 12, False, id="exactly_20_percent_is_within_threshold"),
        pytest.param(10, 13, True, id="just_over_20_percent_needs_reason"),
    ],
)
def test_requires_reason(forecast_demand: int, corrected_demand: int, expected: bool) -> None:
    assert requires_reason(forecast_demand, corrected_demand) is expected


@pytest.fixture(autouse=True)
def frozen_today(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMULATED_TODAY", TODAY)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def forecast_ids(session: Session) -> dict[str, int]:
    """One ward with a forecast day in the future and one in the past."""
    ward = Ward(name="Ward 3B", code="W3B")
    session.add(ward)
    session.commit()

    ids: dict[str, int] = {}
    for label, day in (("future", FUTURE_DATE), ("past", PAST_DATE)):
        forecast = DemandForecast(
            ward_id=ward.id,
            date=day,
            forecast_demand=FORECAST_DEMAND,
            confidence=0.8,
        )
        session.add(forecast)
        session.commit()
        ids[label] = forecast.id
    return ids


# (day, corrected_demand, reason, expected failure or None for "accepted")
CASES = [
    pytest.param("future", -1, None, CorrectionRejected, id="negative_demand_rejected"),
    pytest.param("future", 0, "Ward closing for the day", None, id="zero_demand_is_accepted"),
    pytest.param("past", 11, "Flu wave", CorrectionRejected, id="past_day_rejected"),
    pytest.param("future", 13, None, CorrectionRejected, id="big_deviation_no_reason_rejected"),
    pytest.param("future", 13, "   ", CorrectionRejected, id="big_deviation_blank_reason_rejected"),
    pytest.param("future", 13, "Flu wave expected", None, id="big_deviation_with_reason_ok"),
    pytest.param("future", 11, None, None, id="small_deviation_no_reason_ok"),
]


@pytest.mark.parametrize("day, corrected_demand, reason, expected_error", CASES)
def test_correction_validation(
    session: Session,
    forecast_ids: dict[str, int],
    day: str,
    corrected_demand: int,
    reason: str | None,
    expected_error: type[Exception] | None,
) -> None:
    payload = CorrectionUpsert(corrected_demand=corrected_demand, reason=reason)

    if expected_error is not None:
        with pytest.raises(expected_error):
            upsert_correction(session, forecast_ids[day], payload, MANAGER)
        return

    correction = upsert_correction(session, forecast_ids[day], payload, MANAGER)
    assert correction.corrected_demand == corrected_demand
    assert correction.corrected_by == MANAGER
    assert correction.corrected_at == correction.updated_at


def test_reason_is_trimmed_when_stored(session: Session, forecast_ids: dict[str, int]) -> None:
    payload = CorrectionUpsert(corrected_demand=13, reason="  Flu wave expected  ")
    correction = upsert_correction(session, forecast_ids["future"], payload, MANAGER)
    assert correction.reason == "Flu wave expected"


def test_blank_reason_is_stored_as_none(session: Session, forecast_ids: dict[str, int]) -> None:
    payload = CorrectionUpsert(corrected_demand=11, reason="   ")
    correction = upsert_correction(session, forecast_ids["future"], payload, MANAGER)
    assert correction.reason is None


def test_second_upsert_edits_in_place(session: Session, forecast_ids: dict[str, int]) -> None:
    forecast_id = forecast_ids["future"]
    first = upsert_correction(
        session, forecast_id, CorrectionUpsert(corrected_demand=11), MANAGER
    )
    created_id, created_at = first.id, first.corrected_at

    second = upsert_correction(
        session,
        forecast_id,
        CorrectionUpsert(corrected_demand=14, reason="Flu wave expected"),
        MANAGER,
    )

    assert second.id == created_id
    assert second.corrected_demand == 14
    assert second.reason == "Flu wave expected"
    assert second.corrected_at == created_at
    assert second.updated_at >= created_at


def test_unknown_forecast_is_rejected(session: Session) -> None:
    with pytest.raises(ForecastNotFound):
        upsert_correction(session, 999, CorrectionUpsert(corrected_demand=5), MANAGER)

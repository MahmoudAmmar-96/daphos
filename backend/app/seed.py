"""Seed data generation and insertion.

'generate_seed_data' is deterministic. 'seed_if_empty' is 
the only function here that touches a session.
"""

import datetime as dt
import random

from sqlmodel import Session, select

from app.config import DATABASE_PATH, get_today
from app.models import DemandForecast, PlannedStaffing, Ward

# (name, code, base forecast demand, base planned staffing).
WARD_DEFS = [
    ("B3", "B3", 24.0, 22),
    ("ICU-1", "ICU1", 14.0, 13),
    ("Pediatrics", "PED", 18.0, 19),
    ("ER", "ER", 30.0, 27),
    ("Maternity", "MAT", 16.0, 16),
]

# Mon=0 .. Sun=6: midweek runs busier, weekends quieter.
WEEKDAY_MULTIPLIER = {0: 1.05, 1: 1.08, 2: 1.10, 3: 1.08, 4: 1.02, 5: 0.80, 6: 0.75}

WEEKS_OF_DATA = 4
MIN_CONFIDENCE = 0.55
MAX_CONFIDENCE = 0.95
CONFIDENCE_DECAY_PER_DAY = 0.015


def generate_seed_data(
    today: dt.date, seed: int = 42
) -> tuple[list[Ward], list[DemandForecast], list[PlannedStaffing]]:
    """Build a deterministic slice of wards, forecasts and rosters around 'today'."""
    rng = random.Random(seed)

    wards = [
        Ward(id=i, name=name, code=code) for i, (name, code, _, _) in enumerate(WARD_DEFS, start=1)
    ]

    week_before = today - dt.timedelta(days=7)
    start = week_before - dt.timedelta(days=week_before.weekday())  # Monday
    end = start + dt.timedelta(days=WEEKS_OF_DATA * 7 - 1)  # Sunday, 4 weeks later
    dates = [start + dt.timedelta(days=offset) for offset in range((end - start).days + 1)]

    forecasts: list[DemandForecast] = []
    staffing: list[PlannedStaffing] = []

    for ward, (_, _, base_demand, base_staffing) in zip(wards, WARD_DEFS, strict=True):
        for date in dates:
            weekday_mult = WEEKDAY_MULTIPLIER[date.weekday()]
            demand_noise = rng.uniform(-1.5, 1.5)
            forecast_demand = max(0, round(base_demand * weekday_mult + demand_noise))

            distance = abs((date - today).days)
            confidence_ceiling = max(MIN_CONFIDENCE, MAX_CONFIDENCE - distance * CONFIDENCE_DECAY_PER_DAY)
            confidence = round(rng.uniform(MIN_CONFIDENCE, confidence_ceiling), 2)

            forecasts.append(
                DemandForecast(
                    ward_id=ward.id,
                    date=date,
                    forecast_demand=forecast_demand,
                    confidence=confidence,
                )
            )

            planned = max(1, base_staffing + rng.randint(-3, 3))
            staffing.append(PlannedStaffing(ward_id=ward.id, date=date, planned_staffing=planned))

    return wards, forecasts, staffing


def seed_if_empty(session: Session) -> None:
    """Insert the seed dataset, but only if DemandForecast is currently empty."""
    already_seeded = session.exec(select(DemandForecast.id).limit(1)).first() is not None
    if already_seeded:
        return

    wards, forecasts, staffing = generate_seed_data(get_today())
    session.add_all(wards)
    session.commit()
    session.add_all(forecasts)
    session.add_all(staffing)
    session.commit()


if __name__ == "__main__":
    # Manual re-seed for development: 'python -m app.seed'.
    # Refuses if data already exists rather than clearing it.
    # Delete the DB file yourself first if you want a fresh dataset.
    from app.db import create_db_and_tables, engine

    create_db_and_tables()
    with Session(engine) as cli_session:
        if cli_session.exec(select(DemandForecast.id).limit(1)).first() is not None:
            print(
                f"Seed data already present. Refusing to reseed. Delete {DATABASE_PATH} "
                "and rerun this command for a fresh dataset."
            )
        else:
            seed_if_empty(cli_session)
            print(f"Seed data inserted into {DATABASE_PATH}.")

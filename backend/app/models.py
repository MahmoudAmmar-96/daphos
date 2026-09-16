"""Persistence model.

Forecast, planned staffing and correction are three tables on purpose: they come from
three independently-updated sources.
"""

import datetime as dt

from sqlmodel import Field, SQLModel, UniqueConstraint


class Ward(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    code: str = Field(unique=True, index=True)


class DemandForecast(SQLModel, table=True):
    """Model output. Seeded and immutable."""

    __table_args__ = (UniqueConstraint("ward_id", "date"),)

    id: int | None = Field(default=None, primary_key=True)
    ward_id: int = Field(foreign_key="ward.id", index=True)
    date: dt.date = Field(index=True)
    forecast_demand: int
    confidence: float


class PlannedStaffing(SQLModel, table=True):
    """The existing roster. Seeded, immutable, and not derived from the forecast."""

    __table_args__ = (UniqueConstraint("ward_id", "date"),)

    id: int | None = Field(default=None, primary_key=True)
    ward_id: int = Field(foreign_key="ward.id", index=True)
    date: dt.date = Field(index=True)
    planned_staffing: int


class DemandCorrection(SQLModel, table=True):
    """A manager's override of one forecast. At most one per forecast, edited in place."""

    id: int | None = Field(default=None, primary_key=True)
    forecast_id: int = Field(foreign_key="demandforecast.id", unique=True)
    corrected_demand: int
    reason: str | None = None
    corrected_by: str
    corrected_at: dt.datetime
    updated_at: dt.datetime

"""FastAPI app: creates the schema, seeds on first startup, wires up the routers."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.config import CORS_ORIGINS
from app.db import create_db_and_tables, engine
from app.routers import corrections, wards
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    create_db_and_tables()
    with Session(engine) as session:
        seed_if_empty(session)
    yield


app = FastAPI(title="Daphos Forecast Review", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "PUT"],
    allow_headers=["Content-Type"],
)
app.include_router(wards.router)
app.include_router(corrections.router)

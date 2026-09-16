"""Database engine and the request-scoped session dependency.

Lives in its own module because main.py, the routers, and seed.py's 
CLI entry all need the same engine, and main.py importing the routers 
while the routers import main.py back would be a circular import.
"""

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

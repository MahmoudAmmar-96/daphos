"""Application settings and the single source of truth for "today"."""

import os
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# A correction that moves demand by more than this fraction 
# of the original forecast must carry a written reason.
DEVIATION_JUSTIFICATION_THRESHOLD = 0.20

# No auth in this app: every correction is attributed to the one implicit ward manager.
CURRENT_USER = "Mahmoud Ammar"

DATABASE_PATH = Path(os.getenv("DAPHOS_DB_PATH", str(BASE_DIR / "daphos.db")))
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# The Vite dev server. The SPA is served from a different origin than the API, so the
# browser needs these allowed explicitly. A real deployment would list its own host.
CORS_ORIGINS = os.getenv(
    "DAPHOS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

DEFAULT_SIMULATED_TODAY = "2026-09-15"


def get_today() -> date:
    """Return the date the app treats as today.

    Deliberate seam: "today" is read from SIMULATED_TODAY so the demo always sits in the
    middle of the seeded data, with real past days behind it and correctable days ahead.
    In production this function would simply return date.today().
    """
    return date.fromisoformat(os.getenv("SIMULATED_TODAY", DEFAULT_SIMULATED_TODAY))

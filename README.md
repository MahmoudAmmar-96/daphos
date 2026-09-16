# Forecast Review

A ward manager's screen for reviewing a week of staffing demand forecasts and correcting
any that look wrong, with the reasoning captured alongside each correction.

<img width="1311" height="536" alt="image" src="https://github.com/user-attachments/assets/ca069fd2-c596-495a-a04c-d310d3370f02" />

## Setup

Two services, no Docker: a FastAPI backend and a React/Vite frontend. Run both to use the
app end to end.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs at **http://localhost:8000** by default (uvicorn's own default). Interactive API docs
are at `http://localhost:8000/docs`. On first startup it creates the SQLite database
(`backend/daphos.db`) and seeds it automatically (see below).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:5173** (Vite's default). It talks to the backend via
`VITE_API_BASE_URL`, which defaults to `http://localhost:8000` if unset (see
`frontend/.env.example`, copy it to `.env.local` to override).

### Running the tests

```bash
cd backend && pytest          # correction validation rules
cd frontend && npm test       # DayCell's risk/confidence encoding
```

## How the seed data is generated

**There is no trained model.** `forecast_demand` and `confidence` are seeded, deterministic
synthetic data.

On first startup, the FastAPI app's lifespan (`app/main.py`) creates the schema and calls
`seed_if_empty()` (`app/seed.py`), which only inserts data if the `demandforecast` table is
still empty. It never overwrites an existing database.

`generate_seed_data()` builds five wards (B3, ICU-1, Pediatrics, ER, Maternity), each with
its own base demand and base staffing level, then generates two **independent** series per
ward-day:

- **`forecast_demand`**: the ward's base demand x a weekday multiplier (busier midweek,
  quieter on weekends) + small random noise, rounded to a whole headcount.
- **`planned_staffing`**: the ward's base staffing +/- a random offset, generated
  completely separately from demand.

These two are deliberately not derived from one another, they represent two different
real-world sources that update independently (a demand-forecasting engine vs. a
separately-maintained roster system).

**`confidence`** is randomised within a band whose ceiling shrinks the further a date is
from "today".

The whole thing is **deterministic**: the random generator is seeded with a fixed integer
(`seed=42`).

**To (re-)populate the seed data manually:**

```bash
cd backend
python -m app.seed
```

If the database already has forecast data, this **refuses to reseed** and prints a message
telling you to delete the DB file yourself first.

### Resetting the database

To wipe all data (including any corrections) and get a fresh seed:

```bash
cd backend
rm daphos.db
uvicorn app.main:app --reload
```

No separate seed command needed because starting the server re-creates the schema and reseeds
automatically.

## "Today" and the past-day restriction

The app never reads the real system clock for "today." `get_today()` (`app/config.py`)
reads the `SIMULATED_TODAY` environment variable, defaulting to `2026-09-15`, so the demo
always sits in the middle of the seeded 4-week range regardless of when you actually run
it. This same value is what the "you can't correct a day that's already passed" rule checks
against.

To change it:

```bash
SIMULATED_TODAY=2026-09-20 uvicorn app.main:app --reload
```

Note this only shifts which existing seeded days count as past vs. future, the seed data
itself is generated once, relative to whatever "today" was the first time the (empty)
database started up, and doesn't regenerate when `SIMULATED_TODAY` changes afterward.

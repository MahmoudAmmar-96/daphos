"""ISO week parsing. The one place that turns a '?week=YYYY-Www' 
query string into a date.
"""

import datetime as dt


def parse_iso_week(week: str) -> dt.date:
    """Parse an ISO week string like '2026-W38' into the Monday of that week.

    Raises ValueError (translated to a 400 by the router) on a malformed string.
    """
    try:
        year_str, week_str = week.split("-W")
        return dt.date.fromisocalendar(int(year_str), int(week_str), 1)
    except (ValueError, IndexError) as exc:
        raise ValueError(f"Invalid ISO week string: {week!r} (expected YYYY-Www)") from exc

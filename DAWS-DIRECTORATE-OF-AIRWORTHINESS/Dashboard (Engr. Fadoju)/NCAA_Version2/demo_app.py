from __future__ import annotations

from datetime import date, timedelta
from difflib import get_close_matches
from itertools import product
from pathlib import Path
import random
import re
import sqlite3

import pandas as pd
import streamlit as st


SCENARIO_MARKS = {
    "Assigned aircraft example": "5N-ABC",
    "Reusable historical mark": "5N-AAD",
    "Reserved special mark": "5N-CCA",
    "Unused fresh mark": "5N-ZZZ",
}

NOTICE_STATES = [
    "Pending Review",
    "Call Logged",
    "Email Drafted",
    "Ready for Reuse",
]

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DATA_DIR / "ncaa_demo.db"

KNOWN_OPERATORS = [
    "Rano Air",
    "Air Peace",
    "Arik Air",
    "Ibom Air",
    "Overland Airways",
    "Max Air",
    "Private Owner",
    "Aero Contractors",
    "NCAA",
]

KNOWN_MANUFACTURERS = [
    "Airbus",
    "ATR",
    "Boeing",
    "Cessna",
    "Diamond",
    "Embraer",
    "Leonardo",
]

KNOWN_MODELS = [
    "A320",
    "72-600",
    "737-500",
    "737-800",
    "208B Grand Caravan",
    "DA42",
    "ERJ-145",
    "AW139",
]

KNOWN_AIRCRAFT_TYPES = [
    "Fixed Wing",
    "Rotorcraft",
]

OPERATOR_ALIASES = {
    "rano ar": "Rano Air",
    "ranoair": "Rano Air",
    "airpeace": "Air Peace",
    "air pece": "Air Peace",
    "arikair": "Arik Air",
    "ibomair": "Ibom Air",
    "overland air": "Overland Airways",
    "overland": "Overland Airways",
    "aero contractor": "Aero Contractors",
    "aerocontractors": "Aero Contractors",
}

MANUFACTURER_ALIASES = {
    "air bus": "Airbus",
    "boing": "Boeing",
    "boeingg": "Boeing",
    "embraar": "Embraer",
    "embroer": "Embraer",
    "leonado": "Leonardo",
    "leonado": "Leonardo",
}

MODEL_ALIASES = {
    "737800": "737-800",
    "737 800": "737-800",
    "737500": "737-500",
    "737 500": "737-500",
    "72600": "72-600",
    "72 600": "72-600",
    "aw 139": "AW139",
    "aw139": "AW139",
    "erj145": "ERJ-145",
    "erj 145": "ERJ-145",
    "grand caravan": "208B Grand Caravan",
    "208b grandcaravan": "208B Grand Caravan",
}

ACRONYM_WORDS = {
    "NCAA": "NCAA",
    "DAWS": "DAWS",
    "C of R": "C of R",
}


def all_suffixes() -> list[str]:
    return ["".join(chars) for chars in product("ABCDEFGHIJKLMNOPQRSTUVWXYZ", repeat=3)]


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def normalize_mark_input(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "", value).upper()
    if cleaned.startswith("5N"):
        cleaned = cleaned[2:]
    letters = re.sub(r"[^A-Z]+", "", cleaned)
    return letters[-3:]


def fuzzy_match_value(query: str, choices: list[str], cutoff: float = 0.78) -> str | None:
    if not query or not choices:
        return None
    match = get_close_matches(query, choices, n=1, cutoff=cutoff)
    return match[0] if match else None


def clean_spacing_and_punctuation(value: str) -> str:
    text = re.sub(r"\s+", " ", value).strip()
    text = re.sub(r"\s+([,.;:/-])", r"\1", text)
    text = re.sub(r"([,.;:])(?!\s|$)", r"\1 ", text)
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s*/\s*", "/", text)
    return text.strip()


def smart_title_case(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""

    words: list[str] = []
    for word in cleaned.split(" "):
        plain = re.sub(r"[^A-Za-z0-9]", "", word)
        if plain.upper() in ACRONYM_WORDS:
            words.append(ACRONYM_WORDS[plain.upper()])
        elif plain.isupper() and 2 <= len(plain) <= 5:
            words.append(word.upper())
        elif "/" in word:
            words.append("/".join(part.capitalize() if part else part for part in word.split("/")))
        elif "-" in word and not any(char.isdigit() for char in word):
            words.append("-".join(part.capitalize() if part else part for part in word.split("-")))
        else:
            words.append(word.capitalize())
    return " ".join(words)


def canonicalize_from_choices(
    value: str,
    choices: list[str],
    aliases: dict[str, str] | None = None,
    fallback_title: bool = True,
) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""

    normalized = normalize_text(cleaned)
    if aliases:
        alias_match = aliases.get(normalized)
        if alias_match:
            return alias_match

    normalized_map = {normalize_text(choice): choice for choice in choices}
    if normalized in normalized_map:
        return normalized_map[normalized]

    match = fuzzy_match_value(normalized, list(normalized_map.keys()), cutoff=0.7)
    if match:
        return normalized_map[match]

    return smart_title_case(cleaned) if fallback_title else cleaned


def canonicalize_serial_number(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value).upper()
    cleaned = re.sub(r"[^A-Z0-9/-]", "", cleaned)
    return cleaned


def canonicalize_note(value: str) -> str:
    cleaned = clean_spacing_and_punctuation(value)
    if not cleaned:
        return ""
    cleaned = cleaned[0].upper() + cleaned[1:] if len(cleaned) > 1 else cleaned.upper()
    if cleaned[-1] not in ".!?":
        cleaned = cleaned + "."
    return cleaned


def canonicalize_full_mark(value: str) -> tuple[str, str] | tuple[None, None]:
    suffix = normalize_mark_input(value)
    if len(suffix) != 3:
        return None, None
    return f"5N-{suffix}", suffix


def canonicalize_operator_name(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_OPERATORS, OPERATOR_ALIASES)


def canonicalize_manufacturer(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_MANUFACTURERS, MANUFACTURER_ALIASES)


def canonicalize_model(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_MODELS, MODEL_ALIASES, fallback_title=False)


def canonicalize_aircraft_type(value: str) -> str:
    return canonicalize_from_choices(value, KNOWN_AIRCRAFT_TYPES, fallback_title=False)


def init_demo_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS registry_overrides (
                full_mark TEXT PRIMARY KEY,
                suffix TEXT NOT NULL,
                owner TEXT NOT NULL,
                operator_name TEXT NOT NULL,
                manufacturer TEXT NOT NULL,
                model TEXT NOT NULL,
                serial_number TEXT NOT NULL,
                aircraft_type TEXT NOT NULL,
                registration_date TEXT NOT NULL,
                reviewer TEXT NOT NULL,
                reviewer_note TEXT NOT NULL,
                saved_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_mark TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def load_saved_overrides() -> pd.DataFrame:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        query = """
            SELECT
                full_mark,
                suffix,
                owner,
                operator_name,
                manufacturer,
                model,
                serial_number,
                aircraft_type,
                registration_date,
                reviewer,
                reviewer_note,
                saved_at
            FROM registry_overrides
        """
        return pd.read_sql_query(query, conn)


def save_registry_override(payload: dict[str, str]) -> None:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO registry_overrides (
                full_mark,
                suffix,
                owner,
                operator_name,
                manufacturer,
                model,
                serial_number,
                aircraft_type,
                registration_date,
                reviewer,
                reviewer_note,
                saved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(full_mark) DO UPDATE SET
                suffix=excluded.suffix,
                owner=excluded.owner,
                operator_name=excluded.operator_name,
                manufacturer=excluded.manufacturer,
                model=excluded.model,
                serial_number=excluded.serial_number,
                aircraft_type=excluded.aircraft_type,
                registration_date=excluded.registration_date,
                reviewer=excluded.reviewer,
                reviewer_note=excluded.reviewer_note,
                saved_at=excluded.saved_at
            """,
            (
                payload["full_mark"],
                payload["suffix"],
                payload["owner"],
                payload["operator_name"],
                payload["manufacturer"],
                payload["model"],
                payload["serial_number"],
                payload["aircraft_type"],
                payload["registration_date"],
                payload["reviewer"],
                payload["reviewer_note"],
                payload["saved_at"],
            ),
        )
        conn.execute(
            """
            INSERT INTO audit_log (full_mark, action, details, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload["full_mark"],
                "C_OR_UPLOAD_CONFIRMED",
                f"Saved by {payload['reviewer']} for operator {payload['operator_name']}",
                payload["saved_at"],
            ),
        )
        conn.commit()


def recent_saved_overrides(limit: int = 10) -> pd.DataFrame:
    init_demo_db()
    with sqlite3.connect(DB_PATH) as conn:
        query = f"""
            SELECT
                full_mark,
                operator_name,
                manufacturer,
                model,
                reviewer,
                saved_at
            FROM registry_overrides
            ORDER BY saved_at DESC
            LIMIT {int(limit)}
        """
        return pd.read_sql_query(query, conn)


def similar_phrase_in_text(text: str, phrases: list[str], cutoff: float = 0.82) -> bool:
    normalized_text = normalize_text(text)
    if not normalized_text:
        return False

    normalized_phrases = [normalize_text(phrase) for phrase in phrases]
    if any(phrase in normalized_text for phrase in normalized_phrases):
        return True

    words = normalized_text.split()
    windows: list[str] = []
    max_window = min(5, len(words))
    for size in range(1, max_window + 1):
        for start in range(0, len(words) - size + 1):
            windows.append(" ".join(words[start:start + size]))

    for window in windows:
        if fuzzy_match_value(window, normalized_phrases, cutoff=cutoff):
            return True
    return False


def format_date(value: object) -> str:
    if pd.isna(value):
        return "-"
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    return str(value)


def display_status(record: pd.Series) -> str:
    if record["current_status"] == "Available" and bool(record["previously_used"]):
        return "Available Again"
    return str(record["current_status"])


def status_class(record: pd.Series) -> str:
    label = display_status(record).lower().replace(" ", "-")
    return label


def metric_card(column: st.delta_generator.DeltaGenerator, title: str, value: str, subtitle: str, tone: str) -> None:
    column.markdown(
        f"""
        <div class="metric-card {tone}">
            <div class="metric-label">{title}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-subtitle">{subtitle}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def info_panel(title: str, body: str, tone: str = "slate") -> None:
    st.markdown(
        f"""
        <div class="info-panel {tone}">
            <div class="info-title">{title}</div>
            <div class="info-body">{body}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def inject_styles() -> None:
    st.markdown(
        """
        <style>
            .stApp {
                background: #f7f8fa;
            }
            .block-container {
                padding-top: 4.25rem;
                padding-bottom: 2.5rem;
            }
            [data-testid="stHeader"] {
                background: rgba(247, 248, 250, 0.95);
                border-bottom: 1px solid #e5e7eb;
                backdrop-filter: blur(6px);
            }
            [data-testid="stToolbar"] {
                right: 0.75rem;
            }
            [data-testid="stSidebar"] {
                background: #fbfbfc;
                border-right: 1px solid #e6e8eb;
            }
            .metric-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-left-width: 4px;
                border-radius: 12px;
                padding: 0.95rem 1rem 0.9rem 1rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                min-height: 128px;
            }
            .metric-card.blue { border-left-color: #1f4f82; }
            .metric-card.green { border-left-color: #4b647d; }
            .metric-card.gold { border-left-color: #6b7280; }
            .metric-card.red { border-left-color: #7c8796; }
            .metric-card.slate { border-left-color: #64748b; }
            .metric-label {
                color: #6b7280;
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                margin-bottom: 0.55rem;
            }
            .metric-value {
                color: #0f172a;
                font-size: 1.85rem;
                font-weight: 700;
                margin-bottom: 0.25rem;
            }
            .metric-subtitle {
                color: #64748b;
                font-size: 0.92rem;
                line-height: 1.45;
            }
            .status-chip {
                display: inline-block;
                padding: 0.32rem 0.78rem;
                border-radius: 999px;
                font-weight: 700;
                font-size: 0.82rem;
                margin-right: 0.45rem;
                margin-bottom: 0.35rem;
                border: 1px solid #dbe2ea;
            }
            .status-chip.assigned {
                background: #eef4f8;
                color: #244565;
                border-color: #d7e2ec;
            }
            .status-chip.available {
                background: #f4f7f9;
                color: #334155;
                border-color: #dde4ea;
            }
            .status-chip.available-again {
                background: #f6f7f9;
                color: #475569;
                border-color: #dbe1e7;
            }
            .status-chip.reserved {
                background: #f8f5ef;
                color: #5b6470;
                border-color: #e3ddd2;
            }
            .status-chip.special {
                background: #f5f5f5;
                color: #4b5563;
                border-color: #e5e7eb;
            }
            .info-panel {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 1rem 1.05rem;
                margin-bottom: 0.95rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .info-panel.navy { border-top: 3px solid #274c77; }
            .info-panel.green { border-top: 3px solid #5b6b7d; }
            .info-panel.gold { border-top: 3px solid #6b7280; }
            .info-panel.slate { border-top: 3px solid #7c8796; }
            .info-title {
                font-size: 0.98rem;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.35rem;
            }
            .info-body {
                color: #4b5563;
                line-height: 1.5;
                font-size: 0.94rem;
            }
            .stage-card {
                border-radius: 12px;
                padding: 0.95rem 0.95rem 0.85rem 0.95rem;
                min-height: 116px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
            }
            .stage-card.ready {
                background: #f8fafc;
                border-color: #dbe2ea;
            }
            .stage-card.pending {
                background: #ffffff;
                border-color: #e5e7eb;
            }
            .stage-label {
                font-size: 0.82rem;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.45rem;
            }
            .stage-title {
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.3rem;
            }
            .stage-body {
                color: #4b5563;
                font-size: 0.92rem;
                line-height: 1.45;
            }
            .trust-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 1rem 1.05rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .trust-answer {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 0.5rem;
            }
            .trust-basis {
                color: #4b5563;
                line-height: 1.55;
                font-size: 0.95rem;
            }
            .small-note {
                color: #6b7280;
                font-size: 0.9rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def seed_registry() -> pd.DataFrame:
    rng = random.Random(42)
    suffixes = all_suffixes()
    frame = pd.DataFrame(
        {
            "suffix": suffixes,
            "full_mark": [f"5N-{suffix}" for suffix in suffixes],
            "current_status": "Available",
            "previously_used": False,
            "aircraft_type": "",
            "manufacturer": "",
            "model": "",
            "serial_number": "",
            "owner": "",
            "operator": "",
            "registration_date": pd.NaT,
            "release_date": pd.NaT,
            "previous_owner": "",
            "special_mark": False,
            "notes": "",
            "previous_assignment_count": 0,
            "reuse_notice_status": "Fresh Mark",
            "reuse_ready": False,
            "review_flag": "",
            "last_action": "Mark preloaded into registry",
            "last_action_on": pd.Timestamp(date(2026, 1, 5)),
        }
    )

    operators = [
        "Rano Air",
        "Air Peace",
        "Arik Air",
        "Ibom Air",
        "Overland Airways",
        "Max Air",
        "Private Owner",
        "Aero Contractors",
    ]
    aircraft_pool = [
        ("Airbus", "A320", "Fixed Wing"),
        ("ATR", "72-600", "Fixed Wing"),
        ("Boeing", "737-500", "Fixed Wing"),
        ("Boeing", "737-800", "Fixed Wing"),
        ("Cessna", "208B Grand Caravan", "Fixed Wing"),
        ("Diamond", "DA42", "Fixed Wing"),
        ("Embraer", "ERJ-145", "Fixed Wing"),
        ("Leonardo", "AW139", "Rotorcraft"),
    ]

    assigned_suffixes = [
        "AAA",
        "AAB",
        "AAC",
        "AAE",
        "ABA",
        "ABC",
        "ACD",
        "ADF",
        "AKA",
        "BCA",
        "BCC",
        "CBA",
        "CCC",
        "CCD",
        "CCF",
        "CCG",
        "CCH",
        "CCI",
        "CCJ",
        "CCK",
        "CCL",
        "CCM",
    ]
    reusable_suffixes = [
        "AAD",
        "AAF",
        "AAG",
        "ABE",
        "ABB",
        "ABD",
        "ACA",
        "ACB",
        "BAA",
        "BAB",
        "BAC",
        "CAA",
    ]
    reserved_suffixes = ["CCA", "CCB", "CCE"]

    chosen_assigned = set(assigned_suffixes)
    while len(chosen_assigned) < 220:
        chosen_assigned.add(rng.choice(suffixes[350:6000]))

    chosen_reusable = {suffix for suffix in reusable_suffixes if suffix not in chosen_assigned}
    while len(chosen_reusable) < 48:
        candidate = rng.choice(suffixes[:2500])
        if candidate not in chosen_assigned:
            chosen_reusable.add(candidate)

    for index, suffix in enumerate(sorted(chosen_assigned)):
        manufacturer, model, aircraft_type = rng.choice(aircraft_pool)
        operator = operators[index % len(operators)]
        owner = operator if operator != "Private Owner" else f"Private Owner {index + 1}"
        reg_date = date(2006, 1, 1) + timedelta(days=(index * 97) % 6200)
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "owner",
            "operator",
            "registration_date",
            "notes",
            "previous_assignment_count",
            "reuse_notice_status",
            "last_action",
            "last_action_on",
        ]] = [
            "Assigned",
            aircraft_type,
            manufacturer,
            model,
            f"SN-{suffix}-{1000 + index}",
            owner,
            operator,
            pd.Timestamp(reg_date),
            "Active aircraft registration",
            1 + (index % 2),
            "Not Applicable",
            "Assignment confirmed",
            pd.Timestamp(reg_date) + pd.Timedelta(days=8),
        ]

    for index, suffix in enumerate(sorted(chosen_reusable)):
        manufacturer, model, aircraft_type = rng.choice(aircraft_pool)
        previous_owner = operators[index % len(operators)]
        release_date = date(1998, 1, 1) + timedelta(days=(index * 131) % 7000)
        notice_status = NOTICE_STATES[index % len(NOTICE_STATES)]
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "previously_used",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "previous_owner",
            "release_date",
            "notes",
            "previous_assignment_count",
            "reuse_notice_status",
            "reuse_ready",
            "review_flag",
            "last_action",
            "last_action_on",
        ]] = [
            "Available",
            True,
            aircraft_type,
            manufacturer,
            model,
            f"OLD-{suffix}-{2000 + index}",
            previous_owner,
            pd.Timestamp(release_date),
            "Previously assigned and now reusable after deregistration review",
            1 + (index % 3),
            notice_status,
            notice_status == "Ready for Reuse",
            "Supervisor review recommended" if index % 4 == 0 else "",
            "Historical reuse review updated",
            pd.Timestamp(release_date) + pd.Timedelta(days=25),
        ]

    for offset, suffix in enumerate(reserved_suffixes):
        hold_date = pd.Timestamp(date(2026, 2, 10) + timedelta(days=offset * 5))
        frame.loc[frame["suffix"] == suffix, [
            "current_status",
            "special_mark",
            "notes",
            "reuse_notice_status",
            "last_action",
            "last_action_on",
        ]] = [
            "Reserved",
            True,
            "Special mark held pending payment and approval review",
            "Reserved Hold",
            "Reservation placed",
            hold_date,
        ]

    frame.loc[frame["suffix"] == "ABC", [
        "operator",
        "owner",
        "manufacturer",
        "model",
        "aircraft_type",
        "notes",
    ]] = [
        "Rano Air",
        "Rano Air",
        "Boeing",
        "737-800",
        "Fixed Wing",
        "Assigned example used in stakeholder demo",
    ]
    frame.loc[frame["suffix"] == "CCC", [
        "operator",
        "owner",
        "manufacturer",
        "model",
        "aircraft_type",
        "notes",
    ]] = [
        "Ibom Air",
        "Ibom Air",
        "Airbus",
        "A320",
        "Fixed Wing",
        "Recent current registration example",
    ]
    frame.loc[frame["suffix"] == "AAD", [
        "previous_owner",
        "release_date",
        "reuse_notice_status",
        "reuse_ready",
        "review_flag",
        "notes",
    ]] = [
        "Rano Air",
        pd.Timestamp(date(2012, 8, 14)),
        "Ready for Reuse",
        True,
        "",
        "Historical mark fully reviewed and ready for controlled reuse",
    ]
    frame.loc[frame["suffix"] == "ABE", [
        "previous_owner",
        "reuse_notice_status",
        "reuse_ready",
        "review_flag",
    ]] = [
        "Aero Contractors",
        "Pending Review",
        False,
        "Ownership evidence still being reconciled",
    ]
    frame.loc[frame["suffix"] == "ABB", [
        "previous_owner",
        "reuse_notice_status",
        "reuse_ready",
    ]] = [
        "Air Peace",
        "Call Logged",
        False,
    ]

    return frame.sort_values("suffix").reset_index(drop=True)


def load_registry() -> pd.DataFrame:
    frame = seed_registry()
    overrides = load_saved_overrides()
    if overrides.empty:
        return frame

    for _, row in overrides.iterrows():
        frame.loc[frame["suffix"] == row["suffix"], [
            "full_mark",
            "current_status",
            "aircraft_type",
            "manufacturer",
            "model",
            "serial_number",
            "owner",
            "operator",
            "registration_date",
            "notes",
            "previously_used",
            "reuse_notice_status",
            "reuse_ready",
            "review_flag",
            "last_action",
            "last_action_on",
        ]] = [
            row["full_mark"],
            "Assigned",
            row["aircraft_type"],
            row["manufacturer"],
            row["model"],
            row["serial_number"],
            row["owner"],
            row["operator_name"],
            pd.Timestamp(row["registration_date"]),
            row["reviewer_note"],
            False,
            "Not Applicable",
            False,
            "",
            "C of R upload confirmed",
            pd.Timestamp(row["saved_at"]),
        ]
    return frame


def metric_value(frame: pd.DataFrame, status: str) -> int:
    return int((frame["current_status"] == status).sum())


def recent_registrations(frame: pd.DataFrame, years: int) -> int:
    cutoff = pd.Timestamp(date.today() - timedelta(days=365 * years))
    return int((frame["registration_date"].notna() & (frame["registration_date"] >= cutoff)).sum())


def known_operators(frame: pd.DataFrame) -> list[str]:
    names = set(frame["operator"].dropna().tolist()) | set(frame["previous_owner"].dropna().tolist()) | set(KNOWN_OPERATORS)
    return sorted(name for name in names if name)


def current_operator_records(frame: pd.DataFrame, operator_name: str) -> pd.DataFrame:
    return frame[frame["operator"].fillna("").str.lower() == operator_name.lower()]


def historic_operator_records(frame: pd.DataFrame, operator_name: str) -> pd.DataFrame:
    return frame[frame["previous_owner"].fillna("").str.lower() == operator_name.lower()]


def history_count(frame: pd.DataFrame, operator_name: str) -> int:
    current = current_operator_records(frame, operator_name)
    historic = historic_operator_records(frame, operator_name)
    return int(len(pd.concat([current[["suffix"]], historic[["suffix"]]]).drop_duplicates()))


def reusable_candidates(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame[(frame["current_status"] == "Available") & (frame["previously_used"])].copy()
    result["display_status"] = result.apply(display_status, axis=1)
    return result.sort_values(["reuse_ready", "release_date"], ascending=[False, True])


def match_operator(text: str, frame: pd.DataFrame) -> str | None:
    normalized_text = normalize_text(text)
    operators = known_operators(frame)
    normalized_map = {normalize_text(operator): operator for operator in operators}

    for normalized_operator, original_operator in sorted(normalized_map.items(), key=lambda item: len(item[0]), reverse=True):
        if normalized_operator in normalized_text:
            return original_operator

    words = normalized_text.split()
    windows: list[str] = []
    max_window = min(4, len(words))
    for size in range(1, max_window + 1):
        for start in range(0, len(words) - size + 1):
            windows.append(" ".join(words[start:start + size]))

    for window in windows:
        matched = fuzzy_match_value(window, list(normalized_map.keys()), cutoff=0.72)
        if matched:
            return normalized_map[matched]

    direct = fuzzy_match_value(normalized_text, list(normalized_map.keys()), cutoff=0.72)
    if direct:
        return normalized_map[direct]

    for operator in operators:
        if operator.lower() in normalized_text:
            return operator
    return None


def answer_question(question: str, frame: pd.DataFrame) -> dict[str, str | bool]:
    text = question.strip()
    normalized_text = normalize_text(text)
    active_count = metric_value(frame, "Assigned")
    available_count = metric_value(frame, "Available")
    reserved_count = metric_value(frame, "Reserved")
    recent_five = recent_registrations(frame, 5)
    reusable_ready = int(reusable_candidates(frame)["reuse_ready"].sum())
    operator = match_operator(text, frame)

    if similar_phrase_in_text(normalized_text, ["registered planes", "active aircraft", "currently registered", "current registered planes", "current aircraft total"]):
        return {
            "supported": True,
            "answer": f"There are {active_count} currently assigned aircraft in this demo dataset.",
            "basis": "Count registration marks where current status is Assigned.",
        }
    if similar_phrase_in_text(normalized_text, ["last 5 years", "last five years", "past 5 years", "past five years", "recent registrations"]):
        return {
            "supported": True,
            "answer": f"There are {recent_five} aircraft registrations in the last 5 years in this demo dataset.",
            "basis": "Count registrations with a registration date within the last five years.",
        }
    if similar_phrase_in_text(normalized_text, ["available marks", "available registration marks", "free marks", "unused marks"]):
        return {
            "supported": True,
            "answer": f"There are {available_count} available registration marks, including reusable marks with prior history.",
            "basis": "Count marks where current status is Available, then keep previously used marks visible rather than deleting their history.",
        }
    if similar_phrase_in_text(normalized_text, ["reserved marks", "special marks", "reserved special marks", "marks on hold"]):
        return {
            "supported": True,
            "answer": f"There are {reserved_count} reserved special marks in the current demo data.",
            "basis": "Count marks where current status is Reserved.",
        }
    if similar_phrase_in_text(normalized_text, ["ready for reuse", "reusable marks", "available again", "historical marks ready"]):
        preview = reusable_candidates(frame)
        ready_marks = preview[preview["reuse_ready"]]["full_mark"].head(5).tolist()
        mark_text = ", ".join(ready_marks) if ready_marks else "No marks are currently flagged ready."
        return {
            "supported": True,
            "answer": f"{reusable_ready} historical marks are currently flagged ready for reuse. Example marks: {mark_text}",
            "basis": "Count available marks with previous history where the reuse review state is marked Ready for Reuse.",
        }
    if operator and similar_phrase_in_text(normalized_text, ["history", "their history", "ever registered", "in history", "all time"]):
        return {
            "supported": True,
            "answer": f"{operator} appears in {history_count(frame, operator)} registrations across current and historical records in this demo dataset.",
            "basis": "Combine current operator records and previous-owner records, then deduplicate by registration mark.",
        }
    if operator and similar_phrase_in_text(normalized_text, ["current", "running", "active", "currently have", "current fleet"]):
        current_total = len(current_operator_records(frame, operator))
        return {
            "supported": True,
            "answer": f"{operator} currently has {current_total} active registrations in this demo dataset.",
            "basis": "Count records where the current operator matches the requested operator and status is Assigned.",
        }
    if operator:
        current_total = len(current_operator_records(frame, operator))
        total = history_count(frame, operator)
        return {
            "supported": True,
            "answer": f"{operator} has {current_total} current registrations and {total} current-plus-historical registrations in this demo dataset.",
            "basis": "Show both current operator count and current-plus-historical mark count for the selected operator.",
        }

    return {
        "supported": False,
        "answer": "This demo assistant only answers approved registry questions. Please use one of the supported examples below.",
        "basis": "Unsupported questions are intentionally refused so the assistant does not guess or hallucinate.",
    }


def filtered_registry(frame: pd.DataFrame, status_filter: str, search_text: str, operator_filter: str) -> pd.DataFrame:
    result = frame.copy()
    if status_filter == "Available Again":
        result = result[(result["current_status"] == "Available") & (result["previously_used"])]
    elif status_filter != "All":
        result = result[result["current_status"] == status_filter]

    if operator_filter != "All":
        result = result[
            (result["operator"] == operator_filter)
            | (result["previous_owner"] == operator_filter)
        ]

    if search_text:
        text = search_text.strip().upper().replace("5N-", "")
        result = result[
            result["suffix"].str.contains(text, na=False)
            | result["full_mark"].str.contains(text, na=False)
            | result["owner"].str.upper().str.contains(text, na=False)
            | result["operator"].str.upper().str.contains(text, na=False)
            | result["previous_owner"].str.upper().str.contains(text, na=False)
            | result["serial_number"].str.upper().str.contains(text, na=False)
        ]

        if result.empty:
            mark_guess = fuzzy_match_value(
                normalize_mark_input(search_text),
                frame["suffix"].tolist(),
                cutoff=0.67,
            )
            if mark_guess:
                result = frame[frame["suffix"] == mark_guess]

        if result.empty:
            operator_guess = match_operator(search_text, frame)
            if operator_guess:
                result = frame[
                    (frame["operator"] == operator_guess)
                    | (frame["previous_owner"] == operator_guess)
                ]

    result = result.copy()
    result["display_status"] = result.apply(display_status, axis=1)
    return result


def mark_timeline(record: pd.Series) -> pd.DataFrame:
    events: list[dict[str, str]] = []

    if pd.notna(record["release_date"]):
        previous_span = 4 + int(record["previous_assignment_count"])
        original_assignment = record["release_date"] - pd.Timedelta(days=365 * previous_span)
        events.append(
            {
                "date": format_date(original_assignment),
                "action": "Original assignment created",
                "note": f"Mark assigned to {record['previous_owner'] or 'legacy owner'}",
            }
        )
        events.append(
            {
                "date": format_date(record["release_date"]),
                "action": "Mark released / deregistered",
                "note": "Historical assignment closed and mark returned for review",
            }
        )

    if pd.notna(record["registration_date"]):
        events.append(
            {
                "date": format_date(record["registration_date"]),
                "action": "Current assignment created",
                "note": f"Assigned to {record['operator'] or record['owner']}",
            }
        )

    events.append(
        {
            "date": format_date(record["last_action_on"]),
            "action": str(record["last_action"]),
            "note": str(record["notes"]),
        }
    )

    timeline = pd.DataFrame(events).drop_duplicates()
    return timeline.sort_values("date", ascending=False).reset_index(drop=True)


def render_mark_header(record: pd.Series) -> None:
    chips = [
        f'<span class="status-chip {status_class(record)}">{display_status(record)}</span>'
    ]
    if bool(record["special_mark"]):
        chips.append('<span class="status-chip special">Special Mark</span>')
    if bool(record["previously_used"]):
        chips.append('<span class="status-chip available-again">Previous Owner History Stored</span>')

    st.markdown(f"### {record['full_mark']}")
    st.markdown("".join(chips), unsafe_allow_html=True)


def render_mark_detail(frame: pd.DataFrame, query: str) -> None:
    cleaned = normalize_mark_input(query)
    if not cleaned:
        st.info("Enter a registration mark like 5N-ABC or ABC.")
        return

    match = frame[frame["suffix"] == cleaned]
    matched_label = cleaned
    used_fuzzy_match = False
    if match.empty:
        fuzzy = fuzzy_match_value(cleaned, frame["suffix"].tolist(), cutoff=0.67)
        if fuzzy:
            match = frame[frame["suffix"] == fuzzy]
            matched_label = fuzzy
            used_fuzzy_match = True
        else:
            st.error("Registration mark not found.")
            return

    record = match.iloc[0]
    if used_fuzzy_match and matched_label != cleaned:
        st.caption(f"Showing closest match for `{query}`: `{record['full_mark']}`")
    render_mark_header(record)

    if record["current_status"] == "Available" and bool(record["previously_used"]):
        info_panel(
            "Reuse review view",
            f"{record['full_mark']} is available again, but its previous owner history is preserved. Current notice state: {record['reuse_notice_status']}.",
            tone="gold",
        )
    elif record["current_status"] == "Reserved":
        info_panel(
            "Reserved mark",
            f"{record['full_mark']} is currently held as a special mark pending payment and approval workflow.",
            tone="navy",
        )
    else:
        info_panel(
            "Current assignment snapshot",
            f"{record['full_mark']} is currently mapped to {record['operator'] or record['owner'] or 'an internal placeholder record'} in the demo dataset.",
            tone="green",
        )

    col1, col2, col3, col4 = st.columns(4)
    metric_card(col1, "Current Status", display_status(record), "Current lifecycle state", "blue")
    metric_card(
        col2,
        "Previous Uses",
        str(record["previous_assignment_count"]),
        "Historical assignments retained",
        "slate",
    )
    metric_card(
        col3,
        "Notice State",
        str(record["reuse_notice_status"]),
        "Reuse control workflow",
        "gold",
    )
    metric_card(
        col4,
        "Last Action",
        format_date(record["last_action_on"]),
        str(record["last_action"]),
        "green",
    )

    left, right = st.columns([1.1, 0.9])
    with left:
        st.subheader("Record Details")
        details = pd.DataFrame(
            [
                ("Aircraft Type", record["aircraft_type"] or "-"),
                ("Manufacturer", record["manufacturer"] or "-"),
                ("Model", record["model"] or "-"),
                ("Serial Number", record["serial_number"] or "-"),
                ("Owner", record["owner"] or "-"),
                ("Operator", record["operator"] or "-"),
                ("Registration Date", format_date(record["registration_date"])),
                ("Release Date", format_date(record["release_date"])),
                ("Previous Owner", record["previous_owner"] or "-"),
                ("Review Flag", record["review_flag"] or "-"),
            ],
            columns=["Field", "Value"],
        )
        st.dataframe(details, width="stretch", hide_index=True)

    with right:
        st.subheader("Recommended Action")
        if record["current_status"] == "Assigned":
            info_panel(
                "Operational next step",
                "Inspectors can verify the current aircraft, operator, and document references without checking multiple spreadsheets.",
                tone="navy",
            )
        elif record["current_status"] == "Reserved":
            info_panel(
                "Operational next step",
                "Keep the mark on hold until payment, approval, and reservation validation are complete.",
                tone="gold",
            )
        elif bool(record["reuse_ready"]):
            info_panel(
                "Operational next step",
                "This mark can move to controlled reassignment after final supervisor acknowledgement.",
                tone="green",
            )
        else:
            info_panel(
                "Operational next step",
                "Complete previous-owner contact and supervisor review before placing this mark back into circulation.",
                tone="slate",
            )

        st.subheader("History Timeline")
        st.dataframe(mark_timeline(record), width="stretch", hide_index=True)


def recent_activity(frame: pd.DataFrame) -> pd.DataFrame:
    assigned = frame[frame["registration_date"].notna()][["full_mark", "last_action_on", "last_action"]]
    reusable = frame[frame["previously_used"]][["full_mark", "last_action_on", "last_action"]]
    reserved = frame[frame["special_mark"]][["full_mark", "last_action_on", "last_action"]]
    log = pd.concat([assigned, reusable, reserved], ignore_index=True).dropna(subset=["last_action_on"])
    log = log.sort_values("last_action_on", ascending=False).head(10).copy()
    log["last_action_on"] = log["last_action_on"].apply(format_date)
    log.columns = ["Mark", "Date", "Action"]
    return log


def render_reuse_workflow(record: pd.Series) -> None:
    history_review_ready = True
    notice_ready = record["reuse_notice_status"] in {"Call Logged", "Email Drafted", "Ready for Reuse"}
    supervisor_ready = bool(record["reuse_ready"]) and not bool(record["review_flag"])
    market_ready = bool(record["reuse_ready"])
    stages = [
        ("Historical Review", history_review_ready, "Legacy paper and spreadsheet references linked."),
        ("Previous Owner Notice", notice_ready, f"Current state: {record['reuse_notice_status']}."),
        ("Supervisor Clearance", supervisor_ready, record["review_flag"] or "No open review flags."),
        ("Release To Market", market_ready, "Mark can be offered once internal approval is complete."),
    ]

    cols = st.columns(4)
    for col, (title, ready, body) in zip(cols, stages):
        css_class = "ready" if ready else "pending"
        col.markdown(
            f"""
            <div class="stage-card {css_class}">
                <div class="stage-label">Workflow Stage</div>
                <div class="stage-title">{title}</div>
                <div class="stage-body">{body}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_dashboard(frame: pd.DataFrame) -> None:
    assigned = metric_value(frame, "Assigned")
    available = metric_value(frame, "Available")
    reserved = metric_value(frame, "Reserved")
    reusable = int(((frame["current_status"] == "Available") & frame["previously_used"]).sum())
    recent = recent_registrations(frame, 5)
    ready_for_reuse = int(reusable_candidates(frame)["reuse_ready"].sum())

    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    metric_card(kpi1, "Registry Coverage", "17,576", "All marks from 5N-AAA to 5N-ZZZ preloaded", "blue")
    metric_card(kpi2, "Assigned", f"{assigned:,}", "Current active registrations", "green")
    metric_card(kpi3, "Available", f"{available:,}", "Includes unused and reusable marks", "slate")
    metric_card(kpi4, "Reusable", f"{reusable:,}", f"{ready_for_reuse:,} ready for controlled reuse", "gold")
    metric_card(kpi5, "Last 5 Years", f"{recent:,}", "Recent registration activity", "red")

    left, right = st.columns([1.1, 0.9])
    with left:
        st.subheader("Registry Status Overview")
        status_counts = frame.apply(display_status, axis=1).value_counts().rename_axis("status").reset_index(name="count")
        st.bar_chart(status_counts.set_index("status"))

    with right:
        st.subheader("Top Current Operators")
        operator_counts = (
            frame[frame["current_status"] == "Assigned"]
            .groupby("operator")
            .size()
            .sort_values(ascending=False)
            .head(6)
            .rename("count")
            .reset_index()
        )
        st.bar_chart(operator_counts.set_index("operator"))

    insight_col, story_col = st.columns([1, 1])
    with insight_col:
        info_panel(
            "Executive takeaway",
            "The strongest business value is not just digitization. It is controlled reuse visibility, faster inspector answers, and cleaner operational traceability.",
            tone="navy",
        )
        info_panel(
            "Presentation shortcut",
            "Use the Search tab to compare one assigned mark, one reusable historical mark, and one reserved special mark. That tells the whole story quickly.",
            tone="green",
        )

    with story_col:
        st.subheader("Recent Registry Activity")
        st.dataframe(recent_activity(frame), width="stretch", hide_index=True)


def render_search_tab(frame: pd.DataFrame) -> None:
    st.subheader("Registration Search")
    st.caption("Use scenario shortcuts to walk through assigned, reusable, reserved, and fresh marks during the demo. Search is case-insensitive and tolerant of small typing mistakes.")

    if "search_query" not in st.session_state:
        st.session_state["search_query"] = "5N-ABC"

    cols = st.columns(len(SCENARIO_MARKS))
    for col, (label, mark) in zip(cols, SCENARIO_MARKS.items()):
        if col.button(label, width="stretch"):
            st.session_state["search_query"] = mark

    st.text_input("Search for a registration mark", key="search_query")
    render_mark_detail(frame, st.session_state["search_query"])


def render_reuse_tab(frame: pd.DataFrame) -> None:
    candidates = reusable_candidates(frame)
    st.subheader("Reusable Mark Review")
    st.caption("This workflow highlights older marks that are available again, while preserving previous-owner history and review status.")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    metric_card(kpi1, "Reusable Marks", f"{len(candidates):,}", "Historical marks now available", "gold")
    metric_card(kpi2, "Ready Now", f"{int(candidates['reuse_ready'].sum()):,}", "Reusable marks cleared for next step", "green")
    metric_card(
        kpi3,
        "Pending Contact",
        f"{int((candidates['reuse_notice_status'] == 'Pending Review').sum()):,}",
        "Marks still awaiting review/contact",
        "slate",
    )
    metric_card(
        kpi4,
        "Review Flags",
        f"{int(candidates['review_flag'].fillna('').ne('').sum()):,}",
        "Cases that still need supervisor attention",
        "red",
    )

    selected_mark = st.selectbox("Reusable mark under review", options=candidates["full_mark"].tolist(), index=0)
    record = candidates[candidates["full_mark"] == selected_mark].iloc[0]
    render_mark_header(record)
    render_reuse_workflow(record)

    left, right = st.columns([0.95, 1.05])
    with left:
        info_panel(
            "Reuse recommendation",
            (
                f"{record['full_mark']} previously belonged to {record['previous_owner']} and "
                f"was released on {format_date(record['release_date'])}. Current workflow state: {record['reuse_notice_status']}."
            ),
            tone="gold",
        )
        details = pd.DataFrame(
            [
                ("Previous owner", record["previous_owner"] or "-"),
                ("Release date", format_date(record["release_date"])),
                ("Historical assignment count", str(record["previous_assignment_count"])),
                ("Review flag", record["review_flag"] or "-"),
                ("Reuse ready", "Yes" if bool(record["reuse_ready"]) else "No"),
                ("Notes", record["notes"]),
            ],
            columns=["Field", "Value"],
        )
        st.dataframe(details, width="stretch", hide_index=True)

    with right:
        st.subheader("Top reusable candidates")
        candidate_table = candidates[
            [
                "full_mark",
                "previous_owner",
                "release_date",
                "reuse_notice_status",
                "reuse_ready",
                "review_flag",
            ]
        ].head(12).copy()
        candidate_table["release_date"] = candidate_table["release_date"].apply(format_date)
        st.dataframe(candidate_table, width="stretch", hide_index=True)
        st.download_button(
            "Download reusable marks snapshot",
            candidate_table.to_csv(index=False).encode("utf-8"),
            file_name="reusable_marks_demo.csv",
            mime="text/csv",
            width="stretch",
        )


def render_operator_tab(frame: pd.DataFrame) -> None:
    operators = known_operators(frame)
    st.subheader("Operator Analytics")
    st.caption("This view shows the kind of quick intelligence inspectors and managers can get without manual counting in Excel.")

    selected_operator = st.selectbox("Operator", options=operators, index=operators.index("Rano Air") if "Rano Air" in operators else 0)
    current = current_operator_records(frame, selected_operator)
    historic = historic_operator_records(frame, selected_operator)
    combined = pd.concat([current, historic]).drop_duplicates(subset=["suffix"])
    last_five_cutoff = pd.Timestamp(date.today() - timedelta(days=365 * 5))
    current_recent = int((current["registration_date"].notna() & (current["registration_date"] >= last_five_cutoff)).sum())

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    metric_card(kpi1, "Current Active", f"{len(current):,}", "Marks currently assigned to this operator", "blue")
    metric_card(kpi2, "Historical Reach", f"{len(combined):,}", "Current plus historical appearances", "gold")
    metric_card(kpi3, "Last 5 Years", f"{current_recent:,}", "Recent registrations for this operator", "green")
    metric_card(
        kpi4,
        "Fleet Mix",
        f"{current['model'].replace('', pd.NA).dropna().nunique():,}",
        "Distinct active aircraft models",
        "slate",
    )

    left, right = st.columns([1, 1])
    with left:
        st.subheader("Current Fleet Mix")
        if not current.empty:
            fleet_mix = current.groupby("model").size().sort_values(ascending=False).rename("count").to_frame()
            st.bar_chart(fleet_mix)
        else:
            st.info("No active records for this operator in the demo dataset.")

    with right:
        st.subheader("Registration Timeline")
        if not current.empty:
            timeline = current.copy()
            timeline["year"] = timeline["registration_date"].dt.year
            yearly = timeline.groupby("year").size().rename("registrations").to_frame()
            st.line_chart(yearly)
        else:
            st.info("No registration timeline available for this operator in the demo dataset.")

    table_left, table_right = st.columns([1, 1])
    with table_left:
        st.subheader("Current Records")
        current_table = current[
            ["full_mark", "manufacturer", "model", "registration_date", "owner"]
        ].copy()
        if not current_table.empty:
            current_table["registration_date"] = current_table["registration_date"].apply(format_date)
            st.dataframe(current_table, width="stretch", hide_index=True)
        else:
            st.info("No current records to show.")

    with table_right:
        st.subheader("Historical Records")
        historic_table = historic[
            ["full_mark", "previous_owner", "release_date", "reuse_notice_status", "review_flag"]
        ].copy()
        if not historic_table.empty:
            historic_table["release_date"] = historic_table["release_date"].apply(format_date)
            st.dataframe(historic_table, width="stretch", hide_index=True)
        else:
            st.info("No historical records to show.")


def render_table_tab(frame: pd.DataFrame) -> None:
    st.subheader("Registry Table")
    st.caption("This is the Excel replacement view: full mark inventory, filterable statuses, quick export, and forgiving search for minor typing errors.")

    filter_col1, filter_col2, filter_col3 = st.columns([0.9, 1.1, 1.2])
    with filter_col1:
        status_filter = st.selectbox("Status", ["All", "Assigned", "Available", "Available Again", "Reserved"])
    with filter_col2:
        operator_options = ["All"] + known_operators(frame)
        operator_filter = st.selectbox("Operator / Historical Owner", operator_options)
    with filter_col3:
        search_text = st.text_input("Search table", placeholder="Mark, owner, previous owner, or serial number")

    result = filtered_registry(frame, status_filter, search_text, operator_filter)
    display_frame = result[
        [
            "full_mark",
            "display_status",
            "previous_owner",
            "owner",
            "operator",
            "manufacturer",
            "model",
            "registration_date",
            "release_date",
            "reuse_notice_status",
        ]
    ].copy()
    display_frame["registration_date"] = display_frame["registration_date"].apply(format_date)
    display_frame["release_date"] = display_frame["release_date"].apply(format_date)
    display_frame.columns = [
        "Mark",
        "Status",
        "Previous Owner",
        "Owner",
        "Operator",
        "Manufacturer",
        "Model",
        "Registration Date",
        "Release Date",
        "Reuse Notice",
    ]

    st.write(f"Showing {len(display_frame):,} marks")
    st.dataframe(display_frame, width="stretch", hide_index=True)
    st.download_button(
        "Download registry snapshot",
        display_frame.to_csv(index=False).encode("utf-8"),
        file_name="registry_demo_snapshot.csv",
        mime="text/csv",
    )


def render_upload_tab() -> None:
    st.subheader("C of R Upload Review")
    st.caption("The point of this screen is not blind OCR. It is faster capture with mandatory human review.")

    uploaded_file = st.file_uploader("Upload a scan or photo", type=["png", "jpg", "jpeg", "pdf"])
    left, right = st.columns([0.95, 1.05])

    with left:
        st.markdown("#### Document Preview")
        if uploaded_file is not None and uploaded_file.type.startswith("image/"):
            st.image(uploaded_file, caption="Uploaded scan preview", width="stretch")
        elif uploaded_file is not None:
            info_panel(
                "PDF uploaded",
                "PDF received successfully. In production, the first page preview and extracted regions would be shown here.",
                tone="navy",
            )
        else:
            info_panel(
                "Waiting for upload",
                "Upload a photo or scan of the Certificate of Registration to trigger extraction preview and review workflow.",
                tone="slate",
            )

        confidence = pd.DataFrame(
            [
                ("Registration Mark", "High"),
                ("Owner / Operator", "Medium"),
                ("Serial Number", "Medium"),
                ("Manufacturer / Model", "High"),
                ("Registration Date", "Needs Review"),
            ],
            columns=["Field", "Confidence"],
        )
        st.markdown("#### Extraction Confidence")
        st.dataframe(confidence, width="stretch", hide_index=True)

    with right:
        st.markdown("#### Extracted Fields for Review")
        with st.form("ocr_preview_form"):
            col1, col2 = st.columns(2)
            with col1:
                full_mark = st.text_input("Registration Mark", value="5N-CCD")
                owner = st.text_input("Owner", value="Rano Air")
                operator = st.text_input("Operator", value="Rano Air")
                manufacturer = st.text_input("Manufacturer", value="Boeing")
                model = st.text_input("Model", value="737-800")
            with col2:
                serial_number = st.text_input("Serial Number", value="SN-CCD-8742")
                aircraft_type = st.selectbox("Aircraft Type", ["Fixed Wing", "Rotorcraft"], index=0)
                cor_date = st.date_input("Registration Date", value=date(2026, 4, 10))
                reviewer = st.text_input("Reviewer", value="DAWS Demo Reviewer")
                reviewer_note = st.text_area(
                    "Reviewer Note",
                    value="Confirm against the physical file before final save. Low-confidence fields should be corrected manually.",
                )

            checks_left, checks_right = st.columns(2)
            with checks_left:
                check_scan = st.checkbox("Verified against scan preview", value=True)
                check_physical = st.checkbox("Verified against physical file", value=True)
            with checks_right:
                check_spelling = st.checkbox("Confirmed spelling and serial number", value=True)
                check_sensitive = st.checkbox("Ready to create audit entry", value=True)

            confirmed = st.form_submit_button("Confirm and Save")
            if confirmed:
                if not all([check_scan, check_physical, check_spelling, check_sensitive]):
                    st.warning("All review confirmations must be checked before the demo save can proceed.")
                else:
                    normalized_mark, suffix = canonicalize_full_mark(full_mark)
                    cleaned_owner = canonicalize_operator_name(owner)
                    cleaned_operator = canonicalize_operator_name(operator)
                    cleaned_manufacturer = canonicalize_manufacturer(manufacturer)
                    cleaned_model = canonicalize_model(model)
                    cleaned_serial = canonicalize_serial_number(serial_number)
                    cleaned_aircraft_type = canonicalize_aircraft_type(aircraft_type)
                    cleaned_reviewer = smart_title_case(reviewer)
                    cleaned_note = canonicalize_note(reviewer_note)

                    validation_errors: list[str] = []
                    if not normalized_mark or not suffix:
                        validation_errors.append("Registration mark must resolve to a valid format like 5N-ABC.")
                    else:
                        registry = load_registry()
                        if suffix not in registry["suffix"].tolist():
                            validation_errors.append("Registration mark does not exist in the master AAA to ZZZ registry.")
                    if not cleaned_owner:
                        validation_errors.append("Owner is required.")
                    if not cleaned_operator:
                        validation_errors.append("Operator is required.")
                    if not cleaned_manufacturer:
                        validation_errors.append("Manufacturer is required.")
                    if not cleaned_model:
                        validation_errors.append("Model is required.")
                    if not cleaned_serial:
                        validation_errors.append("Serial number is required.")
                    if not cleaned_reviewer:
                        validation_errors.append("Reviewer name is required.")

                    if validation_errors:
                        for error in validation_errors:
                            st.error(error)
                    else:
                        payload = {
                            "full_mark": normalized_mark,
                            "suffix": suffix,
                            "owner": cleaned_owner,
                            "operator_name": cleaned_operator,
                            "manufacturer": cleaned_manufacturer,
                            "model": cleaned_model,
                            "serial_number": cleaned_serial,
                            "aircraft_type": cleaned_aircraft_type or "Fixed Wing",
                            "registration_date": cor_date.isoformat(),
                            "reviewer": cleaned_reviewer,
                            "reviewer_note": cleaned_note,
                            "saved_at": pd.Timestamp.utcnow().isoformat(),
                        }
                        save_registry_override(payload)
                        st.success(
                            f"Saved {normalized_mark} to the demo database with normalized spelling, spacing, punctuation, and an audit entry."
                        )
                        summary = pd.DataFrame(
                            [
                                ("Mark", payload["full_mark"]),
                                ("Owner", payload["owner"]),
                                ("Operator", payload["operator_name"]),
                                ("Manufacturer", payload["manufacturer"]),
                                ("Model", payload["model"]),
                                ("Serial Number", payload["serial_number"]),
                                ("Aircraft Type", payload["aircraft_type"]),
                                ("Registration Date", payload["registration_date"]),
                                ("Reviewer", payload["reviewer"]),
                                ("Reviewer Note", payload["reviewer_note"]),
                            ],
                            columns=["Field", "Saved Value"],
                        )
                        st.dataframe(summary, width="stretch", hide_index=True)
                        st.caption("The live registry will reflect this saved record on the next rerun.")

        st.markdown("#### Recent Saved Demo Records")
        saved = recent_saved_overrides(limit=8)
        if not saved.empty:
            saved = saved.copy()
            saved["saved_at"] = saved["saved_at"].apply(format_date)
            saved.columns = ["Mark", "Operator", "Manufacturer", "Model", "Reviewer", "Saved On"]
            st.dataframe(saved, width="stretch", hide_index=True)
        else:
            st.info("No C of R records have been saved into the demo database yet.")


def render_assistant_tab(frame: pd.DataFrame) -> None:
    st.subheader("Inspector Assistant")
    st.caption("This assistant is intentionally controlled. It answers approved analytics questions from the registry, tolerates minor spelling/case mistakes, and refuses unsupported ones.")

    if "assistant_prompt" not in st.session_state:
        st.session_state["assistant_prompt"] = "How many aircraft has Rano Air registered in their history?"

    examples = [
        "How many currently registered planes are there?",
        "How many registrations are there in the last 5 years?",
        "How many available marks are there?",
        "How many aircraft has Rano Air registered in their history?",
        "Which marks are ready for reuse?",
    ]

    example_cols = st.columns(len(examples))
    for col, example in zip(example_cols, examples):
        if col.button(example, width="stretch"):
            st.session_state["assistant_prompt"] = example

    st.text_input("Ask a question", key="assistant_prompt")
    run = st.button("Get Answer", type="primary")
    response = answer_question(st.session_state["assistant_prompt"], frame) if run else None

    if response:
        tone = "green" if response["supported"] else "slate"
        st.markdown(
            f"""
            <div class="trust-card">
                <div class="trust-answer">{response["answer"]}</div>
                <div class="trust-basis"><strong>Calculation basis:</strong> {response["basis"]}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if not response["supported"]:
            info_panel(
                "Why the assistant refused",
                "This is deliberate. The assistant should not improvise answers for unsupported or ambiguous questions when the registry is being used operationally.",
                tone=tone,
            )

    with st.expander("Supported question families", expanded=False):
        st.markdown(
            """
            - Current registered aircraft count
            - Registrations in the last 5 years
            - Available or reserved mark counts
            - Reusable mark counts
            - Current or historical operator totals
            """
        )

    st.markdown(
        """
        <p class="small-note">
            Presentation tip: ask one count question, one operator question, and one reusable-mark question.
            That demonstrates accuracy, history awareness, and operational usefulness in under a minute.
        </p>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar(frame: pd.DataFrame) -> None:
    st.sidebar.title("Demo Guide")
    st.sidebar.write("Use this order during the presentation for the clearest story:")
    st.sidebar.markdown(
        """
1. Dashboard
2. Registration Search
3. Reusable Mark Review
4. Operator Analytics
5. C of R Upload Review
6. Inspector Assistant
"""
    )

    st.sidebar.subheader("Prepared scenarios")
    for label, mark in SCENARIO_MARKS.items():
        st.sidebar.write(f"- {label}: `{mark}`")

    st.sidebar.subheader("Demo assumptions")
    st.sidebar.caption("Counts and records use generated sample data. Workflow logic and screen design are the real focus for stakeholder review.")

    reusable_ready = int(reusable_candidates(frame)["reuse_ready"].sum())
    st.sidebar.metric("Reusable marks ready", reusable_ready)
    st.sidebar.metric("Operators represented", len(known_operators(frame)))


def main() -> None:
    st.set_page_config(page_title="NCAA Registry Demo", page_icon="N", layout="wide")
    inject_styles()
    registry = load_registry()
    render_sidebar(registry)

    st.title("NCAA Aircraft Registry Upgrade Demo")
    st.caption(
        "Prototype view only. Counts and records below are generated sample data for workflow validation. "
        "The goal is to demonstrate a cleaner registry process, not expose sensitive source records."
    )
    st.divider()

    tab_dashboard, tab_search, tab_reuse, tab_operator, tab_table, tab_upload, tab_assistant = st.tabs(
        [
            "Dashboard",
            "Registration Search",
            "Reusable Mark Review",
            "Operator Analytics",
            "Registry Table",
            "C of R Upload",
            "Inspector Assistant",
        ]
    )

    with tab_dashboard:
        render_dashboard(registry)

    with tab_search:
        render_search_tab(registry)

    with tab_reuse:
        render_reuse_tab(registry)

    with tab_operator:
        render_operator_tab(registry)

    with tab_table:
        render_table_tab(registry)

    with tab_upload:
        render_upload_tab()

    with tab_assistant:
        render_assistant_tab(registry)


if __name__ == "__main__":
    main()

from __future__ import annotations

from datetime import date, timedelta
from itertools import product
import random
import re

import pandas as pd
import streamlit as st


def all_suffixes() -> list[str]:
    return ["".join(chars) for chars in product("ABCDEFGHIJKLMNOPQRSTUVWXYZ", repeat=3)]


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
        ]

    for index, suffix in enumerate(sorted(chosen_reusable)):
        manufacturer, model, aircraft_type = rng.choice(aircraft_pool)
        previous_owner = operators[index % len(operators)]
        release_date = date(1998, 1, 1) + timedelta(days=(index * 131) % 7000)
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
        ]

    for suffix in reserved_suffixes:
        frame.loc[frame["suffix"] == suffix, ["current_status", "special_mark", "notes"]] = [
            "Reserved",
            True,
            "Special mark held pending payment/approval",
        ]

    frame.loc[frame["suffix"] == "ABC", ["operator", "owner", "manufacturer", "model"]] = [
        "Rano Air",
        "Rano Air",
        "Boeing",
        "737-800",
    ]
    frame.loc[frame["suffix"] == "CCC", ["operator", "owner", "manufacturer", "model"]] = [
        "Ibom Air",
        "Ibom Air",
        "Airbus",
        "A320",
    ]

    return frame.sort_values("suffix").reset_index(drop=True)


@st.cache_data
def load_registry() -> pd.DataFrame:
    return seed_registry()


def metric_value(frame: pd.DataFrame, status: str) -> int:
    return int((frame["current_status"] == status).sum())


def recent_registrations(frame: pd.DataFrame, years: int) -> int:
    cutoff = pd.Timestamp(date.today() - timedelta(days=365 * years))
    return int((frame["registration_date"].notna() & (frame["registration_date"] >= cutoff)).sum())


def history_count(frame: pd.DataFrame, operator_name: str) -> int:
    current = frame["operator"].str.lower() == operator_name.lower()
    historic = frame["previous_owner"].str.lower() == operator_name.lower()
    return int((current | historic).sum())


def answer_question(question: str, frame: pd.DataFrame) -> str:
    text = question.strip().lower()
    active_count = metric_value(frame, "Assigned")
    available_count = metric_value(frame, "Available")
    reserved_count = metric_value(frame, "Reserved")
    recent_five = recent_registrations(frame, 5)

    operator_match = re.search(r"(rano air|air peace|arik air|ibom air|max air|overland airways|aero contractors)", text)

    if "how many" in text and ("registered planes" in text or "active aircraft" in text or "currently registered" in text):
        return f"There are {active_count} currently assigned aircraft in this demo dataset."
    if "last 5 years" in text or "last five years" in text:
        return f"There are {recent_five} aircraft registrations in the last 5 years in this demo dataset."
    if "available" in text and "mark" in text:
        return f"There are {available_count} available registration marks, including reusable marks with prior history."
    if "reserved" in text:
        return f"There are {reserved_count} reserved special marks in the current demo data."
    if operator_match and ("history" in text or "their history" in text or "ever" in text):
        operator = operator_match.group(1).title()
        return f"{operator} appears in {history_count(frame, operator)} registrations across current and historical records in this demo dataset."
    if operator_match and ("current" in text or "running" in text or "active" in text):
        operator = operator_match.group(1).title()
        current_total = int((frame["operator"].str.lower() == operator.lower()).sum())
        return f"{operator} currently has {current_total} active registrations in this demo dataset."
    if operator_match:
        operator = operator_match.group(1).title()
        total = history_count(frame, operator)
        current_total = int((frame["operator"].str.lower() == operator.lower()).sum())
        return f"{operator} has {current_total} current registrations and {total} current-plus-historical registrations in this demo dataset."

    return (
        "Try a question like: 'How many currently registered planes are there?', "
        "'How many were registered in the last 5 years?', or "
        "'How many aircraft has Rano Air registered in its history?'"
    )


def filtered_registry(frame: pd.DataFrame, status_filter: str, search_text: str, operator_filter: str) -> pd.DataFrame:
    result = frame.copy()
    if status_filter != "All":
        result = result[result["current_status"] == status_filter]
    if operator_filter != "All":
        result = result[result["operator"] == operator_filter]
    if search_text:
        text = search_text.strip().upper().replace("5N-", "")
        result = result[
            result["suffix"].str.contains(text, na=False)
            | result["full_mark"].str.contains(text, na=False)
            | result["owner"].str.upper().str.contains(text, na=False)
            | result["operator"].str.upper().str.contains(text, na=False)
        ]
    return result


def show_mark_detail(frame: pd.DataFrame, query: str) -> None:
    cleaned = query.strip().upper().replace("5N-", "")
    if not cleaned:
        st.info("Enter a registration mark like 5N-ABC or ABC.")
        return

    match = frame[frame["suffix"] == cleaned]
    if match.empty:
        st.error("Registration mark not found.")
        return

    record = match.iloc[0]
    st.subheader(record["full_mark"])
    col1, col2, col3 = st.columns(3)
    col1.metric("Status", record["current_status"])
    col2.metric("Previously Used", "Yes" if record["previously_used"] else "No")
    col3.metric("Special Mark", "Yes" if record["special_mark"] else "No")

    details = {
        "Aircraft Type": record["aircraft_type"] or "-",
        "Manufacturer": record["manufacturer"] or "-",
        "Model": record["model"] or "-",
        "Serial Number": record["serial_number"] or "-",
        "Owner": record["owner"] or "-",
        "Operator": record["operator"] or "-",
        "Registration Date": record["registration_date"].date().isoformat() if pd.notna(record["registration_date"]) else "-",
        "Release Date": record["release_date"].date().isoformat() if pd.notna(record["release_date"]) else "-",
        "Previous Owner": record["previous_owner"] or "-",
        "Notes": record["notes"] or "-",
    }
    st.json(details)


def main() -> None:
    st.set_page_config(page_title="NCAA Registry Demo", layout="wide")
    registry = load_registry()

    st.title("NCAA Aircraft Registry Upgrade Demo")
    st.caption(
        "Prototype view only. Counts and records below are generated sample data for demonstration and workflow validation."
    )

    tab_dashboard, tab_search, tab_table, tab_upload, tab_assistant = st.tabs(
        ["Dashboard", "Registration Search", "Registry Table", "C of R Upload", "Inspector Assistant"]
    )

    with tab_dashboard:
        assigned = metric_value(registry, "Assigned")
        available = metric_value(registry, "Available")
        reserved = metric_value(registry, "Reserved")
        reusable = int(((registry["current_status"] == "Available") & registry["previously_used"]).sum())
        recent = recent_registrations(registry, 5)

        col1, col2, col3, col4, col5 = st.columns(5)
        col1.metric("Assigned", assigned)
        col2.metric("Available", available)
        col3.metric("Reusable", reusable)
        col4.metric("Reserved", reserved)
        col5.metric("Last 5 Years", recent)

        status_counts = registry["current_status"].value_counts().rename_axis("status").reset_index(name="count")
        st.subheader("Registry Status Overview")
        st.bar_chart(status_counts.set_index("status"))

        st.subheader("Suggested demo storyline")
        st.markdown(
            """
1. Show that every mark from `5N-AAA` to `5N-ZZZ` exists in one master registry.
2. Search an active mark like `5N-ABC` and show the current aircraft/operator record.
3. Search a reusable mark like `5N-AAD` and show prior ownership history.
4. Use the assistant to answer a question an inspector would normally ask manually.
5. Upload a sample C of R and walk through the human confirmation step before save.
"""
        )

    with tab_search:
        query = st.text_input("Search for a registration mark", value="5N-ABC")
        show_mark_detail(registry, query)

    with tab_table:
        status_filter = st.selectbox("Status", ["All", "Assigned", "Available", "Reserved"])
        operator_options = ["All"] + sorted([name for name in registry["operator"].unique().tolist() if name])
        operator_filter = st.selectbox("Operator", operator_options)
        search_text = st.text_input("Search table", placeholder="Mark, owner, or operator")
        result = filtered_registry(registry, status_filter, search_text, operator_filter)
        st.write(f"Showing {len(result):,} marks")
        st.dataframe(
            result[
                [
                    "full_mark",
                    "current_status",
                    "previously_used",
                    "owner",
                    "operator",
                    "manufacturer",
                    "model",
                    "registration_date",
                    "release_date",
                ]
            ],
            use_container_width=True,
            hide_index=True,
        )

    with tab_upload:
        st.subheader("Upload Certificate of Registration")
        uploaded_file = st.file_uploader("Upload a scan or photo", type=["png", "jpg", "jpeg", "pdf"])
        if uploaded_file is not None:
            if uploaded_file.type.startswith("image/"):
                st.image(uploaded_file, caption="Uploaded preview", use_container_width=True)
            st.success("Document received. Demo extraction preview generated below.")

        with st.form("ocr_preview_form"):
            left, right = st.columns(2)
            with left:
                full_mark = st.text_input("Registration Mark", value="5N-CCD")
                owner = st.text_input("Owner", value="Rano Air")
                operator = st.text_input("Operator", value="Rano Air")
                manufacturer = st.text_input("Manufacturer", value="Boeing")
            with right:
                model = st.text_input("Model", value="737-800")
                serial_number = st.text_input("Serial Number", value="SN-CCD-8742")
                cor_date = st.date_input("Registration Date", value=date(2026, 4, 10))
                reviewer_note = st.text_area(
                    "Reviewer Note",
                    value="Confirm against physical file before final save. Demo mode does not write to a database.",
                )
            confirmed = st.form_submit_button("Confirm and Save")
            if confirmed:
                st.success(
                    f"Demo confirmation complete for {full_mark}. In production, this step would write to the registry and create an audit entry."
                )
                st.info(reviewer_note)

    with tab_assistant:
        st.subheader("Inspector Assistant")
        st.caption("This demo assistant answers from the dataset using controlled rules, not free-form guessing.")
        prompt = st.text_input(
            "Ask a question",
            value="How many aircraft has Rano Air registered in their history?",
        )
        if st.button("Get Answer"):
            st.write(answer_question(prompt, registry))

        st.markdown(
            """
Examples:

- `How many currently registered planes are there?`
- `How many registrations are there in the last 5 years?`
- `How many available marks are there?`
- `How many aircraft has Rano Air registered in their history?`
- `How many aircraft does Ibom Air currently have?`
"""
        )


if __name__ == "__main__":
    main()

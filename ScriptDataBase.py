"""
Pull the full "Variety-wise Daily Market Prices Data of Commodity"
(a.k.a. "Current Daily Price of Various Commodities from Various Markets (Mandi)")
dataset from data.gov.in and save it to an Excel file with THREE sheets:

  1. "Mandis"      - every mandi once: name, district, state
  2. "Crops"       - every crop once
  3. "Mandi Crops" - which crops each mandi has, with their prices

SETUP
-----
1. Get your own free API key (recommended — the shared demo key is heavily
   rate-limited and shared by everyone):
   - Go to https://data.gov.in and register/log in (Google or gov email works).
   - Go to "My Account" -> "API Keys" and generate one.
   - Put it in backend/.env as MANDI_API_KEY (never in this file -
     this file is committed to git).

2. Install dependencies:
   pip install requests pandas openpyxl

3. Run:
   python fetch_mandi_prices_to_excel.py

NOTES
-----
- This dataset is LIVE: the "current price" resource only holds each day's
  reported prices (roughly 10,000-20,000+ rows, changing throughout the day
  as more mandis report), not multi-year history. If you want a specific
  state/commodity/date instead of everything, add filters (see FILTERS below).
- The API paginates ~100-1000 records per request depending on load; this
  script pages through automatically until it has everything, with retries.
- Excel sheets max out at 1,048,576 rows. If the pull ever exceeds that
  (e.g. if you point this at a historical bulk resource instead), the
  script automatically splits output across multiple sheets.
"""

import io
import os
import time
import requests
import pandas as pd
from openpyxl.utils import get_column_letter

# ---- CONFIG -----------------------------------------------------------

# SECURITY: the key is read from the environment, not written here.
#
# It used to be hard-coded on this line - and this file IS committed to
# git, so the key went into the repository history for anyone with
# access to read. A data.gov.in key is low-value, but a credential in
# source control is a habit worth not forming: the same pattern with a
# database or payment key is a serious incident.
#
# Set it in backend/.env (which is gitignored) as MANDI_API_KEY, or
# export it in your shell before running this script.
API_KEY = os.environ.get("MANDI_API_KEY", "").strip()

if not API_KEY:
    # Fall back to reading backend/.env directly, so the script works
    # without you having to export anything by hand.
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
    if os.path.exists(_env_path):
        with io.open(_env_path, encoding="utf-8") as _f:
            for _line in _f:
                if _line.strip().startswith("MANDI_API_KEY="):
                    API_KEY = _line.split("=", 1)[1].strip()
                    break

if not API_KEY:
    raise SystemExit(
        "No MANDI_API_KEY found. "
        "Set it in backend/.env or export MANDI_API_KEY before running."
    )

# Resource ID for "Current Daily Price of Various Commodities from Various
# Markets (Mandi)" / "Variety-wise Daily Market Prices Data of Commodity".
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

# Optional server-side filters, e.g. {"state": "Maharashtra", "commodity": "Onion"}
# Leave empty to pull everything.
FILTERS = {}

PAGE_SIZE = 1000          # records per request
OUTPUT_FILE = "mandi_prices.xlsx"
MAX_ROWS_PER_SHEET = 1_000_000   # safety margin below Excel's 1,048,576 cap

# data.gov.in does NOT answer requests that carry the default
# "python-requests/x.y.z" User-Agent. It doesn't refuse them either - it
# accepts the connection and then never sends a response, so the request
# just hangs until it times out, and every retry hangs the same way.
#
# Sending any ordinary browser/curl User-Agent fixes it instantly
# (measured: times out after 45s with the default, returns in 0.5s with
# this). Almost certainly a bot filter on their side.
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MandiPriceChecker/1.0",
    "Accept": "application/json",
}

# The API is occasionally slow for a big page, so allow more than the
# original 30s before giving up on a request.
REQUEST_TIMEOUT_SECONDS = 90

# ---- SCRIPT -------------------------------------------------------------

def fetch_page(params):
    """One request, with retries. Returns the parsed JSON body."""
    for attempt in range(5):
        try:
            resp = requests.get(
                BASE_URL,
                params=params,
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as e:
            wait = 2 ** attempt
            print(f"  request failed ({e}); retrying in {wait}s...")
            time.sleep(wait)
    raise RuntimeError("Failed to fetch page after 5 retries")


def fetch_with_filters(extra_filters, quiet=False):
    """
    Pages through the dataset applying FILTERS plus `extra_filters`.

    Stops when it has everything, or when the API stops returning rows -
    which it does once the offset gets past about 10,000, see the note in
    fetch_all_records().
    """
    collected = []
    offset = 0
    total = None

    while True:
        params = {
            "api-key": API_KEY,
            "format": "json",
            "offset": offset,
            "limit": PAGE_SIZE,
        }
        for field, value in {**FILTERS, **extra_filters}.items():
            params[f"filters[{field}]"] = value

        data = fetch_page(params)

        if total is None:
            total = int(data.get("total", 0))
            if not quiet:
                print(f"Total records reported by API: {total}")

        batch = data.get("records", [])
        if not batch:
            break

        collected.extend(batch)
        offset += len(batch)
        if not quiet:
            print(f"  fetched {offset}/{total}")

        if total and offset >= total:
            break

        time.sleep(0.2)  # be polite to the API

    return collected, total


def record_key(record):
    """
    A value that identifies one row, used to drop duplicates when the
    same record arrives from both the main pass and a per-state pass.
    """
    return tuple(sorted((k, str(v)) for k, v in record.items()))


def fetch_all_records():
    # ---- Pass 1: straight through, as fast as the API allows ----
    records, total = fetch_with_filters({})

    if total and len(records) >= total:
        return records

    # ---- Pass 2: the API's pagination wall ----
    # data.gov.in stops returning rows once the offset passes roughly
    # 10,000, even though `total` says there are more. So a plain page-
    # through silently stops short - on the day this was written it
    # returned 10,000 of 11,077 rows and reported success.
    #
    # The way around it is to ask for one STATE at a time. Every state has
    # far fewer than 10,000 rows, so each partition fits under the wall,
    # and together they cover everything.
    missing = total - len(records)
    print(
        f"\nThe API stopped at {len(records)} of {total} rows "
        f"({missing} short) - it will not paginate past ~10,000."
    )
    print("Fetching state by state to pick up the rest...\n")

    # Work out which states exist from the rows we already have.
    states = sorted({r.get("state", "") for r in records if r.get("state")})

    seen = {record_key(r) for r in records}

    for state in states:
        state_records, _ = fetch_with_filters({"state": state}, quiet=True)

        added = 0
        for record in state_records:
            key = record_key(record)
            if key not in seen:
                seen.add(key)
                records.append(record)
                added += 1

        print(f"  {state:<28} {len(state_records):>5} rows, {added:>4} new")

    print(f"\nCollected {len(records)} of {total} rows.")
    if len(records) < total:
        print(
            "  Note: still short. Some rows may be duplicates the API counts "
            "separately, or belong to a state not present in the first pass."
        )

    return records


def save_to_excel(records, path):
    """
    Writes the data out as THREE sheets:

      1. "Mandis"      - every mandi, once: name, district, state.
      2. "Crops"       - every crop, once.
      3. "Mandi Crops" - which crops each mandi has, with their prices.
                         One row per mandi-and-crop pair.

    Sheets 1 and 2 are lookup lists; sheet 3 is the mapping that joins
    them. Splitting it this way means you can answer "which mandis
    exist?" and "which crops are traded?" without scrolling through
    thousands of repeated rows, which is what a single flat sheet forces
    you to do.
    """
    if not records:
        print("No records fetched - nothing to save.")
        return

    df = pd.DataFrame(records)

    # Tidy up column names: "modal_price" -> "Modal Price"
    df.columns = [c.replace("_", " ").title() for c in df.columns]

    # Turn the date text into real dates, so Excel sorts and filters it
    # as a date rather than alphabetically.
    date_col = next((c for c in df.columns if "date" in c.lower()), None)
    if date_col:
        df[date_col] = pd.to_datetime(df[date_col], format="%d/%m/%Y", errors="coerce")

    # The API has been consistent about these, but if it ever renames a
    # field we want a clear message rather than a confusing crash deep in
    # pandas.
    required = ["State", "District", "Market", "Commodity"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(
            f"The data is missing expected column(s): {missing}. "
            f"Got: {list(df.columns)}"
        )

    # ---- SHEET 1: one row per mandi ----------------------------------
    # The raw data repeats a mandi once for every crop it sells, so
    # drop_duplicates() collapses that back down to the mandi itself.
    mandis = (
        df[["Market", "District", "State"]]
        .rename(columns={"Market": "Mandi Name"})
        .drop_duplicates()
        .sort_values(["State", "District", "Mandi Name"])
        .reset_index(drop=True)
    )

    # ---- SHEET 2: one row per crop -----------------------------------
    crops = (
        df[["Commodity"]]
        .rename(columns={"Commodity": "Crop"})
        .drop_duplicates()
        .sort_values("Crop")
        .reset_index(drop=True)
    )

    # ---- SHEET 3: which crops are in which mandi ---------------------
    # Prices are included because they're the whole reason to look a crop
    # up in the first place. Variety/Grade are kept too, since the same
    # crop can be listed more than once in a mandi at different grades.
    wanted = [
        "State",
        "District",
        "Market",
        "Commodity",
        "Variety",
        "Grade",
        "Min Price",
        "Max Price",
        "Modal Price",
    ]
    if date_col:
        wanted.append(date_col)

    mandi_crops = (
        df[[c for c in wanted if c in df.columns]]
        .rename(columns={"Market": "Mandi Name", "Commodity": "Crop"})
        .drop_duplicates()
        .sort_values(["State", "District", "Mandi Name", "Crop"])
        .reset_index(drop=True)
    )

    sheets = {
        "Mandis": mandis,
        "Crops": crops,
        "Mandi Crops": mandi_crops,
    }

    # Excel keeps the file locked while it is open, so writing over it
    # fails with a permission error. That used to surface as a raw
    # traceback after the download had already finished - all that work
    # thrown away for something you fix by closing a window. Now we say
    # what happened and write alongside it instead of losing the data.
    try:
        with open(path, "a"):
            pass
    except PermissionError:
        stamp = time.strftime("%H%M%S")
        alternative = path.replace(".xlsx", f"_{stamp}.xlsx")
        print(f"\n  '{path}' is open in Excel, so it can't be overwritten.")
        print(f"  Writing to '{alternative}' instead.")
        print("  (Close the file in Excel and re-run to write the normal name.)")
        path = alternative
    except FileNotFoundError:
        pass  # doesn't exist yet - nothing to be locked

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        for sheet_name, sheet_df in sheets.items():
            # Excel cannot hold more than ~1,048,576 rows on one sheet.
            # Today's data is nowhere near that, but if this is ever
            # pointed at a historical dataset we'd rather trim and say so
            # than have Excel reject the whole file.
            if len(sheet_df) > MAX_ROWS_PER_SHEET:
                print(
                    f"  WARNING: '{sheet_name}' has {len(sheet_df)} rows, "
                    f"trimming to {MAX_ROWS_PER_SHEET} to fit Excel's limit."
                )
                sheet_df = sheet_df.head(MAX_ROWS_PER_SHEET)

            sheet_df.to_excel(writer, index=False, sheet_name=sheet_name)

            # Widen the columns so nothing is cut off when you open it.
            worksheet = writer.sheets[sheet_name]
            for column_index, column_name in enumerate(sheet_df.columns, start=1):
                longest_value = (
                    sheet_df[column_name].astype(str).str.len().max()
                    if len(sheet_df)
                    else 0
                )
                width = min(40, max(12, int(max(longest_value, len(str(column_name)))) + 2))
                worksheet.column_dimensions[
                    get_column_letter(column_index)
                ].width = width

            # Freeze the header row so it stays visible while scrolling.
            worksheet.freeze_panes = "A2"

    print(f"\nSaved to {path}")
    print(f"  Sheet 1 'Mandis'      : {len(mandis):>5} mandis")
    print(f"  Sheet 2 'Crops'       : {len(crops):>5} crops")
    print(f"  Sheet 3 'Mandi Crops' : {len(mandi_crops):>5} mandi-and-crop rows")


if __name__ == "__main__":
    print("Fetching data from data.gov.in ...")
    all_records = fetch_all_records()
    save_to_excel(all_records, OUTPUT_FILE)

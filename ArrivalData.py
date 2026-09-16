"""
Fetch latest mandi crop prices AND arrival quantities/dates from AGMARKNET
and save to an Excel file.

Uses the free, unofficial `agmarknet` Python package, which talks directly
to AGMARKNET's own backend (agmarknet.gov.in) -- no API key needed, and it
includes arrival quantity, which the data.gov.in API resource does NOT have.

SETUP
-----
pip install agmarknet pandas openpyxl

RUN
---
python fetch_agmarknet_arrivals_to_excel.py

CUSTOMIZE
---------
- Leave STATE / COMMODITY / MARKET / DISTRICT as None to get everything
  (all states, all commodities) for the date range -- this can be a LOT
  of rows for wide date ranges, so start narrow while testing.
- FROM_DATE / TO_DATE control the date window. Use "today" for the very
  latest arrivals.
"""

import datetime as dt
import pandas as pd
from agmarknet import Agmarknet

# ---- CONFIG -------------------------------------------------------------

# Narrow these down to keep the pull fast, or set to None for "all".
STATE = None          # e.g. "Maharashtra"
DISTRICT = None       # e.g. "Pune"
MARKET = None         # e.g. "Pune (F&V)"
COMMODITY = None      # e.g. "Onion"  (or a list: ["Onion", "Tomato"])

# Date range -- default is just today (latest arrivals reported so far).
TODAY = dt.date.today().isoformat()
FROM_DATE = TODAY
TO_DATE = TODAY

DATA_TYPE = "both"    # "both" (price + arrivals), "price", or "arrival"

OUTPUT_FILE = "agmarknet_prices_and_arrivals.xlsx"
MAX_ROWS_PER_SHEET = 1_000_000

# ---- SCRIPT ---------------------------------------------------------------

def main():
    api = Agmarknet()

    print(f"Fetching AGMARKNET data from {FROM_DATE} to {TO_DATE} ...")
    df = api.report(
        from_date=FROM_DATE,
        to_date=TO_DATE,
        state=STATE,
        district=DISTRICT,
        market=MARKET,
        commodity=COMMODITY,
        data_type=DATA_TYPE,
        progress=True,
    )

    print(f"Got {len(df)} rows.")
    if df.empty:
        print("No data returned -- try widening the date range or filters.")
        return

    # Friendlier column names
    df = df.rename(columns={
        "arrival_date": "Arrival Date",
        "state_name": "State",
        "district_name": "District",
        "market_name": "Market",
        "cmdt_grp_name": "Commodity Group",
        "cmdt_name": "Commodity",
        "variety_name": "Variety",
        "grade_name": "Grade",
        "min_price": "Min Price",
        "max_price": "Max Price",
        "model_price": "Modal Price",
        "unit_name_price": "Price Unit",
        "arrival_qty": "Arrival Quantity",
        "unit_name_arrival": "Arrival Unit",
    })

    with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:
        if len(df) <= MAX_ROWS_PER_SHEET:
            df.to_excel(writer, index=False, sheet_name="Mandi Data")
        else:
            for i, start in enumerate(range(0, len(df), MAX_ROWS_PER_SHEET)):
                df.iloc[start:start + MAX_ROWS_PER_SHEET].to_excel(
                    writer, index=False, sheet_name=f"Mandi Data {i+1}"
                )

    print(f"Saved {len(df)} rows to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

"""Generate synthetic, aggregated datasets for the web dashboards and Power BI.

Outputs
    data/powerbi/*.csv            star-schema style fact tables (ready for Power BI import)
    dashboards/assets/data.js     the same data, compacted for the HTML dashboards

All figures are synthetic. Amounts are in UZS. The script is deterministic (seed 42).

Usage:
    python scripts/build_dashboard_data.py
"""
import csv
import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = ROOT / "data" / "powerbi"
JS_OUT = ROOT / "dashboards" / "assets" / "data.js"

SEED = 42
START, END = date(2026, 1, 1), date(2026, 6, 30)

# card: (avg daily transactions in January, avg ticket UZS, commission rate, success rate)
CARDS = {
    "UZCARD": (60_000, 165_000, 0.0045, 0.9988),
    "HUMO": (30_500, 160_000, 0.0042, 0.9979),
    "VISA": (13_600, 310_000, 0.0065, 0.9976),
    "MASTERCARD": (7_600, 290_000, 0.0062, 0.9961),
    "UNIONPAY": (1_150, 380_000, 0.0070, 0.9941),
}
# daily growth rate per card type (different trends make the dashboards more realistic)
CARD_GROWTH = {"UZCARD": 0.0021, "HUMO": 0.0034, "VISA": 0.0029, "MASTERCARD": 0.0012, "UNIONPAY": 0.0046}
# extra daily trend per transaction type (wallets grow fast, cash-out declines)
TYPE_TREND = {"PURCHASE": 0.0004, "P2P": 0.0010, "CASH_IN": -0.0003, "CASH_OUT": -0.0016,
              "AUTOPAY": 0.0012, "WALLET": 0.0042, "DEPOSIT": 0.0, "OTHER": -0.0005}
# transaction type: (share of count, ticket multiplier)
TX_TYPES = {
    "PURCHASE": (0.452, 0.95),
    "P2P": (0.168, 1.35),
    "CASH_IN": (0.114, 1.10),
    "CASH_OUT": (0.100, 0.75),
    "AUTOPAY": (0.041, 0.80),
    "WALLET": (0.029, 0.45),
    "DEPOSIT": (0.012, 2.60),
    "OTHER": (0.084, 0.60),
}
# acquiring bank: share of volume, processing fee multiplier
BANKS = {
    "Bank A": (0.27, 1.00),
    "Bank B": (0.21, 1.04),
    "Bank C": (0.16, 0.97),
    "Bank D": (0.14, 1.08),
    "Bank E": (0.12, 0.93),
    "Bank F": (0.10, 1.12),
}
# account: (opening balance, daily volatility, drift) in mln UZS
ACCOUNTS = {
    "10101 Settlement account": (64_000, 6_500, 40),
    "10301 Correspondent account": (22_000, 3_200, 30),
    "16101 Clearing suspense": (-38_000, 4_800, -60),
    "16103 Transit account": (-120_000, 9_000, -150),
    "16301 Due from other banks": (4_500, 900, 10),
    "45405 Fee income": (2_100, 260, 18),
}
ERROR_REASONS = {
    "Account not found": 0.33,
    "Amount mismatch": 0.19,
    "File format error": 0.16,
    "Rejected by issuer": 0.11,
    "Duplicate transaction": 0.05,
    "Timeout": 0.16,
}


def days():
    d = START
    while d <= END:
        yield d
        d += timedelta(days=1)


def seasonal(d: date, rng: random.Random) -> float:
    """Weekly pattern + month-end peak + holiday + noise (growth is applied per card/type)."""
    weekday = [0.97, 0.98, 1.0, 1.01, 1.08, 1.12, 0.84][d.weekday()]
    month_end = 1.10 if d.day >= 25 else 1.0
    holiday = 1.18 if (d.month, d.day) in {(3, 21), (3, 20), (3, 22)} else 1.0  # Navruz
    return weekday * month_end * holiday * rng.uniform(0.94, 1.06)


def build():
    rng = random.Random(SEED)
    card_rows, cost_rows, bal_rows, gw_rows, err_rows = [], [], [], [], []
    monthly_cost = {}

    for d in days():
        f = seasonal(d, rng)
        t = (d - START).days
        for card, (base, ticket, comm_rate, ok_rate) in CARDS.items():
            for tx, (share, mult) in TX_TYPES.items():
                growth = (1 + CARD_GROWTH[card] * t) * (1 + TYPE_TREND[tx] * t)
                cnt = max(0, round(base * f * growth * share * rng.uniform(0.9, 1.1)))
                amt = cnt * ticket * mult * rng.uniform(0.93, 1.07)
                failed = round(cnt * (1 - ok_rate) * rng.uniform(0.6, 1.4))
                comm = amt * comm_rate * rng.uniform(0.95, 1.05)
                card_rows.append([d.isoformat(), card, tx, cnt, round(amt), round(comm), failed])
                # processing cost paid to acquiring banks (aggregated monthly)
                for bank, (bshare, fee_mult) in BANKS.items():
                    key = (d.strftime("%Y-%m"), bank, card)
                    monthly_cost[key] = monthly_cost.get(key, 0) + amt * bshare * comm_rate * 0.42 * fee_mult

    for (month, bank, card), cost in sorted(monthly_cost.items()):
        cost_rows.append([month, bank, card, round(cost)])

    # account balances: random walk in mln UZS
    bal = {a: v[0] for a, v in ACCOUNTS.items()}
    for d in days():
        for acc, (_, vol, drift) in ACCOUNTS.items():
            bal[acc] += drift + rng.gauss(0, vol) * (0.35 if d.weekday() == 6 else 1)
            bal_rows.append([d.isoformat(), acc, round(bal[acc], 1)])

    # bill-payment gateway vs clearing reconciliation
    for d in days():
        f = seasonal(d, rng)
        files = round(8_400 * f)
        partial = round(files * rng.uniform(0.008, 0.016))
        errors = round(files * rng.uniform(0.005, 0.011))
        processed = files - errors
        gw_amount = files * rng.uniform(5.4, 5.9)  # mln UZS
        diff = rng.gauss(-35, 60)  # gateway minus clearing, mln UZS
        if rng.random() < 0.06:
            diff += rng.choice([-1, 1]) * rng.uniform(150, 320)
        gw_rows.append([d.isoformat(), files, processed, partial, errors,
                        round(gw_amount, 1), round(gw_amount - diff, 1)])
        remaining = errors
        reasons = list(ERROR_REASONS.items())
        for i, (reason, w) in enumerate(reasons):
            n = remaining if i == len(reasons) - 1 else min(remaining, round(errors * w * rng.uniform(0.8, 1.2)))
            remaining -= n
            err_rows.append([d.isoformat(), reason, n])

    return card_rows, cost_rows, bal_rows, gw_rows, err_rows


def write_csv(name, header, rows):
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    with (CSV_DIR / name).open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main():
    card_rows, cost_rows, bal_rows, gw_rows, err_rows = build()

    write_csv("fact_card_transactions_daily.csv",
              ["date", "card_type", "transaction_type", "tx_count", "amount_uzs", "commission_uzs", "failed_count"],
              card_rows)
    write_csv("fact_processing_cost_monthly.csv", ["month", "bank", "card_type", "processing_cost_uzs"], cost_rows)
    write_csv("fact_account_balance_daily.csv", ["date", "account", "balance_mln_uzs"], bal_rows)
    write_csv("fact_gateway_reconciliation_daily.csv",
              ["date", "files_received", "files_processed", "files_partial", "files_error",
               "gateway_amount_mln_uzs", "clearing_amount_mln_uzs"], gw_rows)
    write_csv("fact_gateway_errors_daily.csv", ["date", "error_reason", "error_count"], err_rows)

    # compact JSON for the browser: dimensions as index lists, facts as arrays
    dates = sorted({r[0] for r in card_rows})
    di = {d: i for i, d in enumerate(dates)}
    cards, types = list(CARDS), list(TX_TYPES)
    ci, ti = {c: i for i, c in enumerate(cards)}, {t: i for i, t in enumerate(types)}
    banks, accounts, reasons = list(BANKS), list(ACCOUNTS), list(ERROR_REASONS)
    months = sorted({r[0] for r in cost_rows})

    data = {
        "generated": "synthetic, seed 42",
        "currency": "UZS",
        "dates": dates,
        "cards": cards,
        "types": types,
        "banks": banks,
        "accounts": accounts,
        "reasons": reasons,
        "months": months,
        # [dateIdx, cardIdx, typeIdx, count, amount, commission, failed]
        "tx": [[di[r[0]], ci[r[1]], ti[r[2]], *r[3:]] for r in card_rows],
        # [monthIdx, bankIdx, cardIdx, cost]
        "cost": [[months.index(r[0]), banks.index(r[1]), ci[r[2]], r[3]] for r in cost_rows],
        # balances[accountIdx][dateIdx]
        "balances": [[r[2] for r in bal_rows if r[1] == a] for a in accounts],
        # [files, processed, partial, errors, gatewayAmt, clearingAmt] per date
        "gateway": [r[1:] for r in gw_rows],
        # errors[reasonIdx][dateIdx]
        "errors": [[r[2] for r in err_rows if r[1] == reason] for reason in reasons],
    }
    JS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JS_OUT.write_text(
        "// Generated by scripts/build_dashboard_data.py — synthetic data, do not edit by hand\n"
        "window.DASHBOARD_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    total_cnt = sum(r[3] for r in card_rows)
    total_amt = sum(r[4] for r in card_rows)
    print(f"{len(card_rows):,} card rows | {total_cnt:,} transactions | UZS {total_amt / 1e9:,.1f} bln")
    print(f"Wrote CSVs to {CSV_DIR} and {JS_OUT} ({JS_OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

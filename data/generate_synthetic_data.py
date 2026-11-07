"""Generate synthetic clearing transactions for portfolio use.

Usage:
    python data/generate_synthetic_data.py                  # 50,000 rows
    python data/generate_synthetic_data.py --rows 200000 --seed 7
"""
import argparse
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = DATA_DIR / "synthetic_clearing_transactions.csv"

SYSTEMS = ["HUMO", "UZCARD", "VISA", "MASTERCARD"]
SYSTEM_WEIGHTS = [0.42, 0.38, 0.12, 0.08]
CHANNELS = ["POS", "ATM", "EPOS", "TRANSFER"]
TYPES = ["PAYMENT", "CASH_WITHDRAWAL", "P2P", "REFUND"]
HEADER = [
    "transaction_id",
    "transaction_date",
    "payment_system",
    "direction",
    "channel",
    "transaction_type",
    "amount",
    "commission",
    "reconciliation_status",
]


def generate(rows: int = 50_000, output: Path = DEFAULT_OUTPUT, seed: int = 42) -> Path:
    """Write `rows` synthetic transactions (amounts in UZS) to `output`."""
    rng = random.Random(seed)
    start = datetime(2026, 1, 1)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)

    with output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        for i in range(1, rows + 1):
            dt = start + timedelta(minutes=rng.randint(0, 60 * 24 * 300))
            amount = round(rng.uniform(10_000, 5_000_000), 2)
            writer.writerow(
                [
                    f"CL{i:08d}",
                    dt.strftime("%Y-%m-%d %H:%M:%S"),
                    rng.choices(SYSTEMS, weights=SYSTEM_WEIGHTS)[0],
                    "INCOMING" if rng.random() < 0.52 else "OUTGOING",
                    rng.choice(CHANNELS),
                    rng.choice(TYPES),
                    amount,
                    round(amount * rng.uniform(0.001, 0.008), 2),
                    "MATCHED" if rng.random() < 0.985 else "EXCEPTION",
                ]
            )
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--rows", type=int, default=50_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    path = generate(args.rows, args.output, args.seed)
    print(f"Wrote {args.rows:,} rows to {path}")

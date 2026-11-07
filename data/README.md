# Synthetic Data

All data here is synthetic. No real banking or customer data is committed to this repository.

| File | Description |
|---|---|
| `transactions_sample.csv` | 8 hand-written rows for a quick look at the format |
| `generate_synthetic_data.py` | Generates the full dataset (default 50,000 rows, seed 42) |
| `synthetic_clearing_transactions.csv` | Output of the generator — git-ignored, create it locally |

```bash
python data/generate_synthetic_data.py --rows 50000 --seed 42
```

## Fields

| Column | Example |
|---|---|
| transaction_id | `CL00000001` |
| transaction_date | `2026-03-14 10:22:00` |
| payment_system | HUMO, UZCARD, VISA, MASTERCARD |
| direction | INCOMING, OUTGOING |
| channel | POS, ATM, EPOS, TRANSFER |
| transaction_type | PAYMENT, CASH_WITHDRAWAL, P2P, REFUND |
| amount | UZS, 10,000 – 5,000,000 |
| commission | 0.1% – 0.8% of amount |
| reconciliation_status | MATCHED (~98.5%), EXCEPTION |

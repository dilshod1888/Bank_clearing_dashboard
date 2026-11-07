# Power BI Dashboard Guide

The dashboard should connect to the PostgreSQL analytical dataset and include:

- KPI cards for transaction count, amount, net position, and commission
- Daily transaction trend
- Payment system comparison
- Incoming vs outgoing analysis
- Reconciliation status monitoring

Suggested pages:

1. Executive Summary
2. Transaction Analytics
3. Clearing & Settlement
4. Operational Monitoring

## Ready-made datasets

Import the CSV files from [`data/powerbi/`](../data/powerbi) (Get Data → Text/CSV) and relate them on `date`, `card_type` and `month`. They contain the same synthetic data as the web dashboards in [`dashboards/`](../dashboards), so a Power BI version can be built and compared figure by figure.

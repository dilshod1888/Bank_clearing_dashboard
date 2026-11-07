# Suggested Power BI Measures

```DAX
Total Transactions = COUNTROWS(clearing_transactions)

Total Amount = SUM(clearing_transactions[amount])

Commission Revenue = SUM(clearing_transactions[commission])

Incoming Amount =
CALCULATE(
    [Total Amount],
    clearing_transactions[direction] = "INCOMING"
)

Outgoing Amount =
CALCULATE(
    [Total Amount],
    clearing_transactions[direction] = "OUTGOING"
)

Net Clearing Position = [Incoming Amount] - [Outgoing Amount]

Matched Transactions =
CALCULATE(
    [Total Transactions],
    clearing_transactions[reconciliation_status] = "MATCHED"
)

Reconciliation Rate =
DIVIDE([Matched Transactions], [Total Transactions], 0)
```

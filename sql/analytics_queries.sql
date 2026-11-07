-- Daily clearing position
SELECT
    transaction_date::date AS business_date,
    payment_system,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    SUM(CASE WHEN direction = 'INCOMING' THEN amount ELSE -amount END) AS net_clearing_position,
    SUM(commission) AS commission_revenue
FROM clearing_transactions
GROUP BY 1, 2
ORDER BY 1, 2;

-- Reconciliation KPI
SELECT
    payment_system,
    COUNT(*) AS total_transactions,
    COUNT(*) FILTER (WHERE reconciliation_status = 'MATCHED') AS matched_transactions,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE reconciliation_status = 'MATCHED')
        / NULLIF(COUNT(*), 0), 2
    ) AS reconciliation_rate
FROM clearing_transactions
GROUP BY payment_system;

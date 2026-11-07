CREATE TABLE clearing_transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    transaction_date TIMESTAMP NOT NULL,
    payment_system VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('INCOMING','OUTGOING')),
    channel VARCHAR(30) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    commission NUMERIC(18,2) DEFAULT 0,
    reconciliation_status VARCHAR(20) DEFAULT 'MATCHED'
);

CREATE INDEX idx_clearing_transactions_date
    ON clearing_transactions (transaction_date);

CREATE INDEX idx_clearing_transactions_system_date
    ON clearing_transactions (payment_system, transaction_date);

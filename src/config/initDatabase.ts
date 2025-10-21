import { getPool } from "./database";

export const initializeTables = async (): Promise<void> => {
  const pool = getPool();

  const createRatesTable = `
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id SERIAL PRIMARY KEY,
      base_currency VARCHAR(3) NOT NULL,
      target_currency VARCHAR(3) NOT NULL,
      rate DECIMAL(20, 10) NOT NULL,
      source VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_rate_record UNIQUE (base_currency, target_currency, created_at)
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_currencies 
    ON exchange_rates(base_currency, target_currency);
    
    CREATE INDEX IF NOT EXISTS idx_created_at 
    ON exchange_rates(created_at DESC);
  `;

  try {
    await pool.query(createRatesTable);
    await pool.query(createIndexes);
    console.log("Database tables initialized");
  } catch (error) {
    console.error("Failed to initialize database tables:", error);
    throw error;
  }
};

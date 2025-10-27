import { QueryResult } from "pg";
import { query } from "../config/database";

export interface ExchangeRate {
  id: number;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  createdAt: Date;
}

export interface RateHistory {
  rate: number;
  source: string;
  timestamp: Date;
}

export class DatabaseService {
  async saveRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
    source: string
  ): Promise<ExchangeRate> {
    const text = `
      INSERT INTO exchange_rates (base_currency, target_currency, rate, source)
      VALUES ($1, $2, $3, $4)
      RETURNING id, base_currency, target_currency, rate, source, created_at
    `;

    const values = [
      baseCurrency.toUpperCase(),
      targetCurrency.toUpperCase(),
      rate,
      source,
    ];

    const result: QueryResult = await query(text, values);
    const row = result.rows[0];

    return {
      id: row.id,
      baseCurrency: row.base_currency,
      targetCurrency: row.target_currency,
      rate: parseFloat(row.rate),
      source: row.source,
      createdAt: row.created_at,
    };
  }

  async getLatestRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExchangeRate | null> {
    const text = `
      SELECT id, base_currency, target_currency, rate, source, created_at
      FROM exchange_rates
      WHERE base_currency = $1 AND target_currency = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const values = [baseCurrency.toUpperCase(), targetCurrency.toUpperCase()];

    const result: QueryResult = await query(text, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      baseCurrency: row.base_currency,
      targetCurrency: row.target_currency,
      rate: parseFloat(row.rate),
      source: row.source,
      createdAt: row.created_at,
    };
  }

  async getRateHistory(
    baseCurrency: string,
    targetCurrency: string,
    hoursBack: number = 24
  ): Promise<RateHistory[]> {
    const text = `
      SELECT rate, source, created_at as timestamp
      FROM exchange_rates
      WHERE base_currency = $1 
        AND target_currency = $2
        AND created_at > NOW() - INTERVAL '1 hour' * $3
      ORDER BY created_at DESC
    `;

    const values = [
      baseCurrency.toUpperCase(),
      targetCurrency.toUpperCase(),
      hoursBack,
    ];

    const result: QueryResult = await query(text, values);

    return result.rows.map((row) => ({
      rate: parseFloat(row.rate),
      source: row.source,
      timestamp: row.timestamp,
    }));
  }

  async getRatesByTimeRange(
    baseCurrency: string,
    targetCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<RateHistory[]> {
    const text = `
      SELECT rate, source, created_at as timestamp
      FROM exchange_rates
      WHERE base_currency = $1 
        AND target_currency = $2
        AND created_at BETWEEN $3 AND $4
      ORDER BY created_at DESC
    `;

    const values = [
      baseCurrency.toUpperCase(),
      targetCurrency.toUpperCase(),
      startDate,
      endDate,
    ];

    const result: QueryResult = await query(text, values);

    return result.rows.map((row) => ({
      rate: parseFloat(row.rate),
      source: row.source,
      timestamp: row.timestamp,
    }));
  }

  async getRateCount(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<number> {
    const text = `
      SELECT COUNT(*) as count
      FROM exchange_rates
      WHERE base_currency = $1 AND target_currency = $2
    `;

    const values = [baseCurrency.toUpperCase(), targetCurrency.toUpperCase()];

    const result: QueryResult = await query(text, values);

    return parseInt(result.rows[0].count, 10);
  }

  async deleteOldRates(daysToKeep: number = 30): Promise<number> {
    const text = `
      DELETE FROM exchange_rates
      WHERE created_at < NOW() - INTERVAL '1 day' * $1
    `;

    const values = [daysToKeep];

    const result: QueryResult = await query(text, values);

    return result.rowCount || 0;
  }

  async getAllCurrencyPairs(): Promise<
    Array<{ base: string; target: string }>
  > {
    const text = `
      SELECT DISTINCT base_currency, target_currency
      FROM exchange_rates
      ORDER BY base_currency, target_currency
    `;

    const result: QueryResult = await query(text);

    return result.rows.map((row) => ({
      base: row.base_currency,
      target: row.target_currency,
    }));
  }
}

export const databaseService = new DatabaseService();

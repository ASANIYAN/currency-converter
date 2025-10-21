import { cacheService, CachedRate } from "./cacheService";
import { databaseService } from "./databaseServices";

import { externalAPIService } from "./externalApiService";

export interface ConversionResult {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  amount?: number;
  convertedAmount?: number;
  source: string;
  timestamp: string;
  fromCache: boolean;
}

export class RateAggregatorService {
  // Main method: Get exchange rate with fallback chain
  async getExchangeRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ConversionResult> {
    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();

    // Step 1: Check cache first
    const cachedRate = await this.checkCache(base, target);
    if (cachedRate) {
      return cachedRate;
    }

    // Step 2: Cache miss - fetch from external APIs
    const apiRate = await this.fetchFromAPIs(base, target);
    if (apiRate) {
      return apiRate;
    }

    // Step 3: All APIs failed - try database as last resort
    const dbRate = await this.fetchFromDatabase(base, target);
    if (dbRate) {
      return dbRate;
    }

    // Step 4: Everything failed
    throw new Error(`Unable to fetch exchange rate for ${base} → ${target}`);
  }

  // Convert an amount using the exchange rate
  async convertCurrency(
    baseCurrency: string,
    targetCurrency: string,
    amount: number
  ): Promise<ConversionResult> {
    const rateResult = await this.getExchangeRate(baseCurrency, targetCurrency);

    const convertedAmount = amount * rateResult.rate;

    return {
      ...rateResult,
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
    };
  }

  // Step 1: Check cache
  private async checkCache(
    base: string,
    target: string
  ): Promise<ConversionResult | null> {
    const cached = await cacheService.getRate(base, target);

    if (!cached) {
      return null;
    }

    const ttl = await cacheService.getTTL(base, target);

    return {
      baseCurrency: cached.baseCurrency,
      targetCurrency: cached.targetCurrency,
      rate: cached.rate,
      source: cached.source,
      timestamp: cached.timestamp,
      fromCache: true,
    };
  }

  // Step 2: Fetch from external APIs
  private async fetchFromAPIs(
    base: string,
    target: string
  ): Promise<ConversionResult | null> {
    const apiResult = await externalAPIService.fetchRateWithAggregation(
      base,
      target
    );

    if (!apiResult.success) {
      return null;
    }

    // Store in cache for future requests
    await cacheService.setRate(base, target, apiResult.rate, apiResult.source);

    // Store in database for historical record
    await databaseService.saveRate(
      base,
      target,
      apiResult.rate,
      apiResult.source
    );

    return {
      baseCurrency: base,
      targetCurrency: target,
      rate: apiResult.rate,
      source: apiResult.source,
      timestamp: apiResult.timestamp || new Date().toISOString(),
      fromCache: false,
    };
  }

  // Step 3: Fetch from database (fallback)
  private async fetchFromDatabase(
    base: string,
    target: string
  ): Promise<ConversionResult | null> {
    const latestRate = await databaseService.getLatestRate(base, target);

    if (!latestRate) {
      return null;
    }

    return {
      baseCurrency: latestRate.baseCurrency,
      targetCurrency: latestRate.targetCurrency,
      rate: latestRate.rate,
      source: `${latestRate.source} (stale)`,
      timestamp: latestRate.createdAt.toISOString(),
      fromCache: false,
    };
  }

  // Get rate history for a currency pair
  async getRateHistory(
    baseCurrency: string,
    targetCurrency: string,
    hours: number = 24
  ) {
    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();

    const history = await databaseService.getRateHistory(base, target, hours);

    return {
      baseCurrency: base,
      targetCurrency: target,
      period: `${hours} hours`,
      dataPoints: history.length,
      history: history.map((record) => ({
        rate: record.rate,
        source: record.source,
        timestamp: record.timestamp,
      })),
    };
  }

  // Helper: Calculate how old the data is
  private getDataAge(createdAt: Date): string {
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) {
      return `${ageDays} day${ageDays > 1 ? "s" : ""} old`;
    } else if (ageHours > 0) {
      return `${ageHours} hour${ageHours > 1 ? "s" : ""} old`;
    } else {
      return `${ageMinutes} minute${ageMinutes > 1 ? "s" : ""} old`;
    }
  }

  // Clear cache for a specific currency pair
  async clearCache(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<void> {
    await cacheService.deleteRate(
      baseCurrency.toUpperCase(),
      targetCurrency.toUpperCase()
    );
  }

  // Clear all cached rates
  async clearAllCache(): Promise<void> {
    await cacheService.clearAll();
  }
}

// Export singleton instance
export const rateAggregatorService = new RateAggregatorService();

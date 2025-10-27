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
  async getExchangeRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ConversionResult> {
    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();

    const cachedRate = await this.checkCache(base, target);
    if (cachedRate) {
      return cachedRate;
    }

    const apiRate = await this.fetchFromAPIs(base, target);
    if (apiRate) {
      return apiRate;
    }

    const dbRate = await this.fetchFromDatabase(base, target);
    if (dbRate) {
      return dbRate;
    }

    throw new Error(`Unable to fetch exchange rate for ${base} → ${target}`);
  }

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
      convertedAmount: Math.round(convertedAmount * 100) / 100,
    };
  }

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

    await cacheService.setRate(base, target, apiResult.rate, apiResult.source);

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

  private async fetchFromDatabase(
    base: string,
    target: string
  ): Promise<ConversionResult | null> {
    const latestRate = await databaseService.getLatestRate(base, target);

    if (!latestRate) {
      return null;
    }

    await cacheService.setRate(
      base,
      target,
      latestRate.rate,
      `${latestRate.source} (stale)`
    );

    return {
      baseCurrency: latestRate.baseCurrency,
      targetCurrency: latestRate.targetCurrency,
      rate: latestRate.rate,
      source: `${latestRate.source} (stale)`,
      timestamp: latestRate.createdAt.toISOString(),
      fromCache: false,
    };
  }

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

  async clearCache(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<void> {
    await cacheService.deleteRate(
      baseCurrency.toUpperCase(),
      targetCurrency.toUpperCase()
    );
  }

  async clearAllCache(): Promise<void> {
    await cacheService.clearAll();
  }
}

export const rateAggregatorService = new RateAggregatorService();

import axios from "axios";
import config from "../config/env";
import {
  ExternalAPIResponse,
  FixerResponse,
  CurrencyAPIResponse,
  FrankfurterResponse,
} from "../types/apiTypes";

export class ExternalAPIService {
  private readonly timeout = 5000; // 5 seconds timeout

  // Fetch from Fixer.io (Primary API)
  async fetchFromFixer(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    try {
      const url = `https://api.fixer.io/latest`;

      const response = await axios.get<FixerResponse>(url, {
        params: {
          access_key: config.apiKeys.fixer,
          base: baseCurrency.toUpperCase(),
          symbols: targetCurrency.toUpperCase(),
        },
        timeout: this.timeout,
      });

      if (!response.data.success) {
        throw new Error("Fixer API returned unsuccessful response");
      }

      const rate = response.data.rates[targetCurrency.toUpperCase()];

      if (!rate) {
        throw new Error(`Rate not found for ${targetCurrency}`);
      }

      return {
        success: true,
        rate,
        source: "fixer",
        timestamp: new Date(response.data.timestamp * 1000).toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        rate: 0,
        source: "fixer",
      };
    }
  }

  // Fetch from Frankfurter (Secondary API - No API key required)
  async fetchFromFrankfurter(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    try {
      const url = `https://api.frankfurter.app/latest`;

      const response = await axios.get<FrankfurterResponse>(url, {
        params: {
          from: baseCurrency.toUpperCase(),
          to: targetCurrency.toUpperCase(),
        },
        timeout: this.timeout,
      });

      const rate = response.data.rates[targetCurrency.toUpperCase()];

      if (!rate) {
        throw new Error(`Rate not found for ${targetCurrency}`);
      }

      // Convert date string to ISO timestamp
      const timestamp = new Date(response.data.date).toISOString();

      return {
        success: true,
        rate,
        source: "frankfurter",
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        rate: 0,
        source: "frankfurter",
      };
    }
  }

  // Fetch from CurrencyAPI (Backup API)
  async fetchFromCurrencyAPI(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    try {
      const url = `https://api.currencyapi.com/v3/latest`;

      const response = await axios.get<CurrencyAPIResponse>(url, {
        params: {
          apikey: config.apiKeys.currencyApi,
          base_currency: baseCurrency.toUpperCase(),
          currencies: targetCurrency.toUpperCase(),
        },
        timeout: this.timeout,
      });

      const targetData = response.data.data[targetCurrency.toUpperCase()];

      if (!targetData || !targetData.value) {
        throw new Error(`Rate not found for ${targetCurrency}`);
      }

      return {
        success: true,
        rate: targetData.value,
        source: "currencyapi",
      };
    } catch (error) {
      return {
        success: false,
        rate: 0,
        source: "currencyapi",
      };
    }
  }

  // Fetch from multiple APIs with fallback strategy
  async fetchRateWithFallback(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    // Try primary API first
    const fixerResult = await this.fetchFromFixer(baseCurrency, targetCurrency);

    if (fixerResult.success) {
      return fixerResult;
    }

    // Primary failed, try secondary
    const frankfurterResult = await this.fetchFromFrankfurter(
      baseCurrency,
      targetCurrency
    );

    if (frankfurterResult.success) {
      return frankfurterResult;
    }

    // Secondary failed, try backup
    const currencyApiResult = await this.fetchFromCurrencyAPI(
      baseCurrency,
      targetCurrency
    );

    if (currencyApiResult.success) {
      return currencyApiResult;
    }

    // All APIs failed
    return {
      success: false,
      rate: 0,
      source: "none",
    };
  }

  // Fetch from multiple APIs and average the results
  async fetchRateWithAggregation(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    // Fetch from all APIs in parallel
    const [fixerResult, openExchangeResult, currencyApiResult] =
      await Promise.allSettled([
        this.fetchFromFixer(baseCurrency, targetCurrency),
        this.fetchFromFrankfurter(baseCurrency, targetCurrency),
        this.fetchFromCurrencyAPI(baseCurrency, targetCurrency),
      ]);

    const successfulResults: ExternalAPIResponse[] = [];

    // Collect successful results
    if (fixerResult.status === "fulfilled" && fixerResult.value.success) {
      successfulResults.push(fixerResult.value);
    }

    if (
      openExchangeResult.status === "fulfilled" &&
      openExchangeResult.value.success
    ) {
      successfulResults.push(openExchangeResult.value);
    }

    if (
      currencyApiResult.status === "fulfilled" &&
      currencyApiResult.value.success
    ) {
      successfulResults.push(currencyApiResult.value);
    }

    // If no APIs succeeded, return failure
    if (successfulResults.length === 0) {
      return {
        success: false,
        rate: 0,
        source: "none",
      };
    }

    // Calculate average rate
    const averageRate =
      successfulResults.reduce((sum, result) => sum + result.rate, 0) /
      successfulResults.length;

    const sources = successfulResults.map((r) => r.source).join("+");

    return {
      success: true,
      rate: averageRate,
      source: `aggregated(${sources})`,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper to extract error messages
  private getErrorMessage(error: unknown): string {
    // Check if it's an Axios error by examining its properties
    if (this.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        return `HTTP ${error.response.status}: ${JSON.stringify(
          error.response.data
        )}`;
      } else if (error.request) {
        // Request made but no response (timeout, network error)
        return "No response received (timeout or network error)";
      } else {
        // Error setting up request
        return error.message || "Axios request setup error";
      }
    }

    // Check if it's a regular Error object
    if (error && typeof error === "object" && "message" in error) {
      return (error as Error).message;
    }

    // Handle string errors
    if (typeof error === "string") {
      return error;
    }

    return "Unknown error occurred";
  }

  // Custom Axios error type guard
  private isAxiosError(error: any): error is any {
    return (
      error &&
      typeof error === "object" &&
      error.isAxiosError === true &&
      "config" in error &&
      "request" in error
    );
  }
}

// Export singleton instance
export const externalAPIService = new ExternalAPIService();

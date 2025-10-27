import axios from "axios";
import config from "../config/env";
import {
  ExternalAPIResponse,
  FixerResponse,
  CurrencyAPIResponse,
  FrankfurterResponse,
} from "../types/apiTypes";

export class ExternalAPIService {
  private readonly timeout = 5000;

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

  async fetchRateWithFallback(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    const fixerResult = await this.fetchFromFixer(baseCurrency, targetCurrency);

    if (fixerResult.success) {
      return fixerResult;
    }

    const frankfurterResult = await this.fetchFromFrankfurter(
      baseCurrency,
      targetCurrency
    );

    if (frankfurterResult.success) {
      return frankfurterResult;
    }

    const currencyApiResult = await this.fetchFromCurrencyAPI(
      baseCurrency,
      targetCurrency
    );

    if (currencyApiResult.success) {
      return currencyApiResult;
    }

    return {
      success: false,
      rate: 0,
      source: "none",
    };
  }

  async fetchRateWithAggregation(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<ExternalAPIResponse> {
    const [fixerResult, openExchangeResult, currencyApiResult] =
      await Promise.allSettled([
        this.fetchFromFixer(baseCurrency, targetCurrency),
        this.fetchFromFrankfurter(baseCurrency, targetCurrency),
        this.fetchFromCurrencyAPI(baseCurrency, targetCurrency),
      ]);

    const successfulResults: ExternalAPIResponse[] = [];

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

    if (successfulResults.length === 0) {
      return {
        success: false,
        rate: 0,
        source: "none",
      };
    }

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

  private getErrorMessage(error: unknown): string {
    if (this.isAxiosError(error)) {
      if (error.response) {
        return `HTTP ${error.response.status}: ${JSON.stringify(
          error.response.data
        )}`;
      } else if (error.request) {
        return "No response received (timeout or network error)";
      } else {
        return error.message || "Axios request setup error";
      }
    }

    if (error && typeof error === "object" && "message" in error) {
      return (error as Error).message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "Unknown error occurred";
  }

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

export const externalAPIService = new ExternalAPIService();

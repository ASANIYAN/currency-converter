export interface ExternalAPIResponse {
  success: boolean;
  rate: number;
  source: string;
  timestamp?: string;
}

export interface FixerResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
}

export interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
}

export interface CurrencyAPIResponse {
  data: {
    [key: string]: {
      code: string;
      value: number;
    };
  };
}

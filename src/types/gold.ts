export interface GoldRates {
  24: number; // Pure gold (24 karat)
  22: number; // 22 karat
  18: number; // 18 karat
  14: number; // 14 karat
}

export interface RateAtDate {
  rate: number;
  date: {
    year: number;
    month: number;
    dayOfMonth: number;
  };
}

export interface RateAtDateWithCache extends RateAtDate {
  fromCache: boolean;
}

export interface ApiResponse<T = any> {
  responseCode: number;
  responseMessage: string;
  body?: T;
}

export interface GoldRateResponse {
  responseCode: number;
  responseMessage: string;
  body: {
    rates: GoldRates;
    date: {
      year: number;
      month: number;
      dayOfMonth: number;
    };
    lastUpdated: string;
  };
}
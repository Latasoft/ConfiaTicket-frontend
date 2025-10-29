// src/services/configService.ts
import api from './api';

export interface SystemConfig {
  ticketLimits: {
    OWN: { MIN: number; MAX: number | null }; // MAX puede ser null para sin límite
    RESALE: { MIN: number; MAX: number };
  };
  priceLimits: {
    MIN: number;
    MAX: number;
    RESALE_MARKUP_PERCENT: number;
  };
  fieldLimits: {
    TITLE: number;
    DESCRIPTION: number;
    VENUE: number;
    CITY: number;
    COMMUNE: number;
    COVER_URL: number;
    PAYOUT_BANK: number;
    PAYOUT_TYPE: number;
    PAYOUT_NUMBER: number;
    PAYOUT_HOLDER_NAME: number;
  };
  platformFee: {
    feeBps: number;
    description?: string;
  };
  businessRules: {
    ALLOWED_ACCOUNT_TYPES: string[];
  };
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const response = await api.get('/config/business-rules');
  return response.data;
}

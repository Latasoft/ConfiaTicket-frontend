// src/services/adminConfigService.ts
import api from './api';

/* ============= TYPES ============= */

export interface TicketLimitConfig {
  id: number;
  eventType: 'OWN' | 'RESALE';
  minCapacity: number;
  maxCapacity: number | null; // null = sin límite (solo para OWN)
  createdAt: string;
  updatedAt: string;
}

export interface PriceLimitConfig {
  id: number;
  minPrice: number;
  maxPrice: number;
  resaleMarkupPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformFeeConfig {
  id: number;
  feeBps: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FieldLimitConfig {
  id: number;
  fieldName: string;
  maxLength: number;
  context?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: number;
  category: string;
  key: string;
  value: string;
  dataType: string;
  description?: string | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ============= TICKET LIMITS ============= */

export async function getTicketLimits(): Promise<TicketLimitConfig[]> {
  const response = await api.get('/admin/config/ticket-limits');
  return response.data.items;
}

export async function updateTicketLimit(
  eventType: 'OWN' | 'RESALE',
  data: { minCapacity: number; maxCapacity: number | null }
): Promise<TicketLimitConfig> {
  const response = await api.put(`/admin/config/ticket-limits/${eventType}`, data);
  return response.data;
}

/* ============= PRICE LIMITS ============= */

export async function getPriceLimit(): Promise<PriceLimitConfig> {
  const response = await api.get('/admin/config/price-limit');
  return response.data;
}

export async function updatePriceLimit(data: {
  minPrice: number;
  maxPrice: number;
  resaleMarkupPercent: number;
}): Promise<PriceLimitConfig> {
  const response = await api.put('/admin/config/price-limit', data);
  return response.data;
}

/* ============= PLATFORM FEE ============= */

export async function getPlatformFee(): Promise<PlatformFeeConfig> {
  const response = await api.get('/admin/config/platform-fee');
  return response.data;
}

export async function updatePlatformFee(data: {
  feeBps: number;
  description?: string;
}): Promise<PlatformFeeConfig> {
  const response = await api.put('/admin/config/platform-fee', data);
  return response.data;
}

/* ============= FIELD LIMITS ============= */

export async function getFieldLimits(context?: string): Promise<FieldLimitConfig[]> {
  const params = context ? { context } : {};
  const response = await api.get('/admin/config/field-limits', { params });
  return response.data.items;
}

export async function updateFieldLimit(
  fieldName: string,
  data: { maxLength: number; context?: string }
): Promise<FieldLimitConfig> {
  const response = await api.put(`/admin/config/field-limits/${fieldName}`, data);
  return response.data;
}

/* ============= SYSTEM CONFIGS ============= */

export async function getSystemConfigs(category?: string): Promise<SystemConfig[]> {
  const params = category ? { category } : {};
  const response = await api.get('/admin/config/system-configs', { params });
  return response.data.items;
}

export async function updateSystemConfig(
  key: string,
  data: {
    value: string;
    category?: string;
    dataType?: string;
    description?: string;
    isEditable?: boolean;
  }
): Promise<SystemConfig> {
  const response = await api.put(`/admin/config/system-configs/${key}`, data);
  return response.data;
}

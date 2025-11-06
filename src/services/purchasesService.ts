// src/services/purchasesService.ts
import api from './api';

export interface PurchaseMetrics {
  totalAmount: number;
  totalPurchases: number;
  successfulPurchases: number;
}

export interface PurchaseListResponse {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: PurchaseMetrics;
}

export interface PurchaseFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  eventId?: number;
  status?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Lista todas las compras con filtros
 */
export async function adminListPurchases(
  filters: PurchaseFilters = {}
): Promise<PurchaseListResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
  if (filters.q) params.append('q', filters.q);
  if (filters.eventId) params.append('eventId', filters.eventId.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const response = await api.get(`/admin/purchases?${params.toString()}`);
  return response.data;
}

/**
 * Obtiene el detalle de una compra
 */
export async function adminGetPurchaseDetail(id: number): Promise<any> {
  const response = await api.get(`/admin/purchases/${id}`);
  return response.data;
}

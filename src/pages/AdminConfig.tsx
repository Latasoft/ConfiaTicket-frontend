// src/pages/AdminConfig.tsx
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  getTicketLimits,
  updateTicketLimit,
  getPriceLimit,
  updatePriceLimit,
  getPlatformFee,
  updatePlatformFee,
  type TicketLimitConfig,
  type PriceLimitConfig,
  type PlatformFeeConfig,
} from '@/services/adminConfigService';

type Toast = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function AdminConfig() {
  const [ticketLimits, setTicketLimits] = useState<TicketLimitConfig[]>([]);
  const [, setPriceLimit] = useState<PriceLimitConfig | null>(null);
  const [platformFee, setPlatformFee] = useState<PlatformFeeConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set()); // Cambiado a Set para múltiples botones
  
  // Estados originales para detectar cambios
  const [originalTicketForms, setOriginalTicketForms] = useState<Record<string, { min: number; max: number | null; unlimited: boolean }>>({});
  const [originalPriceForm, setOriginalPriceForm] = useState({ minPrice: 0, maxPrice: 0, resaleMarkup: 0 });
  const [originalFeeForm, setOriginalFeeForm] = useState({ feePercent: 0, description: '' });

  // Form states
  const [ticketForms, setTicketForms] = useState<Record<string, { min: number; max: number | null; unlimited: boolean }>>({});
  const [priceForm, setPriceForm] = useState({ minPrice: 0, maxPrice: 0, resaleMarkup: 0 });
  const [feeForm, setFeeForm] = useState({ feePercent: 0, description: '' });

  useEffect(() => {
    loadAllConfig();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadAllConfig() {
    try {
      setLoading(true);
      const [ticketData, priceData, feeData] = await Promise.all([
        getTicketLimits(),
        getPriceLimit(),
        getPlatformFee(),
      ]);

      setTicketLimits(ticketData);
      setPriceLimit(priceData);
      setPlatformFee(feeData);

            // Initialize forms
      const ticketFormsInit: Record<string, { min: number; max: number | null; unlimited: boolean }> = {};
      ticketData.forEach((limit) => {
        ticketFormsInit[limit.eventType] = {
          min: limit.minCapacity,
          max: limit.maxCapacity,
          unlimited: limit.maxCapacity === null,
        };
      });
      setTicketForms(ticketFormsInit);
      setOriginalTicketForms(ticketFormsInit); // Guardar valores originales

      const priceFormData = {
        minPrice: priceData.minPrice,
        maxPrice: priceData.maxPrice,
        resaleMarkup: priceData.resaleMarkupPercent,
      };
      setPriceForm(priceFormData);
      setOriginalPriceForm(priceFormData); // Guardar valores originales

      const feeFormData = {
        feePercent: (feeData.feeBps / 100),
        description: feeData.description || '',
      };
      setFeeForm(feeFormData);
      setOriginalFeeForm(feeFormData); // Guardar valores originales
    } catch (error: any) {
      console.error('Error al cargar configuración:', error);
      setToast({
        kind: 'error',
        text: error?.response?.data?.error || 'Error al cargar la configuración',
      });
    } finally {
      setLoading(false);
    }
  }

  // Helper para detectar cambios y resetear el estado "guardado"
  const handleFormChange = (formKey: string, hasChanged: boolean) => {
    if (hasChanged && justSaved.has(formKey)) {
      setJustSaved((prev) => {
        const next = new Set(prev);
        next.delete(formKey);
        return next;
      });
    }
  };

  async function handleSaveTicketLimit(eventType: 'OWN' | 'RESALE') {
    try {
      setSaving(`ticket-${eventType}`);
      const form = ticketForms[eventType];
      
      if (!form || form.min < 0) {
        setToast({
          kind: 'error',
          text: 'Valores inválidos: mín debe ser >= 0',
        });
        return;
      }

      // Validaciones específicas según si tiene límite o no
      if (!form.unlimited) {
        if (form.max === null || form.max < 1 || form.min >= form.max) {
          setToast({
            kind: 'error',
            text: 'Valores inválidos: máx > 0 y mín < máx',
          });
          return;
        }
      }

      const maxCapacityValue = form.unlimited ? null : form.max;

      await updateTicketLimit(eventType, {
        minCapacity: form.min,
        maxCapacity: maxCapacityValue,
      });

      // Actualizar estado local sin recargar desde el servidor
      setTicketLimits(prev => prev.map(limit => 
        limit.eventType === eventType 
          ? { ...limit, minCapacity: form.min, maxCapacity: maxCapacityValue }
          : limit
      ));

      // Actualizar valores originales después de guardar
      setOriginalTicketForms(prev => ({
        ...prev,
        [eventType]: { min: form.min, max: maxCapacityValue, unlimited: form.unlimited },
      }));

      setToast({ kind: 'success', text: `✓ Límites de ${eventType} actualizados correctamente` });
      
      // Mostrar feedback visual en el botón (permanece hasta que se cambie el valor)
      const saveKey = `ticket-${eventType}`;
      setJustSaved(prev => new Set(prev).add(saveKey));
    } catch (error: any) {
      setToast({
        kind: 'error',
        text: error?.response?.data?.error || 'Error al guardar',
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleSavePriceLimit() {
    try {
      setSaving('price');
      
      if (
        priceForm.minPrice < 0 ||
        priceForm.maxPrice < 1 ||
        priceForm.minPrice >= priceForm.maxPrice ||
        priceForm.resaleMarkup < 0 ||
        priceForm.resaleMarkup > 100
      ) {
        setToast({
          kind: 'error',
          text: 'Valores inválidos: revisa los rangos de precio y el sobreprecio (0-100%)',
        });
        return;
      }

      const updated = await updatePriceLimit({
        minPrice: priceForm.minPrice,
        maxPrice: priceForm.maxPrice,
        resaleMarkupPercent: priceForm.resaleMarkup,
      });

      // Actualizar estado local sin recargar
      setPriceLimit(updated);

      // Actualizar valores originales después de guardar
      setOriginalPriceForm({
        minPrice: priceForm.minPrice,
        maxPrice: priceForm.maxPrice,
        resaleMarkup: priceForm.resaleMarkup,
      });

      setToast({ kind: 'success', text: '✓ Límites de precio actualizados correctamente' });
      
      // Mostrar feedback visual en el botón (permanece hasta que se cambie el valor)
      setJustSaved(prev => new Set(prev).add('price'));
    } catch (error: any) {
      setToast({
        kind: 'error',
        text: error?.response?.data?.error || 'Error al guardar',
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleSavePlatformFee() {
    try {
      setSaving('fee');
      
      if (feeForm.feePercent < 0 || feeForm.feePercent > 100) {
        setToast({
          kind: 'error',
          text: 'El porcentaje debe estar entre 0% y 100%',
        });
        return;
      }

      // Convertir porcentaje a basis points para el backend
      const feeBps = Math.round(feeForm.feePercent * 100);

      const updated = await updatePlatformFee({
        feeBps,
        description: feeForm.description || undefined,
      });

      // Actualizar estado local sin recargar
      setPlatformFee(updated);

      // Actualizar valores originales después de guardar
      setOriginalFeeForm({
        feePercent: feeForm.feePercent,
        description: feeForm.description,
      });

      setToast({ kind: 'success', text: '✓ Comisión de plataforma actualizada correctamente' });
      
      // Mostrar feedback visual en el botón (permanece hasta que se cambie el valor)
      setJustSaved(prev => new Set(prev).add('fee'));
    } catch (error: any) {
      setToast({
        kind: 'error',
        text: error?.response?.data?.error || 'Error al guardar',
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-gray-600 mt-2">Panel de administración de parámetros globales</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 text-sm mb-6 pb-4 border-b">
        <NavLink to="/admin/eventos" className="text-blue-600 hover:underline">
          Eventos
        </NavLink>
        <NavLink to="/admin/usuarios" className="text-blue-600 hover:underline">
          Usuarios
        </NavLink>
        <NavLink to="/admin/solicitudes-organizador" className="text-blue-600 hover:underline">
          Solicitudes
        </NavLink>
        <NavLink to="/admin/configuracion" className="font-semibold text-gray-900">
          Configuración
        </NavLink>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-top-2 ${
            toast.kind === 'success'
              ? 'bg-green-50 border-green-400 text-green-900'
              : toast.kind === 'error'
              ? 'bg-red-50 border-red-400 text-red-900'
              : 'bg-blue-50 border-blue-400 text-blue-900'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {toast.kind === 'success' && (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.kind === 'error' && (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.kind === 'info' && (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs px-2 py-1 border rounded hover:bg-black/5 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Platform Fee - PRIMERO Y MÁS DESTACADO */}
        <section className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-md">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-green-900">Tu Comisión por Venta</h2>
            <p className="text-sm text-green-700 mt-1">
              Porcentaje que ConfiaTicket cobra adicionalmente sobre el precio del organizador
            </p>
          </div>

          <div className="bg-white/80 rounded-lg p-4 mb-4 border border-green-200">
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">Cómo funciona:</p>
              <ul className="space-y-1">
                <li>• <strong>Organizador define precio:</strong> $10.000</li>
                <li>• <strong>Comisión ConfiaTicket (2.5%):</strong> $250</li>
                <li>• <strong>Comprador paga:</strong> $10.000 + $250 = $10.250</li>
                <li>• <strong>Organizador recibe:</strong> $10.000 (precio completo)</li>
                <li>• <strong>ConfiaTicket recibe:</strong> $250 (tu ganancia)</li>
              </ul>
              <p className="text-amber-700 mt-3 font-medium">
                Nota: Las comisiones de Transbank/Webpay se cobran aparte
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje de comisión
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={feeForm.feePercent}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) || 0;
                    setFeeForm({ ...feeForm, feePercent: newValue });
                    handleFormChange('fee', newValue !== originalFeeForm.feePercent);
                  }}
                  className="w-full border-2 border-green-300 rounded-lg px-3 py-2 pr-8 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ej: 2.5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Valores comunes: 2% - 5%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas internas (opcional)
              </label>
              <input
                type="text"
                value={feeForm.description}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFeeForm({ ...feeForm, description: newValue });
                  handleFormChange('fee', 
                    newValue !== originalFeeForm.description ||
                    feeForm.feePercent !== originalFeeForm.feePercent
                  );
                }}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ej: Comisión estándar"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p><strong>Valor actual:</strong> {platformFee ? (platformFee.feeBps / 100).toFixed(2) : '0'}%</p>
            </div>
            <button
              onClick={handleSavePlatformFee}
              disabled={saving === 'fee'}
              className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                justSaved.has('fee')
                  ? 'bg-green-600 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving === 'fee' ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : justSaved.has('fee') ? (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardado
                </>
              ) : (
                'Guardar comisión'
              )}
            </button>
          </div>
        </section>

        {/* Ticket Limits */}
        <section className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Límites de Entradas por Compra</h2>
            <p className="text-sm text-gray-600 mt-1">
              Cantidad mínima y máxima que un usuario puede comprar en una sola transacción
            </p>
          </div>

          {ticketLimits.map((limit) => (
            <div key={limit.eventType} className="mb-6 last:mb-0 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {limit.eventType === 'OWN' ? 'Eventos Propios (organizados en tu plataforma)' : 'Reventa de Entradas'}
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                {limit.eventType === 'OWN' 
                  ? 'Eventos creados por organizadores que generan tickets automáticos' 
                  : 'Reventa de entradas físicas entre usuarios (máximo recomendado: 4)'}
              </p>

              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mínimo por compra
                  </label>
                  <input
                    type="number"
                    value={ticketForms[limit.eventType]?.min ?? limit.minCapacity}
                    onChange={(e) => {
                      const newMin = parseInt(e.target.value) || 0;
                      const currentMax = ticketForms[limit.eventType]?.max ?? limit.maxCapacity;
                      const currentUnlimited = ticketForms[limit.eventType]?.unlimited ?? false;
                      setTicketForms({
                        ...ticketForms,
                        [limit.eventType]: {
                          min: newMin,
                          max: currentMax,
                          unlimited: currentUnlimited,
                        },
                      });
                      const saveKey = `ticket-${limit.eventType}`;
                      const original = originalTicketForms[limit.eventType];
                      handleFormChange(saveKey, 
                        original && (newMin !== original.min || currentMax !== original.max || currentUnlimited !== original.unlimited)
                      );
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo por compra
                  </label>
                  <input
                    type="number"
                    value={ticketForms[limit.eventType]?.max ?? limit.maxCapacity ?? ''}
                    onChange={(e) => {
                      const newMax = parseInt(e.target.value) || null;
                      const currentMin = ticketForms[limit.eventType]?.min ?? limit.minCapacity;
                      const currentUnlimited = ticketForms[limit.eventType]?.unlimited ?? false;
                      setTicketForms({
                        ...ticketForms,
                        [limit.eventType]: {
                          min: currentMin,
                          max: newMax,
                          unlimited: currentUnlimited,
                        },
                      });
                      const saveKey = `ticket-${limit.eventType}`;
                      const original = originalTicketForms[limit.eventType];
                      handleFormChange(saveKey,
                        original && (currentMin !== original.min || newMax !== original.max || currentUnlimited !== original.unlimited)
                      );
                    }}
                    disabled={limit.eventType === 'OWN' && (ticketForms[limit.eventType]?.unlimited ?? false)}
                    className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    min="1"
                    placeholder={limit.eventType === 'OWN' && (ticketForms[limit.eventType]?.unlimited ?? false) ? 'Sin límite' : ''}
                  />
                  {limit.eventType === 'OWN' && (
                    <div className="mt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticketForms[limit.eventType]?.unlimited ?? false}
                          onChange={(e) => {
                            const isUnlimited = e.target.checked;
                            const currentMin = ticketForms[limit.eventType]?.min ?? limit.minCapacity;
                            const currentMax = ticketForms[limit.eventType]?.max ?? limit.maxCapacity;
                            setTicketForms({
                              ...ticketForms,
                              [limit.eventType]: {
                                min: currentMin,
                                max: isUnlimited ? null : currentMax,
                                unlimited: isUnlimited,
                              },
                            });
                            const saveKey = `ticket-${limit.eventType}`;
                            const original = originalTicketForms[limit.eventType];
                            handleFormChange(saveKey,
                              original && (isUnlimited !== original.unlimited)
                            );
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Sin límite máximo (capacidad ilimitada)</span>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => handleSaveTicketLimit(limit.eventType as 'OWN' | 'RESALE')}
                    disabled={saving === `ticket-${limit.eventType}`}
                    className={`w-full px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                      justSaved.has(`ticket-${limit.eventType}`)
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving === `ticket-${limit.eventType}` ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : justSaved.has(`ticket-${limit.eventType}`) ? (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Guardado
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Price Limits */}
        <section className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Límites de Precio</h2>
            <p className="text-sm text-gray-600 mt-1">
              Rangos de precio permitidos para entradas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio mínimo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={priceForm.minPrice}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setPriceForm({ ...priceForm, minPrice: newValue });
                    handleFormChange('price',
                      newValue !== originalPriceForm.minPrice ||
                      priceForm.maxPrice !== originalPriceForm.maxPrice ||
                      priceForm.resaleMarkup !== originalPriceForm.resaleMarkup
                    );
                  }}
                  className="w-full border rounded-lg pl-8 pr-3 py-2"
                  min="0"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Precio más bajo permitido</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio máximo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={priceForm.maxPrice}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setPriceForm({ ...priceForm, maxPrice: newValue });
                    handleFormChange('price',
                      priceForm.minPrice !== originalPriceForm.minPrice ||
                      newValue !== originalPriceForm.maxPrice ||
                      priceForm.resaleMarkup !== originalPriceForm.resaleMarkup
                    );
                  }}
                  className="w-full border rounded-lg pl-8 pr-3 py-2"
                  min="1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Precio más alto permitido</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sobreprecio máximo de reventa
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={priceForm.resaleMarkup}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0;
                    setPriceForm({ ...priceForm, resaleMarkup: newValue });
                    handleFormChange('price',
                      priceForm.minPrice !== originalPriceForm.minPrice ||
                      priceForm.maxPrice !== originalPriceForm.maxPrice ||
                      newValue !== originalPriceForm.resaleMarkup
                    );
                  }}
                  className="w-full border rounded-lg px-3 py-2 pr-8"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cuánto más puede cobrar un revendedor. Ej: 30% = entrada de $10.000 puede revenderse hasta $13.000
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePriceLimit}
            disabled={saving === 'price'}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              justSaved.has('price')
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving === 'price' ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : justSaved.has('price') ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </>
            ) : (
              'Guardar límites de precio'
            )}
          </button>
        </section>

        {/* Info Section */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">Notas importantes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Tu comisión:</strong> Es el dinero que ConfiaTicket gana por cada venta. Se suma al precio del organizador.
              </li>
              <li>
                <strong>Límites de entradas:</strong> Se validan cuando un usuario intenta comprar. Para eventos propios puedes dejarlo alto (999999).
              </li>
              <li>
                <strong>Sobreprecio de reventa:</strong> Protege a los compradores de precios abusivos en el mercado secundario.
              </li>
              <li>
                Los cambios se aplican <strong>inmediatamente</strong> después de guardar.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

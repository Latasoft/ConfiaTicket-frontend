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
  getReservationHold,
  updateReservationHold,
  type TicketLimitConfig,
  type PlatformFeeConfig,
  type ReservationHoldConfig,
} from '@/services/adminConfigService';
import { getFriendlyErrorMessage } from '@/utils/errorMessages';

type Toast = { kind: 'success' | 'error' | 'info'; text: string } | null;

export default function AdminConfig() {
  const [ticketLimits, setTicketLimits] = useState<TicketLimitConfig[]>([]);
  // priceLimit state removed - data is stored in priceForm only
  const [platformFee, setPlatformFee] = useState<PlatformFeeConfig | null>(null);
  const [reservationHold, setReservationHold] = useState<ReservationHoldConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<Set<string>>(new Set()); // Cambiado a Set para múltiples botones
  
  // Estados originales para detectar cambios
  const [originalTicketForms, setOriginalTicketForms] = useState<Record<string, { min: number; max: number | null; unlimited: boolean }>>({});
  const [originalPriceForm, setOriginalPriceForm] = useState({ minPrice: 0, maxPrice: 0, resaleMarkup: 0 });
  const [originalFeeForm, setOriginalFeeForm] = useState({ feePercent: 0, description: '' });
  const [originalHoldForm, setOriginalHoldForm] = useState({ holdMinutes: 0, description: '' });

  // Form states
  const [ticketForms, setTicketForms] = useState<Record<string, { min: number; max: number | null; unlimited: boolean }>>({});
  const [priceForm, setPriceForm] = useState({ minPrice: 0, maxPrice: 0, resaleMarkup: 0 });
  const [feeForm, setFeeForm] = useState({ feePercent: 0, description: '' });
  const [holdForm, setHoldForm] = useState({ holdMinutes: 0, description: '' });

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
      const [ticketData, priceData, feeData, holdData] = await Promise.all([
        getTicketLimits(),
        getPriceLimit(),
        getPlatformFee(),
        getReservationHold(),
      ]);

      setTicketLimits(ticketData);
      // priceData stored directly in priceForm, no need for separate state
      setPlatformFee(feeData);
      setReservationHold(holdData);

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

      const holdFormData = {
        holdMinutes: holdData.holdMinutes,
        description: holdData.description || '',
      };
      setHoldForm(holdFormData);
      setOriginalHoldForm(holdFormData); // Guardar valores originales
    } catch (error: any) {
      console.error('Error al cargar configuración:', error);
      const message = getFriendlyErrorMessage(error, 'No se pudo cargar la configuración');
      setToast({
        kind: 'error',
        text: message,
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
      const message = getFriendlyErrorMessage(error, 'No se pudieron guardar los límites de tickets');
      setToast({
        kind: 'error',
        text: message,
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

      await updatePriceLimit({
        minPrice: priceForm.minPrice,
        maxPrice: priceForm.maxPrice,
        resaleMarkupPercent: priceForm.resaleMarkup,
      });

      // No need to update separate state - data is in priceForm
      // setPriceLimit removed

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
      const message = getFriendlyErrorMessage(error, 'No se pudieron guardar los límites de precio');
      setToast({
        kind: 'error',
        text: message,
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
      const message = getFriendlyErrorMessage(error, 'No se pudo guardar la comisión de plataforma');
      setToast({
        kind: 'error',
        text: message,
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveReservationHold() {
    try {
      setSaving('hold');
      
      if (holdForm.holdMinutes < 1 || holdForm.holdMinutes > 60) {
        setToast({
          kind: 'error',
          text: 'Los minutos deben estar entre 1 y 60',
        });
        return;
      }

      const updated = await updateReservationHold({
        holdMinutes: holdForm.holdMinutes,
        description: holdForm.description || undefined,
      });

      // Actualizar estado local sin recargar
      setReservationHold(updated);

      // Actualizar valores originales después de guardar
      setOriginalHoldForm({
        holdMinutes: holdForm.holdMinutes,
        description: holdForm.description,
      });

      setToast({ kind: 'success', text: '✓ Tiempo de reserva actualizado correctamente' });
      
      // Mostrar feedback visual en el botón (permanece hasta que se cambie el valor)
      setJustSaved(prev => new Set(prev).add('hold'));
    } catch (error: any) {
      const message = getFriendlyErrorMessage(error, 'No se pudo guardar el tiempo de reserva');
      setToast({
        kind: 'error',
        text: message,
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-dark-200">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Configuración del Sistema
          </h1>
          <p className="text-dark-200 text-lg">Panel de administración de parámetros globales</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 text-sm mb-8 pb-4 border-b border-dark-700">
          <NavLink to="/admin/eventos" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Eventos
          </NavLink>
          <NavLink to="/admin/usuarios" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Usuarios
          </NavLink>
          <NavLink to="/admin/solicitudes-organizador" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Solicitudes
          </NavLink>
          <NavLink to="/admin/configuracion" className="font-semibold text-white">
            Configuración
          </NavLink>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-8 rounded-xl border-2 px-6 py-4 shadow-xl animate-in slide-in-from-top-2 backdrop-blur-sm ${
              toast.kind === 'success'
                ? 'bg-green-500/20 border-green-400 text-green-100'
                : toast.kind === 'error'
                ? 'bg-red-500/20 border-red-400 text-red-100'
                : 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {toast.kind === 'success' && (
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {toast.kind === 'error' && (
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {toast.kind === 'info' && (
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="font-medium text-lg">{toast.text}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-sm px-3 py-1.5 border border-current rounded-lg hover:bg-white/10 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Platform Fee - PRIMERO Y MÁS DESTACADO */}
          <section className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-400/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-green-400 mb-2">💰 Tu Comisión por Venta</h2>
              <p className="text-dark-100 text-lg">
                Porcentaje que ConfiaTicket cobra adicionalmente sobre el precio del organizador
              </p>
            </div>

            <div className="bg-dark-800/70 rounded-xl p-6 mb-6 border border-green-500/30">
              <div className="text-dark-100">
                <p className="font-semibold mb-3 text-white text-lg">Cómo funciona:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong className="text-white">Organizador define precio:</strong> $10.000</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong className="text-white">Comisión ConfiaTicket (2.5%):</strong> $250</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong className="text-white">Comprador paga:</strong> $10.000 + $250 = $10.250</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong className="text-white">Organizador recibe:</strong> $10.000 (precio completo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span><strong className="text-white">ConfiaTicket recibe:</strong> $250 (tu ganancia)</span>
                  </li>
                </ul>
                <p className="text-amber-300 mt-4 font-medium flex items-center gap-2">
                  <span className="text-xl">⚠</span>
                  Nota: Las comisiones de Transbank/Webpay se cobran aparte
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
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
                    className="w-full bg-dark-800 border-2 border-green-500/50 rounded-xl px-4 py-3 pr-10 text-white placeholder-dark-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ej: 2.5"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-bold">%</span>
                </div>
                <p className="text-xs text-dark-300 mt-2">
                  Valores comunes: 2% - 5%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
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
                  className="w-full bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/50 transition-all"
                  placeholder="Ej: Comisión estándar"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-dark-100">
                <p className="text-lg"><strong className="text-white">Valor actual:</strong> {platformFee ? (platformFee.feeBps / 100).toFixed(2) : '0'}%</p>
              </div>
              <button
                onClick={handleSavePlatformFee}
                disabled={saving === 'fee'}
                className={`px-8 py-4 font-bold rounded-xl shadow-xl transition-all flex items-center gap-3 text-lg transform hover:scale-105 ${
                  justSaved.has('fee')
                    ? 'bg-green-500 text-white shadow-green-500/50'
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {saving === 'fee' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : justSaved.has('fee') ? (
                  <>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Reservation Hold Time */}
          <section className="bg-dark-850 border-2 border-purple-500/50 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tiempo de Reserva
              </h2>
              <p className="text-dark-100 mt-2 text-lg">
                Cuánto tiempo se bloquean las entradas seleccionadas antes de expirar si no se completa el pago
              </p>
            </div>

            <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-6 mb-6">
              <div className="text-dark-100">
                <p className="font-semibold mb-3 text-white text-lg">Flujo de compra:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Paso 1:</strong> Usuario selecciona entradas y crea reserva</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Paso 2:</strong> Entradas quedan bloqueadas durante {holdForm.holdMinutes} minutos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Paso 3:</strong> Usuario debe completar el pago antes que expire</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span><strong className="text-white">Expira:</strong> Si no paga, las entradas vuelven a estar disponibles</span>
                  </li>
                </ul>
                <p className="text-purple-300 mt-4 font-medium flex items-center gap-2">
                  Recomendado: 10-15 minutos para compras normales
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
                  Minutos de retención
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={holdForm.holdMinutes}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 0;
                      setHoldForm({ ...holdForm, holdMinutes: newValue });
                      handleFormChange('hold', newValue !== originalHoldForm.holdMinutes);
                    }}
                    className="w-full bg-dark-800 border-2 border-purple-500/50 rounded-xl px-4 py-3 pr-24 text-white placeholder-dark-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                    min="1"
                    max="60"
                    placeholder="Ej: 15"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">minutos</span>
                </div>
                <p className="text-xs text-dark-300 mt-2">
                  Rango: 1-60 minutos (máximo 1 hora)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
                  Notas internas (opcional)
                </label>
                <input
                  type="text"
                  value={holdForm.description}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setHoldForm({ ...holdForm, description: newValue });
                    handleFormChange('hold', 
                      newValue !== originalHoldForm.description ||
                      holdForm.holdMinutes !== originalHoldForm.holdMinutes
                    );
                  }}
                  className="w-full bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                  placeholder="Ej: Tiempo estándar para Transbank"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-dark-100">
                <p className="text-lg"><strong className="text-white">Valor actual:</strong> {reservationHold ? reservationHold.holdMinutes : '0'} minutos</p>
              </div>
              <button
                onClick={handleSaveReservationHold}
                disabled={saving === 'hold'}
                className={`px-8 py-4 font-bold rounded-xl shadow-xl transition-all flex items-center gap-3 text-lg transform hover:scale-105 ${
                  justSaved.has('hold')
                    ? 'bg-green-500 text-white shadow-green-500/50'
                    : 'bg-purple-500 text-white hover:bg-purple-600 shadow-purple-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {saving === 'hold' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : justSaved.has('hold') ? (
                  <>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardado
                  </>
                ) : (
                  'Guardar tiempo de reserva'
                )}
              </button>
            </div>
          </section>

          {/* Ticket Limits */}
          <section className="bg-dark-850 border-2 border-cyan-500/50 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Límites de Entradas por Compra</h2>
              <p className="text-dark-100 mt-2 text-lg">
                Cantidad mínima y máxima que un usuario puede comprar en una sola transacción
              </p>
            </div>

            {ticketLimits.map((limit) => (
              <div key={limit.eventType} className="mb-6 last:mb-0 bg-dark-800/70 rounded-xl p-6 border border-cyan-500/30">
                <h3 className="font-bold text-white mb-2 text-lg">
                  {limit.eventType === 'OWN' ? 'Eventos Propios (organizados en tu plataforma)' : 'Reventa de Entradas'}
                </h3>
                <p className="text-sm text-dark-300 mb-4">
                  {limit.eventType === 'OWN' 
                    ? 'Eventos creados por organizadores que generan tickets automáticos' 
                    : 'Reventa de entradas físicas entre usuarios (máximo recomendado: 4)'}
                </p>

                <div className="grid md:grid-cols-3 gap-6 items-end">
                  <div>
                    <label className="block text-sm font-medium text-dark-100 mb-2">
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
                      className="w-full bg-dark-700 border-2 border-cyan-500/50 rounded-lg px-4 py-3 text-white placeholder-dark-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-100 mb-2">
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
                      className="w-full bg-dark-700 border-2 border-cyan-500/50 rounded-lg px-4 py-3 text-white placeholder-dark-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all disabled:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
                      min="1"
                      placeholder={limit.eventType === 'OWN' && (ticketForms[limit.eventType]?.unlimited ?? false) ? 'Sin límite' : ''}
                    />
                    {limit.eventType === 'OWN' && (
                      <div className="mt-3">
                        <label className="flex items-center gap-2 text-sm text-dark-100 cursor-pointer">
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
                            className="rounded border-cyan-400 text-cyan-500 focus:ring-cyan-500 bg-dark-700"
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
                      className={`w-full px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-bold transform hover:scale-105 ${
                        justSaved.has(`ticket-${limit.eventType}`)
                          ? 'bg-green-500 text-white shadow-green-500/50'
                          : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-cyan-500/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl`}
                    >
                      {saving === `ticket-${limit.eventType}` ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
          <section className="bg-dark-850 border-2 border-pink-500/50 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">💵 Límites de Precio</h2>
              <p className="text-dark-100 mt-2 text-lg">
                Rangos de precio permitidos para entradas
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
                  Precio mínimo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 font-bold">$</span>
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
                    className="w-full bg-dark-800 border-2 border-pink-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all"
                    min="0"
                  />
                </div>
                <p className="text-xs text-dark-300 mt-2">Precio más bajo permitido</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
                  Precio máximo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 font-bold">$</span>
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
                    className="w-full bg-dark-800 border-2 border-pink-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all"
                    min="1"
                  />
                </div>
                <p className="text-xs text-dark-300 mt-2">Precio más alto permitido</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-100 mb-2">
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
                    className="w-full bg-dark-800 border-2 border-pink-500/50 rounded-xl px-4 py-3 pr-10 text-white placeholder-dark-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/50 transition-all"
                    min="0"
                    max="100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400 font-bold">%</span>
                </div>
                <p className="text-xs text-dark-300 mt-2">
                  Cuánto más puede cobrar un revendedor. Ej: 30% = entrada de $10.000 puede revenderse hasta $13.000
                </p>
              </div>
            </div>

            <button
              onClick={handleSavePriceLimit}
              disabled={saving === 'price'}
              className={`px-8 py-4 rounded-xl transition-all flex items-center gap-3 font-bold text-lg transform hover:scale-105 ${
                justSaved.has('price')
                  ? 'bg-green-500 text-white shadow-green-500/50'
                  : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl`}
            >
              {saving === 'price' ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : justSaved.has('price') ? (
                <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <section className="bg-cyan-500/10 border-2 border-cyan-400/30 rounded-2xl p-6">
            <div className="text-dark-100">
              <p className="font-bold mb-3 text-white text-lg flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Notas importantes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-white">Tu comisión:</strong> Es el dinero que ConfiaTicket gana por cada venta. Se suma al precio del organizador.
                </li>
                <li>
                  <strong className="text-white">Límites de entradas:</strong> Se validan cuando un usuario intenta comprar. Para eventos propios puedes dejarlo alto (999999).
                </li>
                <li>
                  <strong className="text-white">Sobreprecio de reventa:</strong> Protege a los compradores de precios abusivos en el mercado secundario.
                </li>
                <li>
                  Los cambios se aplican <strong className="text-white">inmediatamente</strong> después de guardar.
                </li>
              </ul>
            </div>
          </section>
        </div>
    </div>
    </div>
  );
}

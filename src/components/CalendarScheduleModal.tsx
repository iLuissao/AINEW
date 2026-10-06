import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Truck, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  createGoogleCalendarEvent, 
  listGoogleCalendarEvents,
  getAccessToken 
} from '../services/calendarAuth';
import { ProjectModelResult } from '../engine/types';

interface CalendarScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProjectModelResult;
  serviceOrderMeta?: {
    serviceOrderId?: string;
    clientName?: string;
    scheduledDate?: string;
  };
}

export const CalendarScheduleModal: React.FC<CalendarScheduleModalProps> = ({
  isOpen,
  onClose,
  result,
  serviceOrderMeta,
}) => {
  const { model, bom, dc, ac } = result;
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const defaultDate = serviceOrderMeta?.scheduledDate || new Date().toISOString().split('T')[0];
  const [eventDate, setEventDate] = useState<string>(defaultDate);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [eventType, setEventType] = useState<'DISPATCH' | 'INSTALLATION' | 'COMMISSIONING'>('DISPATCH');
  const [eventTitle, setEventTitle] = useState<string>(
    `[Salida BOM] ${model.projectName}`
  );
  const [eventLocation, setEventLocation] = useState<string>(
    serviceOrderMeta?.clientName ? `Sitio Cliente: ${serviceOrderMeta.clientName}` : 'Planta / Sitio de Instalación'
  );
  const [includeBOMSummary, setIncludeBOMSummary] = useState<boolean>(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setHasToken(true);
        loadUpcomingEvents();
      },
      () => {
        setUser(null);
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update event title based on type
    if (eventType === 'DISPATCH') {
      setEventTitle(`[Salida BOM Almacén] Despacho Materiales - ${model.projectName}`);
    } else if (eventType === 'INSTALLATION') {
      setEventTitle(`[Instalación FV] Montaje Eléctrico & Mecánico - ${model.projectName}`);
    } else {
      setEventTitle(`[Puesta en Marcha] Pruebas e Interconexión CFE - ${model.projectName}`);
    }
  }, [eventType, model.projectName]);

  const loadUpcomingEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const events = await listGoogleCalendarEvents(6);
      setUpcomingEvents(events);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setHasToken(true);
        loadUpcomingEvents();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setHasToken(false);
    setUpcomingEvents([]);
  };

  const generateBOMDescription = () => {
    const modulesCount = model.pv.totalModules || model.pv.modulesPerString * model.pv.numberOfStrings;
    const bomSummaryList = bom.slice(0, 8).map(
      (b) => `• [${b.category}] ${b.quantity} ${b.unit} - ${b.element} (${b.specification})`
    ).join('\n');

    return `PROYECTO: ${model.projectName}
CLIENTE / FOLIO: ${serviceOrderMeta?.clientName || 'General'} ${serviceOrderMeta?.serviceOrderId ? `(OS: ${serviceOrderMeta.serviceOrderId})` : ''}
POTENCIA TOTAL FV: ${(dc.totalPowerW / 1000).toFixed(2)} kWp (${modulesCount} Módulos de ${model.pv.powerW}W)
INVERSORES: ${model.inverter.numberOfUnits || 1}x ${model.inverter.ratedPowerKw} kW (${ac.nominalAcVoltageV}V ${ac.systemType})
${model.battery.enabled ? `ALMACENAMIENTO ESS: ${model.battery.capacityKwh} kWh (${model.battery.model})` : ''}

MATERIALES BOM PRINCIPALES A DESPACHAR:
${bomSummaryList}
${bom.length > 8 ? `• ... y ${bom.length - 8} partidas adicionales de accesorios y canalización calculadas.` : ''}

GENERADO AUTOMÁTICAMENTE POR PV/ESS MODEL & BOM ENGINE (NEC / NOM-001-SEDE)`;
  };

  const handleConfirmSchedule = async () => {
    setIsCreatingEvent(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmDialog(false);

    try {
      const startDateTime = new Date(`${eventDate}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${eventDate}T${endTime}:00`).toISOString();

      const description = includeBOMSummary
        ? generateBOMDescription()
        : `Instalación fotovoltaica: ${model.projectName}`;

      const eventPayload = {
        summary: eventTitle,
        description,
        location: eventLocation,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const created = await createGoogleCalendarEvent(eventPayload);
      setSuccessMessage(`¡Evento programado exitosamente en Google Calendar! (${created.summary})`);
      loadUpcomingEvents();
    } catch (err: any) {
      console.error('Calendar error:', err);
      setErrorMessage(err.message || 'Error al programar evento en Google Calendar.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Organizar Salidas de BOM en Google Calendar</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 rounded border border-blue-500/40">
                  Google Workspace API
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sincroniza y agenda el despacho de materiales de la lista BOM, fechas de montaje en sitio y puesta en marcha con tu equipo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Section */}
        {!user || !hasToken ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-sm font-bold text-white">Conecta tu cuenta de Google</h4>
              <p className="text-xs text-slate-400">
                Inicia sesión para sincronizar automáticamente los eventos de despacho de materiales y entregas de la lista de materiales (BOM) en tu calendario de Google.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isAuthenticating ? 'Conectando...' : 'Iniciar Sesión con Google'}</span>
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Profile Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-white block">{user.displayName || user.email}</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Conectado a Google Calendar
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>

            {/* Scheduling Form and Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Event Configuration (2 cols) */}
              <div className="md:col-span-2 space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Programar Evento de Salida / Montaje</span>
                </h4>

                {/* Event Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventType('DISPATCH')}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition ${
                      eventType === 'DISPATCH'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    📦 Salida BOM Almacén
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventType('INSTALLATION')}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition ${
                      eventType === 'INSTALLATION'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Montaje en Sitio
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventType('COMMISSIONING')}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition ${
                      eventType === 'COMMISSIONING'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🔌 Pruebas y Red
                  </button>
                </div>

                {/* Event Title */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Título del Evento</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Fecha Programada</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Hora Fin</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Ubicación / Dirección de Entrega</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      placeholder="Dirección de la obra o almacén"
                    />
                  </div>
                </div>

                {/* Checkbox for BOM summary */}
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="includeBOM"
                    checked={includeBOMSummary}
                    onChange={(e) => setIncludeBOMSummary(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="includeBOM" className="text-xs text-slate-300 cursor-pointer">
                    <strong>Adjuntar Resumen de Materiales BOM en la descripción del evento</strong>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Incluye la lista de módulos, inversores, calibres calculados, metros de cable y conduit para el chofer y el equipo técnico.
                    </span>
                  </label>
                </div>

                {/* Confirmation Button */}
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isCreatingEvent}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                >
                  {isCreatingEvent ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Agendando en Google Calendar...</span>
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-4 h-4" />
                      <span>Agendar Evento en Google Calendar</span>
                    </>
                  )}
                </button>

                {successMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Upcoming Events Column (1 col) */}
              <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">
                    Próximas Salidas & Eventos
                  </h4>
                  <button
                    onClick={loadUpcomingEvents}
                    disabled={isLoadingEvents}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px]">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                      <span>No hay salidas programadas en los próximos días.</span>
                    </div>
                  ) : (
                    upcomingEvents.map((ev) => (
                      <div key={ev.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate max-w-[170px]">
                            {ev.summary}
                          </span>
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {ev.start?.dateTime
                              ? new Date(ev.start.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : ev.start?.date}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{ev.location}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Confirmation Modal for Destructive/Mutating Operations (Mandatory Requirement) */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-slate-950/80 z-60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-2 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white uppercase">Confirmar Programación de Evento</h4>
              </div>
              <p className="text-xs text-slate-300">
                ¿Deseas crear el siguiente evento en tu calendario principal de Google Calendar?
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div><strong className="text-white">{eventTitle}</strong></div>
                <div className="text-slate-400">Fecha: {eventDate} ({startTime} - {endTime})</div>
                <div className="text-slate-400">Ubicación: {eventLocation}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Confirmar y Agendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

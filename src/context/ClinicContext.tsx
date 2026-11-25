import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Appointment,
  AppointmentStatus,
  Category,
  Client,
  ClinicState,
  DayAvailability,
  FreedSlot,
  HairFormat,
  HairLength,
  PackagePromo,
  Professional,
  Service,
  Specialty,
  UserAccount,
  UserRole,
  WaitlistEntry,
  WaitlistType,
} from '../types/clinic';
import { buildDemoState, DEFAULT_SIMULATED_TIME, DEMO_USERS } from '../data/seed';
import {
  getTodayIsoLocal,
  minutesToTime,
  parseTimeToMinutes,
} from '../utils/formatters';
import {
  calculateNoShowFinancials,
  findCompatibleWaitlistMatches,
  getClientAvailableCredit,
  isLateArrival,
  minutesUntilNoShowAllowed,
} from '../utils/scheduling';

const STORAGE_STATE_KEY = 'rf_clinic_state_v2';
const STORAGE_AUTH_KEY = 'rf_auth_user_v2';
const STORAGE_SIM_TIME_KEY = 'rf_sim_time_v2';
const STORAGE_SIM_DATE_KEY = 'rf_sim_date_v2';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ActionResult {
  ok: boolean;
  message?: string;
  freedSlot?: FreedSlot;
  waitlistMatch?: WaitlistEntry;
}

interface ClinicContextValue {
  state: ClinicState;
  currentUser: UserAccount | null;
  simulatedDate: string;
  simulatedTime: string;
  simulatedMinutes: number;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  login: (email: string, password: string) => boolean;
  quickLogin: (role: UserRole) => void;
  logout: () => void;
  setSimulatedTime: (time: string) => void;
  stepSimulatedTime: (deltaMinutes: number) => void;
  resetDemoData: () => void;

  // Appointment actions
  checkInAppointment: (
    appointmentId: string,
    payment?: { cardLast4?: string; useCreditAmount?: number }
  ) => ActionResult & { lateSentToWaitlist?: boolean };
  completeAppointment: (appointmentId: string) => ActionResult;
  undoCompleteAppointment: (
    appointmentId: string,
    previousStatus: AppointmentStatus,
    previousFinishedAt?: string
  ) => void;
  registerNoShow: (appointmentId: string) => ActionResult;
  cancelByClinic: (
    appointmentId: string,
    mode: 'remarcar' | 'reembolsar',
    reschedule?: { date: string; startTime: string; professionalId: string }
  ) => ActionResult;
  createCounterBooking: (params: {
    serviceId: string;
    hairFormat?: HairFormat;
    hairLength?: HairLength;
    price: number;
    durationMinutes: number;
    professionalId: string;
    date: string;
    startTime: string;
    clientId?: string;
    walkInName?: string;
    walkInPhone?: string;
  }) => Appointment;

  // Waitlist actions
  addToWaitlist: (params: {
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    serviceId: string;
    hairFormat?: HairFormat;
    hairLength?: HairLength;
    price: number;
    durationMinutes: number;
    type: WaitlistType;
    originalAppointmentId?: string;
  }) => WaitlistEntry;
  removeFromWaitlist: (waitlistId: string) => void;
  fitWaitlistIntoSlot: (
    waitlistId: string,
    slot: FreedSlot,
    payment?: { cardLast4?: string; useCreditAmount?: number }
  ) => ActionResult;
  closeDayWaitlist: () => { refundedCount: number; refundedTotal: number };

  // Availability
  saveDayAvailability: (date: string, entries: DayAvailability[]) => void;

  // Clients
  upsertClient: (
    client: Omit<Client, 'id' | 'createdAt' | 'credits'> & { id?: string }
  ) => { ok: boolean; client: Client; isDuplicateCpf?: boolean };
  toggleClientActive: (clientId: string) => void;

  // Services, Categories, Specialties (Gerente)
  saveCategory: (cat: Category) => void;
  saveSpecialty: (spec: Specialty) => void;
  saveService: (svc: Service) => void;
  toggleServiceActive: (serviceId: string) => void;
  deleteService: (serviceId: string) => ActionResult;

  // Packages (Gerente)
  savePackage: (pkg: PackagePromo) => void;
  togglePackageActive: (pkgId: string) => void;
  deletePackage: (pkgId: string) => void;

  // Professionals (Gerente)
  saveProfessional: (prof: Professional) => void;
  deactivateProfessional: (
    profId: string,
    resolutions: Array<{
      appointmentId: string;
      action: 'reembolsar' | 'remarcar';
      newProfessionalId?: string;
      newTime?: string;
    }>
  ) => void;
  reactivateProfessional: (profId: string) => void;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

function loadInitialState(todayIso: string): ClinicState {
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY);
    const savedDate = localStorage.getItem(STORAGE_SIM_DATE_KEY);
    if (raw && savedDate === todayIso) {
      const parsed = JSON.parse(raw) as ClinicState;
      if (parsed && Array.isArray(parsed.appointments) && Array.isArray(parsed.services)) {
        return parsed;
      }
    }
  } catch {
    // fallback to seed
  }
  const fresh = buildDemoState(todayIso);
  try {
    localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(fresh));
    localStorage.setItem(STORAGE_SIM_DATE_KEY, todayIso);
  } catch {
    // ignore storage quota errors
  }
  return fresh;
}

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulatedDate] = useState<string>(() => getTodayIsoLocal());
  const [state, setState] = useState<ClinicState>(() => loadInitialState(getTodayIsoLocal()));
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH_KEY);
      return raw ? (JSON.parse(raw) as UserAccount) : null;
    } catch {
      return null;
    }
  });
  const [simulatedTime, setSimulatedTimeState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_SIM_TIME_KEY) || DEFAULT_SIMULATED_TIME;
    } catch {
      return DEFAULT_SIMULATED_TIME;
    }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
      localStorage.setItem(STORAGE_SIM_DATE_KEY, simulatedDate);
    } catch {
      // ignore
    }
  }, [state, simulatedDate]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_AUTH_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIM_TIME_KEY, simulatedTime);
    } catch {
      // ignore
    }
  }, [simulatedTime]);

  const clearAllToasts = useCallback(() => {
    Object.values(toastTimersRef.current).forEach((timer) => {
      clearTimeout(timer);
    });
    toastTimersRef.current = {};
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((timer) => {
        clearTimeout(timer);
      });
      toastTimersRef.current = {};
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    Object.values(toastTimersRef.current).forEach((timer) => {
      clearTimeout(timer);
    });
    toastTimersRef.current = {};

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = toast.durationMs ?? 4000;
    setToasts([{ ...toast, id }]);
    toastTimersRef.current[id] = setTimeout(() => {
      delete toastTimersRef.current[id];
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const login = useCallback(
    (email: string, password: string): boolean => {
      const normalized = email.trim().toLowerCase();
      const found = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === normalized && u.password === password
      );
      if (found) {
        setCurrentUser(found);
        pushToast({
          type: 'success',
          title: `Bem-vinda, ${found.name}`,
          description: 'Acesso liberado ao painel Rebecca Felix.',
        });
        return true;
      }
      // Also allow any active professional with panel access using default demo password
      const prof = state.professionals.find(
        (p) => p.active && p.hasPanelAccess && p.email.toLowerCase() === normalized
      );
      if (prof && password === '123456') {
        const user: UserAccount = {
          id: `user-${prof.id}`,
          name: prof.name,
          email: prof.email,
          password,
          role: 'profissional',
          professionalId: prof.id,
        };
        setCurrentUser(user);
        pushToast({
          type: 'success',
          title: `Bem-vinda, ${prof.name}`,
          description: 'Acesso de profissional liberado.',
        });
        return true;
      }
      return false;
    },
    [state.professionals, pushToast]
  );

  const quickLogin = useCallback(
    (role: UserRole) => {
      const found = DEMO_USERS.find((u) => u.role === role);
      if (found) {
        setCurrentUser(found);
        pushToast({
          type: 'success',
          title: `Sessão iniciada como ${found.name}`,
        });
      }
    },
    [pushToast]
  );

  const logout = useCallback(() => {
    clearAllToasts();
    setCurrentUser(null);
  }, [clearAllToasts]);

  const setSimulatedTime = useCallback((time: string) => {
    setSimulatedTimeState(time);
  }, []);

  const stepSimulatedTime = useCallback(
    (deltaMinutes: number) => {
      const current = parseTimeToMinutes(simulatedTime);
      const next = Math.max(7 * 60, Math.min(21 * 60, current + deltaMinutes));
      setSimulatedTimeState(minutesToTime(next));
    },
    [simulatedTime]
  );

  const resetDemoData = useCallback(() => {
    const fresh = buildDemoState(simulatedDate);
    setState(fresh);
    setSimulatedTimeState(DEFAULT_SIMULATED_TIME);
    pushToast({
      type: 'info',
      title: 'Dados de demonstração restaurados',
      description: `Agenda reiniciada para hoje às ${DEFAULT_SIMULATED_TIME}.`,
    });
  }, [simulatedDate, pushToast]);

  const simulatedMinutes = useMemo(
    () => parseTimeToMinutes(simulatedTime),
    [simulatedTime]
  );

  const checkInAppointment: ClinicContextValue['checkInAppointment'] = useCallback(
    (appointmentId, payment) => {
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt) return { ok: false, message: 'Atendimento não encontrado.' };

      // Check 15-min tolerance
      if (appt.date === simulatedDate && isLateArrival(appt, simulatedMinutes)) {
        const waitEntry: WaitlistEntry = {
          id: `wait-${Date.now()}`,
          date: appt.date,
          clientId: appt.clientId,
          clientName: appt.clientName,
          clientPhone: appt.clientPhone,
          serviceId: appt.serviceId,
          serviceName: appt.serviceName,
          specialtyId: appt.specialtyId,
          durationMinutes: appt.durationMinutes,
          hairFormat: appt.hairFormat,
          hairLength: appt.hairLength,
          price: appt.price,
          enteredAt: simulatedTime,
          type: appt.paymentStatus === 'pago' ? 'atrasada_paga' : 'sem_reserva',
          originalAppointmentId: appt.id,
          status: 'aguardando',
        };

        const freedSlot: FreedSlot = {
          date: appt.date,
          startTime: appt.startTime,
          durationMinutes: appt.durationMinutes,
          professionalId: appt.professionalId,
          specialtyId: appt.specialtyId,
        };
        const matches = findCompatibleWaitlistMatches(freedSlot, state.waitlist);

        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status: 'na_fila' } : a
          ),
          waitlist: [...prev.waitlist, waitEntry],
        }));

        pushToast({
          type: 'info',
          title: 'Horário perdido por atraso (> 15 min)',
          description: `${appt.clientName} foi encaminhada para a fila de espera.`,
        });
        return {
          ok: true,
          lateSentToWaitlist: true,
          freedSlot,
          waitlistMatch: matches[0],
          message:
            'Horário perdido por atraso superior a 15 minutos. Cliente movida para a fila de espera.',
        };
      }

      // If payment pending, require payment info
      if (appt.paymentStatus === 'pendente' && !payment) {
        return {
          ok: false,
          message: 'Pagamento pendente. Conclua a cobrança no cartão.',
        };
      }

      const creditUsed = payment?.useCreditAmount ?? 0;

      setState((prev) => {
        let updatedClients = prev.clients;
        if (creditUsed > 0 && appt.clientId) {
          let remainingToDeduct = creditUsed;
          updatedClients = prev.clients.map((c) => {
            if (c.id !== appt.clientId) return c;
            const updatedCredits = c.credits.map((cr) => {
              if (cr.used || cr.expiresAt < simulatedDate || remainingToDeduct <= 0) {
                return cr;
              }
              if (cr.amount <= remainingToDeduct) {
                remainingToDeduct -= cr.amount;
                return { ...cr, used: true };
              }
              const leftover = Math.round((cr.amount - remainingToDeduct) * 100) / 100;
              remainingToDeduct = 0;
              return { ...cr, amount: leftover };
            });
            return { ...c, credits: updatedCredits };
          });
        }

        return {
          ...prev,
          clients: updatedClients,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: 'em_atendimento',
                  paymentStatus: 'pago',
                  cardLast4: payment?.cardLast4 ?? a.cardLast4,
                  creditUsedAmount: creditUsed > 0 ? creditUsed : a.creditUsedAmount,
                  arrivedAt: simulatedTime,
                }
              : a
          ),
        };
      });

      pushToast({
        type: 'success',
        title: 'Check-in realizado',
        description: `${appt.clientName} está em atendimento.`,
      });
      return { ok: true };
    },
    [state.appointments, state.waitlist, simulatedDate, simulatedMinutes, simulatedTime, pushToast]
  );

  const undoCompleteAppointment: ClinicContextValue['undoCompleteAppointment'] =
    useCallback((appointmentId, previousStatus, previousFinishedAt) => {
      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === appointmentId
            ? { ...a, status: previousStatus, finishedAt: previousFinishedAt }
            : a
        ),
      }));
    }, []);

  const completeAppointment: ClinicContextValue['completeAppointment'] = useCallback(
    (appointmentId) => {
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt) return { ok: false, message: 'Atendimento não encontrado.' };

      const previousStatus = appt.status;
      const previousFinishedAt = appt.finishedAt;

      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === appointmentId
            ? { ...a, status: 'concluido', finishedAt: simulatedTime }
            : a
        ),
      }));

      pushToast({
        type: 'success',
        title: `Atendimento de ${appt.clientName} concluído`,
        description: appt.serviceName,
        durationMs: 5000,
        actionLabel: 'Desfazer',
        onAction: () =>
          undoCompleteAppointment(
            appointmentId,
            previousStatus,
            previousFinishedAt
          ),
      });
      return { ok: true };
    },
    [state.appointments, simulatedTime, pushToast, undoCompleteAppointment]
  );

  const registerNoShow: ClinicContextValue['registerNoShow'] = useCallback(
    (appointmentId) => {
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt) return { ok: false, message: 'Agendamento não encontrado.' };

      if (appt.date === simulatedDate) {
        const waitMins = minutesUntilNoShowAllowed(appt, simulatedMinutes);
        if (waitMins > 0) {
          return {
            ok: false,
            message: `Aguarde a tolerância de 15 minutos (faltam ${waitMins} min).`,
          };
        }
      }

      const fin = calculateNoShowFinancials(appt, simulatedDate);
      const freedSlot: FreedSlot = {
        date: appt.date,
        startTime: appt.startTime,
        durationMinutes: appt.durationMinutes,
        professionalId: appt.professionalId,
        specialtyId: appt.specialtyId,
      };
      const matches = findCompatibleWaitlistMatches(freedSlot, state.waitlist);

      setState((prev) => {
        const updatedClients =
          fin.creditAmount > 0 && appt.clientId
            ? prev.clients.map((c) =>
                c.id === appt.clientId
                  ? {
                      ...c,
                      credits: [
                        ...c.credits,
                        {
                          id: `cred-${Date.now()}`,
                          amount: fin.creditAmount,
                          reason: `Crédito por falta em ${appt.serviceName} (50%)`,
                          createdAt: simulatedDate,
                          expiresAt: fin.expiresAt,
                          used: false,
                        },
                      ],
                    }
                  : c
              )
            : prev.clients;

        return {
          ...prev,
          clients: updatedClients,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: 'nao_compareceu',
                  paymentStatus:
                    a.paymentStatus === 'pago' ? 'retido_parcial' : a.paymentStatus,
                }
              : a
          ),
        };
      });

      pushToast({
        type: 'info',
        title: 'Falta registrada e horário liberado',
        description:
          fin.creditAmount > 0
            ? `50% retido e crédito de R$ ${fin.creditAmount.toFixed(2).replace('.', ',')} válido por 7 dias.`
            : 'O horário agora está disponível para encaixe.',
      });

      return { ok: true, freedSlot, waitlistMatch: matches[0] };
    },
    [state.appointments, state.waitlist, simulatedDate, simulatedMinutes, pushToast]
  );

  const cancelByClinic: ClinicContextValue['cancelByClinic'] = useCallback(
    (appointmentId, mode, reschedule) => {
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt) return { ok: false, message: 'Atendimento não encontrado.' };

      if (mode === 'remarcar' && reschedule) {
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  date: reschedule.date,
                  startTime: reschedule.startTime,
                  professionalId: reschedule.professionalId,
                  status: 'agendado',
                }
              : a
          ),
        }));
        pushToast({
          type: 'success',
          title: 'Atendimento remarcado pela clínica',
          description: `${appt.clientName} reagendada sem custo adicional.`,
        });
        return { ok: true };
      }

      const freedSlot: FreedSlot = {
        date: appt.date,
        startTime: appt.startTime,
        durationMinutes: appt.durationMinutes,
        professionalId: appt.professionalId,
        specialtyId: appt.specialtyId,
      };
      const matches = findCompatibleWaitlistMatches(freedSlot, state.waitlist);

      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === appointmentId
            ? {
                ...a,
                status: 'cancelado',
                paymentStatus:
                  a.paymentStatus === 'pago' ? 'reembolsado_total' : a.paymentStatus,
                cancellationNote: 'Cancelado pela clínica com reembolso integral',
              }
            : a
        ),
      }));

      pushToast({
        type: 'info',
        title: 'Cancelamento pela clínica concluído',
        description:
          appt.paymentStatus === 'pago'
            ? 'Reembolso integral estornado no cartão de crédito.'
            : 'Horário liberado.',
      });
      return { ok: true, freedSlot, waitlistMatch: matches[0] };
    },
    [state.appointments, state.waitlist, pushToast]
  );

  const createCounterBooking: ClinicContextValue['createCounterBooking'] = useCallback(
    (params) => {
      const svc = state.services.find((s) => s.id === params.serviceId)!;
      const client = params.clientId
        ? state.clients.find((c) => c.id === params.clientId)
        : undefined;

      const newAppt: Appointment = {
        id: `apt-${Date.now()}`,
        date: params.date,
        startTime: params.startTime,
        durationMinutes: params.durationMinutes,
        clientId: client?.id,
        clientName: client?.name || params.walkInName?.trim() || 'Cliente de Balcão',
        clientPhone: client?.phone || params.walkInPhone,
        serviceId: svc.id,
        serviceName: svc.name,
        categoryId: svc.categoryId,
        specialtyId: svc.specialtyId,
        hairFormat: params.hairFormat,
        hairLength: params.hairLength,
        professionalId: params.professionalId,
        price: params.price,
        origin: 'balcao',
        status: 'agendado',
        paymentStatus: 'pendente',
        createdAt: simulatedDate,
      };

      setState((prev) => ({
        ...prev,
        appointments: [...prev.appointments, newAppt],
      }));

      pushToast({
        type: 'success',
        title: 'Agendamento de balcão confirmado',
        description: `${newAppt.serviceName} às ${newAppt.startTime} (Pagamento pendente na chegada).`,
      });
      return newAppt;
    },
    [state.services, state.clients, simulatedDate, pushToast]
  );

  const addToWaitlist: ClinicContextValue['addToWaitlist'] = useCallback(
    (params) => {
      const svc = state.services.find((s) => s.id === params.serviceId)!;
      const entry: WaitlistEntry = {
        id: `wait-${Date.now()}`,
        date: simulatedDate,
        clientId: params.clientId,
        clientName: params.clientName,
        clientPhone: params.clientPhone,
        serviceId: svc.id,
        serviceName: svc.name,
        specialtyId: svc.specialtyId,
        durationMinutes: params.durationMinutes,
        hairFormat: params.hairFormat,
        hairLength: params.hairLength,
        price: params.price,
        enteredAt: simulatedTime,
        type: params.type,
        originalAppointmentId: params.originalAppointmentId,
        status: 'aguardando',
      };
      setState((prev) => ({
        ...prev,
        waitlist: [...prev.waitlist, entry],
      }));
      pushToast({
        type: 'success',
        title: 'Adicionada à fila de espera',
        description: `${entry.clientName} — ${entry.serviceName}`,
      });
      return entry;
    },
    [state.services, simulatedDate, simulatedTime, pushToast]
  );

  const removeFromWaitlist = useCallback(
    (waitlistId: string) => {
      setState((prev) => ({
        ...prev,
        waitlist: prev.waitlist.map((w) =>
          w.id === waitlistId ? { ...w, status: 'removida' } : w
        ),
      }));
      pushToast({
        type: 'info',
        title: 'Removida da fila de espera',
      });
    },
    [pushToast]
  );

  const fitWaitlistIntoSlot: ClinicContextValue['fitWaitlistIntoSlot'] = useCallback(
    (waitlistId, slot, payment) => {
      const entry = state.waitlist.find((w) => w.id === waitlistId);
      if (!entry) return { ok: false, message: 'Registro da fila não encontrado.' };

      const svc = state.services.find((s) => s.id === entry.serviceId);
      if (!svc) return { ok: false, message: 'Serviço não encontrado.' };

      if (entry.durationMinutes > slot.durationMinutes) {
        return {
          ok: false,
          message: `O serviço (${entry.durationMinutes} min) não cabe no horário liberado (${slot.durationMinutes} min).`,
        };
      }

      const isAlreadyPaid = entry.type === 'atrasada_paga';
      const newAppt: Appointment = {
        id: `apt-enc-${Date.now()}`,
        date: slot.date,
        startTime: slot.startTime,
        durationMinutes: entry.durationMinutes,
        clientId: entry.clientId,
        clientName: entry.clientName,
        clientPhone: entry.clientPhone,
        serviceId: entry.serviceId,
        serviceName: entry.serviceName,
        categoryId: svc.categoryId,
        specialtyId: entry.specialtyId,
        hairFormat: entry.hairFormat,
        hairLength: entry.hairLength,
        professionalId: slot.professionalId,
        price: entry.price,
        origin: isAlreadyPaid ? 'online' : 'balcao',
        status: 'em_atendimento',
        paymentStatus: 'pago',
        cardLast4: payment?.cardLast4 ?? '4242',
        creditUsedAmount: payment?.useCreditAmount,
        createdAt: simulatedDate,
        arrivedAt: simulatedTime,
      };

      setState((prev) => ({
        ...prev,
        appointments: [...prev.appointments, newAppt],
        waitlist: prev.waitlist.map((w) =>
          w.id === waitlistId ? { ...w, status: 'encaixada' } : w
        ),
      }));

      pushToast({
        type: 'success',
        title: 'Encaixe realizado!',
        description: `${entry.clientName} iniciou atendimento às ${slot.startTime}.`,
      });
      return { ok: true };
    },
    [state.waitlist, state.services, simulatedDate, simulatedTime, pushToast]
  );

  const closeDayWaitlist = useCallback(() => {
    const waitingToday = state.waitlist.filter(
      (w) => w.date === simulatedDate && w.status === 'aguardando'
    );
    const latePaid = waitingToday.filter((w) => w.type === 'atrasada_paga');
    const refundedTotal = latePaid.reduce((acc, w) => acc + w.price * 0.5, 0);

    setState((prev) => ({
      ...prev,
      waitlist: prev.waitlist.map((w) => {
        if (w.date !== simulatedDate || w.status !== 'aguardando') return w;
        return {
          ...w,
          status:
            w.type === 'atrasada_paga' ? 'nao_atendida_estornada' : 'removida',
        };
      }),
      appointments: prev.appointments.map((a) => {
        const matchedLate = latePaid.find((w) => w.originalAppointmentId === a.id);
        if (!matchedLate) return a;
        return {
          ...a,
          status: 'nao_atendida',
          paymentStatus: 'reembolsado_parcial',
        };
      }),
    }));

    pushToast({
      type: 'info',
      title: 'Fila do dia encerrada',
      description:
        latePaid.length > 0
          ? `${latePaid.length} cliente(s) atrasada(s) estornada(s) em 50% (R$ ${refundedTotal.toFixed(2).replace('.', ',')}).`
          : 'Nenhuma cliente atrasada pendente de estorno.',
    });

    return { refundedCount: latePaid.length, refundedTotal };
  }, [state.waitlist, simulatedDate, pushToast]);

  const saveDayAvailability = useCallback(
    (date: string, entries: DayAvailability[]) => {
      setState((prev) => {
        const others = prev.availabilities.filter((a) => a.date !== date);
        return {
          ...prev,
          availabilities: [...others, ...entries],
        };
      });
      pushToast({
        type: 'success',
        title: 'Disponibilidade salva',
        description: `Escala atualizada com plantonistas definidos.`,
      });
    },
    [pushToast]
  );

  const upsertClient: ClinicContextValue['upsertClient'] = useCallback(
    (input) => {
      const normalizedCpf = input.cpf.replace(/\D/g, '');
      const existingByCpf = state.clients.find(
        (c) =>
          c.cpf.replace(/\D/g, '') === normalizedCpf && c.id !== input.id
      );
      if (existingByCpf) {
        return { ok: false, client: existingByCpf, isDuplicateCpf: true };
      }

      if (input.id) {
        let updated!: Client;
        setState((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => {
            if (c.id !== input.id) return c;
            updated = { ...c, ...input };
            return updated;
          }),
        }));
        pushToast({
          type: 'success',
          title: 'Cadastro atualizado',
          description: `${input.name}`,
        });
        return {
          ok: true,
          client: updated ?? {
            ...input,
            id: input.id,
            credits: [],
            createdAt: simulatedDate,
          },
        };
      }

      const created: Client = {
        ...input,
        id: `cli-${Date.now()}`,
        credits: [],
        createdAt: simulatedDate,
      };
      setState((prev) => ({
        ...prev,
        clients: [created, ...prev.clients],
      }));
      pushToast({
        type: 'success',
        title: 'Cliente cadastrada',
        description: created.name,
      });
      return { ok: true, client: created };
    },
    [state.clients, simulatedDate, pushToast]
  );

  const toggleClientActive = useCallback(
    (clientId: string) => {
      setState((prev) => ({
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === clientId ? { ...c, active: !c.active } : c
        ),
      }));
      pushToast({
        type: 'info',
        title: 'Status da cliente atualizado',
        description: 'O histórico de atendimentos foi preservado.',
      });
    },
    [pushToast]
  );

  const saveCategory = useCallback(
    (cat: Category) => {
      setState((prev) => {
        const exists = prev.categories.some((c) => c.id === cat.id);
        return {
          ...prev,
          categories: exists
            ? prev.categories.map((c) => (c.id === cat.id ? cat : c))
            : [...prev.categories, cat],
        };
      });
      pushToast({ type: 'success', title: 'Categoria salva' });
    },
    [pushToast]
  );

  const saveSpecialty = useCallback(
    (spec: Specialty) => {
      setState((prev) => {
        const exists = prev.specialties.some((s) => s.id === spec.id);
        return {
          ...prev,
          specialties: exists
            ? prev.specialties.map((s) => (s.id === spec.id ? spec : s))
            : [...prev.specialties, spec],
        };
      });
      pushToast({ type: 'success', title: 'Especialidade salva' });
    },
    [pushToast]
  );

  const saveService = useCallback(
    (svc: Service) => {
      setState((prev) => {
        const exists = prev.services.some((s) => s.id === svc.id);
        return {
          ...prev,
          services: exists
            ? prev.services.map((s) => (s.id === svc.id ? svc : s))
            : [...prev.services, svc],
        };
      });
      pushToast({
        type: 'success',
        title: 'Serviço salvo',
        description: 'Novos valores valem apenas para reservas futuras.',
      });
    },
    [pushToast]
  );

  const toggleServiceActive = useCallback(
    (serviceId: string) => {
      setState((prev) => ({
        ...prev,
        services: prev.services.map((s) =>
          s.id === serviceId ? { ...s, active: !s.active } : s
        ),
      }));
      pushToast({ type: 'info', title: 'Status do serviço atualizado' });
    },
    [pushToast]
  );

  const deleteService: ClinicContextValue['deleteService'] = useCallback(
    (serviceId) => {
      const hasFuture = state.appointments.some(
        (a) =>
          a.serviceId === serviceId &&
          a.date >= simulatedDate &&
          (a.status === 'agendado' || a.status === 'em_atendimento')
      );
      if (hasFuture) {
        return {
          ok: false,
          message:
            'Este serviço possui reservas futuras ativas. Desative-o em vez de excluir.',
        };
      }
      setState((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== serviceId),
      }));
      pushToast({ type: 'success', title: 'Serviço excluído' });
      return { ok: true };
    },
    [state.appointments, simulatedDate, pushToast]
  );

  const savePackage = useCallback(
    (pkg: PackagePromo) => {
      setState((prev) => {
        const exists = prev.packages.some((p) => p.id === pkg.id);
        return {
          ...prev,
          packages: exists
            ? prev.packages.map((p) => (p.id === pkg.id ? pkg : p))
            : [pkg, ...prev.packages],
        };
      });
      pushToast({ type: 'success', title: 'Pacote salvo com sucesso' });
    },
    [pushToast]
  );

  const togglePackageActive = useCallback(
    (pkgId: string) => {
      setState((prev) => ({
        ...prev,
        packages: prev.packages.map((p) =>
          p.id === pkgId ? { ...p, active: !p.active } : p
        ),
      }));
      pushToast({ type: 'info', title: 'Status do pacote atualizado' });
    },
    [pushToast]
  );

  const deletePackage = useCallback(
    (pkgId: string) => {
      setState((prev) => ({
        ...prev,
        packages: prev.packages.filter((p) => p.id !== pkgId),
      }));
      pushToast({ type: 'success', title: 'Pacote excluído' });
    },
    [pushToast]
  );

  const saveProfessional = useCallback(
    (prof: Professional) => {
      setState((prev) => {
        const exists = prev.professionals.some((p) => p.id === prof.id);
        return {
          ...prev,
          professionals: exists
            ? prev.professionals.map((p) => (p.id === prof.id ? prof : p))
            : [...prev.professionals, prof],
        };
      });
      pushToast({ type: 'success', title: 'Profissional salvo' });
    },
    [pushToast]
  );

  const deactivateProfessional: ClinicContextValue['deactivateProfessional'] = useCallback(
    (profId, resolutions) => {
      setState((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) =>
          p.id === profId ? { ...p, active: false } : p
        ),
        appointments: prev.appointments.map((a) => {
          const res = resolutions.find((r) => r.appointmentId === a.id);
          if (!res) return a;
          if (res.action === 'remarcar' && res.newProfessionalId) {
            return {
              ...a,
              professionalId: res.newProfessionalId,
              startTime: res.newTime || a.startTime,
            };
          }
          return {
            ...a,
            status: 'cancelado',
            paymentStatus:
              a.paymentStatus === 'pago' ? 'reembolsado_total' : a.paymentStatus,
            cancellationNote: 'Profissional desativada — reembolso integral',
          };
        }),
      }));
      pushToast({
        type: 'info',
        title: 'Profissional desativada',
        description: 'Reservas futuras tratadas conforme seleção.',
      });
    },
    [pushToast]
  );

  const reactivateProfessional = useCallback(
    (profId: string) => {
      setState((prev) => ({
        ...prev,
        professionals: prev.professionals.map((p) =>
          p.id === profId ? { ...p, active: true } : p
        ),
      }));
      pushToast({ type: 'success', title: 'Profissional reativada' });
    },
    [pushToast]
  );

  return (
    <ClinicContext.Provider
      value={{
        state,
        currentUser,
        simulatedDate,
        simulatedTime,
        simulatedMinutes,
        toasts,
        dismissToast,
        pushToast,
        login,
        quickLogin,
        logout,
        setSimulatedTime,
        stepSimulatedTime,
        resetDemoData,
        checkInAppointment,
        completeAppointment,
        undoCompleteAppointment,
        registerNoShow,
        cancelByClinic,
        createCounterBooking,
        addToWaitlist,
        removeFromWaitlist,
        fitWaitlistIntoSlot,
        closeDayWaitlist,
        saveDayAvailability,
        upsertClient,
        toggleClientActive,
        saveCategory,
        saveSpecialty,
        saveService,
        toggleServiceActive,
        deleteService,
        savePackage,
        togglePackageActive,
        deletePackage,
        saveProfessional,
        deactivateProfessional,
        reactivateProfessional,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export function useClinic(): ClinicContextValue {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be used within ClinicProvider');
  return ctx;
}

export function useClientCredit(clientId?: string): number {
  const { state, simulatedDate } = useClinic();
  if (!clientId) return 0;
  const cli = state.clients.find((c) => c.id === clientId);
  return getClientAvailableCredit(cli, simulatedDate);
}

import {
  Appointment,
  AppointmentStatus,
  Client,
  DayAvailability,
  FreedSlot,
  HairFormat,
  HairLength,
  Professional,
  Service,
  Specialty,
  WaitlistEntry,
} from '../types/clinic';
import {
  addDaysIso,
  formatDateBR,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
  minutesToTime,
  parseTimeToMinutes,
} from './formatters';

export const GRID_STEP_MINUTES = 30;
export const TOLERANCE_MINUTES = 15;

export const ACTIVE_OCCUPYING_STATUSES: AppointmentStatus[] = [
  'agendado',
  'em_atendimento',
  'concluido',
];

export function getServicePriceAndDuration(
  service: Service,
  hairFormat?: HairFormat,
  hairLength?: HairLength
): { price: number; durationMinutes: number } {
  if (service.variesByHair && service.hairMatrix) {
    const fmt: HairFormat = hairFormat ?? 'ondulado';
    const len: HairLength = hairLength ?? 'medio';
    const cell = service.hairMatrix[fmt]?.[len];
    if (cell) {
      return { price: cell.price, durationMinutes: cell.durationMinutes };
    }
  }
  return {
    price: service.fixedPrice,
    durationMinutes: service.fixedDurationMinutes,
  };
}

export function getAvailableSlots(params: {
  date: string;
  professionalId: string;
  durationMinutes: number;
  availabilities: DayAvailability[];
  appointments: Appointment[];
  minStartMinutes?: number;
}): string[] {
  const {
    date,
    professionalId,
    durationMinutes,
    availabilities,
    appointments,
    minStartMinutes = 0,
  } = params;

  const avail = availabilities.find(
    (a) => a.date === date && a.professionalId === professionalId
  );
  if (!avail || avail.isOff) return [];

  const shiftStart = parseTimeToMinutes(avail.startTime);
  const shiftEnd = parseTimeToMinutes(avail.endTime);

  const dayBookings = appointments
    .filter(
      (a) =>
        a.date === date &&
        a.professionalId === professionalId &&
        ACTIVE_OCCUPYING_STATUSES.includes(a.status)
    )
    .map((a) => ({
      start: parseTimeToMinutes(a.startTime),
      end: parseTimeToMinutes(a.startTime) + a.durationMinutes,
    }));

  const slots: string[] = [];
  for (
    let t = shiftStart;
    t + durationMinutes <= shiftEnd;
    t += GRID_STEP_MINUTES
  ) {
    if (t < minStartMinutes) continue;
    const candidateEnd = t + durationMinutes;
    const hasOverlap = dayBookings.some(
      (b) => t < b.end && candidateEnd > b.start
    );
    if (!hasOverlap) {
      slots.push(minutesToTime(t));
    }
  }
  return slots;
}

export function getPlantonistaForDay(
  date: string,
  specialtyId: string,
  professionals: Professional[],
  availabilities: DayAvailability[]
): Professional | undefined {
  const activeSpecProfs = professionals.filter(
    (p) => p.active && p.specialtyId === specialtyId
  );
  const availEntry = availabilities.find(
    (a) =>
      a.date === date &&
      a.isPlantonista &&
      !a.isOff &&
      activeSpecProfs.some((p) => p.id === a.professionalId)
  );
  if (!availEntry) return undefined;
  return activeSpecProfs.find((p) => p.id === availEntry.professionalId);
}

export function isLateArrival(
  appointment: Appointment,
  currentMinutes: number,
  toleranceMinutes: number = TOLERANCE_MINUTES
): boolean {
  const scheduled = parseTimeToMinutes(appointment.startTime);
  return currentMinutes - scheduled > toleranceMinutes;
}

export function minutesUntilNoShowAllowed(
  appointment: Appointment,
  currentMinutes: number,
  toleranceMinutes: number = TOLERANCE_MINUTES
): number {
  const allowedAt = parseTimeToMinutes(appointment.startTime) + toleranceMinutes;
  return Math.max(0, allowedAt - currentMinutes);
}

export function calculateNoShowFinancials(
  appointment: Appointment,
  todayIso: string
): {
  retainedAmount: number;
  creditAmount: number;
  expiresAt: string;
} {
  if (appointment.paymentStatus !== 'pago') {
    return {
      retainedAmount: 0,
      creditAmount: 0,
      expiresAt: addDaysIso(todayIso, 7),
    };
  }
  const half = Math.round(appointment.price * 50) / 100;
  return {
    retainedAmount: half,
    creditAmount: appointment.price - half,
    expiresAt: addDaysIso(todayIso, 7),
  };
}

export function getClientAvailableCredit(
  client: Client | undefined,
  todayIso: string
): number {
  if (!client) return 0;
  return client.credits
    .filter((c) => !c.used && c.expiresAt >= todayIso)
    .reduce((sum, c) => sum + c.amount, 0);
}

export function findCompatibleWaitlistMatches(
  freedSlot: FreedSlot,
  waitlist: WaitlistEntry[]
): WaitlistEntry[] {
  return waitlist
    .filter(
      (w) =>
        w.date === freedSlot.date &&
        w.status === 'aguardando' &&
        w.specialtyId === freedSlot.specialtyId &&
        w.durationMinutes <= freedSlot.durationMinutes
    )
    .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt));
}

export function validateDayAvailability(params: {
  date: string;
  draftEntries: DayAvailability[];
  professionals: Professional[];
  specialties: Specialty[];
  appointments: Appointment[];
}): {
  valid: boolean;
  missingPlantonistaSpecialties: string[];
  affectedAppointments: Appointment[];
} {
  const { date, draftEntries, professionals, specialties, appointments } = params;
  const missingPlantonistaSpecialties: string[] = [];

  for (const spec of specialties) {
    const activeProfs = professionals.filter(
      (p) => p.active && p.specialtyId === spec.id
    );
    if (activeProfs.length === 0) continue;

    const workingEntries = draftEntries.filter(
      (e) =>
        e.date === date &&
        !e.isOff &&
        activeProfs.some((p) => p.id === e.professionalId)
    );
    const hasPlantonista = workingEntries.some((e) => e.isPlantonista);
    if (!hasPlantonista) {
      missingPlantonistaSpecialties.push(spec.name);
    }
  }

  const affectedAppointments = appointments.filter((a) => {
    if (a.date !== date || !ACTIVE_OCCUPYING_STATUSES.includes(a.status)) {
      return false;
    }
    const entry = draftEntries.find((e) => e.professionalId === a.professionalId);
    if (!entry || entry.isOff) return true;
    const apptStart = parseTimeToMinutes(a.startTime);
    const apptEnd = apptStart + a.durationMinutes;
    const shiftStart = parseTimeToMinutes(entry.startTime);
    const shiftEnd = parseTimeToMinutes(entry.endTime);
    return apptStart < shiftStart || apptEnd > shiftEnd;
  });

  return {
    valid: missingPlantonistaSpecialties.length === 0,
    missingPlantonistaSpecialties,
    affectedAppointments,
  };
}

export type ProfessionalLiveState = 'OCUPADO' | 'OCIOSO' | 'FOLGA';

export interface ProfessionalLiveStatus {
  state: ProfessionalLiveState;
  isPlantonista: boolean;
  currentAppointment?: Appointment;
  currentEndsAt?: string;
  nextAppointment?: Appointment;
  shiftLabel: string;
}

export function getProfessionalLiveStatus(params: {
  professional: Professional;
  date: string;
  currentMinutes: number;
  appointments: Appointment[];
  availabilities: DayAvailability[];
}): ProfessionalLiveStatus {
  const { professional, date, currentMinutes, appointments, availabilities } =
    params;

  const avail = availabilities.find(
    (a) => a.date === date && a.professionalId === professional.id
  );
  if (!avail || avail.isOff) {
    return {
      state: 'FOLGA',
      isPlantonista: false,
      shiftLabel: 'Folga hoje',
    };
  }

  const dayAppts = appointments
    .filter(
      (a) =>
        a.date === date &&
        a.professionalId === professional.id &&
        (a.status === 'agendado' || a.status === 'em_atendimento')
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const active = dayAppts.find((a) => a.status === 'em_atendimento');

  const next = dayAppts.find((a) => {
    if (a.id === active?.id) return false;
    return a.status === 'agendado' && parseTimeToMinutes(a.startTime) >= currentMinutes - 30;
  });

  if (active) {
    const endsAt = minutesToTime(
      parseTimeToMinutes(active.startTime) + active.durationMinutes
    );
    return {
      state: 'OCUPADO',
      isPlantonista: avail.isPlantonista,
      currentAppointment: active,
      currentEndsAt: endsAt,
      nextAppointment: next,
      shiftLabel: `${avail.startTime} às ${avail.endTime}`,
    };
  }

  return {
    state: 'OCIOSO',
    isPlantonista: avail.isPlantonista,
    nextAppointment: next,
    shiftLabel: `${avail.startTime} às ${avail.endTime}`,
  };
}

export type ProfessionalArrivalBadge = 'Aguardando' | 'Chegou' | 'Atrasada';
export type HeroScheduleMode = 'attending_now' | 'next_client';

export interface NextClientSummary {
  appointment: Appointment;
  badge: ProfessionalArrivalBadge;
  timeDeltaLabel: string;
}

export interface ProfessionalScheduleBuckets {
  heroMode: HeroScheduleMode;
  nextClient: NextClientSummary | null;
  afterActiveLabel: string | null;
  stripText: string | null;
  toAttend: Appointment[];
  completedToday: Appointment[];
  completedCount: number;
  totalCount: number;
}

export function formatMinutesDurationPtBr(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${rem} min`;
}

export function getArrivalBadgeAndCountdown(
  appointment: Appointment,
  currentMinutes: number
): { badge: ProfessionalArrivalBadge; timeDeltaLabel: string } {
  const startMins = parseTimeToMinutes(appointment.startTime);

  if (appointment.status === 'em_atendimento') {
    const endMins = startMins + appointment.durationMinutes;
    const remainingToEnd = endMins - currentMinutes;
    if (remainingToEnd > 0) {
      return {
        badge: 'Chegou',
        timeDeltaLabel:
          remainingToEnd === 1
            ? 'Falta 1 min para o término'
            : `Faltam ${formatMinutesDurationPtBr(remainingToEnd)} para o término`,
      };
    }
    if (remainingToEnd === 0) {
      return {
        badge: 'Chegou',
        timeDeltaLabel: 'Término previsto agora',
      };
    }
    return {
      badge: 'Chegou',
      timeDeltaLabel: `Tempo previsto excedido em ${formatMinutesDurationPtBr(
        Math.abs(remainingToEnd)
      )}`,
    };
  }

  const diff = startMins - currentMinutes;
  if (diff > 0) {
    return {
      badge: 'Aguardando',
      timeDeltaLabel:
        diff === 1
          ? 'Falta 1 min'
          : `Faltam ${formatMinutesDurationPtBr(diff)}`,
    };
  }
  if (diff === 0) {
    return {
      badge: 'Aguardando',
      timeDeltaLabel: 'Horário marcado agora',
    };
  }
  return {
    badge: 'Atrasada',
    timeDeltaLabel: `Atrasada há ${formatMinutesDurationPtBr(Math.abs(diff))}`,
  };
}

export function getProfessionalScheduleBuckets(params: {
  appointments: Appointment[];
  date: string;
  professionalId: string;
  currentMinutes: number;
}): ProfessionalScheduleBuckets {
  const { appointments, date, professionalId, currentMinutes } = params;

  const dayAppts = appointments.filter(
    (a) => a.date === date && a.professionalId === professionalId
  );

  const allPending = dayAppts
    .filter((a) => a.status === 'agendado' || a.status === 'em_atendimento')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const completedToday = dayAppts
    .filter((a) => a.status === 'concluido')
    .sort((a, b) =>
      (a.finishedAt || a.startTime).localeCompare(b.finishedAt || b.startTime)
    );

  const activeInProgress = allPending.find((a) => a.status === 'em_atendimento');
  const heroMode: HeroScheduleMode = activeInProgress
    ? 'attending_now'
    : 'next_client';
  const heroAppt = activeInProgress ?? allPending[0] ?? null;

  const remainingScheduled = activeInProgress
    ? allPending.filter((a) => a.id !== activeInProgress.id)
    : allPending;

  const toAttend = activeInProgress
    ? [activeInProgress, ...remainingScheduled]
    : allPending;

  const afterActiveAppt = activeInProgress ? remainingScheduled[0] ?? null : null;
  const afterActiveLabel = afterActiveAppt
    ? `Depois: ${afterActiveAppt.clientName} às ${afterActiveAppt.startTime}`
    : null;

  let stripText: string | null = null;
  if (activeInProgress) {
    const endsAt = minutesToTime(
      parseTimeToMinutes(activeInProgress.startTime) +
        activeInProgress.durationMinutes
    );
    const base = `Agora: ${activeInProgress.clientName} · ${activeInProgress.serviceName} · termina ${endsAt}`;
    stripText = afterActiveAppt
      ? `${base} | Depois: ${afterActiveAppt.clientName} às ${afterActiveAppt.startTime}`
      : base;
  } else if (allPending[0]) {
    stripText = `Próxima: ${allPending[0].clientName} às ${allPending[0].startTime}`;
  }

  const nextClient: NextClientSummary | null = heroAppt
    ? {
        appointment: heroAppt,
        ...getArrivalBadgeAndCountdown(heroAppt, currentMinutes),
      }
    : null;

  const completedCount = completedToday.length;
  const totalCount = allPending.length + completedToday.length;

  return {
    heroMode,
    nextClient,
    afterActiveLabel,
    stripText,
    toAttend,
    completedToday,
    completedCount,
    totalCount,
  };
}

export function getLastAppointmentWithProfessional(params: {
  appointments: Appointment[];
  currentAppointment: Appointment;
  professionalId: string;
}): Appointment | null {
  const { appointments, currentAppointment, professionalId } = params;
  const targetClientId = currentAppointment.clientId;
  const targetClientName = currentAppointment.clientName.trim().toLowerCase();

  const matches = appointments.filter((a) => {
    if (a.id === currentAppointment.id) return false;
    if (a.professionalId !== professionalId) return false;
    if (a.status !== 'concluido') return false;

    const sameClient =
      targetClientId && a.clientId
        ? a.clientId === targetClientId
        : a.clientName.trim().toLowerCase() === targetClientName;
    if (!sameClient) return false;

    if (a.date < currentAppointment.date) return true;
    if (a.date > currentAppointment.date) return false;
    return a.startTime < currentAppointment.startTime;
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.startTime.localeCompare(a.startTime);
  });

  return matches[0];
}

export function formatLastAppointmentSummary(params: {
  appointments: Appointment[];
  currentAppointment: Appointment;
  professionalId: string;
}): { isFirst: boolean; label: string } {
  const last = getLastAppointmentWithProfessional(params);
  if (!last) {
    return {
      isFirst: true,
      label: 'Primeiro atendimento com você',
    };
  }

  const hairPart =
    last.hairFormat && last.hairLength
      ? ` · Cabelo ${HAIR_FORMAT_LABELS[last.hairFormat]} · ${
          HAIR_LENGTH_LABELS[last.hairLength]
        }`
      : '';

  return {
    isFirst: false,
    label: `Último atendimento com você: ${last.serviceName}${hairPart} · ${formatDateBR(
      last.date
    )}`,
  };
}

export interface ClinicOccupancySummary {
  totalActive: number;
  workingCount: number;
  busyCount: number;
  idleCount: number;
  offCount: number;
  occupancyPct: number;
}

export function getClinicOccupancySummary(params: {
  professionals: Professional[];
  appointments: Appointment[];
  availabilities: DayAvailability[];
  date: string;
  currentMinutes: number;
  specialtyId?: string;
}): ClinicOccupancySummary {
  const {
    professionals,
    appointments,
    availabilities,
    date,
    currentMinutes,
    specialtyId,
  } = params;

  const filtered = professionals
    .filter((p) => p.active)
    .filter(
      (p) =>
        !specialtyId || specialtyId === 'todas' || p.specialtyId === specialtyId
    );

  const statuses = filtered.map((prof) =>
    getProfessionalLiveStatus({
      professional: prof,
      date,
      currentMinutes,
      appointments,
      availabilities,
    })
  );

  const busyCount = statuses.filter((s) => s.state === 'OCUPADO').length;
  const idleCount = statuses.filter((s) => s.state === 'OCIOSO').length;
  const offCount = statuses.filter((s) => s.state === 'FOLGA').length;
  const workingCount = busyCount + idleCount;
  const occupancyPct =
    workingCount > 0 ? Math.round((busyCount / workingCount) * 100) : 0;

  return {
    totalActive: filtered.length,
    workingCount,
    busyCount,
    idleCount,
    offCount,
    occupancyPct,
  };
}

export function formatSpecialtyOccupancySummary(
  busyCount: number,
  idleCount: number
): string {
  const busyLabel = busyCount === 1 ? '1 ocupada' : `${busyCount} ocupadas`;
  const idleLabel = idleCount === 1 ? '1 ociosa' : `${idleCount} ociosas`;
  return `${busyLabel}, ${idleLabel}`;
}

export function computeOpenSlotsForDay(params: {
  date: string;
  professionals: Professional[];
  availabilities: DayAvailability[];
  appointments: Appointment[];
  minStartMinutes?: number;
}): FreedSlot[] {
  const {
    date,
    professionals,
    availabilities,
    appointments,
    minStartMinutes = 0,
  } = params;

  const slots: FreedSlot[] = [];

  for (const prof of professionals) {
    if (!prof.active) continue;
    const avail = availabilities.find(
      (a) => a.date === date && a.professionalId === prof.id
    );
    if (!avail || avail.isOff) continue;

    const shiftStart = parseTimeToMinutes(avail.startTime);
    const shiftEnd = parseTimeToMinutes(avail.endTime);

    const dayBookings = appointments
      .filter(
        (a) =>
          a.date === date &&
          a.professionalId === prof.id &&
          ACTIVE_OCCUPYING_STATUSES.includes(a.status)
      )
      .map((a) => ({
        start: parseTimeToMinutes(a.startTime),
        end: parseTimeToMinutes(a.startTime) + a.durationMinutes,
      }))
      .sort((a, b) => a.start - b.start);

    // Build contiguous free blocks from [shiftStart, shiftEnd]
    let cursor = shiftStart;
    const freeBlocks: Array<{ start: number; end: number }> = [];
    for (const b of dayBookings) {
      if (b.start > cursor) {
        freeBlocks.push({ start: cursor, end: Math.min(b.start, shiftEnd) });
      }
      if (b.end > cursor) {
        cursor = b.end;
      }
    }
    if (cursor < shiftEnd) {
      freeBlocks.push({ start: cursor, end: shiftEnd });
    }

    for (const block of freeBlocks) {
      let start = block.start;
      while (start < minStartMinutes) {
        start += GRID_STEP_MINUTES;
      }
      if (start + GRID_STEP_MINUTES <= block.end) {
        slots.push({
          date,
          startTime: minutesToTime(start),
          durationMinutes: block.end - start,
          professionalId: prof.id,
          specialtyId: prof.specialtyId,
        });
      }
    }
  }

  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function findEarliestCompatibleSlotForEntry(params: {
  entry: WaitlistEntry;
  date: string;
  professionals: Professional[];
  availabilities: DayAvailability[];
  appointments: Appointment[];
  minStartMinutes?: number;
}): FreedSlot | undefined {
  const {
    entry,
    date,
    professionals,
    availabilities,
    appointments,
    minStartMinutes = 0,
  } = params;

  const candidates: FreedSlot[] = [];
  for (const prof of professionals) {
    if (!prof.active || prof.specialtyId !== entry.specialtyId) continue;
    const freeTimes = getAvailableSlots({
      date,
      professionalId: prof.id,
      durationMinutes: entry.durationMinutes,
      availabilities,
      appointments,
      minStartMinutes,
    });
    if (freeTimes.length > 0) {
      candidates.push({
        date,
        startTime: freeTimes[0],
        durationMinutes: entry.durationMinutes,
        professionalId: prof.id,
        specialtyId: entry.specialtyId,
      });
    }
  }

  candidates.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return candidates[0];
}

export interface ReportsRankingRow {
  serviceId: string;
  name: string;
  count: number;
  revenue: number;
  categoryName: string;
}

export interface ReportsSummary {
  filteredCount: number;
  totalRevenue: number;
  completed: number;
  noShows: number;
  attendanceRate: number;
  ranking: ReportsRankingRow[];
}

export function getAppointmentRevenue(appointment: Appointment): number {
  if (appointment.paymentStatus === 'pago') return appointment.price;
  if (
    appointment.paymentStatus === 'retido_parcial' ||
    appointment.paymentStatus === 'reembolsado_parcial'
  ) {
    return appointment.price * 0.5;
  }
  return 0;
}

export function getReportsSummary(params: {
  appointments: Appointment[];
  categories: Array<{ id: string; name: string }>;
  startDate: string;
  endDate: string;
  categoryId: string;
}): ReportsSummary {
  const { appointments, categories, startDate, endDate, categoryId } = params;

  const filtered = appointments.filter((a) => {
    if (a.date < startDate || a.date > endDate) return false;
    if (categoryId !== 'todas' && a.categoryId !== categoryId) return false;
    return true;
  });

  const completedAppointments = filtered.filter(
    (a) => a.status === 'concluido'
  );
  const completed = completedAppointments.length;
  const noShows = filtered.filter((a) => a.status === 'nao_compareceu').length;
  const baseAttendance = completed + noShows;
  const attendanceRate =
    baseAttendance > 0 ? Math.round((completed / baseAttendance) * 100) : 0;

  const byService: Record<string, ReportsRankingRow> = {};
  let totalRevenue = 0;

  for (const appt of completedAppointments) {
    const rev = getAppointmentRevenue(appt);
    totalRevenue += rev;

    if (!byService[appt.serviceId]) {
      const cat = categories.find((c) => c.id === appt.categoryId);
      byService[appt.serviceId] = {
        serviceId: appt.serviceId,
        name: appt.serviceName,
        count: 0,
        revenue: 0,
        categoryName: cat?.name ?? '',
      };
    }
    byService[appt.serviceId].count += 1;
    byService[appt.serviceId].revenue += rev;
  }

  const ranking = Object.values(byService).sort(
    (a, b) => b.count - a.count || b.revenue - a.revenue
  );

  return {
    filteredCount: filtered.length,
    totalRevenue,
    completed,
    noShows,
    attendanceRate,
    ranking,
  };
}

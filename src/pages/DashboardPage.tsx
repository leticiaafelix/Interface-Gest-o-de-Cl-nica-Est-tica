import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Hourglass,
  PlayCircle,
  Sparkles,
  UserX,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { Appointment, FreedSlot, WaitlistEntry } from '../types/clinic';
import {
  addDaysIso,
  formatCurrencyBRL,
  formatDateBR,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
  parseTimeToMinutes,
} from '../utils/formatters';
import {
  getAvailableSlots,
  getClientAvailableCredit,
  getClinicOccupancySummary,
  formatSpecialtyOccupancySummary,
  isLateArrival,
} from '../utils/scheduling';
import { PaymentModal } from '../components/PaymentModal';
import { Modal } from '../components/Modal';
import { AppointmentStatusLabel, OriginBadge } from '../components/StatusBadge';

type PeriodFilter = 'hoje' | 'semana' | 'mes';

const CHART_ROSE = '#B76E79';
const CHART_GOLD = '#C9A46A';
const CHART_NUDE = '#E4C8BC';
const CHART_INK = '#2E2A2B';
const CHART_GREEN = '#4A8B62';
const CHART_AMBER = '#C88D32';

export const DashboardPage: React.FC = () => {
  const {
    state,
    currentUser,
    simulatedDate,
    simulatedTime,
    simulatedMinutes,
    checkInAppointment,
    fitWaitlistIntoSlot,
  } = useClinic();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodFilter>('hoje');
  const [liveSpecFilter, setLiveSpecFilter] = useState<string>('todas');
  const [paymentTarget, setPaymentTarget] = useState<Appointment | null>(null);
  const [fitModalEntry, setFitModalEntry] = useState<WaitlistEntry | null>(null);
  const [selectedFitSlot, setSelectedFitSlot] = useState<FreedSlot | null>(null);
  const [fitPaymentPending, setFitPaymentPending] = useState<{
    entry: WaitlistEntry;
    slot: FreedSlot;
  } | null>(null);

  const isManager = currentUser?.role === 'gerente';

  const periodStartDate = useMemo(() => {
    if (period === 'hoje') return simulatedDate;
    if (period === 'semana') return addDaysIso(simulatedDate, -6);
    return addDaysIso(simulatedDate, -29);
  }, [period, simulatedDate]);

  const periodAppointments = useMemo(
    () =>
      state.appointments.filter(
        (a) => a.date >= periodStartDate && a.date <= simulatedDate
      ),
    [state.appointments, periodStartDate, simulatedDate]
  );

  const todayAppointments = useMemo(
    () => state.appointments.filter((a) => a.date === simulatedDate),
    [state.appointments, simulatedDate]
  );

  const monthAppointments = useMemo(() => {
    const start = addDaysIso(simulatedDate, -29);
    return state.appointments.filter(
      (a) => a.date >= start && a.date <= simulatedDate
    );
  }, [state.appointments, simulatedDate]);

  const waitingQueue = useMemo(
    () =>
      state.waitlist
        .filter((w) => w.date === simulatedDate && w.status === 'aguardando')
        .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt)),
    [state.waitlist, simulatedDate]
  );

  const clinicOccupancyAll = useMemo(() => {
    return getClinicOccupancySummary({
      professionals: state.professionals,
      appointments: state.appointments,
      availabilities: state.availabilities,
      date: simulatedDate,
      currentMinutes: simulatedMinutes,
    });
  }, [
    state.professionals,
    state.appointments,
    state.availabilities,
    simulatedDate,
    simulatedMinutes,
  ]);

  const clinicOccupancyFiltered = useMemo(() => {
    return getClinicOccupancySummary({
      professionals: state.professionals,
      appointments: state.appointments,
      availabilities: state.availabilities,
      date: simulatedDate,
      currentMinutes: simulatedMinutes,
      specialtyId: liveSpecFilter,
    });
  }, [
    state.professionals,
    state.appointments,
    state.availabilities,
    simulatedDate,
    simulatedMinutes,
    liveSpecFilter,
  ]);

  const kpis = useMemo(() => {
    const agendados = periodAppointments.filter(
      (a) => a.status === 'agendado'
    ).length;
    const emAndamento = todayAppointments.filter(
      (a) => a.status === 'em_atendimento'
    ).length;
    const concluidos = periodAppointments.filter(
      (a) => a.status === 'concluido'
    ).length;
    const faltas = periodAppointments.filter(
      (a) => a.status === 'nao_compareceu'
    ).length;

    const calcRevenue = (list: Appointment[]) =>
      list.reduce((sum, a) => {
        if (a.paymentStatus === 'pago') return sum + a.price;
        if (a.paymentStatus === 'retido_parcial' || a.paymentStatus === 'reembolsado_parcial') {
          return sum + a.price * 0.5;
        }
        return sum;
      }, 0);

    return {
      agendados,
      emAndamento,
      concluidos,
      faltas,
      fila: waitingQueue.length,
      occupancyPct: clinicOccupancyAll.occupancyPct,
      busyCount: clinicOccupancyAll.busyCount,
      workingCount: clinicOccupancyAll.workingCount,
      revenueToday: calcRevenue(todayAppointments),
      revenueMonth: calcRevenue(monthAppointments),
    };
  }, [
    periodAppointments,
    clinicOccupancyAll,
    waitingQueue.length,
    todayAppointments,
    monthAppointments,
  ]);

  // Chart 1: Atendimentos por horário hoje (08h..19h)
  const hourlyTodayData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let h = 8; h <= 19; h++) {
      buckets[`${String(h).padStart(2, '0')}h`] = 0;
    }
    todayAppointments.forEach((a) => {
      if (a.status === 'cancelado') return;
      const hr = a.startTime.slice(0, 2) + 'h';
      if (buckets[hr] !== undefined) buckets[hr] += 1;
    });
    return Object.entries(buckets).map(([hora, total]) => ({ hora, total }));
  }, [todayAppointments]);

  // Chart 2: Profissionais Ocupados x Ociosos
  const occupancyDonutData = useMemo(() => {
    return [
      { name: 'Ocupados', value: clinicOccupancyFiltered.busyCount, color: CHART_ROSE },
      { name: 'Ociosos', value: clinicOccupancyFiltered.idleCount, color: CHART_GOLD },
    ];
  }, [clinicOccupancyFiltered]);

  // Chart 3: Top 5 serviços do mês
  const topServicesMonthData = useMemo(() => {
    const counts: Record<string, number> = {};
    monthAppointments.forEach((a) => {
      if (a.status === 'cancelado') return;
      counts[a.serviceName] = (counts[a.serviceName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([servico, quantidade]) => ({ servico, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [monthAppointments]);

  // Chart 4: Salão x Estética no mês
  const categorySplitData = useMemo(() => {
    let salao = 0;
    let estetica = 0;
    monthAppointments.forEach((a) => {
      if (a.status === 'cancelado') return;
      if (a.categoryId === 'salao') salao += 1;
      else estetica += 1;
    });
    return [
      { name: 'Salão de Beleza', value: salao, color: CHART_ROSE },
      { name: 'Centro de Estética', value: estetica, color: CHART_GOLD },
    ];
  }, [monthAppointments]);

  // Chart 5 (Gerente): Faturamento dos últimos 30 dias
  const revenue30DaysData = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      byDate[addDaysIso(simulatedDate, -i)] = 0;
    }
    monthAppointments.forEach((a) => {
      if (byDate[a.date] === undefined) return;
      if (a.paymentStatus === 'pago') byDate[a.date] += a.price;
      else if (
        a.paymentStatus === 'retido_parcial' ||
        a.paymentStatus === 'reembolsado_parcial'
      ) {
        byDate[a.date] += a.price * 0.5;
      }
    });
    return Object.entries(byDate).map(([iso, valor]) => ({
      dia: formatDateBR(iso).slice(0, 5),
      valor: Math.round(valor * 100) / 100,
    }));
  }, [monthAppointments, simulatedDate]);

  // Chart 6 (Gerente): Taxa de comparecimento por semana (últimas 6 semanas)
  const attendanceWeeklyData = useMemo(() => {
    const weeks: Array<{ semana: string; taxa: number }> = [];
    for (let w = 5; w >= 0; w--) {
      const end = addDaysIso(simulatedDate, -w * 7);
      const start = addDaysIso(end, -6);
      const slice = state.appointments.filter(
        (a) =>
          a.date >= start &&
          a.date <= end &&
          (a.status === 'concluido' || a.status === 'nao_compareceu')
      );
      const attended = slice.filter((a) => a.status === 'concluido').length;
      const rate = slice.length > 0 ? Math.round((attended / slice.length) * 100) : 100;
      weeks.push({
        semana: `${formatDateBR(start).slice(0, 5)}`,
        taxa: rate,
      });
    }
    return weeks;
  }, [state.appointments, simulatedDate]);

  // Next 5 appointments today
  const nextFiveAppointments = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === 'agendado')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [todayAppointments]);

  const handleCheckInClick = (appt: Appointment) => {
    // Check if overdue > 15m first via checkInAppointment or open payment if pending & within tolerance
    const diff = simulatedMinutes - parseTimeToMinutes(appt.startTime);
    if (diff > 15) {
      checkInAppointment(appt.id);
      return;
    }
    if (appt.paymentStatus === 'pendente') {
      setPaymentTarget(appt);
      return;
    }
    checkInAppointment(appt.id);
  };

  // Compatible slots right now for a waitlist entry
  const availableSlotsForWaitlist = useMemo(() => {
    if (!fitModalEntry) return [];
    const candidates: FreedSlot[] = [];
    state.professionals
      .filter((p) => p.active && p.specialtyId === fitModalEntry.specialtyId)
      .forEach((prof) => {
        const slots = getAvailableSlots({
          date: simulatedDate,
          professionalId: prof.id,
          durationMinutes: fitModalEntry.durationMinutes,
          availabilities: state.availabilities,
          appointments: state.appointments,
          minStartMinutes: simulatedMinutes - 15,
        });
        slots.slice(0, 4).forEach((s) => {
          candidates.push({
            date: simulatedDate,
            startTime: s,
            durationMinutes: fitModalEntry.durationMinutes,
            professionalId: prof.id,
            specialtyId: fitModalEntry.specialtyId,
          });
        });
      });
    return candidates.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [
    fitModalEntry,
    state.professionals,
    state.availabilities,
    state.appointments,
    simulatedDate,
    simulatedMinutes,
  ]);

  const handleConfirmFit = (entry: WaitlistEntry, slot: FreedSlot) => {
    if (entry.type === 'atrasada_paga') {
      fitWaitlistIntoSlot(entry.id, slot);
      setFitModalEntry(null);
      setSelectedFitSlot(null);
    } else {
      setFitModalEntry(null);
      setFitPaymentPending({ entry, slot });
    }
  };

  const periodLabel =
    period === 'hoje' ? 'Hoje' : period === 'semana' ? 'Últimos 7 dias' : 'Últimos 30 dias';

  return (
    <div className="space-y-6">
      {/* Header row with Period filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            {isManager ? 'Visão Geral da Clínica' : 'Recepção'}
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            {isManager
              ? `${periodLabel} · Atualizado em tempo real conforme os atendimentos`
              : `Hoje, ${formatDateBR(simulatedDate)} · Chegadas, fila de espera e equipe em tempo real`}
          </p>
        </div>

        {isManager && (
        <div
          className="inline-flex items-center p-1 rounded-full bg-[#F3E3DC]/80 border border-[#EADAD3]"
          role="group"
          aria-label="Filtro de período do dashboard"
        >
          {(['hoje', 'semana', 'mes'] as PeriodFilter[]).map((p) => {
            const labels: Record<PeriodFilter, string> = {
              hoje: 'Hoje',
              semana: 'Semana',
              mes: 'Mês',
            };
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#B76E79] text-white shadow-sm'
                    : 'text-[#2E2A2B] hover:bg-white/60'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {(() => {
        const receptionKpisSection = (
          <section aria-label="Indicadores principais" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Agendados</span>
                <CalendarCheck className="w-4 h-4 text-[#B76E79]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.agendados}
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1">{periodLabel}</p>
            </div>

            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Em andamento</span>
                <PlayCircle className="w-4 h-4 text-[#C9A46A]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.emAndamento}
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1">Em sala agora</p>
            </div>

            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Concluídos</span>
                <CheckCircle2 className="w-4 h-4 text-[#1F6138]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.concluidos}
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1">{periodLabel}</p>
            </div>

            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Faltas</span>
                <UserX className="w-4 h-4 text-[#9B2C2C]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.faltas}
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1">{periodLabel}</p>
            </div>

            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Na fila hoje</span>
                <Hourglass className="w-4 h-4 text-[#C88D32]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.fila}
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1">Aguardando encaixe</p>
            </div>

            <div className="rf-card p-4">
              <div className="flex items-center justify-between text-[#6E6567]">
                <span className="text-xs font-medium">Ocupação agora</span>
                <Users className="w-4 h-4 text-[#B76E79]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {kpis.occupancyPct}%
              </p>
              <p className="text-[11px] text-[#6E6567] mt-1 tabular-nums">
                {kpis.busyCount} de {kpis.workingCount} em atendimento · {simulatedTime}
              </p>
            </div>
          </section>
        );

        const topServicesChartCard = (
          <div className="rf-card p-5 h-full">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                Top 5 serviços do mês
              </h2>
              <p className="text-xs text-[#6E6567]">
                Volume de atendimentos nos últimos 30 dias
              </p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServicesMonthData} layout="vertical" margin={{ left: 12, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6567' }} />
                  <YAxis
                    type="category"
                    dataKey="servico"
                    width={118}
                    tick={{ fontSize: 11, fill: '#2E2A2B' }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v ?? 0)} atendimentos`, 'Total']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                  />
                  <Bar dataKey="quantidade" name="Atendimentos" fill={CHART_GOLD} radius={[0, 6, 6, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

        const nextAppointmentsSection = (
          <section className="rf-card p-5" aria-label="Próximos atendimentos">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                  Próximos atendimentos
                </h2>
                <p className="text-xs text-[#6E6567]">
                  Próximas 5 clientes agendadas hoje
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agenda')}
                className="text-xs font-medium text-[#B76E79] hover:underline flex items-center gap-1"
              >
                <span>Ver agenda</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {nextFiveAppointments.length === 0 ? (
              <p className="text-sm text-[#6E6567] py-6 text-center">
                Nenhum próximo agendamento pendente hoje.
              </p>
            ) : (
              <ul className="divide-y divide-[#F1E6E0]">
                {nextFiveAppointments.map((appt) => {
                  const prof = state.professionals.find(
                    (p) => p.id === appt.professionalId
                  );
                  const hairDetail =
                    appt.hairFormat && appt.hairLength
                      ? ` · ${HAIR_FORMAT_LABELS[appt.hairFormat]} ${HAIR_LENGTH_LABELS[appt.hairLength]}`
                      : '';
                  const isOverdue = isLateArrival(appt, simulatedMinutes);
                  return (
                    <li
                      key={appt.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-[#9A5560] tabular-nums">
                            {appt.startTime}
                          </span>
                          <OriginBadge origin={appt.origin} />
                          {isOverdue && (
                            <AppointmentStatusLabel
                              status={appt.status}
                              isLate={true}
                            />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2E2A2B] truncate">
                          {appt.clientName}
                        </p>
                        <p className="text-xs text-[#6E6567] truncate">
                          {appt.serviceName}
                          {hairDetail} · {prof?.name}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        {isOverdue ? (
                          <button
                            type="button"
                            onClick={() => handleCheckInClick(appt)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#8C5214] border border-[#F0D0A8] hover:bg-[#FDE6C4] transition-colors inline-flex items-center gap-1.5"
                          >
                            <Hourglass className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>Chegou atrasada – enviar à fila</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckInClick(appt)}
                            className="rf-btn-primary px-3 py-1.5 text-xs font-medium"
                          >
                            Cliente chegou
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );

        const waitlistSection = (
          <section className="rf-card p-5" aria-label="Fila de espera">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                  Fila de espera
                </h2>
                <p className="text-xs text-[#6E6567]">
                  Por ordem de chegada ({waitingQueue.length})
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/fila')}
                className="text-xs font-medium text-[#B76E79] hover:underline flex items-center gap-1"
              >
                <span>Gerenciar</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {waitingQueue.length === 0 ? (
              <p className="text-sm text-[#6E6567] py-6 text-center">
                Fila de espera vazia no momento.
              </p>
            ) : (
              <ul className="divide-y divide-[#F1E6E0]">
                {waitingQueue.map((entry, idx) => (
                  <li key={entry.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[#6E6567] tabular-nums">
                        #{idx + 1} · Entrada {entry.enteredAt} ·{' '}
                        {entry.type === 'atrasada_paga'
                          ? 'Atrasada – já pagou'
                          : 'Sem reserva'}
                      </p>
                      <p className="text-sm font-semibold text-[#2E2A2B] truncate mt-0.5">
                        {entry.clientName}
                      </p>
                      <p className="text-xs text-[#6E6567] truncate">
                        {entry.serviceName} ({entry.durationMinutes} min)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFitModalEntry(entry);
                        setSelectedFitSlot(null);
                      }}
                      className="rf-btn-secondary px-3.5 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
                    >
                      Encaixar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

        const teamNowSection = (
          <section className="rf-card p-5" aria-label="Profissionais agora">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                  Profissionais agora
                </h2>
                <p className="text-xs text-[#6E6567] tabular-nums">
                  {formatSpecialtyOccupancySummary(clinicOccupancyAll.busyCount, clinicOccupancyAll.idleCount)} · {simulatedTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/profissionais-agora')}
                className="text-xs font-medium text-[#B76E79] hover:underline flex items-center gap-1"
              >
                <span>Ver equipe</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <ul className="divide-y divide-[#F1E6E0]">
              {state.specialties.map((spec) => {
                const sum = getClinicOccupancySummary({
                  professionals: state.professionals,
                  appointments: state.appointments,
                  availabilities: state.availabilities,
                  date: simulatedDate,
                  currentMinutes: simulatedMinutes,
                  specialtyId: spec.id,
                });
                if (sum.totalActive === 0) return null;
                return (
                  <li key={spec.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#2E2A2B]">{spec.name}</span>
                    <span className="text-xs text-[#6E6567] tabular-nums">
                      {formatSpecialtyOccupancySummary(sum.busyCount, sum.idleCount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );

        return (
          <>
            {/* Gerente: Faturamento (dia e mês) + Top 5 serviços do mês primeiro; Atendente: indicadores da recepção primeiro */}
            {isManager ? (
              <>
                <section
                  aria-label="Faturamento e serviços em destaque"
                  className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch"
                >
                  <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                    <div className="rf-card p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#6E6567]">
                          Faturamento do dia ({formatDateBR(simulatedDate)})
                        </p>
                        <p className="font-display text-3xl font-bold text-[#2E2A2B] mt-1 tabular-nums">
                          {formatCurrencyBRL(kpis.revenueToday)}
                        </p>
                        <p className="text-xs text-[#6E6567] mt-1">
                          Considera pagamentos confirmados e retenções de faltas
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#F3E3DC] flex items-center justify-center text-[#B76E79] shrink-0">
                        <DollarSign className="w-6 h-6" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="rf-card p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#6E6567]">
                          Faturamento dos últimos 30 dias
                        </p>
                        <p className="font-display text-3xl font-bold text-[#B76E79] mt-1 tabular-nums">
                          {formatCurrencyBRL(kpis.revenueMonth)}
                        </p>
                        <p className="text-xs text-[#6E6567] mt-1">
                          Salão de Beleza + Centro de Estética
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#F3E3DC] flex items-center justify-center text-[#C9A46A] shrink-0">
                        <Sparkles className="w-6 h-6" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-7">
                    {topServicesChartCard}
                  </div>
                </section>

                {receptionKpisSection}
              </>
            ) : (
              receptionKpisSection
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {isManager ? (
              <div className="xl:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bar chart: Atendimentos por horário hoje */}
                  <div className="rf-card p-5">
                    <div className="mb-4">
                      <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                        Atendimentos por horário hoje
                      </h2>
                      <p className="text-xs text-[#6E6567]">
                        Total de reservas ativas por faixa horária ({todayAppointments.filter((a) => a.status !== 'cancelado').length} no dia)
                      </p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyTodayData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" />
                          <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#6E6567' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6567' }} />
                          <Tooltip
                            formatter={(v) => [`${Number(v ?? 0)} atendimentos`, 'Quantidade']}
                            contentStyle={{
                              borderRadius: '12px',
                              borderColor: '#EADAD3',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="total" name="Atendimentos" fill={CHART_ROSE} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Donut: Profissionais Ocupados x Ociosos */}
                  <div className="rf-card p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                          Profissionais agora
                        </h2>
                        <p className="text-xs text-[#6E6567] tabular-nums">
                          Ocupados: {occupancyDonutData[0].value} · Ociosos: {occupancyDonutData[1].value}
                        </p>
                      </div>
                      <select
                        aria-label="Filtrar especialidade no gráfico de profissionais"
                        value={liveSpecFilter}
                        onChange={(e) => setLiveSpecFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-full border border-[#D9C3B9] bg-[#FFFAF7] text-[#2E2A2B]"
                      >
                        <option value="todas">Todas</option>
                        {state.specialties.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={occupancyDonutData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={76}
                            paddingAngle={3}
                            isAnimationActive={false}
                          >
                            {occupancyDonutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v, name) => [`${Number(v ?? 0)} profissionais`, String(name ?? '')]}
                            contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                          />
                          <Legend
                            formatter={(value) => {
                              const item = occupancyDonutData.find((d) => d.name === value);
                              return `${value}: ${item?.value ?? 0}`;
                            }}
                            wrapperStyle={{ fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Horizontal Bar: Top 5 serviços do mês (Atendente only here; Gerente sees it at top) */}
                  {!isManager && topServicesChartCard}

                  {/* Donut: Salão x Estética no mês */}
                  <div className="rf-card p-5">
                    <div className="mb-4">
                      <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                        Salão x Estética no mês
                      </h2>
                      <p className="text-xs text-[#6E6567] tabular-nums">
                        Salão: {categorySplitData[0].value} · Estética: {categorySplitData[1].value}
                      </p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySplitData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={76}
                            paddingAngle={3}
                            isAnimationActive={false}
                          >
                            {categorySplitData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v, name) => [`${Number(v ?? 0)} atendimentos`, String(name ?? '')]}
                            contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                          />
                          <Legend
                            formatter={(value) => {
                              const item = categorySplitData.find((d) => d.name === value);
                              return `${value}: ${item?.value ?? 0}`;
                            }}
                            wrapperStyle={{ fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Manager-only charts */}
                  {isManager && (
                    <>
                      <div className="rf-card p-5">
                        <div className="mb-4">
                          <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                            Faturamento dos últimos 30 dias
                          </h2>
                          <p className="text-xs text-[#6E6567]">
                            Evolução diária em R$ (total no período: {formatCurrencyBRL(kpis.revenueMonth)})
                          </p>
                        </div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenue30DaysData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" />
                              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#6E6567' }} interval={4} />
                              <YAxis tick={{ fontSize: 11, fill: '#6E6567' }} />
                              <Tooltip
                                formatter={(v) => [formatCurrencyBRL(Number(v ?? 0)), 'Receita']}
                                contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="valor"
                                name="Faturamento diário"
                                stroke={CHART_ROSE}
                                strokeWidth={2.5}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rf-card p-5 md:col-span-2">
                        <div className="mb-4">
                          <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                            Taxa de comparecimento semanal
                          </h2>
                          <p className="text-xs text-[#6E6567]">
                            Percentual de atendimentos concluídos sem falta (%)
                          </p>
                        </div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attendanceWeeklyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" />
                              <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#6E6567' }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6E6567' }} />
                              <Tooltip
                                formatter={(v) => [`${Number(v ?? 0)}%`, 'Comparecimento']}
                                contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="taxa"
                                name="Comparecimento (%)"
                                stroke={CHART_GREEN}
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: CHART_GREEN }}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              ) : (
                <div className="xl:col-span-8 space-y-6">
                  {nextAppointmentsSection}
                </div>
              )}

        {/* Painéis laterais */}
        <div className="xl:col-span-4 space-y-6">
          {isManager && nextAppointmentsSection}
          {waitlistSection}
          {!isManager && teamNowSection}
        </div>
      </div>
          </>
        );
      })()}

      {/* Payment Modal for pending counter check-in */}
      {paymentTarget && (
        <PaymentModal
          open={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          clientName={paymentTarget.clientName}
          serviceName={paymentTarget.serviceName}
          amount={paymentTarget.price}
          availableCredit={getClientAvailableCredit(
            state.clients.find((c) => c.id === paymentTarget.clientId),
            simulatedDate
          )}
          onConfirm={(pay) => {
            checkInAppointment(paymentTarget.id, pay);
            setPaymentTarget(null);
          }}
        />
      )}

      {/* Waitlist Fit Modal */}
      <Modal
        open={Boolean(fitModalEntry)}
        onClose={() => setFitModalEntry(null)}
        title="Encaixar cliente da fila"
        subtitle={
          fitModalEntry
            ? `${fitModalEntry.clientName} · ${fitModalEntry.serviceName} (${fitModalEntry.durationMinutes} min)`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        {fitModalEntry && (
          <div className="space-y-4">
            {availableSlotsForWaitlist.length === 0 ? (
              <p className="text-sm text-[#6E6567]">
                Não há horários livres compatíveis com a duração de{' '}
                {fitModalEntry.durationMinutes} min neste momento.
              </p>
            ) : (
              <>
                <p className="text-xs text-[#6E6567]">
                  Selecione o horário livre onde o serviço cabe integralmente:
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableSlotsForWaitlist.map((slot) => {
                    const prof = state.professionals.find(
                      (p) => p.id === slot.professionalId
                    );
                    const isSelected =
                      selectedFitSlot?.startTime === slot.startTime &&
                      selectedFitSlot?.professionalId === slot.professionalId;
                    return (
                      <button
                        key={`${slot.professionalId}-${slot.startTime}`}
                        type="button"
                        onClick={() => setSelectedFitSlot(slot)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-colors ${
                          isSelected
                            ? 'border-[#B76E79] bg-[#F3E3DC]/50'
                            : 'border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79]'
                        }`}
                      >
                        <span className="text-sm font-medium text-[#2E2A2B]">
                          <Clock className="w-3.5 h-3.5 inline mr-1.5 text-[#B76E79]" aria-hidden="true" />
                          <span className="tabular-nums">{slot.startTime}</span> · {prof?.name}
                        </span>
                        <span className="text-xs text-[#6E6567]">Selecionar</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFitModalEntry(null)}
                    className="rf-btn-outline px-4 py-2 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFitSlot}
                    onClick={() =>
                      selectedFitSlot &&
                      handleConfirmFit(fitModalEntry, selectedFitSlot)
                    }
                    className="rf-btn-primary px-5 py-2 text-sm font-medium"
                  >
                    Confirmar encaixe
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {fitPaymentPending && (
        <PaymentModal
          open={Boolean(fitPaymentPending)}
          onClose={() => setFitPaymentPending(null)}
          clientName={fitPaymentPending.entry.clientName}
          serviceName={fitPaymentPending.entry.serviceName}
          amount={fitPaymentPending.entry.price}
          availableCredit={getClientAvailableCredit(
            state.clients.find(
              (c) => c.id === fitPaymentPending.entry.clientId
            ),
            simulatedDate
          )}
          onConfirm={(pay) => {
            fitWaitlistIntoSlot(
              fitPaymentPending.entry.id,
              fitPaymentPending.slot,
              pay
            );
            setFitPaymentPending(null);
          }}
        />
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  MoreHorizontal,
  Play,
  UserX,
  XCircle,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { Appointment, AppointmentStatus, FreedSlot, WaitlistEntry } from '../types/clinic';
import {
  addDaysIso,
  formatCurrencyBRL,
  formatDateBR,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
  parseTimeToMinutes,
} from '../utils/formatters';
import {
  calculateNoShowFinancials,
  getAvailableSlots,
  getClientAvailableCredit,
  isLateArrival,
  minutesUntilNoShowAllowed,
} from '../utils/scheduling';
import {
  AppointmentStatusLabel,
  OriginBadge,
  PaymentStatusLabel,
} from '../components/StatusBadge';
import { PaymentModal } from '../components/PaymentModal';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/SkeletonBlock';
import { useNavigate } from 'react-router-dom';
import { BrazilianDateInput, BrazilianTimeInput } from '../components/DateTimeInputs';

export const AgendaPage: React.FC = () => {
  const {
    state,
    simulatedDate,
    simulatedMinutes,
    checkInAppointment,
    completeAppointment,
    registerNoShow,
    cancelByClinic,
    fitWaitlistIntoSlot,
  } = useClinic();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(simulatedDate);
  const [profFilter, setProfFilter] = useState('todos');
  const [specFilter, setSpecFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | AppointmentStatus>('todos');

  const [paymentTarget, setPaymentTarget] = useState<Appointment | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelMode, setCancelMode] = useState<'reembolsar' | 'remarcar'>('reembolsar');
  const [rescheduleDate, setRescheduleDate] = useState(addDaysIso(simulatedDate, 1));
  const [rescheduleProfId, setRescheduleProfId] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [lateWarning, setLateWarning] = useState<{
    clientName: string;
    freedSlot?: FreedSlot;
    match?: WaitlistEntry;
  } | null>(null);

  const [waitlistSuggestion, setWaitlistSuggestion] = useState<{
    freedSlot: FreedSlot;
    match: WaitlistEntry;
  } | null>(null);

  const [fitPaymentTarget, setFitPaymentTarget] = useState<{
    entry: WaitlistEntry;
    slot: FreedSlot;
  } | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openActionMenuId) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-agenda-action-menu]')) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionMenuId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionMenuId]);

  const dayAppointments = useMemo(() => {
    return state.appointments
      .filter((a) => a.date === selectedDate)
      .filter((a) => profFilter === 'todos' || a.professionalId === profFilter)
      .filter((a) => specFilter === 'todas' || a.specialtyId === specFilter)
      .filter((a) => statusFilter === 'todos' || a.status === statusFilter)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.appointments, selectedDate, profFilter, specFilter, statusFilter]);

  const rescheduleSlots = useMemo(() => {
    if (!cancelTarget || cancelMode !== 'remarcar' || !rescheduleProfId) return [];
    return getAvailableSlots({
      date: rescheduleDate,
      professionalId: rescheduleProfId,
      durationMinutes: cancelTarget.durationMinutes,
      availabilities: state.availabilities,
      appointments: state.appointments,
    });
  }, [
    cancelTarget,
    cancelMode,
    rescheduleDate,
    rescheduleProfId,
    state.availabilities,
    state.appointments,
  ]);

  const handleArrival = (appt: Appointment) => {
    if (appt.date === simulatedDate && isLateArrival(appt, simulatedMinutes)) {
      const res = checkInAppointment(appt.id);
      if (res.lateSentToWaitlist) {
        setLateWarning({
          clientName: appt.clientName,
          freedSlot: res.freedSlot,
          match: res.waitlistMatch,
        });
      }
      return;
    }

    if (appt.paymentStatus === 'pendente') {
      setPaymentTarget(appt);
      return;
    }

    checkInAppointment(appt.id);
  };

  const handleConfirmNoShow = () => {
    if (!noShowTarget) return;
    const res = registerNoShow(noShowTarget.id);
    setNoShowTarget(null);
    if (res.ok && res.freedSlot && res.waitlistMatch) {
      setWaitlistSuggestion({
        freedSlot: res.freedSlot,
        match: res.waitlistMatch,
      });
    }
  };

  const handleOpenCancel = (appt: Appointment) => {
    setCancelTarget(appt);
    setCancelMode('reembolsar');
    setRescheduleDate(addDaysIso(simulatedDate, 1));
    setRescheduleProfId(appt.professionalId);
    setRescheduleTime('');
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    if (cancelMode === 'remarcar') {
      if (!rescheduleTime || !rescheduleProfId) return;
      cancelByClinic(cancelTarget.id, 'remarcar', {
        date: rescheduleDate,
        startTime: rescheduleTime,
        professionalId: rescheduleProfId,
      });
      setCancelTarget(null);
      return;
    }
    const res = cancelByClinic(cancelTarget.id, 'reembolsar');
    setCancelTarget(null);
    if (res.ok && res.freedSlot && res.waitlistMatch) {
      setWaitlistSuggestion({
        freedSlot: res.freedSlot,
        match: res.waitlistMatch,
      });
    }
  };

  const handleFitSuggested = () => {
    if (!waitlistSuggestion) return;
    const { entry, slot } = {
      entry: waitlistSuggestion.match,
      slot: waitlistSuggestion.freedSlot,
    };
    setWaitlistSuggestion(null);
    if (entry.type === 'atrasada_paga') {
      fitWaitlistIntoSlot(entry.id, slot);
    } else {
      setFitPaymentTarget({ entry, slot });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Agenda do Dia
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Controle de chegadas, tolerância de 15 min, pagamentos no balcão e faltas
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-white border border-[#EADAD3] rounded-full p-1">
          <button
            type="button"
            onClick={() => setSelectedDate(addDaysIso(selectedDate, -1))}
            aria-label="Dia anterior"
            className="p-2 rounded-full hover:bg-[#F3E3DC] text-[#2E2A2B]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <BrazilianDateInput
            aria-label="Selecionar data da agenda"
            value={selectedDate}
            alignRight
            onChange={(iso) => setSelectedDate(iso)}
            className="text-sm font-medium text-[#2E2A2B] bg-transparent border-none px-2 tabular-nums"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(addDaysIso(selectedDate, 1))}
            aria-label="Próximo dia"
            className="p-2 rounded-full hover:bg-[#F3E3DC] text-[#2E2A2B]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {selectedDate !== simulatedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(simulatedDate)}
              className="rf-btn-secondary px-3 py-1 text-xs font-medium mr-1"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rf-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="agenda-filter-spec" className="text-xs font-medium text-[#6E6567]">
            Especialidade:
          </label>
          <select
            id="agenda-filter-spec"
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-full border border-[#D9C3B9] bg-[#FFFAF7]"
          >
            <option value="todas">Todas</option>
            {state.specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="agenda-filter-prof" className="text-xs font-medium text-[#6E6567]">
            Profissional:
          </label>
          <select
            id="agenda-filter-prof"
            value={profFilter}
            onChange={(e) => setProfFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-full border border-[#D9C3B9] bg-[#FFFAF7]"
          >
            <option value="todos">Todos</option>
            {state.professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="agenda-filter-status" className="text-xs font-medium text-[#6E6567]">
            Status:
          </label>
          <select
            id="agenda-filter-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'todos' | AppointmentStatus)
            }
            className="text-sm px-3 py-1.5 rounded-full border border-[#D9C3B9] bg-[#FFFAF7]"
          >
            <option value="todos">Todos</option>
            <option value="agendado">Agendado</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluido">Concluído</option>
            <option value="nao_compareceu">Não compareceu</option>
            <option value="na_fila">Na fila</option>
            <option value="nao_atendida">Não atendida</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-[#6E6567] tabular-nums">
          {formatDateBR(selectedDate)} · {dayAppointments.length}{' '}
          {dayAppointments.length === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      {/* Appointments List */}
      {dayAppointments.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento encontrado"
          description="Não há atendimentos para esta data e filtros selecionados."
          actionLabel="Agendar no balcão"
          onAction={() => navigate('/balcao')}
          icon={<CalendarIcon className="w-7 h-7" />}
        />
      ) : (
        <div className="rf-card overflow-visible">
          <div className="overflow-x-auto xl:overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FFFAF7] border-b border-[#EADAD3] text-xs font-semibold text-[#6E6567]">
                  <th className="py-3 px-2 2xl:px-3 first:rounded-tl-2xl">Horário</th>
                  <th className="py-3 px-2 2xl:px-3">Cliente</th>
                  <th className="py-3 px-2 2xl:px-3">Serviço</th>
                  <th className="py-3 px-2 2xl:px-3">Profissional</th>
                  <th className="py-3 px-2 2xl:px-3">Pagamento</th>
                  <th className="py-3 px-2 2xl:px-3">Status</th>
                  <th className="py-3 px-2 2xl:px-3 text-right last:rounded-tr-2xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1E6E0] text-[13px]">
                {dayAppointments.map((appt, apptIndex) => {
                  const prof = state.professionals.find(
                    (p) => p.id === appt.professionalId
                  );
                  const isToday = appt.date === simulatedDate;
                  const minsLeftForNoShow = isToday
                    ? minutesUntilNoShowAllowed(appt, simulatedMinutes)
                    : 0;
                  const delayMins =
                    isToday && appt.status === 'agendado'
                      ? Math.max(0, simulatedMinutes - parseTimeToMinutes(appt.startTime))
                      : 0;
                  const isOverdue =
                    isToday &&
                    appt.status === 'agendado' &&
                    isLateArrival(appt, simulatedMinutes);
                  const hairInfo =
                    appt.hairFormat && appt.hairLength
                      ? `${HAIR_FORMAT_LABELS[appt.hairFormat]} · ${HAIR_LENGTH_LABELS[appt.hairLength]}`
                      : null;

                  return (
                    <tr
                      key={appt.id}
                      className="hover:bg-[#FFFAF7]/80 transition-colors align-top"
                    >
                      <td className="py-3 px-2 2xl:px-3 whitespace-nowrap">
                        <p className="font-semibold text-[#2E2A2B] tabular-nums">
                          {appt.startTime}
                        </p>
                        <p className="text-xs text-[#6E6567] tabular-nums">
                          {appt.durationMinutes} min
                        </p>
                        {delayMins > 0 && appt.status === 'agendado' && (
                          <p
                            className={`text-[11px] font-medium mt-0.5 tabular-nums ${
                              delayMins > 15 ? 'text-[#9B2C2C]' : 'text-[#8D6114]'
                            }`}
                          >
                            +{delayMins} min atraso
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-2 2xl:px-3">
                        <p className="font-semibold text-[#2E2A2B]">
                          {appt.clientName}
                        </p>
                        <div className="mt-1">
                          <OriginBadge origin={appt.origin} />
                        </div>
                      </td>

                      <td className="py-3 px-2 2xl:px-3">
                        <p className="font-medium text-[#2E2A2B]">
                          {appt.serviceName}
                        </p>
                        {hairInfo && (
                          <p className="text-xs text-[#6E6567]">{hairInfo}</p>
                        )}
                      </td>

                      <td className="py-3 px-2 2xl:px-3 text-[#2E2A2B]">
                        {prof?.name ?? '—'}
                      </td>

                      <td className="py-3 px-2 2xl:px-3 whitespace-nowrap">
                        <p className="font-semibold tabular-nums text-[#2E2A2B]">
                          {formatCurrencyBRL(appt.price)}
                        </p>
                        <div className="mt-1">
                          <PaymentStatusLabel
                            status={appt.paymentStatus}
                            cardLast4={appt.cardLast4}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-2 2xl:px-3 whitespace-nowrap">
                        <AppointmentStatusLabel
                          status={appt.status}
                          isLate={isOverdue}
                        />
                      </td>

                      <td className="py-3 px-2 2xl:px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {appt.status === 'agendado' && (
                            <>
                              {isOverdue ? (
                                <button
                                  type="button"
                                  onClick={() => handleArrival(appt)}
                                  className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#8C5214] border border-[#F0D0A8] hover:bg-[#FDE6C4] transition-colors inline-flex items-center gap-1.5 leading-tight text-left whitespace-normal max-w-[155px] 2xl:max-w-none 2xl:whitespace-nowrap"
                                >
                                  <Hourglass className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  <span>Chegou atrasada – enviar à fila</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleArrival(appt)}
                                  className="rf-btn-primary px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Play className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  <span>Cliente chegou</span>
                                </button>
                              )}

                              <div className="relative" data-agenda-action-menu>
                                <button
                                  type="button"
                                  aria-label={`Mais ações para ${appt.clientName}`}
                                  aria-haspopup="menu"
                                  aria-expanded={openActionMenuId === appt.id}
                                  onClick={() =>
                                    setOpenActionMenuId((prev) =>
                                      prev === appt.id ? null : appt.id
                                    )
                                  }
                                  className="p-1.5 rounded-full border border-[#EADAD3] bg-white text-[#6E6567] hover:text-[#2E2A2B] hover:border-[#B76E79] transition-colors inline-flex items-center justify-center"
                                  title="Mais ações"
                                >
                                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                                </button>

                                {openActionMenuId === appt.id && (
                                  <div
                                    role="menu"
                                    aria-label={`Ações secundárias para ${appt.clientName}`}
                                    className={`absolute right-0 w-52 bg-white rounded-2xl border border-[#EADAD3] shadow-lg z-30 py-1.5 text-left ${
                                      apptIndex >= dayAppointments.length - 2
                                        ? 'bottom-full mb-1.5'
                                        : 'top-full mt-1.5'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={isToday && minsLeftForNoShow > 0}
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setNoShowTarget(appt);
                                      }}
                                      title={
                                        isToday && minsLeftForNoShow > 0
                                          ? `Disponível após tolerância de 15 min (faltam ${minsLeftForNoShow} min)`
                                          : 'Registrar falta (retém 50% e gera crédito)'
                                      }
                                      className="w-full px-3.5 py-2 text-xs font-medium text-[#2E2A2B] hover:bg-[#FFFAF7] flex items-center justify-between gap-2 disabled:opacity-45 disabled:cursor-not-allowed text-left"
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <UserX className="w-3.5 h-3.5 text-[#6E6567]" aria-hidden="true" />
                                        <span>Registrar falta</span>
                                      </span>
                                      {isToday && minsLeftForNoShow > 0 && (
                                        <span className="text-[11px] text-[#6E6567] tabular-nums">
                                          {minsLeftForNoShow}m
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        handleOpenCancel(appt);
                                      }}
                                      className="w-full px-3.5 py-2 text-xs font-medium text-[#9B2C2C] hover:bg-[#FDECEC]/60 flex items-center gap-2 text-left"
                                    >
                                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Cancelar</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {appt.status === 'em_atendimento' && (
                            <button
                              type="button"
                              onClick={() => completeAppointment(appt.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1F6138] text-white hover:bg-[#174D2C] transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Concluir</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Counter Check-in Payment Modal */}
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

      {/* Late Arrival Warning Modal */}
      <Modal
        open={Boolean(lateWarning)}
        onClose={() => setLateWarning(null)}
        title="Horário perdido por atraso"
        subtitle="Tolerância máxima de 15 minutos excedida"
        maxWidthClass="max-w-md"
      >
        {lateWarning && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFF4E5] border border-[#F0D0A8] text-sm text-[#8C5214]">
              <Hourglass className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {lateWarning.clientName} foi movida para a fila de espera
                </p>
                <p className="text-xs mt-1">
                  O valor já pago permanece reservado para o encaixe de hoje. Se
                  não houver encaixe até o encerramento, 50% será estornado no
                  cartão.
                </p>
              </div>
            </div>

            {lateWarning.match && lateWarning.freedSlot && (
              <div className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] space-y-2">
                <p className="text-xs font-semibold text-[#9A5560]">
                  Horário liberado · Sugestão de encaixe imediato
                </p>
                <p className="text-sm font-medium text-[#2E2A2B]">
                  {lateWarning.match.clientName} aguarda{' '}
                  {lateWarning.match.serviceName} ({lateWarning.match.durationMinutes} min)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const slot = lateWarning.freedSlot!;
                    const match = lateWarning.match!;
                    setLateWarning(null);
                    setWaitlistSuggestion({ freedSlot: slot, match });
                  }}
                  className="rf-btn-primary px-4 py-1.5 text-xs font-medium"
                >
                  Encaixar cliente da fila
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLateWarning(null)}
                className="rf-btn-secondary px-5 py-2 text-sm font-medium"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* No-Show Confirmation Modal */}
      <Modal
        open={Boolean(noShowTarget)}
        onClose={() => setNoShowTarget(null)}
        title="Confirmar falta da cliente"
        subtitle={
          noShowTarget
            ? `${noShowTarget.clientName} · ${noShowTarget.serviceName} às ${noShowTarget.startTime}`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        {noShowTarget && (() => {
          const fin = calculateNoShowFinancials(noShowTarget, simulatedDate);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FDECEC]/60 border border-[#F5C2C2] space-y-2 text-sm">
                <div className="flex items-center gap-2 font-semibold text-[#9B2C2C]">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Ação irreversível</span>
                </div>
                {noShowTarget.paymentStatus === 'pago' ? (
                  <ul className="text-xs text-[#2E2A2B] space-y-1 tabular-nums">
                    <li>
                      • Valor pago: <strong>{formatCurrencyBRL(noShowTarget.price)}</strong>
                    </li>
                    <li>
                      • Valor retido pela clínica (50%):{' '}
                      <strong>{formatCurrencyBRL(fin.retainedAmount)}</strong>
                    </li>
                    <li>
                      • Crédito gerado para a cliente (50%):{' '}
                      <strong>{formatCurrencyBRL(fin.creditAmount)}</strong> (válido
                      por 7 dias até {formatDateBR(fin.expiresAt)})
                    </li>
                  </ul>
                ) : (
                  <p className="text-xs text-[#2E2A2B]">
                    Reserva de balcão com pagamento pendente: o horário será
                    liberado imediatamente para encaixe sem cobrança.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNoShowTarget(null)}
                  className="rf-btn-outline px-4 py-2 text-sm font-medium"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNoShow}
                  className="px-5 py-2 rounded-full text-sm font-medium bg-[#9B2C2C] text-white hover:bg-[#7D2222]"
                >
                  Confirmar falta e liberar horário
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Cancel by Clinic Modal */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancelar atendimento pela clínica"
        subtitle={
          cancelTarget
            ? `${cancelTarget.clientName} · ${cancelTarget.serviceName} (${formatCurrencyBRL(cancelTarget.price)})`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCancelMode('reembolsar')}
                className={`p-3 rounded-2xl border text-left transition-colors ${
                  cancelMode === 'reembolsar'
                    ? 'border-[#B76E79] bg-[#F3E3DC]/50'
                    : 'border-[#EADAD3] bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-[#2E2A2B]">
                  Reembolso integral
                </p>
                <p className="text-xs text-[#6E6567] mt-0.5">
                  Estorna 100% no cartão e libera o horário
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCancelMode('remarcar')}
                className={`p-3 rounded-2xl border text-left transition-colors ${
                  cancelMode === 'remarcar'
                    ? 'border-[#B76E79] bg-[#F3E3DC]/50'
                    : 'border-[#EADAD3] bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-[#2E2A2B]">
                  Remarcar horário
                </p>
                <p className="text-xs text-[#6E6567] mt-0.5">
                  Transfere sem custo para nova data/horário
                </p>
              </button>
            </div>

            {cancelMode === 'remarcar' && (
              <div className="space-y-3 p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="resched-date"
                      className="block text-xs font-medium text-[#2E2A2B] mb-1"
                    >
                      Nova data
                    </label>
                    <BrazilianDateInput
                      id="resched-date"
                      min={simulatedDate}
                      value={rescheduleDate}
                      fullWidth
                      onChange={(iso) => {
                        setRescheduleDate(iso);
                        setRescheduleTime('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="resched-prof"
                      className="block text-xs font-medium text-[#2E2A2B] mb-1"
                    >
                      Profissional
                    </label>
                    <select
                      id="resched-prof"
                      value={rescheduleProfId}
                      onChange={(e) => {
                        setRescheduleProfId(e.target.value);
                        setRescheduleTime('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                    >
                      {state.professionals
                        .filter(
                          (p) => p.active && p.specialtyId === cancelTarget.specialtyId
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#2E2A2B] mb-1.5">
                    Horários livres ({cancelTarget.durationMinutes} min)
                  </p>
                  {rescheduleSlots.length === 0 ? (
                    <p className="text-xs text-[#9B2C2C]">
                      Nenhum horário disponível nesta data para este profissional.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleTime(slot)}
                          className={`px-3 py-1 rounded-full text-xs font-medium tabular-nums border ${
                            rescheduleTime === slot
                              ? 'bg-[#B76E79] text-white border-[#B76E79]'
                              : 'bg-white text-[#2E2A2B] border-[#D9C3B9]'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelMode === 'remarcar' && !rescheduleTime}
                onClick={handleConfirmCancel}
                className="rf-btn-primary px-5 py-2 text-sm font-medium"
              >
                {cancelMode === 'remarcar'
                  ? 'Confirmar remarcação'
                  : 'Cancelar e reembolsar 100%'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Suggestion to fit from Waitlist after No-Show or Cancellation */}
      <Modal
        open={Boolean(waitlistSuggestion)}
        onClose={() => setWaitlistSuggestion(null)}
        title="Horário liberado para encaixe"
        subtitle="Primeira cliente compatível da fila de espera"
        maxWidthClass="max-w-md"
      >
        {waitlistSuggestion && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] space-y-1.5">
              <p className="text-xs font-semibold text-[#9A5560] tabular-nums">
                <Clock className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                Horário disponível: {waitlistSuggestion.freedSlot.startTime} (
                {waitlistSuggestion.freedSlot.durationMinutes} min)
              </p>
              <p className="text-base font-semibold text-[#2E2A2B]">
                {waitlistSuggestion.match.clientName}
              </p>
              <p className="text-xs text-[#6E6567]">
                {waitlistSuggestion.match.serviceName} ({waitlistSuggestion.match.durationMinutes}{' '}
                min) ·{' '}
                {waitlistSuggestion.match.type === 'atrasada_paga'
                  ? 'Atrasada – já pagou'
                  : 'Sem reserva'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWaitlistSuggestion(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={handleFitSuggested}
                className="rf-btn-primary px-5 py-2 text-sm font-medium"
              >
                Encaixar agora
              </button>
            </div>
          </div>
        )}
      </Modal>

      {fitPaymentTarget && (
        <PaymentModal
          open={Boolean(fitPaymentTarget)}
          onClose={() => setFitPaymentTarget(null)}
          clientName={fitPaymentTarget.entry.clientName}
          serviceName={fitPaymentTarget.entry.serviceName}
          amount={fitPaymentTarget.entry.price}
          availableCredit={getClientAvailableCredit(
            state.clients.find((c) => c.id === fitPaymentTarget.entry.clientId),
            simulatedDate
          )}
          onConfirm={(pay) => {
            fitWaitlistIntoSlot(
              fitPaymentTarget.entry.id,
              fitPaymentTarget.slot,
              pay
            );
            setFitPaymentTarget(null);
          }}
        />
      )}
    </div>
  );
};

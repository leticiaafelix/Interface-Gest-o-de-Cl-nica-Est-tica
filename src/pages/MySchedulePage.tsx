import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import {
  formatDateBR,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
} from '../utils/formatters';
import {
  formatLastAppointmentSummary,
  getArrivalBadgeAndCountdown,
  getProfessionalLiveStatus,
  getProfessionalScheduleBuckets,
} from '../utils/scheduling';
import { Appointment } from '../types/clinic';
import { EmptyState } from '../components/SkeletonBlock';

type ScheduleTab = 'a_atender' | 'concluidos';

type RowBadge = 'Agora' | 'Aguardando' | 'Atrasada';

const ROW_BADGE_CONFIG: Record<
  RowBadge,
  {
    bg: string;
    text: string;
    border: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  Agora: {
    bg: '#B76E79',
    text: '#FFFFFF',
    border: '#B76E79',
    Icon: PlayCircle,
  },
  Aguardando: {
    bg: '#F3E3DC',
    text: '#9A5560',
    border: '#E3C5BA',
    Icon: Clock,
  },
  Atrasada: {
    bg: '#FDECEC',
    text: '#9B2C2C',
    border: '#F5C2C2',
    Icon: AlertTriangle,
  },
};

function StatusBadgePill({ badge }: { badge: RowBadge }) {
  const cfg = ROW_BADGE_CONFIG[badge];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{badge}</span>
    </span>
  );
}

function formatHairDetails(appt: Appointment): string | null {
  if (appt.hairFormat && appt.hairLength) {
    return `Cabelo ${HAIR_FORMAT_LABELS[appt.hairFormat]} · ${HAIR_LENGTH_LABELS[appt.hairLength]}`;
  }
  return null;
}

export const MySchedulePage: React.FC = () => {
  const {
    state,
    currentUser,
    simulatedDate,
    simulatedTime,
    simulatedMinutes,
    completeAppointment,
  } = useClinic();

  const [activeTab, setActiveTab] = useState<ScheduleTab>('a_atender');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const professionalId = currentUser?.professionalId || 'prof-ana';
  const prof = state.professionals.find((p) => p.id === professionalId);
  const spec = state.specialties.find((s) => s.id === prof?.specialtyId);

  const buckets = useMemo(() => {
    return getProfessionalScheduleBuckets({
      appointments: state.appointments,
      date: simulatedDate,
      professionalId,
      currentMinutes: simulatedMinutes,
    });
  }, [state.appointments, simulatedDate, professionalId, simulatedMinutes]);

  const liveStatus = useMemo(() => {
    if (!prof) return null;
    return getProfessionalLiveStatus({
      professional: prof,
      date: simulatedDate,
      currentMinutes: simulatedMinutes,
      appointments: state.appointments,
      availabilities: state.availabilities,
    });
  }, [prof, simulatedDate, simulatedMinutes, state.appointments, state.availabilities]);

  const progressPercent =
    buckets.totalCount > 0
      ? Math.round((buckets.completedCount / buckets.totalCount) * 100)
      : 0;

  const toggleExpandClient = (appointmentId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [appointmentId]: !prev[appointmentId],
    }));
  };

  return (
    <div className="space-y-5 max-w-4xl pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Minha Agenda — {prof?.name ?? currentUser?.name}
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5 tabular-nums">
            {spec?.name} · {formatDateBR(simulatedDate)} · Hora atual: {simulatedTime}
          </p>
        </div>

        {liveStatus && (
          <div
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap"
            style={
              liveStatus.state === 'OCUPADO'
                ? {
                    backgroundColor: '#FDF7EC',
                    color: '#8A5300',
                    borderColor: '#EBD3A8',
                  }
                : liveStatus.state === 'OCIOSO'
                ? {
                    backgroundColor: '#EAF6EE',
                    color: '#1F6138',
                    borderColor: '#BCE0C8',
                  }
                : {
                    backgroundColor: '#F4EFEC',
                    color: '#6E6567',
                    borderColor: '#DFD2CC',
                  }
            }
          >
            {liveStatus.state === 'OCUPADO' ? (
              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              Status:{' '}
              {liveStatus.state === 'OCUPADO'
                ? 'Ocupado'
                : liveStatus.state === 'OCIOSO'
                ? 'Ocioso'
                : 'Folga'}
            </span>
          </div>
        )}
      </div>

      {/* Thin Single-Line Strip */}
      <div
        role="region"
        aria-label="Resumo do atendimento"
        className={`rounded-2xl border px-4 py-2.5 flex items-center gap-2.5 text-sm shadow-xs ${
          buckets.heroMode === 'attending_now'
            ? 'bg-[#F3E3DC]/45 border-[#B76E79]/45 text-[#2E2A2B]'
            : 'bg-white border-[#EADAD3] text-[#2E2A2B]'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            buckets.heroMode === 'attending_now'
              ? 'bg-[#B76E79]'
              : buckets.stripText
              ? 'bg-[#C9A46A]'
              : 'bg-[#1F6138]'
          }`}
          aria-hidden="true"
        />
        <p className="font-medium tabular-nums truncate">
          {buckets.stripText ??
            (buckets.totalCount > 0
              ? 'Todos os atendimentos de hoje foram concluídos.'
              : 'Nenhuma cliente aguardando atendimento hoje.')}
        </p>
      </div>

      {/* Progress counter + Tabs */}
      <section className="space-y-4">
        <div className="rf-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Separar atendimentos do dia"
            className="inline-flex p-1 rounded-full bg-[#F3E3DC]/60 border border-[#EADAD3] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'a_atender'}
              onClick={() => setActiveTab('a_atender')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                activeTab === 'a_atender'
                  ? 'bg-[#B76E79] text-white shadow-sm'
                  : 'text-[#6E6567] hover:text-[#2E2A2B]'
              }`}
            >
              A atender ({buckets.toAttend.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'concluidos'}
              onClick={() => setActiveTab('concluidos')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                activeTab === 'concluidos'
                  ? 'bg-[#B76E79] text-white shadow-sm'
                  : 'text-[#6E6567] hover:text-[#2E2A2B]'
              }`}
            >
              Concluídos hoje ({buckets.completedToday.length})
            </button>
          </div>

          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1 h-2 rounded-full bg-[#F3E3DC] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1F6138] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-[#2E2A2B] tabular-nums whitespace-nowrap">
              {buckets.completedCount} de {buckets.totalCount} concluídos
            </span>
          </div>
        </div>

        {/* Tab panels */}
        {activeTab === 'a_atender' ? (
          <div role="tabpanel" aria-label="A atender">
            {buckets.toAttend.length === 0 ? (
              <EmptyState
                title="Nenhum atendimento pendente"
                description={
                  buckets.totalCount > 0
                    ? 'Você concluiu todos os atendimentos de hoje.'
                    : 'Você ainda não possui atendimentos registrados para a data de hoje.'
                }
                icon={<CalendarCheck className="w-7 h-7" />}
              />
            ) : (
              <div className="space-y-3">
                {buckets.toAttend.map((appt) => {
                  const hairInfo = formatHairDetails(appt);
                  const isInProgress = appt.status === 'em_atendimento';
                  const rowBadge: RowBadge = isInProgress
                    ? 'Agora'
                    : getArrivalBadgeAndCountdown(appt, simulatedMinutes).badge ===
                      'Atrasada'
                    ? 'Atrasada'
                    : 'Aguardando';
                  const isExpanded = Boolean(expandedIds[appt.id]);
                  const lastSummary = formatLastAppointmentSummary({
                    appointments: state.appointments,
                    currentAppointment: appt,
                    professionalId,
                  });
                  const canComplete = isInProgress;

                  return (
                    <article
                      key={appt.id}
                      className={`rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isInProgress
                          ? 'bg-gradient-to-r from-[#F3E3DC]/25 to-white border-2 border-[#B76E79] shadow-sm'
                          : 'rf-card'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleExpandClient(appt.id)}
                          aria-expanded={isExpanded}
                          aria-label={`${appt.clientName} — ver último atendimento com você`}
                          className="w-full text-left space-y-1.5 rounded-xl p-1.5 -m-1.5 hover:bg-[#FFFAF7] transition-colors group"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold text-[#9A5560] tabular-nums">
                              <Clock
                                className="w-4 h-4 text-[#B76E79]"
                                aria-hidden="true"
                              />
                              {appt.startTime}
                            </span>
                            <StatusBadgePill badge={rowBadge} />
                          </div>

                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-[#2E2A2B] group-hover:text-[#9A5560] transition-colors">
                              {appt.clientName}
                            </p>
                            {isExpanded ? (
                              <ChevronUp
                                className="w-4 h-4 text-[#9A5560] shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronDown
                                className="w-4 h-4 text-[#6E6567] group-hover:text-[#9A5560] shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <p className="text-sm text-[#6E6567]">
                            {appt.serviceName}
                            {hairInfo ? ` · ${hairInfo}` : ''}
                          </p>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-2.5 border-t border-[#F1E6E0] flex items-start gap-2 text-xs sm:text-sm text-[#6E6567]">
                            <History
                              className="w-4 h-4 text-[#9A5560] shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span className="font-medium text-[#2E2A2B] tabular-nums">
                              {lastSummary.label}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!canComplete}
                        onClick={() => completeAppointment(appt.id)}
                        title={
                          canComplete
                            ? 'Marcar atendimento como concluído'
                            : 'Disponível após a recepção registrar a chegada da cliente'
                        }
                        className={`px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap self-start sm:self-center transition-colors ${
                          canComplete
                            ? 'bg-[#1F6138] text-white hover:bg-[#174D2C] shadow-sm'
                            : 'bg-[#ECE7E4] text-[#7D7577] border border-[#DDD5D0] cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                        <span>Concluído</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div role="tabpanel" aria-label="Concluídos hoje">
            {buckets.completedToday.length === 0 ? (
              <EmptyState
                title="Nenhum atendimento concluído hoje"
                description="Quando você finalizar um atendimento, ele aparecerá aqui com o horário de conclusão."
                icon={<CheckCircle2 className="w-7 h-7" />}
              />
            ) : (
              <div className="space-y-3">
                {buckets.completedToday.map((appt) => {
                  const hairInfo = formatHairDetails(appt);

                  return (
                    <article
                      key={appt.id}
                      className="rf-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold text-[#6E6567] tabular-nums">
                            <Clock
                              className="w-4 h-4 text-[#C9A46A]"
                              aria-hidden="true"
                            />
                            {appt.startTime}
                          </span>
                        </div>

                        <p className="text-base font-semibold text-[#2E2A2B]">
                          {appt.clientName}
                        </p>
                        <p className="text-sm text-[#6E6567]">
                          {appt.serviceName}
                          {hairInfo ? ` · ${hairInfo}` : ''}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF6EE] border border-[#BCE0C8] text-xs font-semibold text-[#1F6138] tabular-nums self-start sm:self-center whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          Concluído às {appt.finishedAt ?? appt.startTime}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

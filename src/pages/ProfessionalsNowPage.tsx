import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import {
  formatSpecialtyOccupancySummary,
  getClinicOccupancySummary,
  getProfessionalLiveStatus,
} from '../utils/scheduling';
import { SafeImage } from '../components/SafeImage';

export const ProfessionalsNowPage: React.FC = () => {
  const { state, simulatedDate, simulatedMinutes, simulatedTime } = useClinic();
  const [specFilter, setSpecFilter] = useState('todas');

  const activePros = useMemo(
    () => state.professionals.filter((p) => p.active),
    [state.professionals]
  );

  const cards = useMemo(() => {
    return activePros
      .filter((p) => specFilter === 'todas' || p.specialtyId === specFilter)
      .map((prof) => {
        const spec = state.specialties.find((s) => s.id === prof.specialtyId);
        const live = getProfessionalLiveStatus({
          professional: prof,
          date: simulatedDate,
          currentMinutes: simulatedMinutes,
          appointments: state.appointments,
          availabilities: state.availabilities,
        });
        return { prof, spec, live };
      });
  }, [
    activePros,
    specFilter,
    state.specialties,
    simulatedDate,
    simulatedMinutes,
    state.appointments,
    state.availabilities,
  ]);

  const specialtySummaries = useMemo(() => {
    return state.specialties
      .filter((s) => specFilter === 'todas' || s.id === specFilter)
      .map((spec) => {
        const list = activePros
          .filter((p) => p.specialtyId === spec.id)
          .map((prof) =>
            getProfessionalLiveStatus({
              professional: prof,
              date: simulatedDate,
              currentMinutes: simulatedMinutes,
              appointments: state.appointments,
              availabilities: state.availabilities,
            })
          );
        const busy = list.filter((l) => l.state === 'OCUPADO').length;
        const idle = list.filter((l) => l.state === 'OCIOSO').length;
        return {
          id: spec.id,
          name: spec.name,
          busy,
          idle,
        };
      });
  }, [
    state.specialties,
    specFilter,
    activePros,
    simulatedDate,
    simulatedMinutes,
    state.appointments,
    state.availabilities,
  ]);

  const totalSummary = useMemo(() => {
    return getClinicOccupancySummary({
      professionals: state.professionals,
      appointments: state.appointments,
      availabilities: state.availabilities,
      date: simulatedDate,
      currentMinutes: simulatedMinutes,
      specialtyId: specFilter,
    });
  }, [
    state.professionals,
    state.appointments,
    state.availabilities,
    simulatedDate,
    simulatedMinutes,
    specFilter,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Profissionais Agora
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5 tabular-nums">
            Situação da equipe às {simulatedTime} · Baseada apenas em check-ins e conclusões
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="prof-now-filter" className="text-xs font-medium text-[#6E6567]">
            Especialidade:
          </label>
          <select
            id="prof-now-filter"
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="text-sm px-3.5 py-2 rounded-full border border-[#D9C3B9] bg-white"
          >
            <option value="todas">Todas as especialidades</option>
            {state.specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="rf-card p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {specialtySummaries.map((sum) => (
            <div key={sum.id} className="flex items-center gap-2">
              <span className="font-semibold text-[#2E2A2B]">{sum.name}:</span>
              <span className="text-[#6E6567] tabular-nums">
                {formatSpecialtyOccupancySummary(sum.busy, sum.idle)}
              </span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFAF7] border border-[#EADAD3] text-xs font-semibold text-[#2E2A2B] tabular-nums whitespace-nowrap">
          <span>
            Ocupados: {totalSummary.busyCount} · Ociosos: {totalSummary.idleCount} · Ocupação: {totalSummary.occupancyPct}%
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(({ prof, spec, live }) => {
          const isBusy = live.state === 'OCUPADO';
          const isOff = live.state === 'FOLGA';

          return (
            <article key={prof.id} className="rf-card p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start gap-4">
                <SafeImage
                  src={prof.photoUrl}
                  alt={`Foto de ${prof.name}, ${spec?.name ?? 'profissional'}`}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#EADAD3] shrink-0"
                  fallbackLabel={prof.name}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-[#2E2A2B] truncate">
                      {prof.name}
                    </h2>
                    {live.isPlantonista && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF6E6] text-[#8D6114] border border-[#ECD39B]">
                        <Award className="w-3 h-3" aria-hidden="true" />
                        Plantonista
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6E6567] mt-0.5">
                    {spec?.name} · {live.shiftLabel}
                  </p>

                  <div className="mt-2.5">
                    {isBusy ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF6E6] text-[#8D6114] border border-[#ECD39B]">
                        <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        OCUPADO
                      </span>
                    ) : isOff ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F2EFEF] text-[#5A5254] border border-[#DDD5D6]">
                        FOLGA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F4EC] text-[#1F6138] border border-[#BCE0C8]">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        OCIOSO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFFAF7] border border-[#F1E6E0] text-xs space-y-1">
                {isBusy && live.currentAppointment ? (
                  <>
                    <p className="font-semibold text-[#2E2A2B]">
                      Atendendo: {live.currentAppointment.clientName}
                    </p>
                    <p className="text-[#6E6567]">
                      {live.currentAppointment.serviceName} · Término previsto:{' '}
                      <strong className="text-[#9A5560] tabular-nums">
                        {live.currentEndsAt}
                      </strong>
                    </p>
                  </>
                ) : isOff ? (
                  <p className="text-[#6E6567]">
                    Profissional de folga na data de hoje.
                  </p>
                ) : live.nextAppointment ? (
                  <p className="text-[#2E2A2B]">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-[#B76E79]" aria-hidden="true" />
                    Próximo atendimento às{' '}
                    <strong className="tabular-nums">{live.nextAppointment.startTime}</strong>{' '}
                    ({live.nextAppointment.clientName} · {live.nextAppointment.serviceName})
                  </p>
                ) : (
                  <p className="text-[#6E6567]">
                    Livre para novos atendimentos até o fim do expediente.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

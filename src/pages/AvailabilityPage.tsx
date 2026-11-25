import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, Calendar, CheckCircle2, Save } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { Appointment, DayAvailability } from '../types/clinic';
import { addDaysIso, formatDateBR } from '../utils/formatters';
import { validateDayAvailability } from '../utils/scheduling';
import { Modal } from '../components/Modal';
import { BrazilianDateInput, BrazilianTimeInput } from '../components/DateTimeInputs';

export const AvailabilityPage: React.FC = () => {
  const { state, simulatedDate, saveDayAvailability, pushToast } = useClinic();
  const [selectedDate, setSelectedDate] = useState(simulatedDate);
  const [draft, setDraft] = useState<DayAvailability[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [affectedConfirm, setAffectedConfirm] = useState<Appointment[] | null>(null);

  const activePros = useMemo(
    () => state.professionals.filter((p) => p.active),
    [state.professionals]
  );

  useEffect(() => {
    const entries: DayAvailability[] = activePros.map((prof) => {
      const existing = state.availabilities.find(
        (a) => a.date === selectedDate && a.professionalId === prof.id
      );
      return (
        existing ?? {
          date: selectedDate,
          professionalId: prof.id,
          isOff: false,
          startTime: '09:00',
          endTime: '18:00',
          isPlantonista: false,
        }
      );
    });
    setDraft(entries);
    setValidationError(null);
  }, [selectedDate, state.availabilities, activePros]);

  const updateEntry = (profId: string, patch: Partial<DayAvailability>) => {
    setDraft((prev) =>
      prev.map((e) => {
        if (e.professionalId !== profId) return e;
        const next = { ...e, ...patch };
        if (next.isOff) next.isPlantonista = false;
        return next;
      })
    );
  };

  const setPlantonistaForSpecialty = (specId: string, profId: string) => {
    const specProfIds = activePros
      .filter((p) => p.specialtyId === specId)
      .map((p) => p.id);

    setDraft((prev) =>
      prev.map((e) => {
        if (!specProfIds.includes(e.professionalId)) return e;
        if (e.professionalId === profId) {
          return { ...e, isOff: false, isPlantonista: true };
        }
        return { ...e, isPlantonista: false };
      })
    );
  };

  const handleSave = () => {
    setValidationError(null);
    const check = validateDayAvailability({
      date: selectedDate,
      draftEntries: draft,
      professionals: state.professionals,
      specialties: state.specialties,
      appointments: state.appointments,
    });

    if (!check.valid) {
      const msg = `Defina 1 plantonista em aberto para: ${check.missingPlantonistaSpecialties.join(', ')}.`;
      setValidationError(msg);
      pushToast({
        type: 'error',
        title: 'Plantonista obrigatório',
        description: msg,
      });
      return;
    }

    if (check.affectedAppointments.length > 0) {
      setAffectedConfirm(check.affectedAppointments);
      return;
    }

    saveDayAvailability(selectedDate, draft);
  };

  // Next 7 quick day pills
  const quickDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDaysIso(simulatedDate, i));
  }, [simulatedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Disponibilidade &amp; Plantonistas
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Defina horários por data e selecione exatamente 1 plantonista por especialidade
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BrazilianDateInput
            aria-label="Selecionar data da disponibilidade"
            value={selectedDate}
            alignRight
            onChange={(iso) => setSelectedDate(iso)}
            className="px-3.5 py-2 rounded-full border border-[#D9C3B9] bg-white text-sm tabular-nums"
          />
          <button
            type="button"
            onClick={handleSave}
            className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Salvar escala</span>
          </button>
        </div>
      </div>

      {/* Quick date selector */}
      <div className="flex flex-wrap items-center gap-2">
        {quickDays.map((d) => {
          const active = d === selectedDate;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium tabular-nums border transition-colors ${
                active
                  ? 'bg-[#B76E79] text-white border-[#B76E79]'
                  : 'bg-white text-[#2E2A2B] border-[#EADAD3] hover:border-[#B76E79]'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-1" aria-hidden="true" />
              {d === simulatedDate ? `Hoje (${formatDateBR(d).slice(0, 5)})` : formatDateBR(d)}
            </button>
          );
        })}
      </div>

      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 rounded-2xl bg-[#FDECEC] border border-[#F5C2C2] text-sm text-[#9B2C2C]"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Specialty Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.specialties.map((spec) => {
          const specProfs = activePros.filter((p) => p.specialtyId === spec.id);
          if (specProfs.length === 0) return null;

          const hasPlantonista = draft.some(
            (e) =>
              specProfs.some((p) => p.id === e.professionalId) &&
              !e.isOff &&
              e.isPlantonista
          );

          return (
            <section key={spec.id} className="rf-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1E6E0] pb-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                    {spec.name}
                  </h2>
                  <p className="text-xs text-[#6E6567]">
                    {specProfs.length} profissional(is) ativo(s)
                  </p>
                </div>
                {hasPlantonista ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1F6138]">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Plantonista definido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B2C2C]">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    Falta plantonista
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {specProfs.map((prof) => {
                  const entry = draft.find((d) => d.professionalId === prof.id);
                  if (!entry) return null;
                  return (
                    <div
                      key={prof.id}
                      className={`p-3.5 rounded-2xl border space-y-3 ${
                        entry.isOff
                          ? 'bg-[#F8F5F3] border-[#E4DDD9]'
                          : 'bg-[#FFFAF7] border-[#EADAD3]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#2E2A2B]">
                          {prof.name}
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6567] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={entry.isOff}
                              onChange={(e) =>
                                updateEntry(prof.id, { isOff: e.target.checked })
                              }
                              className="w-4 h-4 accent-[#B76E79]"
                            />
                            <span>Folga</span>
                          </label>

                          <button
                            type="button"
                            disabled={entry.isOff}
                            onClick={() =>
                              setPlantonistaForSpecialty(spec.id, prof.id)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 transition-colors disabled:opacity-40 ${
                              entry.isPlantonista
                                ? 'bg-[#FEF6E6] text-[#8D6114] border-[#C9A46A]'
                                : 'bg-white text-[#6E6567] border-[#D9C3B9]'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {entry.isPlantonista
                                ? 'Plantonista'
                                : 'Definir plantonista'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {!entry.isOff && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor={`start-${prof.id}`}
                              className="block text-[11px] text-[#6E6567] mb-1"
                            >
                              Início do expediente
                            </label>
                            <BrazilianTimeInput
                              id={`start-${prof.id}`}
                              value={entry.startTime}
                              fullWidth
                              onChange={(hhmm) =>
                                updateEntry(prof.id, { startTime: hhmm })
                              }
                              className="w-full px-3 py-1.5 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`end-${prof.id}`}
                              className="block text-[11px] text-[#6E6567] mb-1"
                            >
                              Fim do expediente
                            </label>
                            <BrazilianTimeInput
                              id={`end-${prof.id}`}
                              value={entry.endTime}
                              fullWidth
                              onChange={(hhmm) =>
                                updateEntry(prof.id, { endTime: hhmm })
                              }
                              className="w-full px-3 py-1.5 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Warning modal when availability affects existing appointments */}
      <Modal
        open={Boolean(affectedConfirm)}
        onClose={() => setAffectedConfirm(null)}
        title="Alteração afeta reservas existentes"
        subtitle={`Existem ${affectedConfirm?.length ?? 0} reserva(s) fora da nova escala em ${formatDateBR(selectedDate)}`}
        maxWidthClass="max-w-md"
      >
        {affectedConfirm && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FFF4E5] border border-[#F0D0A8] text-xs text-[#8C5214] space-y-2">
              <p className="font-semibold">
                Os seguintes atendimentos ficarão fora do horário configurado:
              </p>
              <ul className="space-y-1">
                {affectedConfirm.map((a) => {
                  const prof = state.professionals.find(
                    (p) => p.id === a.professionalId
                  );
                  return (
                    <li key={a.id} className="tabular-nums">
                      • {a.startTime} — {a.clientName} ({a.serviceName} com{' '}
                      {prof?.name})
                    </li>
                  );
                })}
              </ul>
              <p className="pt-1">
                Após salvar, acesse a Agenda do Dia para remarcar ou cancelar
                pela clínica com reembolso integral.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAffectedConfirm(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Revisar horários
              </button>
              <button
                type="button"
                onClick={() => {
                  saveDayAvailability(selectedDate, draft);
                  setAffectedConfirm(null);
                }}
                className="rf-btn-primary px-5 py-2 text-sm font-medium"
              >
                Salvar mesmo assim
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

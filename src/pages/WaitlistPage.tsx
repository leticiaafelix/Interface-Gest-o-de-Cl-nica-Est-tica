import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Hourglass,
  Plus,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import {
  FreedSlot,
  HairFormat,
  HairLength,
  WaitlistEntry,
} from '../types/clinic';
import {
  formatCurrencyBRL,
  formatDateBR,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
  maskPhone,
} from '../utils/formatters';
import {
  findCompatibleWaitlistMatches,
  getAvailableSlots,
  getClientAvailableCredit,
  getServicePriceAndDuration,
} from '../utils/scheduling';
import { Modal } from '../components/Modal';
import { PaymentModal } from '../components/PaymentModal';
import { EmptyState } from '../components/SkeletonBlock';

export const WaitlistPage: React.FC = () => {
  const {
    state,
    simulatedDate,
    simulatedMinutes,
    addToWaitlist,
    removeFromWaitlist,
    fitWaitlistIntoSlot,
    closeDayWaitlist,
  } = useClinic();

  const [addOpen, setAddOpen] = useState(false);
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WaitlistEntry | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [fitPayment, setFitPayment] = useState<{
    entry: WaitlistEntry;
    slot: FreedSlot;
  } | null>(null);

  // Add form state
  const [clientId, setClientId] = useState('');
  const [walkName, setWalkName] = useState('');
  const [walkPhone, setWalkPhone] = useState('');
  const [serviceId, setServiceId] = useState(state.services[0]?.id ?? '');
  const [hairFormat, setHairFormat] = useState<HairFormat>('ondulado');
  const [hairLength, setHairLength] = useState<HairLength>('medio');

  const waitingToday = useMemo(
    () =>
      state.waitlist
        .filter((w) => w.date === simulatedDate && w.status === 'aguardando')
        .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt)),
    [state.waitlist, simulatedDate]
  );

  // Determine next freed / available slot for each specialty right now
  const openSlotsToday = useMemo(() => {
    const slots: FreedSlot[] = [];
    state.professionals
      .filter((p) => p.active)
      .forEach((prof) => {
        const free60 = getAvailableSlots({
          date: simulatedDate,
          professionalId: prof.id,
          durationMinutes: 60,
          availabilities: state.availabilities,
          appointments: state.appointments,
          minStartMinutes: simulatedMinutes - 15,
        });
        const free30 = getAvailableSlots({
          date: simulatedDate,
          professionalId: prof.id,
          durationMinutes: 30,
          availabilities: state.availabilities,
          appointments: state.appointments,
          minStartMinutes: simulatedMinutes - 15,
        });
        if (free60.length > 0) {
          slots.push({
            date: simulatedDate,
            startTime: free60[0],
            durationMinutes: 60,
            professionalId: prof.id,
            specialtyId: prof.specialtyId,
          });
        } else if (free30.length > 0) {
          slots.push({
            date: simulatedDate,
            startTime: free30[0],
            durationMinutes: 30,
            professionalId: prof.id,
            specialtyId: prof.specialtyId,
          });
        }
      });
    return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [
    state.professionals,
    state.availabilities,
    state.appointments,
    simulatedDate,
    simulatedMinutes,
  ]);

  // First compatible suggestion across open slots (excluding skipped)
  const suggestedFit = useMemo(() => {
    for (const slot of openSlotsToday) {
      const matches = findCompatibleWaitlistMatches(slot, waitingToday).filter(
        (m) => !skippedIds.includes(m.id)
      );
      if (matches.length > 0) {
        return { slot, match: matches[0] };
      }
    }
    return null;
  }, [openSlotsToday, waitingToday, skippedIds]);

  const latePaidCount = waitingToday.filter((w) => w.type === 'atrasada_paga').length;
  const latePaidRefundTotal = waitingToday
    .filter((w) => w.type === 'atrasada_paga')
    .reduce((acc, w) => acc + w.price * 0.5, 0);

  const selectedService = state.services.find((s) => s.id === serviceId);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    const cli = state.clients.find((c) => c.id === clientId);
    const name = cli?.name || walkName.trim();
    if (!name) return;
    const pricing = getServicePriceAndDuration(
      selectedService,
      hairFormat,
      hairLength
    );
    addToWaitlist({
      clientId: cli?.id,
      clientName: name,
      clientPhone: cli?.phone || walkPhone.trim() || undefined,
      serviceId: selectedService.id,
      hairFormat: selectedService.variesByHair ? hairFormat : undefined,
      hairLength: selectedService.variesByHair ? hairLength : undefined,
      price: pricing.price,
      durationMinutes: pricing.durationMinutes,
      type: 'sem_reserva',
    });
    setAddOpen(false);
    setClientId('');
    setWalkName('');
    setWalkPhone('');
  };

  const handleFitNow = (entry: WaitlistEntry, slot: FreedSlot) => {
    if (entry.type === 'atrasada_paga') {
      fitWaitlistIntoSlot(entry.id, slot);
    } else {
      setFitPayment({ entry, slot });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Fila de Espera
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            {formatDateBR(simulatedDate)} · Ordem de chegada · Encaixe apenas se o serviço couber no horário
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Adicionar à fila</span>
          </button>

          <button
            type="button"
            disabled={waitingToday.length === 0}
            onClick={() => setCloseDayOpen(true)}
            className="rf-btn-outline px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Encerrar fila do dia
          </button>
        </div>
      </div>

      {/* Horário liberado suggestion banner */}
      {suggestedFit && (() => {
        const prof = state.professionals.find(
          (p) => p.id === suggestedFit.slot.professionalId
        );
        return (
          <div className="rf-card p-5 bg-[#FEF6E6]/60 border-[#ECD39B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF6E6] border border-[#ECD39B] flex items-center justify-center text-[#8D6114] shrink-0">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8D6114]">
                  Horário liberado · {suggestedFit.slot.startTime} ({suggestedFit.slot.durationMinutes} min com {prof?.name})
                </p>
                <p className="text-base font-semibold text-[#2E2A2B] mt-0.5">
                  Sugestão: {suggestedFit.match.clientName} —{' '}
                  {suggestedFit.match.serviceName} ({suggestedFit.match.durationMinutes} min)
                </p>
                <p className="text-xs text-[#6E6567]">
                  {suggestedFit.match.type === 'atrasada_paga'
                    ? 'Atrasada – já pagou (usa o valor já pago)'
                    : 'Sem reserva (pagamento no cartão ao encaixar)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setSkippedIds((prev) => [...prev, suggestedFit.match.id])
                }
                className="rf-btn-outline px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pular</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFitNow(suggestedFit.match, suggestedFit.slot)
                }
                className="rf-btn-primary px-5 py-2 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Encaixar</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Waitlist Table */}
      {waitingToday.length === 0 ? (
        <EmptyState
          title="Fila de espera vazia"
          description="Nenhuma cliente aguardando encaixe no momento. Adicione clientes sem reserva ou encaminhe atrasadas pela Agenda."
          actionLabel="Adicionar à fila"
          onAction={() => setAddOpen(true)}
          icon={<Hourglass className="w-7 h-7" />}
        />
      ) : (
        <div className="rf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FFFAF7] border-b border-[#EADAD3] text-xs font-semibold text-[#6E6567]">
                  <th className="py-3.5 px-4">Posição</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Serviço</th>
                  <th className="py-3.5 px-4">Entrada</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1E6E0] text-sm">
                {waitingToday.map((entry, idx) => {
                  const hairInfo =
                    entry.hairFormat && entry.hairLength
                      ? ` (${HAIR_FORMAT_LABELS[entry.hairFormat]} · ${HAIR_LENGTH_LABELS[entry.hairLength]})`
                      : '';
                  const compatSlot = openSlotsToday.find(
                    (s) =>
                      s.specialtyId === entry.specialtyId &&
                      entry.durationMinutes <= s.durationMinutes
                  );
                  return (
                    <tr key={entry.id} className="hover:bg-[#FFFAF7]/80">
                      <td className="py-3.5 px-4 font-display font-bold text-[#9A5560] tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#2E2A2B]">
                          {entry.clientName}
                        </p>
                        {entry.clientPhone && (
                          <p className="text-xs text-[#6E6567] tabular-nums">
                            {entry.clientPhone}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#2E2A2B]">
                          {entry.serviceName}
                          {hairInfo}
                        </p>
                        <p className="text-xs text-[#6E6567] tabular-nums">
                          {entry.durationMinutes} min
                        </p>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-[#2E2A2B]">
                        {entry.enteredAt}
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.type === 'atrasada_paga' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF6E6] text-[#8D6114] border border-[#ECD39B]">
                            Atrasada – já pagou
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3E3DC] text-[#6D4349] border border-[#E4C8BC]">
                            Sem reserva
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                        {formatCurrencyBRL(entry.price)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        {compatSlot ? (
                          <button
                            type="button"
                            onClick={() => handleFitNow(entry, compatSlot)}
                            className="rf-btn-primary px-3.5 py-1.5 text-xs font-medium"
                          >
                            Encaixar {compatSlot.startTime} ·{' '}
                            {state.professionals
                              .find((p) => p.id === compatSlot.professionalId)
                              ?.name.split(' ')[0]}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Sem horário compatível no momento: nenhum profissional dessa especialidade tem tempo livre suficiente."
                            aria-label={`Sem horário compatível no momento para ${entry.clientName}`}
                            className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#F1ECEA] text-[#9C9193] cursor-not-allowed"
                          >
                            Sem horário compatível
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(entry)}
                          aria-label={`Remover ${entry.clientName} da fila`}
                          className="px-3 py-1.5 rounded-full text-xs font-medium text-[#9B2C2C] hover:bg-[#FDECEC] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Remover</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add to waitlist modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Adicionar à fila de espera"
        subtitle="Clientes sem reserva entram por ordem de chegada"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label htmlFor="wl-client" className="block text-sm font-medium mb-1">
              Cliente cadastrada (opcional)
            </label>
            <select
              id="wl-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            >
              <option value="">Sem cadastro / digitar nome abaixo</option>
              {state.clients
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cpf})
                  </option>
                ))}
            </select>
          </div>

          {!clientId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wl-name" className="block text-sm font-medium mb-1">
                  Nome da cliente *
                </label>
                <input
                  id="wl-name"
                  type="text"
                  value={walkName}
                  onChange={(e) => setWalkName(e.target.value)}
                  required={!clientId}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                />
              </div>
              <div>
                <label htmlFor="wl-phone" className="block text-sm font-medium mb-1">
                  Telefone
                </label>
                <input
                  id="wl-phone"
                  type="text"
                  value={walkPhone}
                  onChange={(e) => setWalkPhone(maskPhone(e.target.value))}
                  placeholder="(21) 99999-9999"
                  className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="wl-service" className="block text-sm font-medium mb-1">
              Serviço desejado
            </label>
            <select
              id="wl-service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            >
              {state.services
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {selectedService?.variesByHair && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wl-fmt" className="block text-xs font-medium mb-1">
                  Formato do cabelo
                </label>
                <select
                  id="wl-fmt"
                  value={hairFormat}
                  onChange={(e) => setHairFormat(e.target.value as HairFormat)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                >
                  <option value="cacheado">Cacheado</option>
                  <option value="ondulado">Ondulado</option>
                  <option value="liso">Liso</option>
                </select>
              </div>
              <div>
                <label htmlFor="wl-len" className="block text-xs font-medium mb-1">
                  Tamanho
                </label>
                <select
                  id="wl-len"
                  value={hairLength}
                  onChange={(e) => setHairLength(e.target.value as HairLength)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                >
                  <option value="curto">Curto</option>
                  <option value="medio">Médio</option>
                  <option value="longo">Longo</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Adicionar à fila
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remover da fila de espera"
        maxWidthClass="max-w-sm"
      >
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#6E6567]">
              Deseja remover <strong className="text-[#2E2A2B]">{removeTarget.clientName}</strong>{' '}
              da fila de espera?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeFromWaitlist(removeTarget.id);
                  setRemoveTarget(null);
                }}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#9B2C2C] text-white hover:bg-[#7D2222]"
              >
                Confirmar remoção
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Close day waitlist confirmation */}
      <Modal
        open={closeDayOpen}
        onClose={() => setCloseDayOpen(false)}
        title="Encerrar fila do dia"
        subtitle="Estorno automático de 50% para clientes atrasadas não atendidas"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FFF4E5] border border-[#F0D0A8] text-sm text-[#8C5214] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Confirmação de encerramento</span>
            </div>
            <p className="text-xs">
              Clientes com reserva atrasada não atendidas hoje:{' '}
              <strong className="tabular-nums">{latePaidCount}</strong>.
            </p>
            <p className="text-xs tabular-nums">
              Total a estornar no cartão (50%):{' '}
              <strong>{formatCurrencyBRL(latePaidRefundTotal)}</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCloseDayOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                closeDayWaitlist();
                setCloseDayOpen(false);
              }}
              className="rf-btn-primary px-5 py-2 text-sm font-medium"
            >
              Encerrar e processar estornos
            </button>
          </div>
        </div>
      </Modal>

      {fitPayment && (
        <PaymentModal
          open={Boolean(fitPayment)}
          onClose={() => setFitPayment(null)}
          clientName={fitPayment.entry.clientName}
          serviceName={fitPayment.entry.serviceName}
          amount={fitPayment.entry.price}
          availableCredit={getClientAvailableCredit(
            state.clients.find((c) => c.id === fitPayment.entry.clientId),
            simulatedDate
          )}
          onConfirm={(pay) => {
            fitWaitlistIntoSlot(fitPayment.entry.id, fitPayment.slot, pay);
            setFitPayment(null);
          }}
        />
      )}
    </div>
  );
};

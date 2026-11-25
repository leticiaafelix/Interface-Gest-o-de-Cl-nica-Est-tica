import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Search,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { ASSETS } from '../data/assets';
import { HairFormat, HairLength } from '../types/clinic';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatDurationLabel,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
  maskCPF,
  maskPhone,
  onlyDigits,
  validateCPF,
} from '../utils/formatters';
import {
  getAvailableSlots,
  getPlantonistaForDay,
  getServicePriceAndDuration,
} from '../utils/scheduling';
import { SafeImage } from '../components/SafeImage';

export const CounterBookingPage: React.FC = () => {
  const {
    state,
    simulatedDate,
    simulatedTime,
    simulatedMinutes,
    createCounterBooking,
    addToWaitlist,
    upsertClient,
    pushToast,
  } = useClinic();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Preserved wizard state
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    state.services.find((s) => s.active)?.id ?? ''
  );
  const [hairFormat, setHairFormat] = useState<HairFormat>('ondulado');
  const [hairLength, setHairLength] = useState<HairLength>('medio');

  const [selectedDate, setSelectedDate] = useState<string>(simulatedDate);
  const [usePlantonista, setUsePlantonista] = useState<boolean>(true);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Client selection / quick registration
  const [cpfSearch, setCpfSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [walkInOnly, setWalkInOnly] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Quick new client inline form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newCliName, setNewCliName] = useState('');
  const [newCliCpf, setNewCliCpf] = useState('');
  const [newCliPhone, setNewCliPhone] = useState('');
  const [newCliEmail, setNewCliEmail] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  // Waitlist fallback quick name
  const [waitlistWalkInName, setWaitlistWalkInName] = useState('');

  const activeServices = useMemo(
    () => state.services.filter((s) => s.active),
    [state.services]
  );

  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId),
    [activeServices, selectedServiceId]
  );

  const pricing = useMemo(() => {
    if (!selectedService) return { price: 0, durationMinutes: 30 };
    return getServicePriceAndDuration(selectedService, hairFormat, hairLength);
  }, [selectedService, hairFormat, hairLength]);

  const specialtyProfs = useMemo(() => {
    if (!selectedService) return [];
    return state.professionals.filter(
      (p) => p.active && p.specialtyId === selectedService.specialtyId
    );
  }, [state.professionals, selectedService]);

  const plantonistaForDate = useMemo(() => {
    if (!selectedService) return undefined;
    return getPlantonistaForDay(
      selectedDate,
      selectedService.specialtyId,
      state.professionals,
      state.availabilities
    );
  }, [selectedService, selectedDate, state.professionals, state.availabilities]);

  const effectiveProfId = useMemo(() => {
    if (usePlantonista) return plantonistaForDate?.id ?? '';
    return selectedProfId || specialtyProfs[0]?.id || '';
  }, [usePlantonista, plantonistaForDate, selectedProfId, specialtyProfs]);

  const effectiveProf = useMemo(
    () => state.professionals.find((p) => p.id === effectiveProfId),
    [state.professionals, effectiveProfId]
  );

  const freeSlots = useMemo(() => {
    if (!effectiveProfId || !selectedService) return [];
    return getAvailableSlots({
      date: selectedDate,
      professionalId: effectiveProfId,
      durationMinutes: pricing.durationMinutes,
      availabilities: state.availabilities,
      appointments: state.appointments,
      minStartMinutes: selectedDate === simulatedDate ? simulatedMinutes : 0,
    });
  }, [
    effectiveProfId,
    selectedService,
    selectedDate,
    pricing.durationMinutes,
    state.availabilities,
    state.appointments,
    simulatedDate,
    simulatedMinutes,
  ]);

  const isTodayPlantonista =
    selectedDate === simulatedDate &&
    usePlantonista &&
    Boolean(plantonistaForDate);

  const matchingClients = useMemo(() => {
    const q = cpfSearch.trim().toLowerCase();
    const digits = onlyDigits(q);
    if (!q) return state.clients.filter((c) => c.active).slice(0, 6);
    return state.clients.filter((c) => {
      if (!c.active) return false;
      const byName = c.name.toLowerCase().includes(q);
      const byCpf = digits.length >= 2 && onlyDigits(c.cpf).includes(digits);
      return byName || byCpf;
    });
  }, [cpfSearch, state.clients]);

  const selectedClient = useMemo(
    () => state.clients.find((c) => c.id === selectedClientId),
    [state.clients, selectedClientId]
  );

  const handleSaveInlineClient = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    if (newCliName.trim().length < 3) {
      setClientError('Informe o nome completo da cliente (mínimo 3 letras).');
      return;
    }
    if (!validateCPF(newCliCpf)) {
      setClientError('CPF inválido. Verifique os 11 dígitos e tente novamente.');
      return;
    }
    if (onlyDigits(newCliPhone).length < 10) {
      setClientError('Informe um telefone válido com DDD.');
      return;
    }

    const res = upsertClient({
      name: newCliName.trim(),
      cpf: maskCPF(newCliCpf),
      phone: maskPhone(newCliPhone),
      email: newCliEmail.trim() || 'sem-email@rebeccafelix.com',
      active: true,
    });

    if (res.isDuplicateCpf) {
      setSelectedClientId(res.client.id);
      setShowNewClientForm(false);
      setWalkInOnly(false);
      pushToast({
        type: 'info',
        title: 'CPF já cadastrado',
        description: `Selecionamos o cadastro existente de ${res.client.name}.`,
      });
      return;
    }

    setSelectedClientId(res.client.id);
    setShowNewClientForm(false);
    setWalkInOnly(false);
  };

  const handleAddToWaitlist = () => {
    if (!selectedService) return;
    const name =
      selectedClient?.name ||
      waitlistWalkInName.trim() ||
      walkInName.trim() ||
      'Cliente sem reserva';
    addToWaitlist({
      clientId: selectedClient?.id,
      clientName: name,
      clientPhone: selectedClient?.phone || walkInPhone || undefined,
      serviceId: selectedService.id,
      hairFormat: selectedService.variesByHair ? hairFormat : undefined,
      hairLength: selectedService.variesByHair ? hairLength : undefined,
      price: pricing.price,
      durationMinutes: pricing.durationMinutes,
      type: 'sem_reserva',
    });
    navigate('/fila');
  };

  const handleConfirmBooking = () => {
    if (!selectedService || !effectiveProfId || !selectedTime) return;
    createCounterBooking({
      serviceId: selectedService.id,
      hairFormat: selectedService.variesByHair ? hairFormat : undefined,
      hairLength: selectedService.variesByHair ? hairLength : undefined,
      price: pricing.price,
      durationMinutes: pricing.durationMinutes,
      professionalId: effectiveProfId,
      date: selectedDate,
      startTime: selectedTime,
      clientId: walkInOnly ? undefined : selectedClient?.id,
      walkInName: walkInOnly ? walkInName.trim() || 'Cliente de Balcão' : undefined,
      walkInPhone: walkInOnly ? walkInPhone.trim() || undefined : undefined,
    });
    navigate('/agenda');
  };

  const canGoStep4 = walkInOnly
    ? isTodayPlantonista
    : Boolean(selectedClientId);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
          Agendar no Balcão
        </h1>
        <p className="text-sm text-[#6E6567] mt-0.5">
          Recepção presencial em etapas · Pagamento no cartão cobrado na chegada
        </p>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Etapas do agendamento" className="rf-card p-3 sm:p-4">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { num: 1, label: '1. Serviço' },
            { num: 2, label: '2. Profissional e Horário' },
            { num: 3, label: '3. Cliente' },
            { num: 4, label: '4. Confirmação' },
          ].map((item) => {
            const active = step === item.num;
            const done = step > item.num;
            return (
              <li key={item.num}>
                <button
                  type="button"
                  disabled={item.num > step}
                  onClick={() => item.num < step && setStep(item.num as 1 | 2 | 3 | 4)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-[#B76E79] text-white'
                      : done
                      ? 'bg-[#E8F4EC] text-[#1F6138]'
                      : 'bg-[#FFFAF7] text-[#6E6567]'
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* STEP 1: Service + Hair photo cards */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rf-card p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#2E2A2B]">
                Escolha o serviço
              </h2>
              <p className="text-xs text-[#6E6567] mt-0.5">
                Valores e durações fixos conforme tabela da gerência
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeServices.map((svc) => {
                const selected = svc.id === selectedServiceId;
                const spec = state.specialties.find((s) => s.id === svc.specialtyId);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(svc.id);
                      setSelectedTime('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      selected
                        ? 'border-[#B76E79] bg-[#F3E3DC]/50 ring-2 ring-[#B76E79]/30'
                        : 'border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79]'
                    }`}
                  >
                    <SafeImage
                      src={svc.photoUrl}
                      alt={svc.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2E2A2B] truncate">
                        {svc.name}
                      </p>
                      <p className="text-xs text-[#6E6567]">{spec?.name}</p>
                      <p className="text-xs font-semibold text-[#9A5560] mt-1 tabular-nums">
                        {svc.variesByHair
                          ? 'Tabela por cabelo'
                          : `${formatCurrencyBRL(svc.fixedPrice)} · ${formatDurationLabel(svc.fixedDurationMinutes)}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hair Format & Length Photo Cards */}
            {selectedService?.variesByHair && (
              <div className="pt-4 border-t border-[#F1E6E0] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFAF7] p-4 rounded-2xl border border-[#EADAD3]">
                  <div>
                    <p className="text-xs text-[#6E6567]">
                      Preço e duração calculados para {selectedService.name}
                    </p>
                    <p className="text-sm font-semibold text-[#2E2A2B]">
                      {HAIR_FORMAT_LABELS[hairFormat]} · {HAIR_LENGTH_LABELS[hairLength]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-[#B76E79] tabular-nums">
                      {formatCurrencyBRL(pricing.price)}
                    </p>
                    <p className="text-xs text-[#6E6567] tabular-nums">
                      Duração: {formatDurationLabel(pricing.durationMinutes)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#2E2A2B] mb-2.5">
                    Formato do cabelo
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['cacheado', 'ondulado', 'liso'] as HairFormat[]).map((fmt) => {
                      const active = hairFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => {
                            setHairFormat(fmt);
                            setSelectedTime('');
                          }}
                          className={`rounded-2xl border overflow-hidden text-left transition-all ${
                            active
                              ? 'border-[#B76E79] ring-2 ring-[#B76E79]/30 bg-[#F3E3DC]/40'
                              : 'border-[#EADAD3] bg-white hover:border-[#B76E79]'
                          }`}
                        >
                          <SafeImage
                            src={ASSETS.hairFormats[fmt]}
                            alt={`Cabelo ${HAIR_FORMAT_LABELS[fmt]}`}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#2E2A2B]">
                              {HAIR_FORMAT_LABELS[fmt]}
                            </span>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-[#B76E79]" aria-hidden="true" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#2E2A2B] mb-2.5">
                    Tamanho do cabelo
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['curto', 'medio', 'longo'] as HairLength[]).map((len) => {
                      const active = hairLength === len;
                      const cell = selectedService.hairMatrix?.[hairFormat]?.[len];
                      return (
                        <button
                          key={len}
                          type="button"
                          onClick={() => {
                            setHairLength(len);
                            setSelectedTime('');
                          }}
                          className={`rounded-2xl border overflow-hidden text-left transition-all ${
                            active
                              ? 'border-[#B76E79] ring-2 ring-[#B76E79]/30 bg-[#F3E3DC]/40'
                              : 'border-[#EADAD3] bg-white hover:border-[#B76E79]'
                          }`}
                        >
                          <SafeImage
                            src={ASSETS.hairLengths[len]}
                            alt={`Cabelo tamanho ${HAIR_LENGTH_LABELS[len]}`}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[#2E2A2B]">
                                {HAIR_LENGTH_LABELS[len]}
                              </p>
                              {cell && (
                                <p className="text-xs text-[#6E6567] tabular-nums">
                                  {formatCurrencyBRL(cell.price)} ·{' '}
                                  {formatDurationLabel(cell.durationMinutes)}
                                </p>
                              )}
                            </div>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-[#B76E79]" aria-hidden="true" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!selectedService}
                onClick={() => setStep(2)}
                className="rf-btn-primary px-6 py-2.5 text-sm font-medium inline-flex items-center gap-2"
              >
                <span>Avançar para horário</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Professional + Date + 30-min Slots */}
      {step === 2 && selectedService && (
        <div className="rf-card p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#2E2A2B]">
                Data, Profissional e Horário
              </h2>
              <p className="text-xs text-[#6E6567]">
                {selectedService.name} · {formatCurrencyBRL(pricing.price)} ·{' '}
                {formatDurationLabel(pricing.durationMinutes)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="balcao-date"
                className="block text-sm font-medium text-[#2E2A2B] mb-1.5"
              >
                Data do atendimento
              </label>
              <input
                id="balcao-date"
                type="date"
                min={simulatedDate}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-[#2E2A2B] mb-1.5">
                Atendimento com
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsePlantonista(true);
                    setSelectedTime('');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${
                    usePlantonista
                      ? 'bg-[#B76E79] text-white border-[#B76E79]'
                      : 'bg-white text-[#2E2A2B] border-[#D9C3B9]'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Plantonista ({plantonistaForDate?.name ?? 'Não definido'})
                  </span>
                </button>

                {specialtyProfs.map((prof) => {
                  const selected = !usePlantonista && effectiveProfId === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setUsePlantonista(false);
                        setSelectedProfId(prof.id);
                        setSelectedTime('');
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border ${
                        selected
                          ? 'bg-[#B76E79] text-white border-[#B76E79]'
                          : 'bg-white text-[#2E2A2B] border-[#D9C3B9]'
                      }`}
                    >
                      {prof.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slots */}
          <div>
            <p className="text-sm font-medium text-[#2E2A2B] mb-2">
              Horários livres em grade de 30 minutos ({effectiveProf?.name ?? '—'})
            </p>
            {freeSlots.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#FFF4E5] border border-[#F0D0A8] space-y-3">
                <p className="text-sm font-semibold text-[#8C5214]">
                  Sem horários livres compatíveis nesta data para{' '}
                  {formatDurationLabel(pricing.durationMinutes)}.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="Nome da cliente para a fila (opcional)"
                    value={waitlistWalkInName}
                    onChange={(e) => setWaitlistWalkInName(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white w-64"
                  />
                  <button
                    type="button"
                    onClick={handleAddToWaitlist}
                    className="rf-btn-primary px-5 py-2 text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Hourglass className="w-4 h-4" aria-hidden="true" />
                    <span>Colocar na fila de espera</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {freeSlots.map((slot) => {
                  const active = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold tabular-nums border transition-colors ${
                        active
                          ? 'bg-[#B76E79] text-white border-[#B76E79]'
                          : 'bg-[#FFFAF7] text-[#2E2A2B] border-[#EADAD3] hover:border-[#B76E79]'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rf-btn-outline px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              disabled={!selectedTime}
              onClick={() => setStep(3)}
              className="rf-btn-primary px-6 py-2.5 text-sm font-medium inline-flex items-center gap-2"
            >
              <span>Avançar para cliente</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Client Search / Optional Walk-in for today's Plantonista */}
      {step === 3 && (
        <div className="rf-card p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#2E2A2B]">
              Identificação da Cliente
            </h2>
            <p className="text-xs text-[#6E6567] mt-0.5">
              {isTodayPlantonista
                ? 'Para o plantonista de hoje, o cadastro completo é opcional.'
                : 'Para agendamentos em outra data ou profissional específico, o cadastro da cliente é obrigatório.'}
            </p>
          </div>

          {isTodayPlantonista && (
            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] cursor-pointer">
              <input
                type="checkbox"
                checked={walkInOnly}
                onChange={(e) => {
                  setWalkInOnly(e.target.checked);
                  if (e.target.checked) setSelectedClientId('');
                }}
                className="w-4 h-4 accent-[#B76E79]"
              />
              <span className="text-sm font-medium text-[#2E2A2B]">
                Atendimento rápido com plantonista hoje (sem cadastro obrigatório)
              </span>
            </label>
          )}

          {walkInOnly ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3]">
              <div>
                <label
                  htmlFor="walkin-name"
                  className="block text-sm font-medium text-[#2E2A2B] mb-1"
                >
                  Nome da cliente (opcional)
                </label>
                <input
                  id="walkin-name"
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Ex.: Paula Oliveira"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="walkin-phone"
                  className="block text-sm font-medium text-[#2E2A2B] mb-1"
                >
                  Telefone (opcional)
                </label>
                <input
                  id="walkin-phone"
                  type="text"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(maskPhone(e.target.value))}
                  placeholder="(21) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={cpfSearch}
                    onChange={(e) => setCpfSearch(e.target.value)}
                    placeholder="Buscar por nome ou CPF..."
                    aria-label="Buscar cliente por nome ou CPF"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewClientForm((v) => !v)}
                  className="rf-btn-secondary px-4 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>{showNewClientForm ? 'Fechar cadastro' : 'Cadastrar nova cliente'}</span>
                </button>
              </div>

              {showNewClientForm && (
                <form
                  onSubmit={handleSaveInlineClient}
                  className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] space-y-3"
                >
                  <p className="text-sm font-semibold text-[#2E2A2B]">
                    Cadastro rápido de cliente
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="nc-name" className="block text-xs font-medium mb-1">
                        Nome completo *
                      </label>
                      <input
                        id="nc-name"
                        type="text"
                        value={newCliName}
                        onChange={(e) => setNewCliName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="nc-cpf" className="block text-xs font-medium mb-1">
                        CPF *
                      </label>
                      <input
                        id="nc-cpf"
                        type="text"
                        value={newCliCpf}
                        onChange={(e) => setNewCliCpf(maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="nc-phone" className="block text-xs font-medium mb-1">
                        Telefone *
                      </label>
                      <input
                        id="nc-phone"
                        type="text"
                        value={newCliPhone}
                        onChange={(e) => setNewCliPhone(maskPhone(e.target.value))}
                        placeholder="(21) 99999-9999"
                        className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="nc-email" className="block text-xs font-medium mb-1">
                        E-mail
                      </label>
                      <input
                        id="nc-email"
                        type="email"
                        value={newCliEmail}
                        onChange={(e) => setNewCliEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                      />
                    </div>
                  </div>
                  {clientError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 text-xs text-[#9B2C2C] bg-[#FDECEC] p-2.5 rounded-xl border border-[#F5C2C2]"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{clientError}</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="submit" className="rf-btn-primary px-4 py-2 text-xs font-medium">
                      Salvar e selecionar
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchingClients.map((cli) => {
                  const selected = selectedClientId === cli.id;
                  return (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => setSelectedClientId(cli.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-colors flex items-center justify-between ${
                        selected
                          ? 'border-[#B76E79] bg-[#F3E3DC]/50 ring-2 ring-[#B76E79]/30'
                          : 'border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#2E2A2B]">
                          {cli.name}
                        </p>
                        <p className="text-xs text-[#6E6567] tabular-nums">
                          CPF: {cli.cpf} · {cli.phone}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-[#B76E79] shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rf-btn-outline px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              disabled={!canGoStep4}
              onClick={() => setStep(4)}
              className="rf-btn-primary px-6 py-2.5 text-sm font-medium inline-flex items-center gap-2"
            >
              <span>Revisar confirmação</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirmation */}
      {step === 4 && selectedService && (
        <div className="rf-card p-6 space-y-5">
          <h2 className="font-display text-xl font-semibold text-[#2E2A2B]">
            Confirmar agendamento de balcão
          </h2>

          <div className="p-5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#6E6567]">Serviço</p>
              <p className="font-semibold text-[#2E2A2B]">
                {selectedService.name}
                {selectedService.variesByHair
                  ? ` (${HAIR_FORMAT_LABELS[hairFormat]} · ${HAIR_LENGTH_LABELS[hairLength]})`
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6567]">Profissional</p>
              <p className="font-semibold text-[#2E2A2B]">
                {effectiveProf?.name}
                {usePlantonista ? ' (Plantonista)' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6567]">Data e horário</p>
              <p className="font-semibold text-[#2E2A2B] tabular-nums">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-[#B76E79]" aria-hidden="true" />
                {formatDateBR(selectedDate)} às {selectedTime} (
                {formatDurationLabel(pricing.durationMinutes)})
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6567]">Cliente</p>
              <p className="font-semibold text-[#2E2A2B]">
                {walkInOnly
                  ? walkInName.trim() || 'Cliente de Balcão (sem cadastro)'
                  : selectedClient?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6567]">Valor</p>
              <p className="font-display text-xl font-bold text-[#B76E79] tabular-nums">
                {formatCurrencyBRL(pricing.price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6567]">Pagamento</p>
              <p className="font-semibold text-[#8D6114]">
                Pendente · Cartão de crédito na chegada ({simulatedTime})
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rf-btn-outline px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmBooking}
              className="rf-btn-primary px-6 py-2.5 text-sm font-medium inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Confirmar agendamento</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

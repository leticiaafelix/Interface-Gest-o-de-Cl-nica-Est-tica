import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePackageSavings,
  formatCurrencyBRL,
  formatDateBR,
  getPackageStatus,
  validateCPF,
  validateCreditCard,
} from './formatters';
import {
  calculateNoShowFinancials,
  findCompatibleWaitlistMatches,
  formatLastAppointmentSummary,
  formatMinutesDurationPtBr,
  formatSpecialtyOccupancySummary,
  getArrivalBadgeAndCountdown,
  getAvailableSlots,
  getClinicOccupancySummary,
  getProfessionalLiveStatus,
  getProfessionalScheduleBuckets,
  getServicePriceAndDuration,
  isLateArrival,
  minutesUntilNoShowAllowed,
  validateDayAvailability,
} from './scheduling';
import {
  Appointment,
  DayAvailability,
  PackagePromo,
  Professional,
  Service,
  Specialty,
  WaitlistEntry,
} from '../types/clinic';

test('formatCurrencyBRL e formatDateBR formatam no padrão brasileiro', () => {
  assert.match(formatCurrencyBRL(299), /R\$\s*299,00/);
  assert.equal(formatDateBR('2026-11-24'), '24/11/2026');
});

test('validateCPF valida dígitos verificadores reais', () => {
  assert.equal(validateCPF('52998224725'), true);
  assert.equal(validateCPF('111.111.111-11'), false);
  assert.equal(validateCPF('529.982.247-20'), false);
});

test('validateCreditCard recusa cartão final 0000 e aceita válidos retornando apenas 4 últimos dígitos', () => {
  const declined = validateCreditCard({
    number: '4111 1111 1111 0000',
    holder: 'Maria Silva',
    expiry: '12/28',
    cvv: '123',
  });
  assert.equal(declined.valid, false);
  assert.match(declined.error ?? '', /0000/);

  const accepted = validateCreditCard({
    number: '5500 0000 0000 4242',
    holder: 'Maria Silva',
    expiry: '12/28',
    cvv: '123',
  });
  assert.equal(accepted.valid, true);
  assert.equal(accepted.last4, '4242');
});

test('getServicePriceAndDuration retorna valor e duração corretos na matriz 3x3 de cabelo', () => {
  const corte: Service = {
    id: 'svc-corte',
    categoryId: 'salao',
    specialtyId: 'spec-cab',
    name: 'Corte feminino',
    photoUrl: '',
    active: true,
    variesByHair: true,
    fixedPrice: 75,
    fixedDurationMinutes: 60,
    hairMatrix: {
      liso: {
        curto: { price: 60, durationMinutes: 30 },
        medio: { price: 75, durationMinutes: 60 },
        longo: { price: 90, durationMinutes: 90 },
      },
      ondulado: {
        curto: { price: 70, durationMinutes: 30 },
        medio: { price: 85, durationMinutes: 60 },
        longo: { price: 100, durationMinutes: 90 },
      },
      cacheado: {
        curto: { price: 80, durationMinutes: 30 },
        medio: { price: 95, durationMinutes: 60 },
        longo: { price: 110, durationMinutes: 90 },
      },
    },
  };

  assert.deepEqual(getServicePriceAndDuration(corte, 'cacheado', 'longo'), {
    price: 110,
    durationMinutes: 90,
  });
  assert.deepEqual(getServicePriceAndDuration(corte, 'liso', 'curto'), {
    price: 60,
    durationMinutes: 30,
  });
});

test('getAvailableSlots respeita grade de 30 min e impede sobreposição para serviços longos', () => {
  const avails: DayAvailability[] = [
    {
      date: '2026-11-24',
      professionalId: 'prof-ana',
      isOff: false,
      startTime: '09:00',
      endTime: '12:00',
      isPlantonista: true,
    },
  ];
  const appts: Appointment[] = [
    {
      id: 'a1',
      date: '2026-11-24',
      startTime: '10:00',
      durationMinutes: 60,
      clientName: 'Clara',
      serviceId: 's1',
      serviceName: 'Corte',
      categoryId: 'salao',
      specialtyId: 'spec-cab',
      professionalId: 'prof-ana',
      price: 85,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      createdAt: '2026-11-20',
    },
  ];

  // For a 60-min service, 09:30 would overlap 10:00..11:00, so only 09:00 and 11:00 fit!
  const slots60 = getAvailableSlots({
    date: '2026-11-24',
    professionalId: 'prof-ana',
    durationMinutes: 60,
    availabilities: avails,
    appointments: appts,
  });
  assert.deepEqual(slots60, ['09:00', '11:00']);

  // For a 90-min service, neither 09:00..10:30 nor 11:00..12:30 fit!
  const slots90 = getAvailableSlots({
    date: '2026-11-24',
    professionalId: 'prof-ana',
    durationMinutes: 90,
    availabilities: avails,
    appointments: appts,
  });
  assert.deepEqual(slots90, []);
});

test('Regra de tolerância de 15 minutos, falta e crédito de 7 dias', () => {
  const appt: Appointment = {
    id: 'a2',
    date: '2026-11-24',
    startTime: '10:00',
    durationMinutes: 60,
    clientName: 'Beatriz',
    serviceId: 's1',
    serviceName: 'Acupuntura',
    categoryId: 'estetica',
    specialtyId: 'spec-acu',
    professionalId: 'prof-eduarda',
    price: 120,
    origin: 'online',
    status: 'agendado',
    paymentStatus: 'pago',
    createdAt: '2026-11-20',
  };

  // 10:15 (615) is still within 15-min tolerance
  assert.equal(isLateArrival(appt, 615), false);
  assert.equal(minutesUntilNoShowAllowed(appt, 610), 5);

  // 10:16 (616) exceeds 15-min tolerance
  assert.equal(isLateArrival(appt, 616), true);
  assert.equal(minutesUntilNoShowAllowed(appt, 616), 0);

  const fin = calculateNoShowFinancials(appt, '2026-11-24');
  assert.equal(fin.retainedAmount, 60);
  assert.equal(fin.creditAmount, 60);
  assert.equal(fin.expiresAt, '2026-12-01');
});

test('findCompatibleWaitlistMatches seleciona primeira cliente compatível por ordem de chegada', () => {
  const waitlist: WaitlistEntry[] = [
    {
      id: 'w1',
      date: '2026-11-24',
      clientName: 'Longo Primeiro',
      serviceId: 's1',
      serviceName: 'Corte longo',
      specialtyId: 'spec-cab',
      durationMinutes: 90,
      price: 100,
      enteredAt: '09:30',
      type: 'sem_reserva',
      status: 'aguardando',
    },
    {
      id: 'w2',
      date: '2026-11-24',
      clientName: 'Curto Segundo',
      serviceId: 's1',
      serviceName: 'Corte curto',
      specialtyId: 'spec-cab',
      durationMinutes: 30,
      price: 70,
      enteredAt: '09:45',
      type: 'atrasada_paga',
      status: 'aguardando',
    },
  ];

  const matches = findCompatibleWaitlistMatches(
    {
      date: '2026-11-24',
      startTime: '10:00',
      durationMinutes: 60,
      professionalId: 'prof-ana',
      specialtyId: 'spec-cab',
    },
    waitlist
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'w2');
});

test('validateDayAvailability exige plantonista por especialidade e alerta reservas impactadas', () => {
  const specialties: Specialty[] = [
    { id: 'spec-cab', categoryId: 'salao', name: 'Cabeleireiro' },
  ];
  const professionals: Professional[] = [
    {
      id: 'p1',
      name: 'Ana',
      specialtyId: 'spec-cab',
      email: 'a@rf.com',
      phone: '',
      photoUrl: '',
      active: true,
      hasPanelAccess: true,
    },
  ];
  const draft: DayAvailability[] = [
    {
      date: '2026-11-25',
      professionalId: 'p1',
      isOff: false,
      startTime: '10:00',
      endTime: '18:00',
      isPlantonista: false,
    },
  ];
  const appts: Appointment[] = [
    {
      id: 'a9',
      date: '2026-11-25',
      startTime: '09:00',
      durationMinutes: 60,
      clientName: 'Cliente',
      serviceId: 's1',
      serviceName: 'Corte',
      categoryId: 'salao',
      specialtyId: 'spec-cab',
      professionalId: 'p1',
      price: 75,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      createdAt: '2026-11-20',
    },
  ];

  const result = validateDayAvailability({
    date: '2026-11-25',
    draftEntries: draft,
    professionals,
    specialties,
    appointments: appts,
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.missingPlantonistaSpecialties, ['Cabeleireiro']);
  assert.equal(result.affectedAppointments.length, 1);
});

test('getProfessionalLiveStatus diferencia OCUPADO, OCIOSO e FOLGA', () => {
  const prof: Professional = {
    id: 'p1',
    name: 'Ana',
    specialtyId: 'spec-cab',
    email: 'a@rf.com',
    phone: '',
    photoUrl: '',
    active: true,
    hasPanelAccess: true,
  };
  const avails: DayAvailability[] = [
    {
      date: '2026-11-24',
      professionalId: 'p1',
      isOff: false,
      startTime: '09:00',
      endTime: '18:00',
      isPlantonista: true,
    },
  ];
  const appts: Appointment[] = [
    {
      id: 'a1',
      date: '2026-11-24',
      startTime: '10:00',
      durationMinutes: 60,
      clientName: 'Julia',
      serviceId: 's1',
      serviceName: 'Corte',
      categoryId: 'salao',
      specialtyId: 'spec-cab',
      professionalId: 'p1',
      price: 75,
      origin: 'online',
      status: 'em_atendimento',
      paymentStatus: 'pago',
      createdAt: '2026-11-20',
    },
  ];

  const busy = getProfessionalLiveStatus({
    professional: prof,
    date: '2026-11-24',
    currentMinutes: 620,
    appointments: appts,
    availabilities: avails,
  });
  assert.equal(busy.state, 'OCUPADO');
  assert.equal(busy.currentEndsAt, '11:00');
  assert.equal(busy.isPlantonista, true);

  const idle = getProfessionalLiveStatus({
    professional: prof,
    date: '2026-11-24',
    currentMinutes: 620,
    appointments: [{ ...appts[0], status: 'concluido' }],
    availabilities: avails,
  });
  assert.equal(idle.state, 'OCIOSO');
});

test('Pacotes calculam economia e status Vigente/Agendado/Expirado', () => {
  const services: Service[] = [
    {
      id: 's-escova',
      categoryId: 'salao',
      specialtyId: 'spec-cab',
      name: 'Escova',
      photoUrl: '',
      active: true,
      variesByHair: true,
      fixedPrice: 75,
      fixedDurationMinutes: 60,
      hairMatrix: {
        liso: { curto: { price: 50, durationMinutes: 30 }, medio: { price: 65, durationMinutes: 60 }, longo: { price: 80, durationMinutes: 90 } },
        ondulado: { curto: { price: 60, durationMinutes: 30 }, medio: { price: 75, durationMinutes: 60 }, longo: { price: 95, durationMinutes: 90 } },
        cacheado: { curto: { price: 70, durationMinutes: 30 }, medio: { price: 90, durationMinutes: 60 }, longo: { price: 110, durationMinutes: 90 } },
      },
    },
    {
      id: 's-pemao',
      categoryId: 'salao',
      specialtyId: 'spec-man',
      name: 'Pé e mão',
      photoUrl: '',
      active: true,
      variesByHair: false,
      fixedPrice: 60,
      fixedDurationMinutes: 60,
    },
    {
      id: 's-radio',
      categoryId: 'estetica',
      specialtyId: 'spec-rad',
      name: 'Radiofrequência facial',
      photoUrl: '',
      active: true,
      variesByHair: false,
      fixedPrice: 200,
      fixedDurationMinutes: 60,
    },
  ];
  const pkg: PackagePromo = {
    id: 'pkg-noiva',
    name: 'Dia da Noiva',
    description: 'Completo',
    serviceIds: ['s-escova', 's-pemao', 's-radio'],
    price: 299,
    validFrom: '2026-11-01',
    validUntil: '2026-12-31',
    weekdays: [4, 5, 6],
    active: true,
  };
  assert.equal(getPackageStatus(pkg, '2026-11-24'), 'Vigente');
  assert.equal(getPackageStatus(pkg, '2026-10-15'), 'Agendado');
  assert.equal(getPackageStatus(pkg, '2027-01-05'), 'Expirado');

  const calc = calculatePackageSavings(pkg, services);
  assert.equal(calc.regularTotal, 335);
  assert.equal(calc.savings, 36);
});

test('Minha Agenda calcula selo Aguardando/Chegou/Atrasada, tempo que falta e abas A atender x Concluídos hoje', () => {
  assert.equal(formatMinutesDurationPtBr(40), '40 min');
  assert.equal(formatMinutesDurationPtBr(60), '1 h');
  assert.equal(formatMinutesDurationPtBr(220), '3 h 40 min');

  const appts: Appointment[] = [
    {
      id: 'a-done',
      date: '2026-11-24',
      startTime: '08:30',
      durationMinutes: 60,
      clientName: 'Camila Andrade',
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'ondulado',
      hairLength: 'medio',
      professionalId: 'prof-ana',
      price: 85,
      origin: 'online',
      status: 'concluido',
      paymentStatus: 'pago',
      createdAt: '2026-11-20',
      finishedAt: '09:27',
    },
    {
      id: 'a-active',
      date: '2026-11-24',
      startTime: '10:00',
      durationMinutes: 60,
      clientName: 'Renata Monteiro',
      serviceId: 'svc-escova',
      serviceName: 'Escova',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'cacheado',
      hairLength: 'medio',
      professionalId: 'prof-ana',
      price: 90,
      origin: 'online',
      status: 'em_atendimento',
      paymentStatus: 'pago',
      createdAt: '2026-11-22',
      arrivedAt: '09:57',
    },
    {
      id: 'a-next',
      date: '2026-11-24',
      startTime: '14:00',
      durationMinutes: 60,
      clientName: 'Natália Carvalho',
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'liso',
      hairLength: 'medio',
      professionalId: 'prof-ana',
      price: 75,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      createdAt: '2026-11-23',
    },
  ];

  // At 10:20 (620 mins): Renata is em_atendimento -> stripText shows Agora + Depois, and Renata stays first in toAttend
  const bucketsAt1020 = getProfessionalScheduleBuckets({
    appointments: appts,
    date: '2026-11-24',
    professionalId: 'prof-ana',
    currentMinutes: 620,
  });
  assert.equal(bucketsAt1020.heroMode, 'attending_now');
  assert.equal(bucketsAt1020.completedCount, 1);
  assert.equal(bucketsAt1020.totalCount, 3);
  assert.equal(bucketsAt1020.toAttend.length, 2);
  assert.equal(bucketsAt1020.toAttend[0].id, 'a-active');
  assert.equal(bucketsAt1020.toAttend[1].id, 'a-next');
  assert.equal(bucketsAt1020.completedToday.length, 1);
  assert.equal(
    bucketsAt1020.stripText,
    'Agora: Renata Monteiro · Escova · termina 11:00 | Depois: Natália Carvalho às 14:00'
  );

  // After completing Renata: stripText switches to Próxima: Natália Carvalho às 14:00
  const afterComplete = appts.map((a) =>
    a.id === 'a-active' ? { ...a, status: 'concluido' as const, finishedAt: '10:20' } : a
  );
  const bucketsAfterComplete = getProfessionalScheduleBuckets({
    appointments: afterComplete,
    date: '2026-11-24',
    professionalId: 'prof-ana',
    currentMinutes: 620,
  });
  assert.equal(bucketsAfterComplete.heroMode, 'next_client');
  assert.equal(bucketsAfterComplete.stripText, 'Próxima: Natália Carvalho às 14:00');
  assert.equal(bucketsAfterComplete.completedCount, 2);
  assert.equal(bucketsAfterComplete.totalCount, 3);
  assert.equal(bucketsAfterComplete.toAttend.length, 1);
  assert.equal(bucketsAfterComplete.completedToday.length, 2);

  // If simulated time moves to 14:12 (852 mins) and Natália hasn't arrived -> Atrasada
  const late = getArrivalBadgeAndCountdown(appts[2], 852);
  assert.equal(late.badge, 'Atrasada');
  assert.equal(late.timeDeltaLabel, 'Atrasada há 12 min');
});

test('formatLastAppointmentSummary retorna último atendimento concluído com o mesmo profissional ou Primeiro atendimento com você', () => {
  const currentForAna: Appointment = {
    id: 'apt-now',
    date: '2026-11-25',
    startTime: '14:00',
    durationMinutes: 60,
    clientId: 'cli-7',
    clientName: 'Renata Monteiro',
    serviceId: 'svc-escova',
    serviceName: 'Escova',
    categoryId: 'salao',
    specialtyId: 'spec-cabelo',
    hairFormat: 'cacheado',
    hairLength: 'medio',
    professionalId: 'prof-ana',
    price: 90,
    origin: 'online',
    status: 'agendado',
    paymentStatus: 'pago',
    createdAt: '2026-11-24',
  };

  const history: Appointment[] = [
    currentForAna,
    // Older visit with Ana
    {
      ...currentForAna,
      id: 'apt-old-1',
      date: '2026-10-10',
      startTime: '09:00',
      serviceName: 'Corte feminino',
      hairFormat: 'ondulado',
      hairLength: 'longo',
      status: 'concluido',
    },
    // Most recent completed visit with Ana
    {
      ...currentForAna,
      id: 'apt-old-2',
      date: '2026-11-12',
      startTime: '11:00',
      serviceName: 'Escova',
      hairFormat: 'cacheado',
      hairLength: 'medio',
      status: 'concluido',
    },
    // Newer visit but with ANOTHER professional -> must be ignored
    {
      ...currentForAna,
      id: 'apt-other-prof',
      date: '2026-11-20',
      startTime: '15:00',
      professionalId: 'prof-beatriz',
      serviceName: 'Corte feminino',
      status: 'concluido',
    },
    // Newer visit with Ana but cancelled -> must be ignored
    {
      ...currentForAna,
      id: 'apt-cancelled',
      date: '2026-11-22',
      startTime: '16:00',
      status: 'cancelado',
    },
  ];

  const found = formatLastAppointmentSummary({
    appointments: history,
    currentAppointment: currentForAna,
    professionalId: 'prof-ana',
  });
  assert.equal(found.isFirst, false);
  assert.equal(
    found.label,
    'Último atendimento com você: Escova · Cabelo Cacheado · Médio · 12/11/2026'
  );

  // Client never seen by prof-ana
  const firstClient: Appointment = {
    ...currentForAna,
    id: 'apt-first',
    clientId: 'cli-99',
    clientName: 'Nova Cliente',
  };
  const firstResult = formatLastAppointmentSummary({
    appointments: [...history, firstClient],
    currentAppointment: firstClient,
    professionalId: 'prof-ana',
  });
  assert.equal(firstResult.isFirst, true);
  assert.equal(firstResult.label, 'Primeiro atendimento com você');
});

test('OCUPADO depende exclusivamente de status em_atendimento (nunca do horário agendado) e getClinicOccupancySummary bate totais', () => {
  const profs: Professional[] = [
    {
      id: 'p1',
      name: 'Ana',
      specialtyId: 'spec-cab',
      email: 'a@rf.com',
      phone: '',
      photoUrl: '',
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'p2',
      name: 'Beatriz',
      specialtyId: 'spec-cab',
      email: 'b@rf.com',
      phone: '',
      photoUrl: '',
      active: true,
      hasPanelAccess: false,
    },
  ];
  const avails: DayAvailability[] = [
    { date: '2026-11-25', professionalId: 'p1', isOff: false, startTime: '08:00', endTime: '18:00', isPlantonista: true },
    { date: '2026-11-25', professionalId: 'p2', isOff: false, startTime: '08:00', endTime: '18:00', isPlantonista: false },
  ];
  const scheduledOnly: Appointment[] = [
    {
      id: 'a-sched',
      date: '2026-11-25',
      startTime: '10:00',
      durationMinutes: 60,
      clientName: 'Cliente',
      serviceId: 's1',
      serviceName: 'Corte',
      categoryId: 'salao',
      specialtyId: 'spec-cab',
      professionalId: 'p1',
      price: 85,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      createdAt: '2026-11-20',
    },
  ];

  // Even at 10:20 (inside 10:00..11:00 slot), because status is still 'agendado', p1 MUST be OCIOSO
  const beforeCheckIn = getProfessionalLiveStatus({
    professional: profs[0],
    date: '2026-11-25',
    currentMinutes: 620,
    appointments: scheduledOnly,
    availabilities: avails,
  });
  assert.equal(beforeCheckIn.state, 'OCIOSO');

  // After check-in ('em_atendimento'), even past 11:30 (outside 10:00..11:00 slot), p1 stays OCUPADO until 'concluido'
  const checkedIn: Appointment[] = [{ ...scheduledOnly[0], status: 'em_atendimento' }];
  const afterSlotEndStillBusy = getProfessionalLiveStatus({
    professional: profs[0],
    date: '2026-11-25',
    currentMinutes: 690,
    appointments: checkedIn,
    availabilities: avails,
  });
  assert.equal(afterSlotEndStillBusy.state, 'OCUPADO');

  const summary = getClinicOccupancySummary({
    professionals: profs,
    appointments: checkedIn,
    availabilities: avails,
    date: '2026-11-25',
    currentMinutes: 690,
  });
  assert.equal(summary.busyCount, 1);
  assert.equal(summary.idleCount, 1);
  assert.equal(summary.workingCount, 2);
  assert.equal(summary.occupancyPct, 50);
});

test('formatSpecialtyOccupancySummary aplica singular e plural corretos', () => {
  assert.equal(formatSpecialtyOccupancySummary(1, 1), '1 ocupada, 1 ociosa');
  assert.equal(formatSpecialtyOccupancySummary(2, 0), '2 ocupadas, 0 ociosas');
  assert.equal(formatSpecialtyOccupancySummary(0, 1), '0 ocupadas, 1 ociosa');
  assert.equal(formatSpecialtyOccupancySummary(0, 2), '0 ocupadas, 2 ociosas');
});





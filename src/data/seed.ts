import {
  Appointment,
  Category,
  Client,
  ClinicState,
  DayAvailability,
  PackagePromo,
  Professional,
  Service,
  Specialty,
  UserAccount,
  WaitlistEntry,
} from '../types/clinic';
import { addDaysIso, formatCurrencyBRL, getTodayIsoLocal } from '../utils/formatters';
import { ASSETS } from './assets';

export const DEMO_USERS: UserAccount[] = [
  {
    id: 'user-atendente',
    name: 'Marina Campos',
    email: 'atendente@rebeccafelix.com',
    password: '123456',
    role: 'atendente',
  },
  {
    id: 'user-gerente',
    name: 'Rebecca Felix',
    email: 'gerente@rebeccafelix.com',
    password: '123456',
    role: 'gerente',
  },
  {
    id: 'user-prof',
    name: 'Ana Souza',
    email: 'profissional@rebeccafelix.com',
    password: '123456',
    role: 'profissional',
    professionalId: 'prof-ana',
  },
];

export const DEFAULT_SIMULATED_TIME = '10:20';

function makeValidCpf(seed9: string): string {
  const digits = seed9.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  digits.push(d1);

  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  digits.push(d2);

  const s = digits.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9, 11)}`;
}

export function buildDemoState(baseDateIso: string = getTodayIsoLocal()): ClinicState {
  const categories: Category[] = [
    { id: 'salao', name: 'Salão de Beleza' },
    { id: 'estetica', name: 'Centro de Estética' },
  ];

  const specialties: Specialty[] = [
    { id: 'spec-cabelo', categoryId: 'salao', name: 'Cabeleireiro' },
    { id: 'spec-manicure', categoryId: 'salao', name: 'Manicure' },
    { id: 'spec-acupuntura', categoryId: 'estetica', name: 'Acupuntura' },
    { id: 'spec-radiofreq', categoryId: 'estetica', name: 'Radiofrequência' },
  ];

  const professionals: Professional[] = [
    {
      id: 'prof-ana',
      name: 'Ana Souza',
      specialtyId: 'spec-cabelo',
      email: 'ana.souza@rebeccafelix.com',
      phone: '(21) 99112-3401',
      photoUrl: ASSETS.professionals.ana,
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'prof-beatriz',
      name: 'Beatriz Lima',
      specialtyId: 'spec-cabelo',
      email: 'beatriz.lima@rebeccafelix.com',
      phone: '(21) 99112-3402',
      photoUrl: ASSETS.professionals.beatriz,
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'prof-carla',
      name: 'Carla Mendes',
      specialtyId: 'spec-manicure',
      email: 'carla.mendes@rebeccafelix.com',
      phone: '(21) 99112-3403',
      photoUrl: ASSETS.professionals.carla,
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'prof-daniela',
      name: 'Daniela Rocha',
      specialtyId: 'spec-manicure',
      email: 'daniela.rocha@rebeccafelix.com',
      phone: '(21) 99112-3404',
      photoUrl: ASSETS.professionals.daniela,
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'prof-eduarda',
      name: 'Eduarda Alves',
      specialtyId: 'spec-acupuntura',
      email: 'eduarda.alves@rebeccafelix.com',
      phone: '(21) 99112-3405',
      photoUrl: ASSETS.professionals.eduarda,
      active: true,
      hasPanelAccess: true,
    },
    {
      id: 'prof-fernanda',
      name: 'Fernanda Costa',
      specialtyId: 'spec-radiofreq',
      email: 'fernanda.costa@rebeccafelix.com',
      phone: '(21) 99112-3406',
      photoUrl: ASSETS.professionals.fernanda,
      active: true,
      hasPanelAccess: true,
    },
  ];

  const services: Service[] = [
    {
      id: 'svc-corte',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      name: 'Corte feminino',
      description: 'Corte personalizado com visagismo, lavagem e finalização.',
      photoUrl: ASSETS.services.cabelo,
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
    },
    {
      id: 'svc-escova',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      name: 'Escova',
      description: 'Escova modeladora ou lisa com proteção térmica e brilho.',
      photoUrl: ASSETS.services.escova,
      active: true,
      variesByHair: true,
      fixedPrice: 65,
      fixedDurationMinutes: 60,
      hairMatrix: {
        liso: {
          curto: { price: 50, durationMinutes: 30 },
          medio: { price: 65, durationMinutes: 60 },
          longo: { price: 80, durationMinutes: 90 },
        },
        ondulado: {
          curto: { price: 60, durationMinutes: 30 },
          medio: { price: 75, durationMinutes: 60 },
          longo: { price: 95, durationMinutes: 90 },
        },
        cacheado: {
          curto: { price: 70, durationMinutes: 30 },
          medio: { price: 90, durationMinutes: 60 },
          longo: { price: 110, durationMinutes: 90 },
        },
      },
    },
    {
      id: 'svc-manicure',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      name: 'Manicure',
      description: 'Cutilagem, hidratação e esmaltação clássica ou em gel.',
      photoUrl: ASSETS.services.manicure,
      active: true,
      variesByHair: false,
      fixedPrice: 35,
      fixedDurationMinutes: 30,
    },
    {
      id: 'svc-pe-mao',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      name: 'Pé e mão',
      description: 'Combo completo de manicure e pedicure com esfoliação suave.',
      photoUrl: ASSETS.services.manicure,
      active: true,
      variesByHair: false,
      fixedPrice: 60,
      fixedDurationMinutes: 60,
    },
    {
      id: 'svc-acupuntura',
      categoryId: 'estetica',
      specialtyId: 'spec-acupuntura',
      name: 'Acupuntura',
      description: 'Sessão terapêutica para equilíbrio energético e bem-estar.',
      photoUrl: ASSETS.services.estetica,
      active: true,
      variesByHair: false,
      fixedPrice: 120,
      fixedDurationMinutes: 60,
    },
    {
      id: 'svc-radiofreq',
      categoryId: 'estetica',
      specialtyId: 'spec-radiofreq',
      name: 'Radiofrequência facial',
      description: 'Estímulo de colágeno e firmeza facial com tecnologia térmica.',
      photoUrl: ASSETS.services.estetica,
      active: true,
      variesByHair: false,
      fixedPrice: 200,
      fixedDurationMinutes: 60,
    },
  ];

  const packages: PackagePromo[] = [
    {
      id: 'pkg-noiva',
      name: 'Dia da Noiva',
      description: 'Escova modelada, pé e mão completos e sessão de radiofrequência facial iluminadora.',
      serviceIds: ['svc-escova', 'svc-pe-mao', 'svc-radiofreq'],
      price: 299,
      validFrom: addDaysIso(baseDateIso, -20),
      validUntil: addDaysIso(baseDateIso, 45),
      weekdays: [4, 5, 6],
      active: true,
    },
    {
      id: 'pkg-primavera',
      name: 'Ritual Primavera',
      description: 'Corte feminino renovador combinado com manicure clássica.',
      serviceIds: ['svc-corte', 'svc-manicure'],
      price: 89,
      validFrom: addDaysIso(baseDateIso, -90),
      validUntil: addDaysIso(baseDateIso, -10),
      weekdays: [1, 2, 3, 4],
      active: false,
    },
  ];

  const clients: Client[] = [
    {
      id: 'cli-teste',
      name: 'Cliente Teste',
      cpf: makeValidCpf('529982247'),
      phone: '(21) 99876-5432',
      email: 'cliente@teste.com',
      notes: 'Prefere atendimento na parte da manhã. Cabelo cacheado médio.',
      active: true,
      createdAt: addDaysIso(baseDateIso, -85),
      credits: [],
    },
    {
      id: 'cli-2',
      name: 'Juliana Vasconcelos',
      cpf: makeValidCpf('153509460'),
      phone: '(21) 99741-1122',
      email: 'juliana.v@email.com',
      notes: 'Alergia leve a acetona; usar removedor hipoalergênico.',
      active: true,
      createdAt: addDaysIso(baseDateIso, -80),
      credits: [],
    },
    {
      id: 'cli-3',
      name: 'Camila Andrade',
      cpf: makeValidCpf('390533447'),
      phone: '(21) 99622-8891',
      email: 'camila.andrade@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -74),
      credits: [],
    },
    {
      id: 'cli-4',
      name: 'Patrícia Nogueira',
      cpf: makeValidCpf('714287938'),
      phone: '(21) 99511-2040',
      email: 'patricia.n@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -68),
      credits: [],
    },
    {
      id: 'cli-5',
      name: 'Larissa Ferreira',
      cpf: makeValidCpf('842619350'),
      phone: '(21) 99433-7710',
      email: 'larissa.f@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -60),
      credits: [],
    },
    {
      id: 'cli-6',
      name: 'Mariana Tavares',
      cpf: makeValidCpf('268491730'),
      phone: '(21) 99388-5501',
      email: 'mariana.t@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -55),
      credits: [],
    },
    {
      id: 'cli-7',
      name: 'Renata Monteiro',
      cpf: makeValidCpf('615928374'),
      phone: '(21) 99277-4321',
      email: 'renata.m@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -49),
      credits: [],
    },
    {
      id: 'cli-8',
      name: 'Helena Duarte',
      cpf: makeValidCpf('483920175'),
      phone: '(21) 99166-3190',
      email: 'helena.d@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -40),
      credits: [],
    },
    {
      id: 'cli-9',
      name: 'Sofia Albuquerque',
      cpf: makeValidCpf('937182640'),
      phone: '(21) 98844-1209',
      email: 'sofia.a@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -35),
      credits: [],
    },
    {
      id: 'cli-10',
      name: 'Gabriela Peixoto',
      cpf: makeValidCpf('741852963'),
      phone: '(21) 98733-6540',
      email: 'gabriela.p@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -28),
      credits: [],
    },
    {
      id: 'cli-11',
      name: 'Amanda Ribeiro',
      cpf: makeValidCpf('369258147'),
      phone: '(21) 98622-7890',
      email: 'amanda.r@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -20),
      credits: [],
    },
    {
      id: 'cli-12',
      name: 'Natália Carvalho',
      cpf: makeValidCpf('852147963'),
      phone: '(21) 98511-4567',
      email: 'natalia.c@email.com',
      active: true,
      createdAt: addDaysIso(baseDateIso, -12),
      credits: [],
    },
  ];

  // Availability for today + next 14 days (15 days total)
  const availabilities: DayAvailability[] = [];
  for (let offset = 0; offset <= 14; offset++) {
    const d = addDaysIso(baseDateIso, offset);
    const evenDay = offset % 2 === 0;
    availabilities.push(
      {
        date: d,
        professionalId: 'prof-ana',
        isOff: false,
        startTime: '08:00',
        endTime: '18:00',
        isPlantonista: evenDay,
      },
      {
        date: d,
        professionalId: 'prof-beatriz',
        isOff: false,
        startTime: '09:00',
        endTime: '19:00',
        isPlantonista: !evenDay,
      },
      {
        date: d,
        professionalId: 'prof-carla',
        isOff: false,
        startTime: '08:00',
        endTime: '17:30',
        isPlantonista: evenDay,
      },
      {
        date: d,
        professionalId: 'prof-daniela',
        isOff: false,
        startTime: '09:00',
        endTime: '18:30',
        isPlantonista: !evenDay,
      },
      {
        date: d,
        professionalId: 'prof-eduarda',
        isOff: false,
        startTime: '08:30',
        endTime: '17:30',
        isPlantonista: true,
      },
      {
        date: d,
        professionalId: 'prof-fernanda',
        isOff: false,
        startTime: '09:00',
        endTime: '18:00',
        isPlantonista: true,
      }
    );
  }

  // Today's 12 appointments (simulated clock starts at 10:20)
  const todayAppointments: Appointment[] = [
    {
      id: 'apt-t1',
      date: baseDateIso,
      startTime: '08:30',
      durationMinutes: 60,
      clientId: 'cli-3',
      clientName: 'Camila Andrade',
      clientPhone: '(21) 99622-8891',
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
      cardLast4: '4821',
      createdAt: addDaysIso(baseDateIso, -3),
      arrivedAt: '08:28',
      finishedAt: '09:27',
    },
    {
      id: 'apt-t2',
      date: baseDateIso,
      startTime: '08:30',
      durationMinutes: 30,
      clientId: 'cli-4',
      clientName: 'Patrícia Nogueira',
      clientPhone: '(21) 99511-2040',
      serviceId: 'svc-manicure',
      serviceName: 'Manicure',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-carla',
      price: 35,
      origin: 'online',
      status: 'concluido',
      paymentStatus: 'pago',
      cardLast4: '9104',
      createdAt: addDaysIso(baseDateIso, -2),
      arrivedAt: '08:30',
      finishedAt: '09:00',
    },
    {
      id: 'apt-t3',
      date: baseDateIso,
      startTime: '09:00',
      durationMinutes: 60,
      clientId: 'cli-5',
      clientName: 'Larissa Ferreira',
      clientPhone: '(21) 99433-7710',
      serviceId: 'svc-acupuntura',
      serviceName: 'Acupuntura',
      categoryId: 'estetica',
      specialtyId: 'spec-acupuntura',
      professionalId: 'prof-eduarda',
      price: 120,
      origin: 'balcao',
      status: 'concluido',
      paymentStatus: 'pago',
      cardLast4: '7732',
      createdAt: addDaysIso(baseDateIso, -1),
      arrivedAt: '08:58',
      finishedAt: '09:59',
    },
    {
      id: 'apt-t4',
      date: baseDateIso,
      startTime: '09:30',
      durationMinutes: 30,
      clientId: 'cli-6',
      clientName: 'Mariana Tavares',
      clientPhone: '(21) 99388-5501',
      serviceId: 'svc-escova',
      serviceName: 'Escova',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'liso',
      hairLength: 'curto',
      professionalId: 'prof-beatriz',
      price: 50,
      origin: 'online',
      status: 'concluido',
      paymentStatus: 'pago',
      cardLast4: '3319',
      createdAt: addDaysIso(baseDateIso, -4),
      arrivedAt: '09:32',
      finishedAt: '10:01',
    },
    {
      id: 'apt-t5',
      date: baseDateIso,
      startTime: '10:00',
      durationMinutes: 60,
      clientId: 'cli-7',
      clientName: 'Renata Monteiro',
      clientPhone: '(21) 99277-4321',
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
      cardLast4: '6412',
      createdAt: addDaysIso(baseDateIso, -2),
      arrivedAt: '09:57',
    },
    {
      id: 'apt-t6',
      date: baseDateIso,
      startTime: '10:00',
      durationMinutes: 60,
      clientId: 'cli-8',
      clientName: 'Helena Duarte',
      clientPhone: '(21) 99166-3190',
      serviceId: 'svc-pe-mao',
      serviceName: 'Pé e mão',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-carla',
      price: 60,
      origin: 'online',
      status: 'agendado', // At 10:20, 20 min overdue -> triggers late arrival / no-show demo
      paymentStatus: 'pago',
      cardLast4: '5510',
      createdAt: addDaysIso(baseDateIso, -5),
    },
    {
      id: 'apt-t7',
      date: baseDateIso,
      startTime: '10:00',
      durationMinutes: 60,
      clientId: 'cli-9',
      clientName: 'Sofia Albuquerque',
      clientPhone: '(21) 98844-1209',
      serviceId: 'svc-radiofreq',
      serviceName: 'Radiofrequência facial',
      categoryId: 'estetica',
      specialtyId: 'spec-radiofreq',
      professionalId: 'prof-fernanda',
      price: 200,
      origin: 'online',
      status: 'em_atendimento',
      paymentStatus: 'pago',
      cardLast4: '2209',
      createdAt: addDaysIso(baseDateIso, -3),
      arrivedAt: '10:02',
    },
    {
      id: 'apt-t8',
      date: baseDateIso,
      startTime: '10:15',
      durationMinutes: 30,
      clientId: 'cli-10',
      clientName: 'Gabriela Peixoto',
      clientPhone: '(21) 98733-6540',
      serviceId: 'svc-manicure',
      serviceName: 'Manicure',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-daniela',
      price: 35,
      origin: 'balcao',
      status: 'agendado', // At 10:20, 5 min late (within 15-min tolerance) & pendente payment!
      paymentStatus: 'pendente',
      createdAt: addDaysIso(baseDateIso, -1),
    },
    {
      id: 'apt-t9',
      date: baseDateIso,
      startTime: '11:00',
      durationMinutes: 90,
      clientId: 'cli-11',
      clientName: 'Amanda Ribeiro',
      clientPhone: '(21) 98622-7890',
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'cacheado',
      hairLength: 'longo',
      professionalId: 'prof-beatriz',
      price: 110,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      cardLast4: '8841',
      createdAt: addDaysIso(baseDateIso, -2),
    },
    {
      id: 'apt-t10',
      date: baseDateIso,
      startTime: '11:30',
      durationMinutes: 60,
      clientId: 'cli-teste',
      clientName: 'Cliente Teste',
      clientPhone: '(21) 99876-5432',
      serviceId: 'svc-acupuntura',
      serviceName: 'Acupuntura',
      categoryId: 'estetica',
      specialtyId: 'spec-acupuntura',
      professionalId: 'prof-eduarda',
      price: 120,
      origin: 'balcao',
      status: 'agendado',
      paymentStatus: 'pendente',
      createdAt: baseDateIso,
    },
    {
      id: 'apt-t11',
      date: baseDateIso,
      startTime: '14:00',
      durationMinutes: 60,
      clientId: 'cli-12',
      clientName: 'Natália Carvalho',
      clientPhone: '(21) 98511-4567',
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
      cardLast4: '1923',
      createdAt: addDaysIso(baseDateIso, -1),
    },
    {
      id: 'apt-t12',
      date: baseDateIso,
      startTime: '15:00',
      durationMinutes: 60,
      clientId: 'cli-2',
      clientName: 'Juliana Vasconcelos',
      clientPhone: '(21) 99741-1122',
      serviceId: 'svc-radiofreq',
      serviceName: 'Radiofrequência facial',
      categoryId: 'estetica',
      specialtyId: 'spec-radiofreq',
      professionalId: 'prof-fernanda',
      price: 200,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      cardLast4: '7042',
      createdAt: addDaysIso(baseDateIso, -3),
    },
  ];

  // Future appointments for tomorrow and day+2
  const futureAppointments: Appointment[] = [
    {
      id: 'apt-f1',
      date: addDaysIso(baseDateIso, 1),
      startTime: '10:00',
      durationMinutes: 60,
      clientId: 'cli-3',
      clientName: 'Camila Andrade',
      clientPhone: '(21) 99622-8891',
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'ondulado',
      hairLength: 'medio',
      professionalId: 'prof-ana',
      price: 85,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      cardLast4: '4821',
      createdAt: baseDateIso,
    },
    {
      id: 'apt-f2',
      date: addDaysIso(baseDateIso, 1),
      startTime: '14:00',
      durationMinutes: 60,
      clientId: 'cli-5',
      clientName: 'Larissa Ferreira',
      clientPhone: '(21) 99433-7710',
      serviceId: 'svc-pe-mao',
      serviceName: 'Pé e mão',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-carla',
      price: 60,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      cardLast4: '7732',
      createdAt: baseDateIso,
    },
    {
      id: 'apt-f3',
      date: addDaysIso(baseDateIso, 2),
      startTime: '11:00',
      durationMinutes: 60,
      clientId: 'cli-teste',
      clientName: 'Cliente Teste',
      clientPhone: '(21) 99876-5432',
      serviceId: 'svc-radiofreq',
      serviceName: 'Radiofrequência facial',
      categoryId: 'estetica',
      specialtyId: 'spec-radiofreq',
      professionalId: 'prof-fernanda',
      price: 200,
      origin: 'online',
      status: 'agendado',
      paymentStatus: 'pago',
      cardLast4: '4242',
      createdAt: baseDateIso,
    },
  ];

  // Historical appointments across past 90 days (3 months) for dashboard charts & reports
  const historicalTemplates: Array<{
    serviceId: string;
    serviceName: string;
    categoryId: string;
    specialtyId: string;
    professionalId: string;
    price: number;
    durationMinutes: number;
    hairFormat?: 'cacheado' | 'ondulado' | 'liso';
    hairLength?: 'curto' | 'medio' | 'longo';
  }> = [
    {
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      professionalId: 'prof-ana',
      price: 85,
      durationMinutes: 60,
      hairFormat: 'ondulado',
      hairLength: 'medio',
    },
    {
      serviceId: 'svc-corte',
      serviceName: 'Corte feminino',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      professionalId: 'prof-beatriz',
      price: 95,
      durationMinutes: 60,
      hairFormat: 'cacheado',
      hairLength: 'medio',
    },
    {
      serviceId: 'svc-escova',
      serviceName: 'Escova',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      professionalId: 'prof-ana',
      price: 65,
      durationMinutes: 60,
      hairFormat: 'liso',
      hairLength: 'medio',
    },
    {
      serviceId: 'svc-manicure',
      serviceName: 'Manicure',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-carla',
      price: 35,
      durationMinutes: 30,
    },
    {
      serviceId: 'svc-pe-mao',
      serviceName: 'Pé e mão',
      categoryId: 'salao',
      specialtyId: 'spec-manicure',
      professionalId: 'prof-daniela',
      price: 60,
      durationMinutes: 60,
    },
    {
      serviceId: 'svc-acupuntura',
      serviceName: 'Acupuntura',
      categoryId: 'estetica',
      specialtyId: 'spec-acupuntura',
      professionalId: 'prof-eduarda',
      price: 120,
      durationMinutes: 60,
    },
    {
      serviceId: 'svc-radiofreq',
      serviceName: 'Radiofrequência facial',
      categoryId: 'estetica',
      specialtyId: 'spec-radiofreq',
      professionalId: 'prof-fernanda',
      price: 200,
      durationMinutes: 60,
    },
  ];

  const historicalSlots = ['09:00', '10:30', '14:00', '15:30', '17:00'];
  const historicalAppointments: Appointment[] = [];

  for (let daysAgo = 1; daysAgo <= 90; daysAgo++) {
    const date = addDaysIso(baseDateIso, -daysAgo);
    // Skip Sundays occasionally, 2-3 appointments per day
    const count = daysAgo % 7 === 0 ? 1 : daysAgo % 3 === 0 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const tpl = historicalTemplates[(daysAgo + i * 2) % historicalTemplates.length];
      const cli = clients[(daysAgo + i) % clients.length];
      const isNoShow = (daysAgo * 7 + i) % 13 === 0;
      const isCancelled = !isNoShow && (daysAgo * 5 + i) % 23 === 0;
      const origin = (daysAgo + i) % 4 === 0 ? 'balcao' : 'online';
      const status = isNoShow
        ? 'nao_compareceu'
        : isCancelled
        ? 'cancelado'
        : 'concluido';
      const paymentStatus = isNoShow
        ? 'retido_parcial'
        : isCancelled
        ? 'reembolsado_total'
        : 'pago';

      historicalAppointments.push({
        id: `apt-h-${daysAgo}-${i}`,
        date,
        startTime: historicalSlots[(i + daysAgo) % historicalSlots.length],
        durationMinutes: tpl.durationMinutes,
        clientId: cli.id,
        clientName: cli.name,
        clientPhone: cli.phone,
        serviceId: tpl.serviceId,
        serviceName: tpl.serviceName,
        categoryId: tpl.categoryId,
        specialtyId: tpl.specialtyId,
        hairFormat: tpl.hairFormat,
        hairLength: tpl.hairLength,
        professionalId: tpl.professionalId,
        price: tpl.price,
        origin,
        status,
        paymentStatus,
        cardLast4: '4242',
        createdAt: addDaysIso(date, -2),
        arrivedAt: status === 'concluido' ? historicalSlots[(i + daysAgo) % historicalSlots.length] : undefined,
      });
    }
  }

  // Deterministic recent no-shows matching active client credits (50% retained, 50% credit valid for 7 days)
  historicalAppointments.push(
    {
      id: 'apt-h-2-noshow',
      date: addDaysIso(baseDateIso, -2),
      startTime: '17:00',
      durationMinutes: 60,
      clientId: 'cli-teste',
      clientName: 'Cliente Teste',
      clientPhone: '(21) 99876-5432',
      serviceId: 'svc-escova',
      serviceName: 'Escova',
      categoryId: 'salao',
      specialtyId: 'spec-cabelo',
      hairFormat: 'cacheado',
      hairLength: 'medio',
      professionalId: 'prof-beatriz',
      price: 90,
      origin: 'online',
      status: 'nao_compareceu',
      paymentStatus: 'retido_parcial',
      cardLast4: '4242',
      createdAt: addDaysIso(baseDateIso, -4),
    },
    {
      id: 'apt-h-1-noshow',
      date: addDaysIso(baseDateIso, -1),
      startTime: '17:00',
      durationMinutes: 60,
      clientId: 'cli-2',
      clientName: 'Juliana Vasconcelos',
      clientPhone: '(21) 99741-1122',
      serviceId: 'svc-acupuntura',
      serviceName: 'Acupuntura',
      categoryId: 'estetica',
      specialtyId: 'spec-acupuntura',
      professionalId: 'prof-eduarda',
      price: 120,
      origin: 'online',
      status: 'nao_compareceu',
      paymentStatus: 'retido_parcial',
      cardLast4: '7042',
      createdAt: addDaysIso(baseDateIso, -3),
    }
  );

  // Derive every credit directly from historical no-show reservations (50% of booking value, expires +7 days)
  for (const appt of historicalAppointments) {
    if (
      appt.status !== 'nao_compareceu' ||
      appt.paymentStatus !== 'retido_parcial' ||
      !appt.clientId
    ) {
      continue;
    }
    const client = clients.find((c) => c.id === appt.clientId);
    if (!client) continue;
    const creditAmount = Math.round(appt.price * 50) / 100;
    client.credits.push({
      id: `cred-${appt.id}`,
      amount: creditAmount,
      reason: `Crédito por falta em ${appt.serviceName} (50% de ${formatCurrencyBRL(
        appt.price
      )})`,
      createdAt: appt.date,
      expiresAt: addDaysIso(appt.date, 7),
      used: false,
    });
  }

  for (const client of clients) {
    client.credits.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const waitlist: WaitlistEntry[] = [
    {
      id: 'wait-1',
      date: baseDateIso,
      clientId: 'cli-4',
      clientName: 'Patrícia Nogueira',
      clientPhone: '(21) 99511-2040',
      serviceId: 'svc-manicure',
      serviceName: 'Manicure',
      specialtyId: 'spec-manicure',
      durationMinutes: 30,
      price: 35,
      enteredAt: '09:40',
      type: 'sem_reserva',
      status: 'aguardando',
    },
    {
      id: 'wait-2',
      date: baseDateIso,
      clientId: 'cli-6',
      clientName: 'Mariana Tavares',
      clientPhone: '(21) 99388-5501',
      serviceId: 'svc-escova',
      serviceName: 'Escova',
      specialtyId: 'spec-cabelo',
      durationMinutes: 30,
      hairFormat: 'liso',
      hairLength: 'curto',
      price: 50,
      enteredAt: '10:05',
      type: 'atrasada_paga',
      status: 'aguardando',
    },
  ];

  return {
    categories,
    specialties,
    professionals,
    services,
    packages,
    clients,
    appointments: [...todayAppointments, ...futureAppointments, ...historicalAppointments],
    waitlist,
    availabilities,
  };
}

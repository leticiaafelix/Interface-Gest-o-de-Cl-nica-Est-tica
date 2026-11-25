export type UserRole = 'atendente' | 'gerente' | 'profissional';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  professionalId?: string;
}

export type CategoryId = 'salao' | 'estetica' | string;

export interface Category {
  id: CategoryId;
  name: string;
}

export interface Specialty {
  id: string;
  categoryId: CategoryId;
  name: string;
}

export interface Professional {
  id: string;
  name: string;
  specialtyId: string;
  email: string;
  phone: string;
  photoUrl: string;
  active: boolean;
  hasPanelAccess: boolean;
}

export type HairFormat = 'cacheado' | 'ondulado' | 'liso';
export type HairLength = 'curto' | 'medio' | 'longo';

export interface HairVariantPrice {
  price: number;
  durationMinutes: number;
}

export type HairMatrix = Record<HairFormat, Record<HairLength, HairVariantPrice>>;

export interface Service {
  id: string;
  specialtyId: string;
  categoryId: CategoryId;
  name: string;
  description?: string;
  photoUrl: string;
  active: boolean;
  variesByHair: boolean;
  fixedPrice: number;
  fixedDurationMinutes: number;
  hairMatrix?: HairMatrix;
}

export interface PackagePromo {
  id: string;
  name: string;
  description: string;
  serviceIds: string[];
  price: number;
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  weekdays: number[]; // 0=Dom..6=Sab
  active: boolean;
}

export interface ClientCredit {
  id: string;
  amount: number;
  reason: string;
  createdAt: string; // YYYY-MM-DD
  expiresAt: string; // YYYY-MM-DD
  used: boolean;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  notes?: string;
  active: boolean;
  credits: ClientCredit[];
  createdAt: string; // YYYY-MM-DD
}

export type AppointmentOrigin = 'online' | 'balcao';

export type AppointmentStatus =
  | 'agendado'
  | 'em_atendimento'
  | 'concluido'
  | 'nao_compareceu'
  | 'na_fila'
  | 'nao_atendida'
  | 'cancelado';

export type PaymentStatus =
  | 'pago'
  | 'pendente'
  | 'reembolsado_total'
  | 'reembolsado_parcial'
  | 'retido_parcial';

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  categoryId: CategoryId;
  specialtyId: string;
  hairFormat?: HairFormat;
  hairLength?: HairLength;
  professionalId: string;
  price: number;
  origin: AppointmentOrigin;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  cardLast4?: string;
  creditUsedAmount?: number;
  createdAt: string;
  arrivedAt?: string;
  finishedAt?: string;
  cancellationNote?: string;
}

export type WaitlistType = 'sem_reserva' | 'atrasada_paga';
export type WaitlistStatus =
  | 'aguardando'
  | 'encaixada'
  | 'removida'
  | 'nao_atendida_estornada';

export interface WaitlistEntry {
  id: string;
  date: string; // YYYY-MM-DD
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  specialtyId: string;
  durationMinutes: number;
  hairFormat?: HairFormat;
  hairLength?: HairLength;
  price: number;
  enteredAt: string; // HH:MM
  type: WaitlistType;
  originalAppointmentId?: string;
  status: WaitlistStatus;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  professionalId: string;
  isOff: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isPlantonista: boolean;
}

export interface FreedSlot {
  date: string;
  startTime: string;
  durationMinutes: number;
  professionalId: string;
  specialtyId: string;
}

export interface ClinicState {
  categories: Category[];
  specialties: Specialty[];
  professionals: Professional[];
  services: Service[];
  packages: PackagePromo[];
  clients: Client[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  availabilities: DayAvailability[];
}

import { HairFormat, HairLength, PackagePromo, Service } from '../types/clinic';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekdayFromIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0=Dom .. 6=Sab
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function formatMaskedCPF(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return '***.***.***-**';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

export function maskDateBRInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateBRToIso(brDate: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return null;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function maskTime24hInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidTime24h(hhmm: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function validateCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === Number(cpf[10]);
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskCardExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export interface CardValidationResult {
  valid: boolean;
  last4?: string;
  error?: string;
}

export function validateCreditCard(params: {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}): CardValidationResult {
  const digits = onlyDigits(params.number);
  if (digits.length !== 16) {
    return {
      valid: false,
      error: 'Informe os 16 dígitos do cartão de crédito para prosseguir.',
    };
  }
  const last4 = digits.slice(-4);
  if (last4 === '0000') {
    return {
      valid: false,
      error:
        'Cartão recusado pela operadora (final 0000). Utilize outro cartão de crédito.',
    };
  }
  if (!params.holder.trim() || params.holder.trim().length < 3) {
    return {
      valid: false,
      error: 'Informe o nome impresso no cartão.',
    };
  }
  const expiryDigits = onlyDigits(params.expiry);
  if (expiryDigits.length !== 4) {
    return {
      valid: false,
      error: 'Informe a validade do cartão no formato MM/AA.',
    };
  }
  const month = Number(expiryDigits.slice(0, 2));
  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: 'Mês de validade inválido. Informe entre 01 e 12.',
    };
  }
  const cvvDigits = onlyDigits(params.cvv);
  if (cvvDigits.length < 3 || cvvDigits.length > 4) {
    return {
      valid: false,
      error: 'Informe o código de segurança (CVV) com 3 ou 4 dígitos.',
    };
  }
  return { valid: true, last4 };
}

export const HAIR_FORMAT_LABELS: Record<HairFormat, string> = {
  cacheado: 'Cacheado',
  ondulado: 'Ondulado',
  liso: 'Liso',
};

export const HAIR_LENGTH_LABELS: Record<HairLength, string> = {
  curto: 'Curto',
  medio: 'Médio',
  longo: 'Longo',
};

export const WEEKDAY_SHORT_LABELS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];

export type PackageStatusLabel = 'Vigente' | 'Agendado' | 'Expirado';

export function getPackageStatus(
  pkg: PackagePromo,
  referenceDateIso: string
): PackageStatusLabel {
  if (referenceDateIso < pkg.validFrom) return 'Agendado';
  if (referenceDateIso > pkg.validUntil || !pkg.active) return 'Expirado';
  return 'Vigente';
}

export function calculatePackageSavings(
  pkg: PackagePromo,
  services: Service[]
): { regularTotal: number; savings: number; savingsPercent: number } {
  const regularTotal = pkg.serviceIds.reduce((acc, sid) => {
    const svc = services.find((s) => s.id === sid);
    if (!svc) return acc;
    if (svc.variesByHair && svc.hairMatrix) {
      // Base reference: médio ondulado when package combines hair service
      return acc + svc.hairMatrix.ondulado.medio.price;
    }
    return acc + svc.fixedPrice;
  }, 0);
  const savings = Math.max(0, regularTotal - pkg.price);
  const savingsPercent =
    regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;
  return { regularTotal, savings, savingsPercent };
}

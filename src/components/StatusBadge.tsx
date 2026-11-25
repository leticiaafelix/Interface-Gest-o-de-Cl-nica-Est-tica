import React from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  PlayCircle,
  Store,
  UserX,
  Hourglass,
} from 'lucide-react';
import { AppointmentOrigin, AppointmentStatus, PaymentStatus } from '../types/clinic';

export const AppointmentStatusLabel: React.FC<{
  status: AppointmentStatus;
  isLate?: boolean;
}> = ({ status, isLate }) => {
  if (status === 'agendado' && isLate) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
        style={{
          backgroundColor: '#FDECEC',
          color: '#9B2C2C',
          borderColor: '#F5C2C2',
        }}
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Atrasada</span>
      </span>
    );
  }

  const map: Record<
    AppointmentStatus,
    { label: string; bg: string; text: string; border: string; Icon: React.FC<{ className?: string }> }
  > = {
    agendado: {
      label: 'Agendado',
      bg: '#F3E3DC',
      text: '#6D4349',
      border: '#E4C8BC',
      Icon: Clock,
    },
    em_atendimento: {
      label: 'Em atendimento',
      bg: '#FEF6E6',
      text: '#8D6114',
      border: '#ECD39B',
      Icon: PlayCircle,
    },
    concluido: {
      label: 'Concluído',
      bg: '#E8F4EC',
      text: '#1F6138',
      border: '#BCE0C8',
      Icon: CheckCircle2,
    },
    nao_compareceu: {
      label: 'Não compareceu',
      bg: '#FDECEC',
      text: '#9B2C2C',
      border: '#F5C2C2',
      Icon: UserX,
    },
    na_fila: {
      label: 'Na fila',
      bg: '#FFF4E5',
      text: '#8C5214',
      border: '#F0D0A8',
      Icon: Hourglass,
    },
    nao_atendida: {
      label: 'Não atendida',
      bg: '#FDECEC',
      text: '#9B2C2C',
      border: '#F5C2C2',
      Icon: AlertCircle,
    },
    cancelado: {
      label: 'Cancelado',
      bg: '#F2EFEF',
      text: '#5A5254',
      border: '#DDD5D6',
      Icon: Ban,
    },
  };

  const cfg = map[status];
  const Icon = cfg.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};

export const PaymentStatusLabel: React.FC<{
  status: PaymentStatus;
  cardLast4?: string;
}> = ({ status, cardLast4 }) => {
  const map: Record<
    PaymentStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    pago: {
      label: cardLast4 ? `Pago · •••• ${cardLast4}` : 'Pago',
      bg: '#E8F4EC',
      text: '#1F6138',
      border: '#BCE0C8',
    },
    pendente: {
      label: 'Pendente',
      bg: '#FEF6E6',
      text: '#8D6114',
      border: '#ECD39B',
    },
    reembolsado_total: {
      label: 'Reembolsado 100%',
      bg: '#F2EFEF',
      text: '#5A5254',
      border: '#DDD5D6',
    },
    reembolsado_parcial: {
      label: 'Estorno 50%',
      bg: '#FFF4E5',
      text: '#8C5214',
      border: '#F0D0A8',
    },
    retido_parcial: {
      label: '50% retido / 50% crédito',
      bg: '#FDECEC',
      text: '#9B2C2C',
      border: '#F5C2C2',
    },
  };

  const cfg = map[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap tabular-nums"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      <CreditCard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
};

export const OriginBadge: React.FC<{ origin: AppointmentOrigin }> = ({ origin }) => {
  if (origin === 'online') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3E3DC] text-[#7D434D] border border-[#E6CCC1] whitespace-nowrap">
        <Globe className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>Reserva online</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F7F3EF] text-[#5B524A] border border-[#E2D8CE] whitespace-nowrap">
      <Store className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>Balcão</span>
    </span>
  );
};

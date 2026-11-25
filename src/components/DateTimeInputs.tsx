import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  formatDateBR,
  getTodayIsoLocal,
  isValidTime24h,
  maskDateBRInput,
  maskTime24hInput,
  parseDateBRToIso,
} from '../utils/formatters';

interface BrazilianDateInputProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  'aria-label'?: string;
  className?: string;
  required?: boolean;
  alignRight?: boolean;
  fullWidth?: boolean;
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAYS_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const BrazilianDateInput: React.FC<BrazilianDateInputProps> = ({
  id,
  value,
  onChange,
  min,
  max,
  'aria-label': ariaLabel,
  className = '',
  required,
  alignRight = false,
  fullWidth = false,
}) => {
  const [text, setText] = useState(() => formatDateBR(value));
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)) || 2026);
  const [viewMonth, setViewMonth] = useState(
    () => (Number(value.slice(5, 7)) || 1) - 1
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(formatDateBR(value));
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setViewYear(Number(value.slice(0, 4)));
      setViewMonth(Number(value.slice(5, 7)) - 1);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isWithinBounds = (iso: string) => {
    if (min && iso < min) return false;
    if (max && iso > max) return false;
    return true;
  };

  const handleTextChange = (raw: string) => {
    const masked = maskDateBRInput(raw);
    setText(masked);
    const parsed = parseDateBRToIso(masked);
    if (parsed && isWithinBounds(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseDateBRToIso(text);
    if (parsed && isWithinBounds(parsed)) {
      setText(formatDateBR(parsed));
    } else {
      setText(formatDateBR(value));
    }
  };

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();

  const shiftMonth = (delta: number) => {
    const dt = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(dt.getUTCFullYear());
    setViewMonth(dt.getUTCMonth());
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'flex w-full' : 'inline-flex'} items-center`}
    >
      <div
        className={`inline-flex items-center justify-between gap-1 ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="dd/mm/aaaa"
          aria-label={ariaLabel}
          required={required}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          className={`${
            fullWidth ? 'flex-1 min-w-0' : 'w-[92px]'
          } bg-transparent border-none p-0 text-inherit font-inherit tabular-nums focus:outline-none`}
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={`Abrir calendário${ariaLabel ? ` (${ariaLabel})` : ''}`}
          className="p-1 rounded-full hover:bg-[#F3E3DC] text-[#6E6567] shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Calendário"
          className={`absolute top-full mt-2 z-40 w-64 rounded-2xl bg-white border border-[#EADAD3] shadow-lg p-3 ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="p-1 rounded-full hover:bg-[#F3E3DC] text-[#2E2A2B]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#2E2A2B]">
              {MONTHS_PT[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              className="p-1 rounded-full hover:bg-[#F3E3DC] text-[#2E2A2B]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#6E6567] mb-1">
            {WEEKDAYS_INITIALS.map((w, i) => (
              <span key={`${w}-${i}`}>{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstWeekday }).map((_, idx) => (
              <span key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = `${String(viewYear).padStart(4, '0')}-${String(
                viewMonth + 1
              ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const selected = iso === value;
              const disabled = !isWithinBounds(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-7 w-7 mx-auto rounded-full text-xs tabular-nums transition-colors ${
                    selected
                      ? 'bg-[#B76E79] text-white font-semibold'
                      : disabled
                      ? 'text-[#C9BFC1] cursor-not-allowed'
                      : 'text-[#2E2A2B] hover:bg-[#F3E3DC]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[#F1E6E0] flex justify-end">
            <button
              type="button"
              onClick={() => {
                const today = getTodayIsoLocal();
                if (isWithinBounds(today)) {
                  onChange(today);
                  setOpen(false);
                }
              }}
              className="text-[11px] font-semibold text-[#9A5560] hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BrazilianTimeInputProps {
  id?: string;
  value: string; // HH:mm
  onChange: (hhmm: string) => void;
  'aria-label'?: string;
  className?: string;
  showClockPicker?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

const HOURS_PRESETS = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
];

export const BrazilianTimeInput: React.FC<BrazilianTimeInputProps> = ({
  id,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
  showClockPicker = true,
  compact = false,
  fullWidth = false,
}) => {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleTextChange = (raw: string) => {
    const masked = maskTime24hInput(raw);
    setText(masked);
    if (isValidTime24h(masked)) {
      onChange(masked);
    }
  };

  const handleBlur = () => {
    if (isValidTime24h(text)) {
      setText(text);
    } else {
      setText(value);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'flex w-full' : 'inline-flex'} items-center`}
    >
      <div
        className={`inline-flex items-center justify-between gap-1 ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="00:00"
          aria-label={ariaLabel}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          className={`${
            fullWidth ? 'flex-1 min-w-0' : compact ? 'w-[44px]' : 'w-[54px]'
          } bg-transparent border-none p-0 text-inherit font-inherit tabular-nums focus:outline-none`}
        />
        {showClockPicker && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={`Selecionar horário${ariaLabel ? ` (${ariaLabel})` : ''}`}
            className="p-0.5 rounded-full hover:bg-[#F3E3DC] text-[#6E6567] shrink-0"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Horários em 24 horas"
          className="absolute left-0 top-full mt-1.5 z-40 w-28 max-h-52 overflow-y-auto rounded-xl bg-white border border-[#EADAD3] shadow-lg p-1"
        >
          {HOURS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs tabular-nums ${
                preset === value
                  ? 'bg-[#B76E79] text-white font-semibold'
                  : 'text-[#2E2A2B] hover:bg-[#F3E3DC]/60'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

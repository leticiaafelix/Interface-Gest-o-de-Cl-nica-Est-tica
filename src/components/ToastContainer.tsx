import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useClinic();
  const activeToast = toasts[0];

  if (!activeToast) return null;

  const styles =
    activeToast.type === 'success'
      ? {
          bg: '#F4FBF6',
          border: '#BCE0C8',
          iconColor: '#1F6138',
          Icon: CheckCircle2,
        }
      : activeToast.type === 'error'
      ? {
          bg: '#FEF5F5',
          border: '#F5C2C2',
          iconColor: '#9B2C2C',
          Icon: AlertCircle,
        }
      : {
          bg: '#FFFAF7',
          border: '#C9A46A',
          iconColor: '#9A5560',
          Icon: Info,
        };
  const Icon = styles.Icon;

  return (
    <div
      className="bg-[#FFFAF7]/95 backdrop-blur-sm border-b border-[#EADAD3] px-4 sm:px-6 py-2.5"
      aria-live="polite"
      role="status"
    >
      <div className="max-w-[1440px] mx-auto">
        <div
          key={activeToast.id}
          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border shadow-sm"
          style={{
            backgroundColor: styles.bg,
            borderColor: styles.border,
          }}
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <Icon
              className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0"
              style={{ color: styles.iconColor }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold text-[#2E2A2B]">
                {activeToast.title}
              </p>
              {activeToast.description && (
                <p className="text-xs text-[#6E6567]">
                  {activeToast.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {activeToast.actionLabel && activeToast.onAction && (
              <button
                type="button"
                onClick={() => {
                  activeToast.onAction?.();
                  dismissToast(activeToast.id);
                }}
                className="px-3.5 py-1 rounded-full text-xs font-semibold border border-[#1F6138]/35 bg-white text-[#1F6138] hover:bg-[#1F6138] hover:text-white transition-colors whitespace-nowrap"
              >
                {activeToast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(activeToast.id)}
              aria-label="Dispensar notificação"
              className="p-1 rounded-full text-[#6E6567] hover:text-[#2E2A2B] hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

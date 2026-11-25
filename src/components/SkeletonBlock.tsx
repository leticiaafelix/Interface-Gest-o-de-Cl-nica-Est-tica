import React from 'react';
import { CalendarX2 } from 'lucide-react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Carregando dados">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-12 rounded-xl bg-[#F3E3DC]/60 border border-[#EADAD3]/70"
      />
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => (
  <div className="rf-card p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-4">
    <div className="w-14 h-14 rounded-2xl bg-[#F3E3DC] border border-[#E4C8BC] flex items-center justify-center text-[#B76E79] mb-4">
      {icon ?? <CalendarX2 className="w-7 h-7" aria-hidden="true" />}
    </div>
    <h3 className="font-display text-xl font-semibold text-[#2E2A2B]">
      {title}
    </h3>
    <p className="text-sm text-[#6E6567] mt-1.5 max-w-sm">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="rf-btn-primary px-5 py-2.5 text-sm font-medium mt-5"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

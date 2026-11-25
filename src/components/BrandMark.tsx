import React from 'react';

interface BrandMarkProps {
  compact?: boolean;
  light?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ compact = false, light = false }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: light ? 'rgba(255,250,247,0.16)' : '#F3E3DC',
          borderColor: light ? 'rgba(201,164,106,0.6)' : '#C9A46A',
        }}
        aria-hidden="true"
      >
        <span
          className="font-display text-lg font-semibold tracking-tight"
          style={{ color: light ? '#FFFAF7' : '#B76E79' }}
        >
          RF
        </span>
      </div>
      {!compact && (
        <div className="leading-tight min-w-0">
          <p
            className="font-display text-base font-semibold tracking-tight whitespace-nowrap"
            style={{ color: light ? '#FFFAF7' : '#2E2A2B' }}
          >
            Rebecca Felix
          </p>
          <p
            className="text-[11px] tracking-wide whitespace-nowrap"
            style={{ color: light ? 'rgba(255,250,247,0.75)' : '#6E6567' }}
          >
            Salão &amp; Estética · Gestão
          </p>
        </div>
      )}
    </div>
  );
};

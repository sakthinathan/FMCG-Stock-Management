import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  borderColor?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function KpiStatCard({
  label,
  value,
  sub,
  borderColor = '#4f46e5',
  icon: Icon,
}: KpiStatCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        padding: '20px 20px 18px',
        borderLeft: `4px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          {label}
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{sub}</p>}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${borderColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={borderColor} />
      </div>
    </div>
  );
}

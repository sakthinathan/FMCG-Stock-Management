import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconBg?: string;
  iconColor?: string;
  maxWidth?: number;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  iconBg = '#eef2ff',
  iconColor = '#4f46e5',
  maxWidth = 480,
}: EmptyStateProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        maxWidth,
        margin: '60px auto',
        padding: '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={26} color={iconColor} />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#4f46e5',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

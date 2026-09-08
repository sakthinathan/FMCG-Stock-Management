import React from 'react';

export type StatusType =
  | 'Equal'
  | 'Shortage'
  | 'Excess'
  | 'In Progress'
  | 'Completed'
  | 'Not Started'
  | 'Uncounted'
  | 'New Issue'
  | 'Resolved'
  | 'Increased'
  | 'Decreased'
  | 'Unchanged'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  customLabel?: string;
  size?: 'sm' | 'md';
}

const statusConfigs: Record<string, { bg: string; color: string; border: string; label: string }> = {
  'Equal':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Equal' },
  'Shortage':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Shortage' },
  'Excess':    { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Excess' },
  'In Progress': { bg: '#fef2f2', color: '#e52321', border: '#fecaca', label: '⏸ In Progress' },
  'Completed': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: '✓ Completed' },
  'Not Started': { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Not Started' },
  'Uncounted':  { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Uncounted' },
  'New Issue':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'New Issue' },
  'Resolved':   { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Resolved' },
  'Increased':  { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', label: 'Increased' },
  'Decreased':  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Decreased' },
  'Unchanged':  { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Unchanged' },
};

export function StatusBadge({ status, customLabel, size = 'md' }: StatusBadgeProps) {
  const config = statusConfigs[status] || {
    bg: '#f8fafc',
    color: '#64748b',
    border: '#e2e8f0',
    label: status
  };

  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: isSm ? 10 : 11,
        fontWeight: 600,
        padding: isSm ? '2px 6px' : '3px 8px',
        borderRadius: 9999,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {customLabel || config.label}
    </span>
  );
}

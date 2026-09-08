import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  height?: number | string;
  label?: string;
}

export function LoadingSpinner({
  size = 30,
  color = '#4f46e5',
  height = 240,
  label
}: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap: 12
      }}
    >
      <Loader2
        size={size}
        color={color}
        style={{ animation: 'spin 1s linear infinite' }}
      />
      {label && <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{label}</p>}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

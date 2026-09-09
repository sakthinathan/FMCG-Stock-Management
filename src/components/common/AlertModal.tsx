import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
  onClose: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    info: { icon: Info, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', defaultTitle: 'Notice' },
    error: { icon: AlertCircle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', defaultTitle: 'Error' },
    success: { icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', defaultTitle: 'Success' },
    warning: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', defaultTitle: 'Warning' },
  }[type];

  const Icon = typeConfig.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: typeConfig.bg,
            color: typeConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            border: `1px solid ${typeConfig.border}`,
          }}
        >
          <Icon size={28} />
        </div>

        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px 0',
          }}
        >
          {title || typeConfig.defaultTitle}
        </h3>

        <p
          style={{
            fontSize: 13,
            color: '#64748b',
            margin: '0 0 20px 0',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 10,
            border: 'none',
            background: typeConfig.color,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: `0 4px 12px ${typeConfig.color}40`,
          }}
        >
          OK
        </button>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

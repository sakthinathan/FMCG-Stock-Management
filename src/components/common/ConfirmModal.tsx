import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  promptWord?: string;
  inputValue?: string;
  onInputChange?: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  promptWord,
  inputValue = '',
  onInputChange,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isPromptInvalid = promptWord ? inputValue !== promptWord : false;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          border: `1px solid ${isDanger ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          padding: 24,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: isDanger ? '#dc2626' : '#0f172a',
            margin: 0,
          }}
        >
          {title}
        </h3>
        <div style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          {description}
        </div>

        {promptWord && onInputChange && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={promptWord}
            autoFocus
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              boxSizing: 'border-box',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              background: '#fff',
              color: '#0f172a',
              outline: 'none',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isPromptInvalid) {
                onConfirm();
              }
            }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: 'transparent',
              color: '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPromptInvalid}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: isDanger ? '#dc2626' : '#4f46e5',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: isPromptInvalid ? 'not-allowed' : 'pointer',
              opacity: isPromptInvalid ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

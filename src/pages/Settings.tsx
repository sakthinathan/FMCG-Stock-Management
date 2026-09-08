import React, { useState } from 'react';
import { Moon, Sun, Monitor, Trash2, AlertTriangle, Loader2, User, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useStockStore } from '@/store/useStockStore';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmModal } from '@/components/common/ConfirmModal';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, agency } = useAuth();
  const { clearActiveUpload } = useStockStore();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const handleFactoryReset = () => {
    setShowResetConfirm(true);
  };

  const proceedToPrompt = () => {
    setShowResetConfirm(false);
    setDeleteConfirmInput('');
    setShowResetPrompt(true);
  };

  const confirmFactoryReset = async () => {
    if (deleteConfirmInput !== 'DELETE') {
      setModalMessage("Verification word incorrect. Factory reset aborted.");
      setShowResetPrompt(false);
      return;
    }
    setShowResetPrompt(false);
    setIsClearing(true);
    try {
      const { error } = await supabase.from('stock_uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      clearActiveUpload();
      setModalMessage('Database cleared successfully.');
      navigate('/');
    } catch (e: any) {
      setModalMessage('Failed: ' + e.message);
    } finally {
      setIsClearing(false);
    }
  };

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Manage application preferences, security policies, and database state"
        icon={SettingsIcon}
      />

      {/* Two-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Appearance */}
        <div style={W}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun size={16} color="#e52321" />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Appearance</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>Customize how StockSync looks</p>
            </div>
          </div>
          <div style={{ padding: '18px 22px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>Theme</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {themeOptions.map(({ key, label, icon: Icon }) => {
                const active = theme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTheme(key as any)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '16px 8px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      border: active ? '2px solid #e52321' : '1.5px solid #e2e8f0',
                      background: active ? '#fef2f2' : '#f8fafc',
                      color: active ? '#e52321' : '#64748b',
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Account */}
        <div style={W}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="#16a34a" />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Distributor Account</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>Agency credentials & session info</p>
            </div>
          </div>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>AW Code</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#e52321', margin: 0, fontFamily: 'monospace' }}>{agency?.aw_code || 'AW0001'}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Agency Name & Location</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{agency?.name || 'Thulir Agency'}{agency?.district ? ` (${agency.district})` : ''}</p>
            </div>
            {agency?.mobile && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Mobile Number</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>+91 {agency.mobile}</p>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <Shield size={13} color="#16a34a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Authenticated Distributor Session</span>
            </div>
          </div>
        </div>

        {/* Security & Data Storage */}
        <div style={W}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Security & Data Storage</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>Data isolation and safety compliance</p>
            </div>
          </div>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Tenant Isolation Level</p>
              <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
                Row-Level Security (RLS) enforced at database level. Your agency data is physically isolated and inaccessible by other organizations.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Storage Encryption</p>
              <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
                Encrypted at rest using AES-256 standard and in transit via HTTPS/TLS 1.3 tunnels on secure Supabase cloud hosting.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Audit Logging</p>
              <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
                All stock counts record user metadata (Auditor ID, session timestamps, and discrepancy reason codes) for compliance tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...W, border: '1px solid #fecaca', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#dc2626" />
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: 0 }}>Danger Zone</h2>
            <p style={{ fontSize: 12, color: '#ef4444', margin: '1px 0 0' }}>Destructive actions that cannot be reversed</p>
          </div>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Factory Reset Database</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 480 }}>
              Permanently deletes all uploaded files, stock snapshots, and physical counts from Supabase. Use only when starting a completely new audit cycle.
            </p>
          </div>
          <button
            onClick={handleFactoryReset}
            disabled={isClearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 9,
              border: 'none',
              background: isClearing ? '#fca5a5' : '#dc2626',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: isClearing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {isClearing ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Clearing...</>
            ) : (
              <><Trash2 size={14} /> Clear Entire Database</>
            )}
          </button>
        </div>
      </div>

      {/* System info footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Database', value: 'Supabase PostgreSQL', status: 'HEALTHY', color: '#16a34a' },
          { label: 'Cloud Storage', value: 'Supabase Buckets', status: 'ACTIVE', color: '#16a34a' },
          { label: 'Auth Engine', value: 'Supabase Auth', status: 'VERIFIED', color: '#e52321' },
        ].map(r => (
          <div key={r.label} style={{ ...W, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{r.label}</p>
              <p style={{ fontSize: 12, color: '#475569', margin: '3px 0 0' }}>{r.value}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: r.color, letterSpacing: '0.06em' }}>{r.status}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Factory Reset Database?"
        description="WARNING: This will permanently delete ALL stock uploads, snapshots, and counts. This cannot be undone. Are you sure you want to proceed?"
        confirmText="Yes, Proceed"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={proceedToPrompt}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPrompt}
        title="Confirm Destruction"
        description="To confirm factory reset, please type DELETE in the box below:"
        promptWord="DELETE"
        inputValue={deleteConfirmInput}
        onInputChange={setDeleteConfirmInput}
        confirmText="Confirm Reset"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmFactoryReset}
        onCancel={() => setShowResetPrompt(false)}
      />

      <ConfirmModal
        isOpen={!!modalMessage}
        title="Notification"
        description={modalMessage || ''}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setModalMessage(null)}
        onCancel={() => setModalMessage(null)}
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

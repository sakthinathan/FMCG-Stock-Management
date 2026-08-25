import React, { useState } from 'react';
import { Moon, Sun, Monitor, Trash2, AlertTriangle, Loader2, User, Database, Shield } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useStockStore } from '@/store/useStockStore';
import { useNavigate } from 'react-router-dom';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { clearActiveUpload } = useStockStore();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);

  const handleFactoryReset = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL stock uploads, snapshots, and counts. This cannot be undone. Are you sure?')) return;
    if (prompt("Type 'DELETE' to confirm:") !== 'DELETE') return;
    setIsClearing(true);
    try {
      const { error } = await supabase.from('stock_uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      clearActiveUpload();
      alert('Database cleared successfully.');
      navigate('/');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    } finally { setIsClearing(false); }
  };

  const themeOptions = [
    { key: 'light',  label: 'Light',  icon: Sun  },
    { key: 'dark',   label: 'Dark',   icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Inter', sans-serif" }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Settings</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Manage application preferences and data</p>
      </div>

      {/* Two-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>

        {/* Appearance */}
        <div style={W}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun size={16} color="#4f46e5" />
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
                  <button key={key} onClick={() => setTheme(key as any)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '16px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      border: active ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                      background: active ? '#eef2ff' : '#f8fafc',
                      color: active ? '#4f46e5' : '#64748b',
                      fontSize: 12, fontWeight: active ? 700 : 500,
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
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Account Details</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>Your current login session</p>
            </div>
          </div>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Email Address</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Account ID</p>
              <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>{user?.id}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <Shield size={13} color="#16a34a" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Authenticated via Supabase</span>
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
          <button onClick={handleFactoryReset} disabled={isClearing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 9, border: 'none', background: isClearing ? '#fca5a5' : '#dc2626',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: isClearing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {isClearing
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Clearing...</>
              : <><Trash2 size={14} /> Clear Entire Database</>
            }
          </button>
        </div>
      </div>

      {/* System info footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Database', value: 'Supabase PostgreSQL', status: 'HEALTHY', color: '#16a34a' },
          { label: 'Cloud Storage', value: 'Supabase Buckets', status: 'ACTIVE', color: '#16a34a' },
          { label: 'Auth Engine', value: 'Supabase Auth', status: 'VERIFIED', color: '#4f46e5' },
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

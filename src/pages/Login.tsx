import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PackageOpen, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <PackageOpen size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>StockSync</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>FMCG Stock Reconciliation</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
          padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Welcome back</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Sign in to your account</p>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                style={{
                  width: '100%', height: 42, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 14, color: '#0f172a',
                  background: '#fff', boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                id="password" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                style={{
                  width: '100%', height: 42, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 14, color: '#0f172a',
                  background: '#fff', boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', height: 44, borderRadius: 9, border: 'none',
                background: loading ? '#818cf8' : '#4f46e5', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          FMCG Physical Stock Reconciliation System
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

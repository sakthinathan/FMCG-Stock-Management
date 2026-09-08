import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PackageSearch, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif",
      background: 'linear-gradient(135deg, #181111 0%, #0f172a 50%, #7f1d1d 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Logo + Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img 
          src={`${import.meta.env.BASE_URL}britannia_logo.webp`} 
          alt="Britannia Logo"
          style={{
            height: 72,
            objectFit: 'contain',
            margin: '0 auto 18px',
            display: 'block'
          }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>THULIR AGENCY</h1>
        <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Stock Management</p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420, background: '#ffffff',
        borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        border: '1px solid #fecaca',
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase' }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Please enter your credentials</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" placeholder="admin@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                style={{
                  width: '100%', height: 46, paddingLeft: 38, paddingRight: 14,
                  border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14,
                  color: '#0f172a', background: '#fff', boxSizing: 'border-box',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                style={{
                  width: '100%', height: 46, paddingLeft: 38, paddingRight: 44,
                  border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14,
                  color: '#0f172a', background: '#fff', boxSizing: 'border-box',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', display: 'flex' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', height: 48, marginTop: 6, borderRadius: 12, border: 'none',
              background: loading ? '#991b1b' : '#e52321', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', letterSpacing: '0.02em', textTransform: 'uppercase',
              boxShadow: '0 4px 14px rgba(229,35,33,0.35)',
            }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
              : <>Sign In <ArrowRight size={16} /></>
            }
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Don't have an agency? <Link to="/signup" style={{ color: '#e52321', fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: '#fca5a5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Britannia FMCG Stock Counter Portal
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

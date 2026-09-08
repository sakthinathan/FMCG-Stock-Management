import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, Hash, Building2, MapPin, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [awCode, setAwCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verified Agency state
  const [agencyData, setAgencyData] = useState<{ id: string; name: string; district?: string | null; mobile?: string | null } | null>(null);
  const [verifyingAgency, setVerifyingAgency] = useState(false);
  const [agencyNotFound, setAgencyNotFound] = useState(false);

  // Pre-fill registered AW Code if coming from signup
  useEffect(() => {
    if (location.state?.registeredAwCode) {
      setAwCode(location.state.registeredAwCode);
    }
  }, [location.state]);

  // Lookup Agency by AW Code dynamically as user types
  useEffect(() => {
    const cleanAwCode = awCode.trim().toUpperCase();
    if (cleanAwCode.length < 3) {
      setAgencyData(null);
      setAgencyNotFound(false);
      return;
    }

    const timer = setTimeout(async () => {
      setVerifyingAgency(true);
      setAgencyNotFound(false);
      try {
        const { data, error } = await supabase
          .from('agencies')
          .select('id, name, district, mobile')
          .ilike('aw_code', cleanAwCode)
          .maybeSingle();

        if (data) {
          setAgencyData(data);
          setAgencyNotFound(false);
        } else {
          setAgencyData(null);
          setAgencyNotFound(true);
        }
      } catch (e) {
        console.error('Agency lookup error:', e);
      } finally {
        setVerifyingAgency(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [awCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAwCode = awCode.trim().toUpperCase();
    if (!cleanAwCode) {
      setError('Please enter your AW Code.');
      return;
    }
    if (!agencyData) {
      setError(`AW Code "${cleanAwCode}" is not registered. Please check or register your agency.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Internal email format: aw25999@britanniaaudit.com
      const safeCode = cleanAwCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const internalEmail = `aw${safeCode}@britanniaaudit.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect Password. Please check your password and try again.');
        }
        throw error;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif",
      background: 'linear-gradient(135deg, #181111 0%, #0f172a 50%, #7f1d1d 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      {/* Logo + Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img 
          src={`${import.meta.env.BASE_URL}britannia_logo.webp`} 
          alt="Britannia Logo"
          style={{ height: 68, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>DISTRIBUTOR LOGIN</h1>
        <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>FMCG Stock Audit Portal</p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420, background: '#ffffff',
        borderRadius: 20, padding: '30px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        border: '1px solid #fecaca',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase' }}>Sign In</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Enter your AW Code and Password</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* AW Code Input */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              AW Code (Agency Code)
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={15} color="#94a3b8" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              {verifyingAgency && (
                <Loader2 size={15} color="#e52321" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
              )}
              <input
                type="text" placeholder="e.g. AW100234"
                value={awCode} onChange={e => setAwCode(e.target.value.toUpperCase())} required
                style={{
                  width: '100%', height: 46, paddingLeft: 38, paddingRight: 38,
                  border: agencyData ? '2px solid #16a34a' : agencyNotFound ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  borderRadius: 10, fontSize: 15, fontWeight: 700,
                  color: '#0f172a', background: '#fff', boxSizing: 'border-box',
                  outline: 'none', fontFamily: 'inherit', letterSpacing: '0.04em'
                }}
              />
            </div>
          </div>

          {/* Verified Agency Card Banner */}
          {agencyData && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={16} color="#16a34a" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{agencyData.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={10} /> Verified
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#475569', fontWeight: 600 }}>
                {agencyData.district && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} color="#64748b" /> {agencyData.district}</span>
                )}
                {agencyData.mobile && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} color="#64748b" /> {agencyData.mobile}</span>
                )}
              </div>
            </div>
          )}

          {agencyNotFound && awCode.trim().length >= 3 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>AW Code "{awCode}" not found. Check the code or <Link to="/signup" style={{ color: '#e52321', fontWeight: 700 }}>Register New Agency</Link>.</span>
            </div>
          )}

          {/* Password Input */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Password
            </label>
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
              width: '100%', height: 48, marginTop: 4, borderRadius: 12, border: 'none',
              background: loading ? '#991b1b' : '#e52321', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', letterSpacing: '0.03em', textTransform: 'uppercase',
              boxShadow: '0 4px 14px rgba(229,35,33,0.35)',
            }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
              : <>Sign In To Agency Portal <ArrowRight size={16} /></>
            }
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          New Distributor Agency? <Link to="/signup" style={{ color: '#e52321', fontWeight: 700, textDecoration: 'none' }}>Register New Agency</Link>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: '#fca5a5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Britannia FMCG Stock Audit Platform
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


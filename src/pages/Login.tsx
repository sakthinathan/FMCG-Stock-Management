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

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAwCode, setResetAwCode] = useState('');
  const [resetMobile, setResetMobile] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const cleanCode = resetAwCode.trim().toUpperCase();
    const cleanMobile = resetMobile.trim();

    if (!cleanCode || !cleanMobile) {
      setResetError('Please enter both AW Code and Registered Mobile Number.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_agency_password', {
        p_aw_code: cleanCode,
        p_mobile: cleanMobile,
        p_new_password: resetPassword
      });

      if (error) throw error;

      setResetSuccess('Password reset successfully! You can now log in with your new password.');
      setTimeout(() => {
        setShowResetModal(false);
        setAwCode(cleanCode);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password. Please check your AW Code and Mobile No.');
    } finally {
      setResetLoading(false);
    }
  };

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
              AW Code (5-Digit Number)
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={15} color="#94a3b8" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              {verifyingAgency && (
                <Loader2 size={15} color="#e52321" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
              )}
              <input
                type="text" inputMode="numeric" placeholder="e.g. 25999" maxLength={5}
                value={awCode} onChange={e => setAwCode(e.target.value.replace(/\D/g, '').slice(0, 5))} required
                style={{
                  width: '100%', height: 46, paddingLeft: 38, paddingRight: 38,
                  border: agencyData ? '2px solid #16a34a' : agencyNotFound ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                  borderRadius: 10, fontSize: 15, fontWeight: 700,
                  color: '#0f172a', background: '#fff', boxSizing: 'border-box',
                  outline: 'none', fontFamily: 'inherit', letterSpacing: '0.06em'
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

          {/* Password Input Header with Forgot Link */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => { setShowResetModal(true); setResetError(null); setResetSuccess(null); }}
                style={{ border: 'none', background: 'none', color: '#e52321', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
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

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowResetModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: '#fff', borderRadius: 20, padding: '24px 24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #fecaca', zIndex: 101 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase' }}>Reset Password</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>Verify your AW Code and Registered Mobile Number</p>

            {resetError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, color: '#16a34a', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>AW Code (5-Digit Number) *</label>
                <input
                  type="text" inputMode="numeric" required placeholder="e.g. 25999" maxLength={5}
                  value={resetAwCode} onChange={e => setResetAwCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', letterSpacing: '0.05em' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Registered Mobile No *</label>
                <input
                  type="tel" required placeholder="9876543210" maxLength={10}
                  value={resetMobile} onChange={e => setResetMobile(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>New Password *</label>
                <input
                  type="password" required placeholder="••••••••"
                  value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Confirm New Password *</label>
                <input
                  type="password" required placeholder="••••••••"
                  value={resetConfirmPassword} onChange={e => setResetConfirmPassword(e.target.value)}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button" onClick={() => setShowResetModal(false)}
                  style={{ flex: 1, height: 42, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={resetLoading}
                  style={{ flex: 1, height: 42, background: resetLoading ? '#991b1b' : '#e52321', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: resetLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', textTransform: 'uppercase' }}
                >
                  {resetLoading ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 11, color: '#fca5a5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Britannia FMCG Stock Audit Platform
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


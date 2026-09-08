import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Create Agency first (public insert allowed)
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyName,
          logo_url: logoUrl || null
        })
        .select()
        .single();
      if (agencyError) throw agencyError;

      // 2. Sign up user in Auth with agency metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            agency_id: agencyData.id,
            role: 'Owner'
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed.');

      alert('Agency and Admin Account registered successfully!');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif",
      background: 'linear-gradient(135deg, #181111 0%, #0f172a 50%, #7f1d1d 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img 
          src={`${import.meta.env.BASE_URL}britannia_logo.webp`} 
          alt="Britannia Logo"
          style={{
            height: 64,
            objectFit: 'contain',
            margin: '0 auto 16px',
            display: 'block'
          }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>GET STARTED</h1>
        <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>Create Agency & Owner Account</p>
      </div>

      {/* Card */}
      <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#b91c1c', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agency Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agency Name</label>
            <input
              type="text" required placeholder="e.g. Sathish Distributors"
              value={agencyName} onChange={e => setAgencyName(e.target.value)}
              style={{ height: 44, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0 14px', color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Logo URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo Image URL (Optional)</label>
            <input
              type="url" placeholder="https://example.com/logo.png"
              value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              style={{ height: 44, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0 14px', color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Email</label>
            <input
              type="email" required placeholder="admin@myagency.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ height: 44, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0 14px', color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ height: 44, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0 14px', color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{ height: 48, background: loading ? '#991b1b' : '#e52321', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'background 0.2s', fontFamily: 'inherit', textTransform: 'uppercase', boxShadow: '0 4px 14px rgba(229,35,33,0.35)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#c8102e'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#e52321'; }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Register Agency & Admin
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#e52321', fontWeight: 700, textDecoration: 'none' }}>Log In</Link>
        </div>
      </div>
    </div>
  );
}

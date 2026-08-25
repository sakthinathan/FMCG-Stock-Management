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
      // 1. Sign up user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed.');

      // 2. Create Agency
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyName,
          logo_url: logoUrl || null
        })
        .select()
        .single();
      if (agencyError) throw agencyError;

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          agency_id: agencyData.id,
          role: 'Owner'
        });
      if (profileError) throw profileError;

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
      minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif",
      background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0b0f19 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>GET STARTED</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 600 }}>Create Agency & Owner Account</p>
      </div>

      {/* Card */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#b91c1c', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agency Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agency Name</label>
            <input
              type="text" required placeholder="e.g. Sathish Distributors"
              value={agencyName} onChange={e => setAgencyName(e.target.value)}
              style={{ height: 42, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '0 12px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Logo URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logo Image URL (Optional)</label>
            <input
              type="url" placeholder="https://example.com/logo.png"
              value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              style={{ height: 42, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '0 12px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Email</label>
            <input
              type="email" required placeholder="admin@myagency.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ height: 42, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '0 12px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ height: 42, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '0 12px', color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{ height: 44, background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'background 0.2s', fontFamily: 'inherit' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#4338ca'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#4f46e5'; }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Register Agency & Admin
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
          Already have an account? <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
        </div>
      </div>
    </div>
  );
}

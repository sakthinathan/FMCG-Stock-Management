import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Building, MapPin, Phone, Hash, Lock, CheckCircle2 } from 'lucide-react';

export function Signup() {
  const navigate = useNavigate();
  const [awCode, setAwCode] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [district, setDistrict] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAwCode = awCode.trim().toUpperCase();
    if (!cleanAwCode) {
      setError('Please enter a valid AW Code.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mobile && !/^\d{10}$/.test(mobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if AW Code is already registered
      const { data: existingAgency } = await supabase
        .from('agencies')
        .select('id')
        .eq('aw_code', cleanAwCode)
        .maybeSingle();

      if (existingAgency) {
        throw new Error(`AW Code "${cleanAwCode}" is already registered. Please log in with your existing AW Code.`);
      }

      // 2. Create Agency (Try direct insert, fallback to RPC if RLS blocks direct table insert)
      let agencyId: string | null = null;
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyName.trim(),
          aw_code: cleanAwCode,
          district: district.trim(),
          mobile: mobile.trim()
        })
        .select()
        .single();

      if (agencyError) {
        // Fallback to RPC function if RLS policy blocks direct table insert
        const { data: rpcId, error: rpcError } = await supabase
          .rpc('create_agency', {
            p_agency_name: agencyName.trim(),
            p_aw_code: cleanAwCode,
            p_district: district.trim() || null,
            p_mobile: mobile.trim() || null
          });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          throw new Error('Database RLS Policy Error: Please run the SQL snippet in Supabase SQL Editor.');
        }
        agencyId = rpcId;
      } else {
        agencyId = agencyData.id;
      }

      // 3. Construct clean internal email identifier for auth: e.g. aw25999@britanniaaudit.com
      const safeCode = cleanAwCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const internalEmail = `aw${safeCode}@britanniaaudit.com`;

      // 4. Register user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          data: {
            agency_id: agencyId,
            role: 'Owner'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User registration failed.');

      alert(`Agency "${agencyName}" registered successfully with AW Code: ${cleanAwCode}`);
      navigate('/login', { state: { registeredAwCode: cleanAwCode } });
    } catch (err: any) {
      setError(err.message || 'Failed to register agency.');
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
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img 
          src={`${import.meta.env.BASE_URL}britannia_logo.webp`} 
          alt="Britannia Logo"
          style={{ height: 60, objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
        />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>NEW AGENCY REGISTRATION</h1>
        <p style={{ fontSize: 12, color: '#fca5a5', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>Register Distributor & Owner Account</p>
      </div>

      {/* Card */}
      <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 18, color: '#b91c1c', fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* AW Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AW Code (Unique Agency Code) *</label>
            <div style={{ position: 'relative' }}>
              <Hash size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" required placeholder="e.g. AW100234"
                value={awCode} onChange={e => setAwCode(e.target.value.toUpperCase())}
                style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 36, paddingRight: 14, color: '#0f172a', fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Agency Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distributor / Agency Name *</label>
            <div style={{ position: 'relative' }}>
              <Building size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" required placeholder="e.g. Sathish Distributors"
                value={agencyName} onChange={e => setAgencyName(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 36, paddingRight: 14, color: '#0f172a', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* District & Mobile Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>District / City *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text" required placeholder="e.g. Madurai"
                  value={district} onChange={e => setDistrict(e.target.value)}
                  style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 32, paddingRight: 10, color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile No *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel" required placeholder="9876543210" maxLength={10}
                  value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 32, paddingRight: 10, color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 36, paddingRight: 14, color: '#0f172a', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password" required placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', height: 42, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 36, paddingRight: 14, color: '#0f172a', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{ height: 46, background: loading ? '#991b1b' : '#e52321', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, transition: 'background 0.2s', fontFamily: 'inherit', textTransform: 'uppercase', boxShadow: '0 4px 14px rgba(229,35,33,0.35)' }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
            Register Agency & Owner
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          Already registered? <Link to="/login" style={{ color: '#e52321', fontWeight: 700, textDecoration: 'none' }}>Login with AW Code</Link>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

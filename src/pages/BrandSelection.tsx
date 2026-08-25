import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Loader2, Building2, ArrowRight } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

interface BrandSummary {
  name: string; totalProducts: number; countedProducts: number;
  status: 'Not Started' | 'In Progress' | 'Completed'; progress: number; sessionId: string | null;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function BrandSelection() {
  const navigate = useNavigate();
  const { activeUploadId, filename } = useStockStore();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: snaps } = await supabase.from('system_stock_snapshots').select('brand').eq('upload_id', activeUploadId);
        const { data: sessions } = await supabase.from('stock_count_sessions').select('id, brand, status').eq('upload_id', activeUploadId);
        const { data: counts } = await supabase.from('physical_stock_counts').select('session_id');

        const brandMap = new Map<string, number>();
        snaps?.forEach(r => brandMap.set(r.brand, (brandMap.get(r.brand) || 0) + 1));
        const sessionMap = new Map(sessions?.map(s => [s.brand, s]) || []);
        const countMap = new Map<string, number>();
        counts?.forEach(r => countMap.set(r.session_id, (countMap.get(r.session_id) || 0) + 1));

        const list: BrandSummary[] = [];
        for (const [name, total] of brandMap.entries()) {
          const sess = sessionMap.get(name);
          const counted = sess ? (countMap.get(sess.id) || 0) : 0;
          const progress = Math.min(Math.round((counted / total) * 100), 100);
          let status: BrandSummary['status'] = 'Not Started';
          if (sess?.status === 'Completed' || progress === 100) status = 'Completed';
          else if (sess?.status === 'In Progress' || progress > 0) status = 'In Progress';
          list.push({ name, totalProducts: total, countedProducts: counted, status, progress, sessionId: sess?.id || null });
        }
        setBrands(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [activeUploadId]);

  const handleStart = async (name: string, sessionId: string | null) => {
    let sid = sessionId;
    if (!sid) {
      const sname = window.prompt('Session name (optional):', `Count - ${name}`);
      if (sname === null) return;
      const { data } = await supabase.from('stock_count_sessions').insert({ upload_id: activeUploadId, brand: name, session_name: sname || `Count - ${name}`, status: 'In Progress' }).select().single();
      if (data) sid = data.id;
    }
    if (sid) navigate(`/count/${sid}`);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Loader2 size={30} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>;

  if (!activeUploadId || brands.length === 0) return (
    <div style={{ ...card, maxWidth: 480, margin: '80px auto', padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PackageOpen size={26} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>No Stock File Active</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>Upload a stock Excel file to begin brand-wise counting</p>
      </div>
      <button onClick={() => navigate('/upload')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Upload Stock File</button>
    </div>
  );

  const done = brands.filter(b => b.status === 'Completed').length;

  const statusCfg = (s: string) => s === 'Completed'
    ? { border: '#bbf7d0', bg: '#eef2ff', iconBg: '#f0fdf4', iconColor: '#16a34a', badgeBg: '#f0fdf4', badgeColor: '#16a34a', badgeBorder: '#bbf7d0', label: '✓ Done', barColor: '#16a34a' }
    : s === 'In Progress'
    ? { border: '#c7d2fe', bg: '#fff', iconBg: '#eef2ff', iconColor: '#4f46e5', badgeBg: '#eef2ff', badgeColor: '#4338ca', badgeBorder: '#c7d2fe', label: '⏸ In Progress', barColor: '#4f46e5' }
    : { border: '#e2e8f0', bg: '#fff', iconBg: '#f8fafc', iconColor: '#94a3b8', badgeBg: '#f8fafc', badgeColor: '#64748b', badgeBorder: '#e2e8f0', label: 'Not Started', barColor: '#94a3b8' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Brand-Wise Counting</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{filename} · {brands.length} brands · {done} completed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#4338ca', padding: '4px 10px', borderRadius: 9999, border: '1px solid #c7d2fe' }}>{brands.length} Brands</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 9999, border: '1px solid #bbf7d0' }}>{done} Done</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {brands.map((brand, i) => {
          const cfg = statusCfg(brand.status);
          return (
            <motion.div key={brand.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.04 }}>
              <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box' }}>
                {/* Top */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color={cfg.iconColor} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 9999, background: cfg.badgeBg, color: cfg.badgeColor, border: `1px solid ${cfg.badgeBorder}` }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Brand name */}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 3px' }}>{brand.name}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{brand.countedProducts} / {brand.totalProducts} counted</p>
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.iconColor }}>{brand.progress}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${brand.progress}%`, background: cfg.barColor, borderRadius: 9999, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => handleStart(brand.name, brand.sessionId)}
                  style={{
                    width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    border: brand.status === 'Completed' ? '1px solid #e2e8f0' : 'none',
                    background: brand.status === 'Completed' ? '#fff' : '#4f46e5',
                    color: brand.status === 'Completed' ? '#475569' : '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  {brand.status === 'Not Started' ? 'Start Count' : brand.status === 'Completed' ? 'View Results' : 'Resume Count'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

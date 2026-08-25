import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertCircle, CheckCircle2, AlertTriangle, Loader2, ArrowRight, Building2, UploadCloud } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Dashboard() {
  const navigate = useNavigate();
  const { activeUploadId, filename, uploadedAt } = useStockStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBrands: 0, totalProducts: 0, countedProducts: 0, pendingProducts: 0, equalCount: 0, shortage: 0, excess: 0 });
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: snaps } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', activeUploadId);
        const { data: counts } = await supabase.from('physical_stock_counts').select('*, system_stock_snapshots!inner(upload_id)').eq('system_stock_snapshots.upload_id', activeUploadId);
        const brands = new Set(snaps?.map(s => s.brand)).size;
        const total = snaps?.length || 0;
        const counted = counts?.length || 0;
        let eq = 0, sh = 0, ex = 0;
        const issueList: any[] = [];
        counts?.forEach(c => {
          if (c.status === 'Equal') eq++; else if (c.status === 'Shortage') sh++; else if (c.status === 'Excess') ex++;
          if (c.variance !== 0) {
            const snap = snaps?.find(s => s.id === c.snapshot_id);
            if (snap) issueList.push({ id: c.id, material: snap.material, desc: snap.material_desc, brand: snap.brand, type: c.status, variance: c.variance, impact: Math.round(Math.abs(c.variance) * (snap.mrp || 0)) });
          }
        });
        issueList.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
        setStats({ totalBrands: brands, totalProducts: total, countedProducts: counted, pendingProducts: total - counted, equalCount: eq, shortage: sh, excess: ex });
        setIssues(issueList.slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetch();
    const ch = supabase.channel('dash').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Loader2 size={30} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>;

  if (!activeUploadId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <UploadCloud size={30} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>No Active Session</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>Upload a stock Excel file to start reconciliation</p>
      </div>
      <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <UploadCloud size={16} /> Upload Stock File
      </button>
    </div>
  );

  const pct = stats.totalProducts > 0 ? Math.round((stats.countedProducts / stats.totalProducts) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page Header */}
      <div style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Dashboard</h1>
            <span style={{ fontSize: 10, fontWeight: 600, background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 9999, border: '1px solid #c7d2fe' }}>Live</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            <strong style={{ color: '#334155' }}>{filename}</strong>{uploadedAt && ` · ${new Date(uploadedAt).toLocaleDateString()}`}
          </p>
        </div>
        <button onClick={() => navigate('/brands')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Continue Count <ArrowRight size={14} />
        </button>
      </div>

      {/* Progress */}
      <div style={{ ...card, padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Overall Progress</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 9999, transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>{stats.countedProducts} of {stats.totalProducts} SKUs audited</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Brands', value: stats.totalBrands, sub: 'categories', bg: '#eef2ff', color: '#4338ca', iconBg: '#c7d2fe' },
          { label: 'Total SKUs', value: stats.totalProducts, sub: 'in master file', bg: '#fff', color: '#334155', iconBg: '#f1f5f9' },
          { label: 'Counted', value: stats.countedProducts, sub: 'SKUs audited', bg: '#f0fdf4', color: '#15803d', iconBg: '#bbf7d0' },
          { label: 'Pending', value: stats.pendingProducts, sub: 'awaiting count', bg: '#fffbeb', color: '#b45309', iconBg: '#fde68a' },
        ].map(({ label, value, sub, bg, color, iconBg }) => (
          <div key={label} style={{ background: bg, border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0 }}>{value}</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Discrepancy Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Equal</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#15803d', margin: '6px 0 2px' }}>{stats.equalCount}</p>
          <p style={{ fontSize: 11, color: '#4ade80', margin: 0 }}>Exact match</p>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Shortage</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#b91c1c', margin: '6px 0 2px' }}>{stats.shortage}</p>
          <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>Physical &lt; System</p>
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Excess</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#b45309', margin: '6px 0 2px' }}>{stats.excess}</p>
          <p style={{ fontSize: 11, color: '#fbbf24', margin: 0 }}>Physical &gt; System</p>
        </div>
      </div>

      {/* Top Issues */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} color="#dc2626" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Top Discrepancies</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>Largest variances by magnitude</p>
            </div>
          </div>
          <button onClick={() => navigate('/issues')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            View All <ArrowRight size={12} />
          </button>
        </div>

        {issues.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={36} color="#4ade80" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No Discrepancies Found</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>All counted stock matches system records</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Material', 'Brand', 'Status', 'Variance', 'Impact ₹'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{issue.material}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.desc}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 500 }}>{issue.brand}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 9999, background: issue.type === 'Shortage' ? '#fef2f2' : '#fffbeb', color: issue.type === 'Shortage' ? '#dc2626' : '#d97706' }}>{issue.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: issue.variance < 0 ? '#dc2626' : '#d97706', fontSize: 13 }}>
                      {issue.variance > 0 ? '+' : ''}{issue.variance}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: 13 }}>₹{issue.impact.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

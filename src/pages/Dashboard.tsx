import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertCircle, CheckCircle2, AlertTriangle, Loader2, ArrowRight, Building2, UploadCloud } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

// KPI card with left colored border like payroll system
function KpiCard({ label, value, sub, borderColor, icon: Icon, iconColor }: any) {
  return (
    <div style={{ ...W, padding: '20px 20px 18px', borderLeft: `4px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>
        <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{sub}</p>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${borderColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={borderColor} />
      </div>
    </div>
  );
}

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
        setIssues(issueList.slice(0, 8));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetch();
    const ch = supabase.channel('dash').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Loader2 size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>;

  if (!activeUploadId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <UploadCloud size={32} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>No Active Session</h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0, maxWidth: 300 }}>Upload a stock Excel file to start the reconciliation process</p>
      </div>
      <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <UploadCloud size={16} /> Upload Stock File
      </button>
    </div>
  );

  const pct = stats.totalProducts > 0 ? Math.round((stats.countedProducts / stats.totalProducts) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

      {/* Page header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.3px' }}>Payroll Overview</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <strong style={{ color: '#334155' }}>{filename}</strong>
            {uploadedAt && <> &nbsp;·&nbsp; {new Date(uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
          </p>
        </div>
        <button onClick={() => navigate('/brands')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
          Continue Count <ArrowRight size={14} />
        </button>
      </div>

      {/* KPI cards — left border style like payroll */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard label="Total Brands"   value={stats.totalBrands}    sub="Active categories"  borderColor="#4f46e5" icon={Building2}    iconColor="#4f46e5" />
        <KpiCard label="Total SKUs"     value={stats.totalProducts}   sub="In master file"     borderColor="#10b981" icon={Package}      iconColor="#10b981" />
        <KpiCard label="Pending Count"  value={stats.pendingProducts} sub="Awaiting audit"     borderColor="#f59e0b" icon={AlertCircle}  iconColor="#f59e0b" />
        <KpiCard label="Total Issues"   value={stats.shortage + stats.excess} sub="Variances found" borderColor="#ef4444" icon={AlertTriangle} iconColor="#ef4444" />
      </div>

      {/* Two column: progress + discrepancy summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Progress card */}
        <div style={{ ...W, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Audit Progress</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>{stats.countedProducts} of {stats.totalProducts} SKUs counted</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 9999, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5', flexShrink: 0 }}>{pct}%</span>
          </div>
        </div>

        {/* Status summary */}
        <div style={{ ...W, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Count Results</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Equal (exact match)', value: stats.equalCount,   color: '#10b981' },
              { label: 'Shortage (deficit)',  value: stats.shortage,      color: '#ef4444' },
              { label: 'Excess (surplus)',    value: stats.excess,        color: '#f59e0b' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{r.label}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: r.value > 0 ? r.color : '#94a3b8' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues table */}
      <div style={{ ...W, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Top Discrepancies</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Largest variances by magnitude</p>
          </div>
          <button onClick={() => navigate('/issues')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            View All <ArrowRight size={12} />
          </button>
        </div>

        {issues.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No Discrepancies Found</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>All counted stock matches system records</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Material', 'Brand', 'Status', 'Variance', 'Value Impact'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.id} style={{ borderBottom: '1px solid #f8fafc' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfc'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                  >
                    <td style={{ padding: '13px 20px' }}>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px', fontSize: 13 }}>{issue.material}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.desc}</p>
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 12, color: '#64748b', fontWeight: 500 }}>{issue.brand}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: issue.type === 'Shortage' ? '#fef2f2' : '#fffbeb', color: issue.type === 'Shortage' ? '#dc2626' : '#d97706' }}>{issue.type}</span>
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'center', fontWeight: 800, color: issue.variance < 0 ? '#dc2626' : '#d97706', fontSize: 14 }}>
                      {issue.variance > 0 ? '+' : ''}{issue.variance}
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'center', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>₹{issue.impact.toLocaleString('en-IN')}</td>
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

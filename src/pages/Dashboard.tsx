import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight, Building2, UploadCloud, LayoutDashboard } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { KpiStatCard } from '@/components/common/KpiStatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/common/PageHeader';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Dashboard() {
  const navigate = useNavigate();
  const { activeUploadId, filename, uploadedAt } = useStockStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBrands: 0,
    totalProducts: 0,
    countedProducts: 0,
    pendingProducts: 0,
    equalCount: 0,
    shortage: 0,
    excess: 0
  });
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }
      try {
        const { data: snaps } = await supabase
          .from('system_stock_snapshots')
          .select('id, brand, material, material_desc, mrp')
          .eq('upload_id', activeUploadId);

        const { data: counts } = await supabase
          .from('physical_stock_counts')
          .select('id, snapshot_id, status, variance, system_stock_snapshots!inner(upload_id)')
          .eq('system_stock_snapshots.upload_id', activeUploadId);

        const brands = new Set(snaps?.map(s => s.brand)).size;
        const total = snaps?.length || 0;
        const counted = counts?.length || 0;
        let eq = 0, sh = 0, ex = 0;
        const issueList: any[] = [];

        counts?.forEach(c => {
          if (c.status === 'Equal') eq++;
          else if (c.status === 'Shortage') sh++;
          else if (c.status === 'Excess') ex++;

          if (c.variance !== 0) {
            const snap = snaps?.find(s => s.id === c.snapshot_id);
            if (snap) {
              issueList.push({
                id: c.id,
                material: snap.material,
                desc: snap.material_desc,
                brand: snap.brand,
                type: c.status,
                variance: c.variance,
                impact: Math.round(Math.abs(c.variance) * (snap.mrp || 0))
              });
            }
          }
        });

        issueList.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
        setStats({
          totalBrands: brands,
          totalProducts: total,
          countedProducts: counted,
          pendingProducts: total - counted,
          equalCount: eq,
          shortage: sh,
          excess: ex
        });
        setIssues(issueList.slice(0, 8));
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    const channel = supabase
      .channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUploadId]);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard metrics..." />;
  }

  if (!activeUploadId) {
    return (
      <EmptyState
        icon={UploadCloud}
        title="No Active Session"
        description="Upload a stock Excel file to start the reconciliation process"
        actionText="Upload Stock File"
        onAction={() => navigate('/upload')}
      />
    );
  }

  const pct = stats.totalProducts > 0 ? Math.round((stats.countedProducts / stats.totalProducts) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <PageHeader
        title="Stock Overview"
        icon={LayoutDashboard}
        description={
          <>
            <strong style={{ color: '#334155' }}>{filename}</strong>
            {uploadedAt && <> &nbsp;·&nbsp; {new Date(uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
          </>
        }
        actions={
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#e52321',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 12px rgba(229,35,33,0.25)',
            }}
          >
            Continue Count <ArrowRight size={14} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiStatCard label="Total Brands" value={stats.totalBrands} sub="Active categories" borderColor="#e52321" icon={Building2} />
        <KpiStatCard label="Total SKUs" value={stats.totalProducts} sub="In master file" borderColor="#10b981" icon={Package} />
        <KpiStatCard label="Pending Count" value={stats.pendingProducts} sub="Awaiting audit" borderColor="#f59e0b" icon={AlertCircle} />
        <KpiStatCard label="Total Issues" value={stats.shortage + stats.excess} sub="Variances found" borderColor="#dc2626" icon={AlertTriangle} />
      </div>

      {/* Progress & Discrepancy Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Progress card */}
        <div style={{ ...W, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Audit Progress</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>{stats.countedProducts} of {stats.totalProducts} SKUs counted</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #e52321, #991b1b)', borderRadius: 9999, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#e52321', flexShrink: 0 }}>{pct}%</span>
          </div>
        </div>

        {/* Count Results */}
        <div style={{ ...W, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Count Results</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Equal (exact match)', value: stats.equalCount, color: '#10b981' },
              { label: 'Shortage (deficit)', value: stats.shortage, color: '#ef4444' },
              { label: 'Excess (surplus)', value: stats.excess, color: '#f59e0b' },
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

      {/* Issues Table */}
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
                      <StatusBadge status={issue.type} />
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
    </div>
  );
}

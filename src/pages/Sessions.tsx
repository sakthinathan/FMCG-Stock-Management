import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, ArrowRight } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

interface SessionRow {
  id: string;
  brand: string;
  session_name: string;
  count_date: string;
  status: string;
  total_counted: number;
  total_products: number;
  progress: number;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Sessions() {
  const navigate = useNavigate();
  const { activeUploadId } = useStockStore();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: sessData } = await supabase
          .from('stock_count_sessions')
          .select('*')
          .eq('upload_id', activeUploadId)
          .order('count_date', { ascending: false });

        const { data: countsData } = await supabase
          .from('physical_stock_counts')
          .select('session_id');

        const { data: snapData } = await supabase
          .from('system_stock_snapshots')
          .select('brand')
          .eq('upload_id', activeUploadId);

        const countMap = new Map<string, number>();
        countsData?.forEach(r => countMap.set(r.session_id, (countMap.get(r.session_id) || 0) + 1));
        const brandTotalMap = new Map<string, number>();
        snapData?.forEach(r => brandTotalMap.set(r.brand, (brandTotalMap.get(r.brand) || 0) + 1));

        const rows: SessionRow[] = (sessData || []).map(s => {
          const total = brandTotalMap.get(s.brand) || 0;
          const counted = countMap.get(s.id) || 0;
          const progress = total > 0 ? Math.min(Math.round((counted / total) * 100), 100) : 0;
          let status = s.status;
          if (progress >= 100) status = 'Completed'; else if (progress > 0) status = 'In Progress';
          return {
            id: s.id,
            brand: s.brand,
            session_name: s.session_name || `Count - ${s.brand}`,
            count_date: new Date(s.count_date).toLocaleDateString(),
            status,
            total_counted: counted,
            total_products: total,
            progress
          };
        });
        setSessions(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
    const ch = supabase.channel('sessions').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, loadSessions).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  if (loading) {
    return <LoadingSpinner label="Fetching audit sessions..." />;
  }

  if (!activeUploadId || sessions.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No Audit Sessions Yet"
        description="Start a brand count to automatically create audit sessions"
        actionText="Go to Brand Selection"
        onAction={() => navigate('/brands')}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Audit Sessions"
        description="Track and resume brand-wise physical stock counts"
        icon={ListChecks}
        actions={
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
            New Count <ArrowRight size={14} />
          </button>
        }
      />

      {/* Desktop Table View */}
      <div style={{ ...card, overflow: 'hidden' }} className="hidden md:block">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Session', 'Brand', 'Status', 'Progress', 'Action'].map((h, i) => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '13px 16px' }}>
                    <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{s.session_name}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{s.count_date}</p>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#e52321', padding: '3px 8px', borderRadius: 6, border: '1px solid #fecaca' }}>{s.brand}</span>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>{s.total_counted}/{s.total_products} ({s.progress}%)</p>
                    <div style={{ width: 80, height: 4, background: '#f1f5f9', borderRadius: 9999, margin: '0 auto', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.progress}%`, background: s.progress === 100 ? '#16a34a' : '#e52321', borderRadius: 9999 }} />
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/count/${s.id}`)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: s.status === 'Completed' ? '1px solid #e2e8f0' : 'none',
                        background: s.status === 'Completed' ? '#fff' : '#e52321',
                        color: s.status === 'Completed' ? '#475569' : '#fff',
                        fontFamily: 'inherit',
                      }}
                    >
                      {s.status === 'Completed' ? 'Review' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="block md:hidden">
        {sessions.map(s => (
          <div key={s.id} style={{ ...card, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{s.session_name}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{s.count_date}</p>
              </div>
              <StatusBadge status={s.status} size="sm" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fdfbf7', padding: '10px 12px', borderRadius: 8, border: '1px solid #fef2f2' }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: '#fff', color: '#e52321', padding: '2px 8px', borderRadius: 6, border: '1px solid #fecaca' }}>{s.brand}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{s.total_counted} / {s.total_products} ({s.progress}%)</span>
            </div>

            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.progress}%`, background: s.progress === 100 ? '#16a34a' : '#e52321', borderRadius: 9999 }} />
            </div>

            <button
              onClick={() => navigate(`/count/${s.id}`)}
              style={{
                width: '100%',
                padding: '9px 0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: s.status === 'Completed' ? '1px solid #e2e8f0' : 'none',
                background: s.status === 'Completed' ? '#fff' : '#e52321',
                color: s.status === 'Completed' ? '#475569' : '#fff',
                fontFamily: 'inherit',
              }}
            >
              {s.status === 'Completed' ? 'Review Session' : 'Resume Count'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

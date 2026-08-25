import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, PauseCircle, PlayCircle, ListChecks, ArrowRight, Building2 } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

interface SessionRow {
  id: string; brand: string; session_name: string; count_date: string;
  status: string; total_counted: number; total_products: number; progress: number;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

function StatusBadge({ status }: { status: string }) {
  const cfg = status === 'Completed'
    ? { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: '✓ Completed' }
    : status === 'In Progress'
    ? { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe', label: '⏸ In Progress' }
    : { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Not Started' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 9999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

export function Sessions() {
  const navigate = useNavigate();
  const { activeUploadId } = useStockStore();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: sessData } = await supabase.from('stock_count_sessions').select('*').eq('upload_id', activeUploadId).order('count_date', { ascending: false });
        const { data: countsData } = await supabase.from('physical_stock_counts').select('session_id');
        const { data: snapData } = await supabase.from('system_stock_snapshots').select('brand').eq('upload_id', activeUploadId);

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
          return { id: s.id, brand: s.brand, session_name: s.session_name || `Count - ${s.brand}`, count_date: new Date(s.count_date).toLocaleDateString(), status, total_counted: counted, total_products: total, progress };
        });
        setSessions(rows);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
    const ch = supabase.channel('sessions').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}><Loader2 size={30} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>;

  if (!activeUploadId || sessions.length === 0) return (
    <div style={{ ...card, maxWidth: 480, margin: '80px auto', padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ListChecks size={24} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>No Sessions Yet</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', maxWidth: 280 }}>Start a brand count to automatically create audit sessions</p>
      </div>
      <button onClick={() => navigate('/brands')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Go to Brand Selection
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ListChecks size={20} color="#4f46e5" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Audit Sessions</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>Track and resume brand-wise physical stock counts</p>
          </div>
        </div>
        <button onClick={() => navigate('/brands')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          New Count <ArrowRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
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
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>{s.brand}</span>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>{s.total_counted}/{s.total_products} ({s.progress}%)</p>
                    <div style={{ width: 80, height: 4, background: '#f1f5f9', borderRadius: 9999, margin: '0 auto', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.progress}%`, background: s.progress === 100 ? '#16a34a' : '#4f46e5', borderRadius: 9999 }} />
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/count/${s.id}`)}
                      style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: s.status === 'Completed' ? '1px solid #e2e8f0' : 'none', background: s.status === 'Completed' ? '#fff' : '#4f46e5', color: s.status === 'Completed' ? '#475569' : '#fff' }}
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
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

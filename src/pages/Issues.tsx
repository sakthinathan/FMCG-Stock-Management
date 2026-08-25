import React, { useEffect, useState } from 'react';
import { AlertTriangle, Search, RotateCcw, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

interface IssueItem {
  id: string; material: string; desc: string; brand: string;
  mrp: number; sysQty: number; phyQty: number; variance: number;
  status: string; notes?: string; reasonCode?: string; trend?: string;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Issues() {
  const { activeUploadId } = useStockStore();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('All');
  const [sort, setSort] = useState<'variance' | 'value'>('variance');
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        setLoading(true);
        const { data: counts } = await supabase.from('physical_stock_counts').select('*, system_stock_snapshots!inner(*)').eq('system_stock_snapshots.upload_id', activeUploadId).neq('variance', 0);
        const bSet = new Set<string>();
        const fmt: IssueItem[] = (counts || []).map((c: any) => {
          const s = c.system_stock_snapshots;
          if (s.brand) bSet.add(s.brand);
          const getTrend = (curr: number, prev: number) => {
            if (prev === 0 && curr !== 0) return 'New Issue';
            if (curr !== 0 && prev !== 0) return Math.abs(curr) > Math.abs(prev) ? 'Increased' : Math.abs(curr) < Math.abs(prev) ? 'Decreased' : 'Unchanged';
            return 'Resolved';
          };
          return { id: c.id, material: s.material, desc: s.material_desc, brand: s.brand, mrp: s.mrp, sysQty: s.system_qty_pcs, phyQty: c.physical_total_pcs, variance: c.variance, status: c.status, notes: c.notes, reasonCode: c.reason_code, trend: getTrend(c.variance, s.prev_variance || 0) };
        });
        setBrands(Array.from(bSet).sort());
        setIssues(fmt);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
    const ch = supabase.channel('issues').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  const handleRecount = async (id: string) => { await supabase.from('physical_stock_counts').delete().eq('id', id); };

  const filtered = issues
    .filter(i => brand === 'All' || i.brand === brand)
    .filter(i => !search || i.material.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'value' ? Math.abs(b.variance * b.mrp) - Math.abs(a.variance * a.mrp) : Math.abs(b.variance) - Math.abs(a.variance));

  const totalImpact = filtered.reduce((s, i) => s + Math.abs(i.variance * i.mrp), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Issues & Discrepancies</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>Stock variances requiring review or recount</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 9999, border: '1px solid #fecaca' }}>{filtered.length} Issues</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: 9999, border: '1px solid #fde68a' }}>₹{totalImpact.toLocaleString('en-IN')} at risk</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search material code or name..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={brand} onChange={e => setBrand(e.target.value)} style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }}>
          <option value="All">All Brands</option>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }}>
          <option value="variance">By Variance</option>
          <option value="value">By Value (₹)</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Loader2 size={30} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: '56px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={40} color="#4ade80" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>No Discrepancies</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>All counted materials match system stock</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(issue => {
            const isShortage = issue.variance < 0;
            const impact = Math.abs(issue.variance * issue.mrp);
            const trendCfg = issue.trend === 'Increased'
              ? { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' }
              : issue.trend === 'New Issue'
              ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
              : { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
            return (
              <div key={issue.id} style={{ background: '#fff', border: `1px solid ${isShortage ? '#fecaca' : '#fde68a'}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                  {/* Material info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{issue.material}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{issue.brand}</span>
                      <span style={{ fontSize: 10, background: '#f8fafc', color: '#64748b', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>MRP ₹{issue.mrp}</span>
                      {issue.trend && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: trendCfg.bg, color: trendCfg.color, border: `1px solid ${trendCfg.border}` }}>{issue.trend}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{issue.desc}</p>
                  </div>

                  {/* Numbers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 3px' }}>System</p>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 14 }}>{issue.sysQty}</p>
                    </div>
                    <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 3px' }}>Physical</p>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 14 }}>{issue.phyQty}</p>
                    </div>
                    <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 3px' }}>Variance</p>
                      <p style={{ fontWeight: 700, color: isShortage ? '#dc2626' : '#d97706', margin: 0, fontSize: 15 }}>{issue.variance > 0 ? '+' : ''}{issue.variance}</p>
                    </div>
                  </div>

                  {/* Impact + action */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 2px' }}>Impact</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>₹{impact.toLocaleString('en-IN')}</p>
                    </div>
                    <button
                      onClick={() => handleRecount(issue.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <RotateCcw size={12} color="#4f46e5" /> Recount
                    </button>
                  </div>
                </div>

                {/* Notes footer */}
                {(issue.reasonCode || issue.notes) && (
                  <div style={{ background: '#fffbeb', borderTop: '1px solid #fde68a', padding: '8px 20px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    {issue.reasonCode && <span style={{ fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10} />{issue.reasonCode}</span>}
                    {issue.notes && <span style={{ fontSize: 11, color: '#92400e', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={10} />"{issue.notes}"</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

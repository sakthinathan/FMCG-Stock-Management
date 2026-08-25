import React, { useState, useEffect } from 'react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { Search as SearchIcon, Loader2, PackageSearch } from 'lucide-react';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const statusStyle = (s: string) => {
  if (s === 'Equal')    return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  if (s === 'Shortage') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (s === 'Excess')   return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
};

export function Search() {
  const { activeUploadId } = useStockStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeUploadId || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: snaps } = await supabase.from('system_stock_snapshots').select('*')
          .eq('upload_id', activeUploadId).or(`material.ilike.%${query}%,material_desc.ilike.%${query}%`).limit(60);
        if (snaps && snaps.length > 0) {
          const ids = snaps.map(s => s.id);
          const { data: counts } = await supabase.from('physical_stock_counts').select('*').in('snapshot_id', ids);
          setResults(snaps.map(snap => {
            const c = counts?.find(c => c.snapshot_id === snap.id);
            return { ...snap, physical_total_pcs: c?.physical_total_pcs, variance: c?.variance, status: c?.status || 'Uncounted' };
          }));
        } else setResults([]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, activeUploadId]);

  if (!activeUploadId) return (
    <div style={{ ...W, maxWidth: 480, margin: '80px auto', padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PackageSearch size={26} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>No Active Stock File</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>Upload an Excel file first to search materials</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ ...W, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SearchIcon size={20} color="#4f46e5" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Global Material Search</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>Look up any SKU with real-time audit status</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 640 }}>
        <SearchIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        {loading && <Loader2 size={16} color="#4f46e5" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />}
        <input
          type="search" autoFocus
          placeholder="Search by material code or product name..."
          value={query} onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', height: 50, paddingLeft: 44, paddingRight: 44,
            border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 14,
            color: '#0f172a', background: '#fff', boxSizing: 'border-box', outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: 'inherit',
          }}
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Type at least 2 characters to search...</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {results.map(item => {
              const sc = statusStyle(item.status);
              return (
                <div key={item.id} style={{ ...W, padding: '18px 20px', borderLeft: `3px solid ${sc.border}` }}>
                  {/* Top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace', background: '#eef2ff', padding: '3px 8px', borderRadius: 6 }}>{item.material}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, flexShrink: 0 }}>{item.status}</span>
                  </div>

                  {/* Name */}
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {item.material_desc}
                  </p>

                  {/* Info rows */}
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #f1f5f9' }}>
                    {[
                      { label: 'Brand', value: item.brand || 'N/A' },
                      { label: 'MRP', value: `₹${item.mrp}` },
                      { label: 'System Qty', value: `${item.system_qty_pcs} PCS` },
                      ...(item.status !== 'Uncounted' ? [
                        { label: 'Physical Qty', value: `${item.physical_total_pcs} PCS` },
                      ] : []),
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{r.value}</span>
                      </div>
                    ))}
                    {item.status !== 'Uncounted' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Variance</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: item.variance < 0 ? '#dc2626' : item.variance > 0 ? '#d97706' : '#16a34a' }}>
                          {item.variance > 0 ? '+' : ''}{item.variance} PCS
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <div style={{ ...W, maxWidth: 400, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <PackageSearch size={36} color="#cbd5e1" style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No Materials Found</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No SKUs matching "{query}" in this snapshot</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

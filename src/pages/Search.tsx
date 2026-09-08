import React, { useState, useEffect, useDeferredValue } from 'react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { Search as SearchIcon, Loader2, PackageSearch } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export function Search() {
  const { activeUploadId } = useStockStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeUploadId || deferredQuery.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: snaps } = await supabase
          .from('system_stock_snapshots')
          .select('id, upload_id, material, material_desc, brand, mrp, system_qty_pcs')
          .eq('upload_id', activeUploadId)
          .or(`material.ilike.%${deferredQuery}%,material_desc.ilike.%${deferredQuery}%`)
          .limit(60);

        if (snaps && snaps.length > 0) {
          const ids = snaps.map(s => s.id);
          const { data: counts } = await supabase
            .from('physical_stock_counts')
            .select('snapshot_id, physical_total_pcs, variance, status')
            .in('snapshot_id', ids);

          setResults(snaps.map(snap => {
            const c = counts?.find(x => x.snapshot_id === snap.id);
            return {
              ...snap,
              physical_total_pcs: c?.physical_total_pcs,
              variance: c?.variance,
              status: c?.status || 'Uncounted'
            };
          }));
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [deferredQuery, activeUploadId]);

  if (!activeUploadId) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No Active Stock File"
        description="Upload an Excel file first to search materials"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Global Material Search"
        description="Look up any SKU with real-time audit status"
        icon={SearchIcon}
      />

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 640 }}>
        <SearchIcon
          size={18}
          color="#94a3b8"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        {loading && (
          <Loader2
            size={16}
            color="#4f46e5"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }}
          />
        )}
        <input
          type="search"
          autoFocus
          placeholder="Search by material code or product name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            height: 50,
            paddingLeft: 44,
            paddingRight: 44,
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            fontSize: 14,
            color: '#0f172a',
            background: '#fff',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Type at least 2 characters to search...</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {results.map(item => (
              <div key={item.id} style={{ ...W, padding: '18px 20px' }}>
                {/* Top header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace', background: '#eef2ff', padding: '3px 8px', borderRadius: 6 }}>
                    {item.material}
                  </span>
                  <StatusBadge status={item.status} size="sm" />
                </div>

                {/* Name */}
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                  {item.material_desc}
                </p>

                {/* Details */}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #f1f5f9' }}>
                  {[
                    { label: 'Brand', value: item.brand || 'N/A' },
                    { label: 'MRP', value: `₹${item.mrp}` },
                    { label: 'System Qty', value: `${item.system_qty_pcs} PCS` },
                    ...(item.status !== 'Uncounted' ? [
                      { label: 'Physical Qty', value: `${item.physical_total_pcs} PCS` },
                    ] : []),
                  ].map(r => {
                    const isMrp = r.label === 'MRP';
                    return (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: isMrp ? 13 : 11, fontWeight: 700, color: isMrp ? '#b45309' : '#334155' }}>{r.value}</span>
                      </div>
                    );
                  })}
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
            ))}
          </div>
        </>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <EmptyState
          icon={PackageSearch}
          title="No Materials Found"
          description={`No SKUs matching "${query}" in this snapshot`}
          maxWidth={400}
        />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search, RotateCcw, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface IssueItem {
  id: string; material: string; desc: string; brand: string;
  mrp: number; sysQty: number; phyQty: number; variance: number;
  status: string; notes?: string; reasonCode?: string; trend?: string;
}

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
        const { data: counts } = await supabase
          .from('physical_stock_counts')
          .select('*, system_stock_snapshots!inner(*)')
          .eq('system_stock_snapshots.upload_id', activeUploadId)
          .neq('variance', 0);

        const brandSet = new Set<string>();
        const formatted: IssueItem[] = (counts || []).map((c: any) => {
          const s = c.system_stock_snapshots;
          if (s.brand) brandSet.add(s.brand);
          const getTrend = (curr: number, prev: number) => {
            if (prev === 0 && curr !== 0) return 'New Issue';
            if (curr !== 0 && prev !== 0) return Math.abs(curr) > Math.abs(prev) ? 'Increased' : Math.abs(curr) < Math.abs(prev) ? 'Decreased' : 'Unchanged';
            return 'Resolved';
          };
          return {
            id: c.id, material: s.material, desc: s.material_desc, brand: s.brand,
            mrp: s.mrp, sysQty: s.system_qty_pcs, phyQty: c.physical_total_pcs,
            variance: c.variance, status: c.status, notes: c.notes, reasonCode: c.reason_code,
            trend: getTrend(c.variance, s.prev_variance || 0)
          };
        });

        setBrands(Array.from(brandSet).sort());
        setIssues(formatted);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }

    load();
    const ch = supabase.channel('issues').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  const handleRecount = async (id: string) => {
    await supabase.from('physical_stock_counts').delete().eq('id', id);
  };

  const filtered = issues
    .filter(i => brand === 'All' || i.brand === brand)
    .filter(i => !search || i.material.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'value'
      ? Math.abs(b.variance * b.mrp) - Math.abs(a.variance * a.mrp)
      : Math.abs(b.variance) - Math.abs(a.variance));

  const totalImpact = filtered.reduce((s, i) => s + Math.abs(i.variance * i.mrp), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Issues & Discrepancies</h1>
            <p className="text-sm text-slate-500 mt-0.5">Stock variances requiring review</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100">
            {filtered.length} Issues
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-100">
            ₹{totalImpact.toLocaleString('en-IN')} at risk
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search material code or name..."
            className="pl-9 bg-white"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 px-3 border border-[#e2e8f0] rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={brand} onChange={e => setBrand(e.target.value)}
        >
          <option value="All">All Brands</option>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <select
          className="h-10 px-3 border border-[#e2e8f0] rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={sort} onChange={e => setSort(e.target.value as any)}
        >
          <option value="variance">By Variance</option>
          <option value="value">By Value (₹)</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#e2e8f0] rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Discrepancies</h3>
          <p className="text-sm text-slate-400 mt-1">All counted materials match system stock</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(issue => {
            const isShortage = issue.variance < 0;
            const impact = Math.abs(issue.variance * issue.mrp);
            return (
              <div
                key={issue.id}
                className={cn(
                  'bg-white border rounded-xl overflow-hidden',
                  isShortage ? 'border-red-100' : 'border-amber-100'
                )}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Material info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-bold text-slate-900">{issue.material}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">{issue.brand}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">MRP ₹{issue.mrp}</span>
                      {issue.trend && (
                        <span className={cn('px-1.5 py-0.5 text-[10px] font-semibold rounded',
                          issue.trend === 'Increased' ? 'bg-purple-50 text-purple-600' :
                          issue.trend === 'New Issue' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                        )}>{issue.trend}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{issue.desc}</p>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-center gap-4 bg-slate-50 border border-[#e2e8f0] rounded-lg px-4 py-3 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">System</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{issue.sysQty}</p>
                    </div>
                    <div className="w-px h-8 bg-[#e2e8f0]" />
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Physical</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{issue.phyQty}</p>
                    </div>
                    <div className="w-px h-8 bg-[#e2e8f0]" />
                    <div className="text-center">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Variance</p>
                      <p className={cn('font-bold text-sm mt-0.5', isShortage ? 'text-red-600' : 'text-amber-600')}>
                        {issue.variance > 0 ? '+' : ''}{issue.variance}
                      </p>
                    </div>
                  </div>

                  {/* Impact + action */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Impact</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">₹{impact.toLocaleString('en-IN')}</p>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      className="text-xs font-semibold border-[#e2e8f0] text-slate-600 hover:bg-slate-50"
                      onClick={() => handleRecount(issue.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Recount
                    </Button>
                  </div>
                </div>

                {/* Notes/reason */}
                {(issue.reasonCode || issue.notes) && (
                  <div className="bg-amber-50 border-t border-amber-100 px-5 py-2.5 flex flex-wrap gap-3 items-center">
                    {issue.reasonCode && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> {issue.reasonCode}
                      </span>
                    )}
                    {issue.notes && (
                      <span className="text-xs text-amber-700 flex items-center gap-1.5 italic">
                        <MessageSquare className="w-3 h-3 shrink-0" /> "{issue.notes}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

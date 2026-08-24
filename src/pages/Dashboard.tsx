import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, AlertCircle, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, Building2, UploadCloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

export function Dashboard() {
  const navigate = useNavigate();
  const { activeUploadId, filename, uploadedAt } = useStockStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBrands: 0, totalProducts: 0, countedProducts: 0,
    pendingProducts: 0, equalCount: 0, shortage: 0, excess: 0,
  });
  const [criticalIssues, setCriticalIssues] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: snapshots } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', activeUploadId);
        const { data: counts } = await supabase.from('physical_stock_counts').select('*, system_stock_snapshots!inner(upload_id)').eq('system_stock_snapshots.upload_id', activeUploadId);

        const uniqueBrands = new Set(snapshots?.map(s => s.brand)).size;
        const totalProducts = snapshots?.length || 0;
        const countedProducts = counts?.length || 0;

        let equalCount = 0, shortage = 0, excess = 0;
        const issues: any[] = [];

        counts?.forEach(c => {
          if (c.status === 'Equal') equalCount++;
          else if (c.status === 'Shortage') shortage++;
          else if (c.status === 'Excess') excess++;

          if (c.variance !== 0) {
            const snap = snapshots?.find(s => s.id === c.snapshot_id);
            if (snap) {
              const varianceAbs = Math.abs(c.variance);
              issues.push({
                id: c.id, material: snap.material, desc: snap.material_desc,
                brand: snap.brand, type: c.status,
                variance: `${c.variance > 0 ? '+' : ''}${c.variance} PCS`,
                impact: Math.round(varianceAbs * (snap.mrp || 0)), varianceAbs,
              });
            }
          }
        });

        issues.sort((a, b) => b.varianceAbs - a.varianceAbs);
        setStats({ totalBrands: uniqueBrands, totalProducts, countedProducts, pendingProducts: totalProducts - countedProducts, equalCount, shortage, excess });
        setCriticalIssues(issues.slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }

    fetch();
    const ch = supabase.channel('dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeUploadId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!activeUploadId) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <UploadCloud className="w-8 h-8 text-indigo-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">No Active Session</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">Upload an Excel stock master file to start reconciliation</p>
      </div>
      <Button onClick={() => navigate('/upload')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        <UploadCloud className="w-4 h-4 mr-2" /> Upload Stock File
      </Button>
    </div>
  );

  const pct = stats.totalProducts > 0 ? Math.round((stats.countedProducts / stats.totalProducts) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full">Live</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="font-medium text-slate-700">{filename}</span>
            {uploadedAt && <> · {new Date(uploadedAt).toLocaleDateString()}</>}
          </p>
        </div>
        <Button onClick={() => navigate('/brands')} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
          Continue Count <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
          <span className="text-sm font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{stats.countedProducts} of {stats.totalProducts} SKUs audited</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Brands',  value: stats.totalBrands,      sub: 'categories',       icon: Building2,     color: 'indigo' },
          { label: 'Total SKUs',    value: stats.totalProducts,     sub: 'in master file',   icon: Package,       color: 'slate'  },
          { label: 'Counted',       value: stats.countedProducts,   sub: 'SKUs audited',     icon: CheckCircle2,  color: 'emerald'},
          { label: 'Pending',       value: stats.pendingProducts,   sub: 'awaiting count',   icon: AlertCircle,   color: 'amber'  },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[#e2e8f0] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                color === 'indigo'  ? 'bg-indigo-50'  :
                color === 'emerald' ? 'bg-emerald-50' :
                color === 'amber'   ? 'bg-amber-50'   : 'bg-slate-100'
              )}>
                <Icon className={cn('w-4 h-4',
                  color === 'indigo'  ? 'text-indigo-500'  :
                  color === 'emerald' ? 'text-emerald-500' :
                  color === 'amber'   ? 'text-amber-500'   : 'text-slate-500'
                )} />
              </div>
            </div>
            <div className={cn('text-2xl font-bold',
              color === 'emerald' ? 'text-emerald-600' :
              color === 'amber'   ? 'text-amber-600'   : 'text-slate-900'
            )}>{value}</div>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Discrepancy Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Equal</p>
          <div className="text-3xl font-bold text-emerald-700 mt-1">{stats.equalCount}</div>
          <p className="text-xs text-emerald-500 mt-0.5 hidden sm:block">Exact match</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Shortage</p>
          <div className="text-3xl font-bold text-red-700 mt-1">{stats.shortage}</div>
          <p className="text-xs text-red-500 mt-0.5 hidden sm:block">Physical &lt; System</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Excess</p>
          <div className="text-3xl font-bold text-amber-700 mt-1">{stats.excess}</div>
          <p className="text-xs text-amber-500 mt-0.5 hidden sm:block">Physical &gt; System</p>
        </div>
      </div>

      {/* Top Issues Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Discrepancies</h2>
              <p className="text-[11px] text-slate-400">Largest variances by magnitude</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/issues')} className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold">
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {criticalIssues.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Discrepancies</p>
            <p className="text-xs text-slate-400 mt-0.5">All counted stock matches system records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-[#e2e8f0]">
                  <th className="text-left py-3 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Material</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Brand</th>
                  <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Variance</th>
                  <th className="text-right py-3 px-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Impact ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {criticalIssues.map(issue => (
                  <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900 text-sm">{issue.material}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{issue.desc}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{issue.brand}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        issue.type.includes('Shortage') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      )}>{issue.type}</span>
                    </td>
                    <td className={cn('py-3.5 px-4 text-right font-bold text-sm',
                      issue.variance.startsWith('-') ? 'text-red-600' : 'text-amber-600'
                    )}>{issue.variance}</td>
                    <td className="py-3.5 px-5 text-right font-semibold text-slate-700 text-sm">
                      ₹{issue.impact.toLocaleString('en-IN')}
                    </td>
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

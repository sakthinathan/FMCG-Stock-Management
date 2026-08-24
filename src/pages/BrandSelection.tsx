import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle2, PauseCircle, PackageOpen, Loader2, Building2, ArrowRight } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BrandSummary {
  name: string; totalProducts: number; countedProducts: number;
  status: 'Not Started' | 'In Progress' | 'Completed'; progress: number; sessionId: string | null;
}

export function BrandSelection() {
  const navigate = useNavigate();
  const { activeUploadId, filename } = useStockStore();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        const { data: snaps } = await supabase.from('system_stock_snapshots').select('brand').eq('upload_id', activeUploadId);
        const { data: sessions } = await supabase.from('stock_count_sessions').select('id, brand, status').eq('upload_id', activeUploadId);
        const { data: counts } = await supabase.from('physical_stock_counts').select('session_id');

        const brandMap = new Map<string, number>();
        snaps?.forEach(r => brandMap.set(r.brand, (brandMap.get(r.brand) || 0) + 1));

        const sessionMap = new Map(sessions?.map(s => [s.brand, s]) || []);
        const countMap = new Map<string, number>();
        counts?.forEach(r => countMap.set(r.session_id, (countMap.get(r.session_id) || 0) + 1));

        const list: BrandSummary[] = [];
        for (const [name, total] of brandMap.entries()) {
          const sess = sessionMap.get(name);
          const counted = sess ? (countMap.get(sess.id) || 0) : 0;
          const progress = Math.min(Math.round((counted / total) * 100), 100);
          let status: BrandSummary['status'] = 'Not Started';
          if (sess?.status === 'Completed' || progress === 100) status = 'Completed';
          else if (sess?.status === 'In Progress' || progress > 0) status = 'In Progress';
          list.push({ name, totalProducts: total, countedProducts: counted, status, progress, sessionId: sess?.id || null });
        }
        setBrands(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [activeUploadId]);

  const handleStart = async (brandName: string, sessionId: string | null) => {
    let sid = sessionId;
    if (!sid) {
      const name = window.prompt('Session name (optional):', `Count - ${brandName}`);
      if (name === null) return;
      const { data } = await supabase.from('stock_count_sessions')
        .insert({ upload_id: activeUploadId, brand: brandName, session_name: name || `Count - ${brandName}`, status: 'In Progress' })
        .select().single();
      if (data) sid = data.id;
    }
    if (sid) navigate(`/count/${sid}`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!activeUploadId || brands.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <PackageOpen className="w-8 h-8 text-indigo-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">No Stock File Active</h2>
        <p className="text-sm text-slate-500 mt-1">Upload a stock Excel file to begin counting</p>
      </div>
      <Button onClick={() => navigate('/upload')} className="bg-indigo-600 hover:bg-indigo-700 text-white">Upload Stock File</Button>
    </div>
  );

  const done = brands.filter(b => b.status === 'Completed').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brand-Wise Counting</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filename} · {brands.length} brands · {done} completed</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
            {brands.length} Brands
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100">
            {done} Done
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand, i) => (
          <motion.div key={brand.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: i * 0.03 }}>
            <div className={cn(
              'bg-white border rounded-xl p-5 flex flex-col gap-4 h-full transition-shadow hover:shadow-md',
              brand.status === 'Completed' ? 'border-emerald-200' :
              brand.status === 'In Progress' ? 'border-indigo-200' : 'border-[#e2e8f0]'
            )}>
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  brand.status === 'Completed' ? 'bg-emerald-50' :
                  brand.status === 'In Progress' ? 'bg-indigo-50' : 'bg-slate-100'
                )}>
                  <Building2 className={cn('w-5 h-5',
                    brand.status === 'Completed' ? 'text-emerald-500' :
                    brand.status === 'In Progress' ? 'text-indigo-500' : 'text-slate-400'
                  )} />
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  brand.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                  brand.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700' :
                  'bg-slate-100 text-slate-500'
                )}>
                  {brand.status === 'Not Started' ? 'Not Started' :
                   brand.status === 'In Progress' ? 'In Progress' : '✓ Done'}
                </span>
              </div>

              {/* Brand name */}
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">{brand.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{brand.countedProducts} / {brand.totalProducts} counted</p>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-500">Progress</span>
                  <span className={brand.progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}>{brand.progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', brand.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                    initial={{ width: 0 }} animate={{ width: `${brand.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Button */}
              <Button
                onClick={() => handleStart(brand.name, brand.sessionId)}
                variant={brand.status === 'Completed' ? 'outline' : 'default'}
                className={cn('w-full font-semibold',
                  brand.status !== 'Completed' && 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
              >
                {brand.status === 'Not Started' ? 'Start Count' :
                 brand.status === 'Completed' ? 'View Results' : 'Resume Count'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  Building2, 
  Layers, 
  TrendingUp,
  Sparkles,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

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
    excess: 0,
  });

  const [criticalIssues, setCriticalIssues] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }

      try {
        const { data: snapshots, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('*')
          .eq('upload_id', activeUploadId);

        if (snapError) throw snapError;

        const { data: counts, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('*, system_stock_snapshots!inner(upload_id)')
          .eq('system_stock_snapshots.upload_id', activeUploadId);

        if (countError) throw countError;

        const uniqueBrands = new Set(snapshots?.map(s => s.brand)).size;
        const totalProducts = snapshots?.length || 0;
        const countedProducts = counts?.length || 0;
        const pendingProducts = totalProducts - countedProducts;

        let equalCount = 0;
        let shortage = 0;
        let excess = 0;

        const issues: any[] = [];

        counts?.forEach(c => {
          if (c.status === 'Equal') equalCount++;
          else if (c.status === 'Shortage') shortage++;
          else if (c.status === 'Excess') excess++;

          if (c.variance !== 0) {
            const snap = snapshots?.find(s => s.id === c.snapshot_id);
            if (snap) {
              const varianceAbs = Math.abs(c.variance);
              const priority = varianceAbs > 50 ? 'High' : 'Medium';
              let type = c.status;
              
              if (c.variance < 0 && c.variance < (snap.prev_variance || 0)) {
                type = 'Shortage Increased';
              }

              issues.push({
                id: c.id,
                material: snap.material,
                desc: snap.material_desc,
                brand: snap.brand,
                mrp: snap.mrp,
                type,
                variance: `${c.variance > 0 ? '+' : ''}${c.variance} PCS`,
                impact: Math.round(varianceAbs * (snap.mrp || 0)),
                priority,
                varianceAbs,
              });
            }
          }
        });

        issues.sort((a, b) => b.varianceAbs - a.varianceAbs);

        setStats({
          totalBrands: uniqueBrands,
          totalProducts,
          countedProducts,
          pendingProducts,
          equalCount,
          shortage,
          excess,
        });

        setCriticalIssues(issues.slice(0, 6));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();

    const channel = supabase
      .channel('public:physical_stock_counts:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUploadId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!activeUploadId) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-5 p-8 bg-card border border-border shadow-sm rounded-2xl max-w-lg mx-auto">
        <div className="p-4 bg-indigo-500/10 text-indigo-600 rounded-2xl ring-1 ring-indigo-500/30">
          <UploadCloud className="h-12 w-12" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">StockSync Terminal</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
            No active audit session found. Upload an Excel stock master file to initialize counting queues and live reconciliation dashboards.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/upload')} 
          className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 px-6 h-12"
        >
          <UploadCloud className="mr-2 h-5 w-5" />
          Upload Excel File
        </Button>
      </div>
    );
  }

  const progressPct = stats.totalProducts > 0 
    ? Math.round((stats.countedProducts / stats.totalProducts) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Session Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card  p-6 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Executive Dashboard
            </h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs font-bold">
              Live Real-Time
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>Snapshot: <strong className="text-foreground">{filename}</strong></span>
            <span>•</span>
            <span>Uploaded {new Date(uploadedAt || '').toLocaleDateString()}</span>
          </p>
        </div>

        <Button 
          onClick={() => navigate('/brands')}
          className="rounded-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-foreground shadow-lg shadow-indigo-600/30 h-11 px-5"
        >
          <span>Continue Stock Count</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Progress & Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border border-border shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Brands</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalBrands}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Active categories</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total SKUs</span>
              <div className="p-2 rounded-xl bg-secondary text-muted-foreground">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Materials in master</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Audited SKUs</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.countedProducts}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{progressPct}% audit completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pending SKUs</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">{stats.pendingProducts}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting physical count</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy Breakdown Highlights */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-card border border-emerald-500/30 shadow-sm rounded-xl bg-emerald-50 p-4 sm:p-5">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
            Equal Match
          </span>
          <div className="text-2xl sm:text-4xl font-black text-emerald-400 mt-1">
            {stats.equalCount}
          </div>
          <p className="text-[11px] text-emerald-300/70 mt-1 hidden sm:block">Perfect count match</p>
        </Card>

        <Card className="bg-card border border-rose-500/30 shadow-sm rounded-xl bg-rose-50 p-4 sm:p-5">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-400">
            Shortages
          </span>
          <div className="text-2xl sm:text-4xl font-black text-rose-400 mt-1">
            {stats.shortage}
          </div>
          <p className="text-[11px] text-rose-300/70 mt-1 hidden sm:block">Physical count &lt; System</p>
        </Card>

        <Card className="bg-card border border-amber-500/30 shadow-sm rounded-xl bg-amber-50 p-4 sm:p-5">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
            Surplus (Excess)
          </span>
          <div className="text-2xl sm:text-4xl font-black text-amber-400 mt-1">
            {stats.excess}
          </div>
          <p className="text-[11px] text-amber-300/70 mt-1 hidden sm:block">Physical count &gt; System</p>
        </Card>
      </div>

      {/* Top Discrepancies Table */}
      <Card className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-card border-b border-border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-foreground">Top Discrepancies Requiring Review</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Largest physical stock variances ranked by magnitude.
                </CardDescription>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/issues')} 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
            >
              View All Issues
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {criticalIssues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-medium">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-foreground">No Discrepancies Found</p>
              <p className="text-xs text-muted-foreground mt-0.5">All audited stocks match system records perfectly.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Material</th>
                    <th className="py-3.5 px-4">Brand</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Variance</th>
                    <th className="py-3.5 px-4 text-right">Impact (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {criticalIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-foreground">
                        {issue.material}
                        <div className="text-xs font-normal text-muted-foreground truncate max-w-xs">
                          {issue.desc}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground text-xs">
                        {issue.brand}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] font-bold",
                            issue.type.includes('Shortage') 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          )}
                        >
                          {issue.type}
                        </Badge>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black ${
                        issue.variance.startsWith('-') ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {issue.variance}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        ₹{issue.impact.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

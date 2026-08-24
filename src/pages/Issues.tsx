import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  Search, 
  RotateCcw, 
  Loader2, 
  Package, 
  CheckCircle2, 
  Filter,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface IssueItem {
  id: string;
  sessionId: string;
  material: string;
  desc: string;
  brand: string;
  mrp: number;
  sysQty: number;
  phyQty: number;
  variance: number;
  status: 'Equal' | 'Shortage' | 'Excess';
  notes?: string;
  reasonCode?: string;
  trend?: string;
}

export function Issues() {
  const { activeUploadId } = useStockStore();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [sortOption, setSortOption] = useState<'Highest Variance' | 'Highest Value Impact'>('Highest Variance');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);

  useEffect(() => {
    async function loadIssues() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: counts, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('*, system_stock_snapshots!inner(*)')
          .eq('system_stock_snapshots.upload_id', activeUploadId)
          .neq('variance', 0);

        if (countError) throw countError;

        const brands = new Set<string>();

        const formatted: IssueItem[] = (counts || []).map((c: any) => {
          const snap = c.system_stock_snapshots;
          if (snap.brand) brands.add(snap.brand);

          const getTrendCategory = (curr: number, prev: number) => {
            if (prev === 0 && curr !== 0) return 'New Issue';
            if (curr !== 0 && prev !== 0) {
              if (Math.abs(curr) > Math.abs(prev)) return 'Increased Variance';
              if (Math.abs(curr) < Math.abs(prev)) return 'Decreased Variance';
              return 'Unchanged Issue';
            }
            if (curr === 0 && prev < 0) return 'Shortage Resolved';
            if (curr === 0 && prev > 0) return 'Excess Resolved';
            return 'No Change';
          };

          return {
            id: c.id,
            sessionId: c.session_id,
            material: snap.material,
            desc: snap.material_desc,
            brand: snap.brand,
            mrp: snap.mrp,
            sysQty: snap.system_qty_pcs,
            phyQty: c.physical_total_pcs,
            variance: c.variance,
            status: c.status,
            notes: c.notes,
            reasonCode: c.reason_code,
            trend: getTrendCategory(c.variance, snap.prev_variance || 0)
          };
        });

        setUniqueBrands(Array.from(brands).sort());
        setIssues(formatted);
      } catch (error) {
        console.error("Error loading issues:", error);
      } finally {
        setLoading(false);
      }
    }

    loadIssues();

    const channel = supabase
      .channel('public:physical_stock_counts:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, () => {
        loadIssues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUploadId]);

  const handleRecount = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from('physical_stock_counts')
        .delete()
        .eq('id', issueId);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error requesting recount:", error);
    }
  };

  const filteredIssues = issues
    .filter(issue => selectedBrand === 'All Brands' || issue.brand === selectedBrand)
    .filter(issue => 
      searchQuery === '' || 
      issue.material.toLowerCase().includes(searchQuery.toLowerCase()) || 
      issue.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === 'Highest Value Impact') {
        const impactA = Math.abs(a.variance) * a.mrp;
        const impactB = Math.abs(b.variance) * b.mrp;
        return impactB - impactA;
      }
      return Math.abs(b.variance) - Math.abs(a.variance);
    });

  const totalVarianceImpact = filteredIssues.reduce((acc, curr) => acc + Math.abs(curr.variance * curr.mrp), 0);
  const shortageCount = filteredIssues.filter(i => i.variance < 0).length;
  const excessCount = filteredIssues.filter(i => i.variance > 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card  p-6 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Discrepancies & Issues</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Audit variances requiring review, verification, or physical recounts.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold text-xs px-3 py-1.5 rounded-xl">
            {filteredIssues.length} Active Issues
          </Badge>
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold text-xs px-3 py-1.5 rounded-xl">
            ₹{totalVarianceImpact.toLocaleString('en-IN')} Total At Risk
          </Badge>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search material code or description..." 
            className="pl-10 h-11 bg-card border-border focus:border-indigo-500 rounded-xl text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select 
            className="h-11 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="All Brands">All Brands ({uniqueBrands.length})</option>
            {uniqueBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          <select 
            className="h-11 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
          >
            <option value="Highest Variance">Highest Variance</option>
            <option value="Highest Value Impact">Highest Value (₹)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-16 px-6 bg-card border border-border shadow-sm rounded-xl rounded-3xl border-border text-muted-foreground max-w-lg mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-foreground">No Discrepancies Found</h3>
          <p className="text-xs text-muted-foreground mt-1">All counted materials match system stock records with zero variance.</p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredIssues.map((issue) => {
            const isShortage = issue.variance < 0;
            const impactVal = Math.abs(issue.variance * issue.mrp);

            return (
              <Card 
                key={issue.id} 
                className={cn(
                  "bg-card border border-border shadow-sm rounded-xl border-border rounded-2xl overflow-hidden hover:border-border transition-all duration-200 shadow-md",
                  isShortage ? "hover:border-rose-500/40" : "hover:border-amber-500/40"
                )}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Material Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-black text-foreground text-base tracking-tight">{issue.material}</span>
                      <Badge variant="outline" className="text-[10px] font-bold bg-secondary/50 border-border text-muted-foreground">
                        {issue.brand}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-secondary text-muted-foreground">
                        MRP ₹{issue.mrp}
                      </Badge>
                      {issue.trend && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] font-extrabold uppercase tracking-wider",
                            issue.trend.includes('Increased') ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                            issue.trend.includes('New') ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                            "bg-secondary text-muted-foreground border-border"
                          )}
                        >
                          {issue.trend}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">{issue.desc}</h3>
                  </div>
                  
                  {/* Middle Column: Numbers Breakdown */}
                  <div className="flex items-center gap-4 sm:gap-6 bg-card p-3 rounded-xl border border-border">
                    <div className="text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System</span>
                      <div className="font-extrabold text-xs sm:text-sm text-foreground mt-0.5">{issue.sysQty}</div>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Physical</span>
                      <div className="font-extrabold text-xs sm:text-sm text-foreground mt-0.5">{issue.phyQty}</div>
                    </div>
                    <div className="text-center border-l border-border pl-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Variance</span>
                      <div className={cn("font-black text-sm sm:text-base mt-0.5", isShortage ? "text-rose-400" : "text-amber-400")}>
                        {issue.variance > 0 ? '+' : ''}{issue.variance} PCS
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial Impact & Recount Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Impact</span>
                      <div className="text-sm font-black text-foreground">₹{impactVal.toLocaleString('en-IN')}</div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-border hover:bg-secondary text-muted-foreground text-xs font-bold h-9 gap-1.5"
                      onClick={() => handleRecount(issue.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      Request Recount
                    </Button>
                  </div>
                </div>

                {/* Reason Code & Notes Drawer */}
                {(issue.reasonCode || issue.notes) && (
                  <div className="bg-amber-950/20 border-t border-amber-500/20 p-3 px-5 flex flex-wrap gap-3 items-center text-xs">
                    {issue.reasonCode && (
                      <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="w-3 h-3" />
                        {issue.reasonCode}
                      </div>
                    )}
                    {issue.notes && (
                      <div className="text-amber-200/90 italic flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>"{issue.notes}"</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Loader2, PackageSearch, Building2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function Search() {
  const { activeUploadId } = useStockStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function performSearch() {
      if (!activeUploadId || searchQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: snaps, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('*')
          .eq('upload_id', activeUploadId)
          .or(`material.ilike.%${searchQuery}%,material_desc.ilike.%${searchQuery}%`)
          .limit(60);

        if (snapError) throw snapError;

        if (snaps && snaps.length > 0) {
          const snapshotIds = snaps.map(s => s.id);
          const { data: counts, error: countError } = await supabase
            .from('physical_stock_counts')
            .select('*')
            .in('snapshot_id', snapshotIds);
            
          if (countError) throw countError;

          const merged = snaps.map(snap => {
            const count = counts?.find(c => c.snapshot_id === snap.id);
            return {
              ...snap,
              physical_total_pcs: count?.physical_total_pcs,
              variance: count?.variance,
              status: count?.status || 'Uncounted'
            };
          });

          setResults(merged);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeUploadId]);

  if (!activeUploadId) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-4 p-8 bg-card border border-border shadow-sm rounded-xl rounded-3xl max-w-lg mx-auto border-border text-muted-foreground">
        <PackageSearch className="h-14 w-14 text-indigo-400 opacity-80" />
        <div>
          <h3 className="text-xl font-bold text-foreground">No Active Stock File</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Upload an Excel inventory file first to search through warehouse materials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-card  p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <SearchIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Global Material Search</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Instantly look up any SKU across all brand queues with real-time audit status.
            </p>
          </div>
        </div>
      </div>

      {/* Big Search Bar */}
      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search"
          placeholder="Search by material code (e.g. 100234) or product name..." 
          className="pl-12 h-13 text-base rounded-2xl bg-card border-border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-foreground placeholder:text-muted-foreground shadow-xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {loading && (
          <Loader2 className="absolute right-4 top-4 h-5 w-5 animate-spin text-indigo-400" />
        )}
      </div>

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="text-xs text-muted-foreground font-medium">Type at least 2 characters to search...</p>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <Card key={item.id} className="bg-card border border-border shadow-sm rounded-xl border-border rounded-2xl overflow-hidden hover:border-indigo-500/40 hover:shadow-xl transition-all duration-200">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <Badge variant="outline" className="font-mono bg-secondary/50 text-foreground border-border text-xs px-2.5 py-0.5">
                    {item.material}
                  </Badge>
                  <Badge 
                    className={cn(
                      "text-[10px] font-bold",
                      item.status === 'Uncounted' ? 'bg-secondary text-muted-foreground border border-border' :
                      item.status === 'Equal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      item.status === 'Shortage' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
                
                <h3 className="font-bold text-foreground text-sm mb-3 line-clamp-2" title={item.material_desc}>
                  {item.material_desc}
                </h3>
                
                <div className="bg-card rounded-xl p-3 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Brand</span>
                    <span className="font-bold text-foreground">{item.brand || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">System Qty</span>
                    <span className="font-bold text-foreground">{item.system_qty_pcs} PCS</span>
                  </div>
                  
                  {item.status !== 'Uncounted' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">Physical Qty</span>
                        <span className="font-bold text-foreground">{item.physical_total_pcs} PCS</span>
                      </div>
                      
                      <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                        <span className="text-muted-foreground font-bold">Variance</span>
                        <span className={cn("font-black text-sm", item.variance < 0 ? 'text-rose-400' : item.variance > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                          {item.variance > 0 ? '+' : ''}{item.variance} PCS
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {searchQuery.length >= 2 && results.length === 0 && !loading && (
        <div className="text-center py-16 px-6 bg-card border border-border shadow-sm rounded-xl rounded-3xl border-border text-muted-foreground max-w-md mx-auto">
          <PackageSearch className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-80" />
          <h4 className="text-base font-bold text-foreground">No Materials Found</h4>
          <p className="text-xs text-muted-foreground mt-1">No SKUs matching "{searchQuery}" were found in this snapshot.</p>
        </div>
      )}
    </div>
  );
}

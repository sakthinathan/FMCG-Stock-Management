import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle2, PauseCircle, PackageOpen, Loader2, Layers, ArrowRight, Building2, Sparkles } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

interface BrandSummary {
  name: string;
  totalProducts: number;
  countedProducts: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  sessionId: string | null;
}

export function BrandSelection() {
  const navigate = useNavigate();
  const { activeUploadId, filename } = useStockStore();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBrands() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }

      try {
        const { data: snapshotData, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('brand')
          .eq('upload_id', activeUploadId);

        if (snapError) throw snapError;

        const brandMap = new Map<string, number>();
        snapshotData?.forEach(row => {
          brandMap.set(row.brand, (brandMap.get(row.brand) || 0) + 1);
        });

        const { data: sessionData, error: sessError } = await supabase
          .from('stock_count_sessions')
          .select('id, brand, status')
          .eq('upload_id', activeUploadId);
        
        if (sessError) throw sessError;

        const sessionMap = new Map(sessionData?.map(s => [s.brand, s]) || []);

        const { data: countsData, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('session_id');

        if (countError) throw countError;

        const countMap = new Map<string, number>();
        countsData?.forEach(row => {
          countMap.set(row.session_id, (countMap.get(row.session_id) || 0) + 1);
        });

        const brandSummaries: BrandSummary[] = [];

        for (const [name, total] of brandMap.entries()) {
          const session = sessionMap.get(name);
          const counted = session ? (countMap.get(session.id) || 0) : 0;
          const progress = Math.round((counted / total) * 100);
          
          let status: BrandSummary['status'] = 'Not Started';
          if (session?.status === 'Completed' || progress === 100) status = 'Completed';
          else if (session?.status === 'In Progress' || (progress > 0 && progress < 100)) status = 'In Progress';

          brandSummaries.push({
            name,
            totalProducts: total,
            countedProducts: counted,
            status,
            progress: Math.min(progress, 100),
            sessionId: session?.id || null
          });
        }

        setBrands(brandSummaries.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to load brands:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBrands();
  }, [activeUploadId]);

  const handleStartCount = async (brandName: string, sessionId: string | null) => {
    let activeSessionId = sessionId;
    
    if (!activeSessionId) {
      const sessionName = window.prompt("Enter an optional Session Name (e.g. 'Aisle 1' or 'John'):", `Count - ${brandName}`);
      if (sessionName === null) return;
      
      const { data, error } = await supabase
        .from('stock_count_sessions')
        .insert({
          upload_id: activeUploadId,
          brand: brandName,
          session_name: sessionName || `Count - ${brandName}`,
          status: 'In Progress'
        })
        .select()
        .single();
      
      if (!error && data) {
        activeSessionId = data.id;
      }
    }

    if (activeSessionId) {
      navigate(`/count/${activeSessionId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Completed') {
      return (
        <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold gap-1 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          Completed
        </Badge>
      );
    }
    if (status === 'In Progress') {
      return (
        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold gap-1 text-xs">
          <PauseCircle className="h-3.5 w-3.5 text-indigo-400" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border font-bold gap-1 text-xs">
        <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
        Not Started
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!activeUploadId || brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 p-6 bg-card border border-border shadow-sm rounded-xl rounded-3xl max-w-lg mx-auto border-border shadow-2xl">
        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl">
          <PackageOpen className="h-12 w-12" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-foreground">No Active Stock File</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">Upload a system stock Excel spreadsheet to initialize brand-wise counting queues.</p>
        </div>
        <Button onClick={() => navigate('/upload')} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 px-6">
          Upload Stock File
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card  p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Brand-Wise Counting</h2>
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              {brands.length} Brands
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Select a brand queue below to start counting or resume where you left off.
          </p>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand, i) => (
          <motion.div
            key={brand.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <Card className="bg-card border border-border shadow-sm rounded-xl h-full flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 rounded-2xl overflow-hidden group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  {getStatusBadge(brand.status)}
                </div>

                <div className="mt-3">
                  <CardTitle className="text-lg font-bold text-foreground tracking-tight group-hover:text-indigo-300 transition-colors">
                    {brand.name}
                  </CardTitle>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{brand.totalProducts} Materials</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-indigo-400">{brand.countedProducts} Counted</span>
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Completion</span>
                    <span className={brand.progress === 100 ? "text-emerald-400" : "text-indigo-400"}>
                      {brand.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-white/5">
                    <motion.div 
                      className={`h-full rounded-full ${
                        brand.progress === 100 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/50'
                      }`} 
                      initial={{ width: 0 }}
                      animate={{ width: `${brand.progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handleStartCount(brand.name, brand.sessionId)}
                  variant={brand.status === 'Completed' ? 'outline' : 'default'}
                  className={`w-full rounded-xl font-bold h-11 transition-all shadow-md ${
                    brand.status === 'Completed'
                      ? 'border-border text-muted-foreground hover:bg-secondary'
                      : brand.status === 'In Progress'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-foreground shadow-indigo-600/25'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-indigo-600/25'
                  }`}
                >
                  <span>
                    {brand.status === 'Not Started' ? 'Start Count' : 
                     brand.status === 'Completed' ? 'View Results' : 'Resume Count'}
                  </span>
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

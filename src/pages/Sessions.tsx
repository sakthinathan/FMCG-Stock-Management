import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, CheckCircle2, PauseCircle, ListChecks, ArrowRight, Building2 } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SessionRow {
  id: string;
  brand: string;
  session_name: string;
  count_date: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  total_counted: number;
  total_products: number;
  progress: number;
}

export function Sessions() {
  const navigate = useNavigate();
  const { activeUploadId } = useStockStore();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessError } = await supabase
          .from('stock_count_sessions')
          .select('*')
          .eq('upload_id', activeUploadId)
          .order('count_date', { ascending: false });
        
        if (sessError) throw sessError;

        const { data: countsData, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('session_id');
        
        if (countError) throw countError;

        const countMap = new Map<string, number>();
        countsData?.forEach(row => {
          countMap.set(row.session_id, (countMap.get(row.session_id) || 0) + 1);
        });

        const { data: snapshotData, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('brand')
          .eq('upload_id', activeUploadId);

        if (snapError) throw snapError;

        const brandTotalMap = new Map<string, number>();
        snapshotData?.forEach(row => {
          brandTotalMap.set(row.brand, (brandTotalMap.get(row.brand) || 0) + 1);
        });

        const rows: SessionRow[] = sessionData?.map(s => {
          const totalProducts = brandTotalMap.get(s.brand) || 0;
          const totalCounted = countMap.get(s.id) || 0;
          const progress = totalProducts > 0 ? Math.round((totalCounted / totalProducts) * 100) : 0;
          
          let status = s.status;
          if (progress >= 100) status = 'Completed';
          else if (progress > 0) status = 'In Progress';

          return {
            id: s.id,
            brand: s.brand,
            session_name: s.session_name || `Count - ${s.brand}`,
            count_date: new Date(s.count_date).toLocaleDateString(),
            status,
            total_counted: totalCounted,
            total_products: totalProducts,
            progress: Math.min(progress, 100)
          };
        }) || [];

        setSessions(rows);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();

    const channel = supabase
      .channel('public:physical_stock_counts:sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physical_stock_counts' }, () => {
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUploadId]);

  const getStatusBadge = (status: string) => {
    if (status === 'Completed') {
      return (
        <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold gap-1 text-[11px]">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Completed
        </Badge>
      );
    }
    if (status === 'In Progress') {
      return (
        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold gap-1 text-[11px]">
          <PauseCircle className="h-3 w-3 text-indigo-400" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-secondary text-muted-foreground border-border font-bold text-[11px]">
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

  if (!activeUploadId || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-4 p-8 bg-card border border-border shadow-sm rounded-xl rounded-3xl max-w-lg mx-auto border-border text-muted-foreground">
        <div className="bg-indigo-500/10 p-4 rounded-2xl text-indigo-400">
          <ListChecks className="h-12 w-12" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">No Sessions Created</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Start a brand counting queue to automatically create audit sessions.</p>
        </div>
        <Button onClick={() => navigate('/brands')} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-foreground">
          Go to Brand Selection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card  p-6 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Audit Sessions</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage, track, and resume brand-wise physical stock count sessions.</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/brands')} 
          className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/25 h-11 px-5"
        >
          <span>Start New Brand Count</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Sessions Table Card */}
      <Card className="bg-card border border-border shadow-sm rounded-xl border-border rounded-3xl overflow-hidden shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Session & Date</th>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Progress</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-foreground">
                      {session.session_name}
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">Created: {session.count_date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="bg-secondary/50 text-foreground border-border font-semibold text-xs">
                        {session.brand}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(session.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {session.total_counted} / {session.total_products} ({session.progress}%)
                        </span>
                        <div className="w-20 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", session.progress === 100 ? "bg-emerald-500" : "bg-indigo-500")}
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button 
                        size="sm"
                        className={cn(
                          "rounded-xl font-bold text-xs h-9 px-4 shadow-sm",
                          session.status === 'Completed'
                            ? 'border border-border bg-transparent text-muted-foreground hover:bg-secondary'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-foreground'
                        )}
                        onClick={() => navigate(`/count/${session.id}`)}
                      >
                        {session.status === 'Completed' ? 'Review Count' : 'Resume Count'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

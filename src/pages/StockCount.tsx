import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, ListChecks, TrendingUp, TrendingDown, Minus, AlertTriangle, Package, Sparkles } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function StockCount() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { activeUploadId } = useStockStore();
  
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCounted, setHideCounted] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [sortQueue, setSortQueue] = useState<'A-Z' | 'Highest Value' | 'Highest Variance'>('A-Z');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const [cbb, setCbb] = useState('');
  const [pcs, setPcs] = useState('');
  const [notes, setNotes] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  
  const products = allProducts
    .filter(p => {
      const matchesSearch = p.material.toLowerCase().includes(searchQuery.toLowerCase()) || p.material_desc.toLowerCase().includes(searchQuery.toLowerCase());
      const isCounted = p.existingCbb !== '' || p.existingPcs !== '';
      if (hideCounted && isCounted) return false;
      if (issuesOnly) {
        if (!isCounted) return false;
        const totalPhy = (parseInt(p.existingCbb || '0') * p.conversion) + parseInt(p.existingPcs || '0');
        if (totalPhy === p.system_qty_pcs) return false;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortQueue === 'Highest Value') return b.mrp - a.mrp;
      if (sortQueue === 'Highest Variance') {
        const varA = Math.abs(a.prev_variance || 0);
        const varB = Math.abs(b.prev_variance || 0);
        return varB - varA;
      }
      return a.material.localeCompare(b.material);
    });
  
  const currentProduct = products[currentIndex];
  
  const [variance, setVariance] = useState<number | null>(null);
  const [varianceChange, setVarianceChange] = useState<number | null>(null);
  const [status, setStatus] = useState<'Equal' | 'Shortage' | 'Excess' | null>(null);

  useEffect(() => {
    async function loadSession() {
      if (!sessionId || !activeUploadId) {
        navigate('/brands');
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('stock_count_sessions')
          .select('brand')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;

        const { data: snapshotData, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('*')
          .eq('upload_id', activeUploadId)
          .eq('brand', sessionData.brand);

        if (snapError) throw snapError;

        const { data: countsData, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('*')
          .eq('session_id', sessionId);

        if (countError) throw countError;

        const mergedProducts = snapshotData.map(snap => {
          const existingCount = countsData?.find(c => c.snapshot_id === snap.id);
          return {
            ...snap,
            existingCbb: existingCount ? existingCount.physical_cbb : '',
            existingPcs: existingCount ? existingCount.physical_pcs : '',
            existingNotes: existingCount?.notes || '',
            existingReason: existingCount?.reason_code || '',
          };
        });

        setAllProducts(mergedProducts);
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId, activeUploadId, navigate]);

  // Realtime subscription for duplicate count prevention
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`public:physical_stock_counts:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'physical_stock_counts',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldData = payload.old as any;
            if (oldData && oldData.snapshot_id) {
              setAllProducts((prevProducts) => {
                const newProducts = [...prevProducts];
                const idx = newProducts.findIndex((p) => p.id === oldData.snapshot_id);
                if (idx !== -1) {
                  newProducts[idx].existingCbb = '';
                  newProducts[idx].existingPcs = '';
                  newProducts[idx].existingNotes = '';
                  newProducts[idx].existingReason = '';
                  
                  if (currentProduct && currentProduct.id === oldData.snapshot_id) {
                    setCbb('');
                    setPcs('');
                    setNotes('');
                    setReasonCode('');
                  }
                }
                return newProducts;
              });
            }
          } else {
            const newData = payload.new as any;
            if (newData && newData.snapshot_id) {
              setAllProducts((prevProducts) => {
                const newProducts = [...prevProducts];
                const idx = newProducts.findIndex((p) => p.id === newData.snapshot_id);
                if (idx !== -1) {
                  if (newProducts[idx].existingCbb !== newData.physical_cbb || newProducts[idx].existingPcs !== newData.physical_pcs || newProducts[idx].existingNotes !== newData.notes || newProducts[idx].existingReason !== newData.reason_code) {
                    newProducts[idx].existingCbb = newData.physical_cbb;
                    newProducts[idx].existingPcs = newData.physical_pcs;
                    newProducts[idx].existingNotes = newData.notes || '';
                    newProducts[idx].existingReason = newData.reason_code || '';
                    
                    if (currentProduct && currentProduct.id === newData.snapshot_id) {
                      setCbb(String(newData.physical_cbb));
                      setPcs(String(newData.physical_pcs));
                      setNotes(newData.notes || '');
                      setReasonCode(newData.reason_code || '');
                    }
                  }
                }
                return newProducts;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentProduct]);

  // Reset index to 0 when search query, sort, or filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery, hideCounted, issuesOnly, sortQueue]);

  useEffect(() => {
    if (currentProduct) {
      setCbb(currentProduct.existingCbb !== '' ? String(currentProduct.existingCbb) : '');
      setPcs(currentProduct.existingPcs !== '' ? String(currentProduct.existingPcs) : '');
      setNotes(currentProduct.existingNotes || '');
      setReasonCode(currentProduct.existingReason || '');
      setVariance(null);
      setVarianceChange(null);
      setStatus(null);
    } else {
      setCbb('');
      setPcs('');
      setNotes('');
      setReasonCode('');
      setVariance(null);
      setVarianceChange(null);
      setStatus(null);
    }
  }, [currentIndex, allProducts, searchQuery, hideCounted, issuesOnly, sortQueue]);

  // Recalculate variance whenever CBB or PCS changes & Auto-Save
  useEffect(() => {
    if (!currentProduct) return;

    const evaluatedCbb = evaluateMath(cbb);
    const evaluatedPcs = evaluateMath(pcs);

    const cbbVal = evaluatedCbb !== '' ? parseInt(evaluatedCbb, 10) : 0;
    const pcsVal = evaluatedPcs !== '' ? parseInt(evaluatedPcs, 10) : 0;

    if (evaluatedCbb === '' && evaluatedPcs === '') {
      setVariance(null);
      setVarianceChange(null);
      setStatus(null);
      setSaveStatus('idle');
      return;
    }

    const totalPhysicalPcs = (cbbVal * currentProduct.conversion) + pcsVal;
    const currentVariance = totalPhysicalPcs - currentProduct.system_qty_pcs;

    setVariance(currentVariance);

    let currentStatus: 'Equal' | 'Shortage' | 'Excess' = 'Equal';
    if (currentVariance < 0) currentStatus = 'Shortage';
    else if (currentVariance > 0) currentStatus = 'Excess';

    setStatus(currentStatus);

    // Auto-Save Logic
    const hasChanged = cbbVal !== currentProduct.existingCbb || pcsVal !== currentProduct.existingPcs || notes !== currentProduct.existingNotes || reasonCode !== currentProduct.existingReason;
    if (!hasChanged) {
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
    
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('physical_stock_counts')
          .upsert({
            session_id: sessionId,
            snapshot_id: currentProduct.id,
            physical_cbb: cbbVal,
            physical_pcs: pcsVal,
            physical_total_pcs: totalPhysicalPcs,
            variance: currentVariance,
            status: currentStatus,
            notes: notes,
            reason_code: reasonCode
          }, { onConflict: 'session_id,snapshot_id' });

        if (error) throw error;
        setSaveStatus('saved');

        // Update local state in allProducts silently
        setAllProducts(prev => {
          const newAll = [...prev];
          const allIndex = newAll.findIndex(p => p.id === currentProduct.id);
          if (allIndex !== -1) {
            newAll[allIndex].existingCbb = cbbVal;
            newAll[allIndex].existingPcs = pcsVal;
            newAll[allIndex].existingNotes = notes;
            newAll[allIndex].existingReason = reasonCode;
          }
          return newAll;
        });

      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);

  }, [cbb, pcs, notes, reasonCode, currentProduct, sessionId]);

  const evaluateMath = (str: string) => {
    if (!str) return '';
    try {
      if (/^[0-9+\-*/. ]+$/.test(str)) {
        const res = Function(`'use strict'; return (${str})`)();
        if (!isNaN(res) && isFinite(res)) {
          return String(Math.floor(res));
        }
      }
    } catch {
      // ignore
    }
    return str;
  };

  const handleCbbBlur = () => {
    setCbb(evaluateMath(cbb));
  };

  const handlePcsBlur = () => {
    setPcs(evaluateMath(pcs));
  };

  const handleSaveAndNext = async () => {
    if (!currentProduct || !sessionId) return;

    setSaving(true);
    try {
      const evaluatedCbb = evaluateMath(cbb);
      const evaluatedPcs = evaluateMath(pcs);

      const cbbVal = evaluatedCbb !== '' ? parseInt(evaluatedCbb, 10) : 0;
      const pcsVal = evaluatedPcs !== '' ? parseInt(evaluatedPcs, 10) : 0;

      const totalPhysicalPcs = (cbbVal * currentProduct.conversion) + pcsVal;
      const currentVariance = totalPhysicalPcs - currentProduct.system_qty_pcs;

      let currentStatus: 'Equal' | 'Shortage' | 'Excess' = 'Equal';
      if (currentVariance < 0) currentStatus = 'Shortage';
      else if (currentVariance > 0) currentStatus = 'Excess';

      const { error } = await supabase
        .from('physical_stock_counts')
        .upsert({
          session_id: sessionId,
          snapshot_id: currentProduct.id,
          physical_cbb: cbbVal,
          physical_pcs: pcsVal,
          physical_total_pcs: totalPhysicalPcs,
          variance: currentVariance,
          status: currentStatus,
          notes: notes,
          reason_code: reasonCode
        }, { onConflict: 'session_id,snapshot_id' });

      if (error) throw error;

      setAllProducts(prev => {
        const newAll = [...prev];
        const allIndex = newAll.findIndex(p => p.id === currentProduct.id);
        if (allIndex !== -1) {
          newAll[allIndex].existingCbb = cbbVal;
          newAll[allIndex].existingPcs = pcsVal;
          newAll[allIndex].existingNotes = notes;
          newAll[allIndex].existingReason = reasonCode;
        }
        return newAll;
      });

      if (currentIndex < products.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        const { error: sessionUpdateError } = await supabase
          .from('stock_count_sessions')
          .update({ status: 'Completed' })
          .eq('id', sessionId);
          
        if (sessionUpdateError) console.error("Error completing session:", sessionUpdateError);
        navigate('/brands');
      }
    } catch (error) {
      console.error("Error saving count:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-12">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/brands')} 
            className="pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent font-semibold text-sm"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Brands
          </Button>

          <div className="flex items-center gap-2">
            {/* Hide Counted Pill */}
            <div 
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all border",
                hideCounted 
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm" 
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )} 
              onClick={() => { setHideCounted(!hideCounted); setIssuesOnly(false); }}
            >
              <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors", hideCounted ? "bg-indigo-500 border-indigo-500" : "border-slate-600")}>
                {hideCounted && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              Hide Counted
            </div>

            {/* Issues Only Pill */}
            <div 
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all border",
                issuesOnly 
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm" 
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )} 
              onClick={() => { setIssuesOnly(!issuesOnly); setHideCounted(false); }}
            >
              <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors", issuesOnly ? "bg-rose-500 border-rose-500" : "border-slate-600")}>
                {issuesOnly && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              Issues Only
            </div>
          </div>
        </div>
        
        {/* Search & Sort Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              type="search" 
              placeholder="Search material or code..." 
              className="w-full h-11 bg-card border-border focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-4 pr-10 text-sm font-medium placeholder:text-muted-foreground" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="flex h-11 w-36 items-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={sortQueue}
            onChange={(e) => setSortQueue(e.target.value as any)}
          >
            <option value="A-Z">A-Z</option>
            <option value="Highest Value">High Value</option>
            <option value="Highest Variance">High Variance</option>
          </select>
        </div>
      </div>

      {!currentProduct ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-8 p-10 bg-card border border-border shadow-sm rounded-xl rounded-3xl border-border shadow-2xl"
        >
          <div className="bg-secondary/50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No products match</h3>
          <p className="text-muted-foreground text-xs mt-1">Try clearing filters or searching another material.</p>
          <Button onClick={() => { setSearchQuery(''); setHideCounted(false); setIssuesOnly(false); }} className="mt-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500" size="sm">
            Reset Filters
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Progress Header */}
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Item Queue
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full">
                {currentIndex + 1} / {products.length}
              </span>
            </div>
          </div>

          {/* Main Counting Terminal Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProduct.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={cn(
                "bg-card border border-border shadow-sm rounded-xl border-border shadow-2xl rounded-3xl overflow-hidden relative transition-all duration-300",
                status === 'Equal' ? 'glow-green border-emerald-500/30' :
                status === 'Shortage' ? 'glow-red border-rose-500/30' :
                status === 'Excess' ? 'glow-amber border-amber-500/30' : ''
              )}>
                <CardContent className="p-5 sm:p-7 relative z-10 space-y-6">
                  {/* Material Title & Badges */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight tracking-tight">
                      {currentProduct.material_desc}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs bg-secondary/50 border-border text-foreground px-2.5 py-1">
                        {currentProduct.material}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 font-bold">
                        MRP ₹{currentProduct.mrp}
                      </Badge>
                      <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 font-bold">
                        1 CBB = {currentProduct.conversion} PCS
                      </Badge>
                    </div>
                  </div>

                  {/* CBB & PCS Large Touch Input Boxes */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">Cartons (CBB)</label>
                        <span className="text-[10px] text-indigo-400 font-semibold">x{currentProduct.conversion} PCS</span>
                      </div>
                      <Input 
                        type="text" 
                        inputMode="text"
                        placeholder="0" 
                        className="text-center text-3xl sm:text-4xl h-20 font-black bg-card border-border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl text-foreground transition-all shadow-inner" 
                        value={cbb}
                        onChange={(e) => setCbb(e.target.value)}
                        onBlur={handleCbbBlur}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">Loose (PCS)</label>
                        <span className="text-[10px] text-muted-foreground font-semibold">1x</span>
                      </div>
                      <Input 
                        type="text" 
                        inputMode="text"
                        placeholder="0" 
                        className="text-center text-3xl sm:text-4xl h-20 font-black bg-card border-border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl text-foreground transition-all shadow-inner" 
                        value={pcs}
                        onChange={(e) => setPcs(e.target.value)}
                        onBlur={handlePcsBlur}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  </div>

                  {/* System Expectation & Live Physical Total */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Expects</span>
                      <span className="font-extrabold text-sm text-foreground bg-secondary px-3 py-1 rounded-xl border border-border">
                        {currentProduct.system_qty_pcs} PCS
                      </span>
                    </div>
                    
                    {variance !== null && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-border space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Physical Total</span>
                          <div className="flex items-center gap-3">
                            <AnimatePresence mode="wait">
                              {saveStatus === 'saving' && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="text-[11px] font-bold text-indigo-400 flex items-center bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full"
                                >
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Auto-Saving
                                </motion.div>
                              )}
                              {saveStatus === 'saved' && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="text-[11px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
                                >
                                  <ListChecks className="h-3 w-3 mr-1" />
                                  Auto-Saved
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <span className="font-black text-xl text-foreground">
                              {((parseInt(evaluateMath(cbb))||0) * currentProduct.conversion) + (parseInt(evaluateMath(pcs))||0)} PCS
                            </span>
                          </div>
                        </div>

                        {/* Status & Variance Banner */}
                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                          status === 'Equal' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                          status === 'Shortage' ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                          "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        )}>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest opacity-90 mb-0.5">{status}</span>
                            <span className="font-black text-2xl sm:text-3xl">
                              {Math.abs(variance)} PCS
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Financial Impact</span>
                            <div className="font-extrabold text-sm sm:text-base mt-0.5">
                              {variance < 0 ? '-' : variance > 0 ? '+' : ''}₹{Math.abs(variance * currentProduct.mrp).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                        
                        {/* High Deviation Alert */}
                        {variance !== null && Math.abs(variance) >= (currentProduct.system_qty_pcs * 0.20) && Math.abs(variance) >= 5 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3"
                          >
                            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-extrabold text-rose-300">High Variance Warning</h4>
                              <p className="text-[11px] text-rose-400/90 mt-0.5 leading-relaxed">
                                Count deviates by more than 20% from system records. Please double-check physical cartons.
                              </p>
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Reason Code & Notes for Discrepancies */}
                        {variance !== null && status !== 'Equal' && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="pt-3 border-t border-border space-y-3"
                          >
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Reason Code</label>
                              <select 
                                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value)}
                              >
                                <option value="">Select reason code (optional)...</option>
                                <option value="Damaged">Damaged Goods</option>
                                <option value="Expired">Expired Goods</option>
                                <option value="Missing Box">Missing Box / Carton</option>
                                <option value="Wrong Box">Wrong Box Contents</option>
                                <option value="Theft Suspected">Theft Suspected</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Auditor Notes</label>
                              <textarea 
                                className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16 placeholder:text-slate-600"
                                placeholder="Add notes for the audit supervisor..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Action Buttons: Prev & Save/Next */}
          <div className="flex gap-3 pt-1">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-2xl font-bold text-sm bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shadow-md" 
              onClick={handlePrev} 
              disabled={currentIndex === 0 || saving}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Previous
            </Button>
            <Button 
              className={cn(
                "flex-[2] h-14 rounded-2xl font-extrabold text-base shadow-xl transition-all duration-300 text-foreground",
                variance !== null && status === 'Equal' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30" :
                variance !== null && status === 'Shortage' ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30" :
                variance !== null && status === 'Excess' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30" :
                "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30"
              )}
              onClick={handleSaveAndNext}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {currentIndex === products.length - 1 ? 'Complete Brand Audit' : 'Save & Next'}
              {!saving && currentIndex !== products.length - 1 && <ChevronRight className="ml-1.5 h-5 w-5" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

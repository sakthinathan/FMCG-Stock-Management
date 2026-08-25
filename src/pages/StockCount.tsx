import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, ListChecks, AlertTriangle, Package, Search, CheckCircle2, MessageSquare } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const statusStyle = (s: string) => {
  if (s === 'Equal')    return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  if (s === 'Shortage') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  if (s === 'Excess')   return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
};

const btn = (primary = true, disabled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px',
  borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  border: 'none', fontFamily: 'inherit',
  background: primary ? (disabled ? '#a5b4fc' : '#4f46e5') : (disabled ? '#f8fafc' : '#fff'),
  color: primary ? '#fff' : '#374151',
  ...(primary ? {} : { border: '1px solid #e2e8f0' }),
  opacity: disabled ? 0.7 : 1,
});


export function StockCount() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { activeUploadId } = useStockStore();

  const [brandName, setBrandName] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCounted, setHideCounted] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [sortQueue, setSortQueue] = useState<'A-Z' | 'Highest Value' | 'Highest Variance'>('A-Z');

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobileListOpen, setMobileListOpen] = useState(false);

  // Input states
  const [cbb, setCbb] = useState('');
  const [pcs, setPcs] = useState('');
  const [notes, setNotes] = useState('');
  const [reasonCode, setReasonCode] = useState('');

  // 1. Load session & products
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
        setBrandName(sessionData.brand);

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

        const merged = snapshotData.map(snap => {
          const c = countsData?.find(x => x.snapshot_id === snap.id);
          return {
            ...snap,
            existingCbb: c ? String(c.physical_cbb) : '',
            existingPcs: c ? String(c.physical_pcs) : '',
            existingNotes: c?.notes || '',
            existingReason: c?.reason_code || '',
            existingStatus: c?.status || 'Uncounted',
            existingVariance: c ? c.variance : null,
          };
        });

        setAllProducts(merged);
        if (merged.length > 0) {
          setSelectedProductId(merged[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId, activeUploadId]);

  // Evaluate simple math in inputs (e.g. 5+10)
  const evaluateMath = (str: string) => {
    if (!str) return '';
    try {
      if (/^[0-9+\-*/. ]+$/.test(str)) {
        const res = Function(`'use strict'; return (${str})`)();
        if (!isNaN(res) && isFinite(res)) {
          return String(Math.floor(res));
        }
      }
    } catch {}
    return str;
  };

  // Filter products list
  const filteredProducts = allProducts
    .filter(p => {
      const matchesSearch = p.material.toLowerCase().includes(searchQuery.toLowerCase()) || p.material_desc.toLowerCase().includes(searchQuery.toLowerCase());
      const isCounted = p.existingCbb !== '' || p.existingPcs !== '';
      if (hideCounted && isCounted) return false;
      if (issuesOnly) {
        if (!isCounted) return false;
        if (p.existingVariance === 0 || p.existingVariance === null) return false;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortQueue === 'Highest Value') return b.mrp - a.mrp;
      if (sortQueue === 'Highest Variance') {
        return Math.abs(b.prev_variance || 0) - Math.abs(a.prev_variance || 0);
      }
      return a.material.localeCompare(b.material);
    });

  const currentProduct = allProducts.find(p => p.id === selectedProductId) || filteredProducts[0];
  const currentIndex = currentProduct ? filteredProducts.findIndex(p => p.id === currentProduct.id) : -1;

  // Initialize inputs when selected product changes
  useEffect(() => {
    if (currentProduct) {
      setCbb(currentProduct.existingCbb);
      setPcs(currentProduct.existingPcs);
      setNotes(currentProduct.existingNotes);
      setReasonCode(currentProduct.existingReason);
      setSaveStatus('idle');
    } else {
      setCbb(''); setPcs(''); setNotes(''); setReasonCode('');
      setSaveStatus('idle');
    }
  }, [selectedProductId, allProducts]);

  // Calculate live variance
  const cbbVal = evaluateMath(cbb) !== '' ? parseInt(evaluateMath(cbb), 10) : 0;
  const pcsVal = evaluateMath(pcs) !== '' ? parseInt(evaluateMath(pcs), 10) : 0;
  const hasInput = cbb !== '' || pcs !== '';
  const totalPhysical = currentProduct ? (cbbVal * currentProduct.conversion) + pcsVal : 0;
  const liveVariance = currentProduct ? totalPhysical - currentProduct.system_qty_pcs : null;
  const liveStatus = liveVariance === null ? null : liveVariance === 0 ? 'Equal' : liveVariance < 0 ? 'Shortage' : 'Excess';

  // Auto-Save Effect
  useEffect(() => {
    if (!currentProduct || !sessionId) return;
    const isDifferent = cbb !== currentProduct.existingCbb || pcs !== currentProduct.existingPcs || notes !== currentProduct.existingNotes || reasonCode !== currentProduct.existingReason;
    if (!isDifferent) return;

    setSaveStatus('saving');
    const t = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('physical_stock_counts')
          .upsert({
            session_id: sessionId,
            snapshot_id: currentProduct.id,
            physical_cbb: cbbVal,
            physical_pcs: pcsVal,
            physical_total_pcs: totalPhysical,
            variance: liveVariance,
            status: liveStatus,
            notes,
            reason_code: reasonCode
          }, { onConflict: 'session_id,snapshot_id' });

        if (error) throw error;
        setSaveStatus('saved');

        // Update local memory silently
        setAllProducts(prev => prev.map(p => p.id === currentProduct.id ? {
          ...p,
          existingCbb: cbb,
          existingPcs: pcs,
          existingNotes: notes,
          existingReason: reasonCode,
          existingStatus: liveStatus,
          existingVariance: liveVariance
        } : p));
      } catch (e) {
        console.error(e);
        setSaveStatus('idle');
      }
    }, 500);

    return () => clearTimeout(t);
  }, [cbb, pcs, notes, reasonCode, currentProduct, sessionId]);

  const handleSaveAndNext = async () => {
    if (!currentProduct || !sessionId) return;
    setSaving(true);
    try {
      // 1. Force immediately save current state to db
      const { error } = await supabase
        .from('physical_stock_counts')
        .upsert({
          session_id: sessionId,
          snapshot_id: currentProduct.id,
          physical_cbb: cbbVal,
          physical_pcs: pcsVal,
          physical_total_pcs: totalPhysical,
          variance: liveVariance,
          status: liveStatus,
          notes,
          reason_code: reasonCode
        }, { onConflict: 'session_id,snapshot_id' });

      if (error) throw error;

      // Update local memory
      const updatedProducts = allProducts.map(p => p.id === currentProduct.id ? {
        ...p,
        existingCbb: cbb,
        existingPcs: pcs,
        existingNotes: notes,
        existingReason: reasonCode,
        existingStatus: liveStatus,
        existingVariance: liveVariance
      } : p);
      setAllProducts(updatedProducts);

      // Determine next product BEFORE changing the active product
      // If hideCounted is true, the current product will be filtered out. 
      // So the next item will actually shift to the same position (currentIndex).
      // Let's compute next item carefully:
      let nextProduct = null;
      if (hideCounted) {
        // Find next product in the list that is NOT the current one and is uncounted
        const remainingUncounted = filteredProducts.filter(p => p.id !== currentProduct.id);
        if (remainingUncounted.length > 0) {
          // Stay at same index if possible, or clamp to last
          const nextIdx = Math.min(currentIndex, remainingUncounted.length - 1);
          nextProduct = remainingUncounted[nextIdx];
        }
      } else {
        if (currentIndex < filteredProducts.length - 1) {
          nextProduct = filteredProducts[currentIndex + 1];
        }
      }

      if (nextProduct) {
        setSelectedProductId(nextProduct.id);
      } else {
        // Complete session
        const { error: completeErr } = await supabase
          .from('stock_count_sessions')
          .update({ status: 'Completed' })
          .eq('id', sessionId);
        if (completeErr) throw completeErr;
        alert('Audit session completed!');
        navigate('/brands');
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to save count: ' + (e.message || e.details || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedProductId(filteredProducts[currentIndex - 1].id);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><Loader2 size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>
      {/* Top breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/brands')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          <ArrowLeft size={16} /> Brands Selection
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMobileListOpen(true)} className="mobile-list-toggle-btn"
            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4f46e5', cursor: 'pointer', fontFamily: 'inherit' }}>
            Show SKUs List
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>{brandName} Queue</span>
        </div>
      </div>

      {/* Mobile overlay list */}
      {mobileListOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, display: 'flex' }} onClick={() => setMobileListOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', width: 280, background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 0' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>SKUs Queue</span>
              <button onClick={() => setMobileListOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16 }}>✕</button>
            </div>
            {/* search & filters */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                placeholder="Filter items..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 32, paddingLeft: 8, paddingRight: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setHideCounted(!hideCounted); setIssuesOnly(false); }} style={{ flex: 1, padding: '4px', fontSize: 10, background: hideCounted ? '#eef2ff' : '#fff', color: hideCounted ? '#4f46e5' : '#475569', border: '1px solid #e2e8f0', borderRadius: 4 }}>Hide Counted</button>
                <button onClick={() => { setIssuesOnly(!issuesOnly); setHideCounted(false); }} style={{ flex: 1, padding: '4px', fontSize: 10, background: issuesOnly ? '#fef2f2' : '#fff', color: issuesOnly ? '#dc2626' : '#475569', border: '1px solid #e2e8f0', borderRadius: 4 }}>Issues Only</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {filteredProducts.map(p => {
                const active = p.id === selectedProductId;
                const isCounted = p.existingCbb !== '' || p.existingPcs !== '';
                const sc = statusStyle(p.existingStatus);
                return (
                  <div key={p.id} onClick={() => { setSelectedProductId(p.id); setMobileListOpen(false); }}
                    style={{ padding: '8px 10px', borderRadius: 6, marginBottom: 4, background: active ? '#eef2ff' : 'transparent', borderLeft: `3px solid ${isCounted ? sc.border : 'transparent'}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: active ? '#4f46e5' : '#475569', marginBottom: 2 }}>
                      <span>{p.material}</span>
                      {isCounted && <span>{p.existingStatus}</span>}
                    </div>
                    <p style={{ fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.material_desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main split layout */}
      <div className="stock-count-layout" style={{ display: 'flex', gap: 20 }}>
        
        {/* Left Side: SKUs list (Desktop only, scrollable) */}
        <div className="skus-list-panel" style={{ ...W, width: 320, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', flexShrink: 0 }}>
          {/* List Search & Filters */}
          <div style={{ padding: 14, borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                placeholder="Filter items..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            {/* Filter checkboxes */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setHideCounted(!hideCounted); setIssuesOnly(false); }}
                style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: hideCounted ? '1px solid #c7d2fe' : '1px solid #e2e8f0', background: hideCounted ? '#eef2ff' : '#fff', color: hideCounted ? '#4f46e5' : '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Hide Counted
              </button>
              <button
                onClick={() => { setIssuesOnly(!issuesOnly); setHideCounted(false); }}
                style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: issuesOnly ? '1px solid #fecaca' : '1px solid #e2e8f0', background: issuesOnly ? '#fef2f2' : '#fff', color: issuesOnly ? '#dc2626' : '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Issues Only
              </button>
            </div>
          </div>

          {/* List scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No matching SKUs</div>
            ) : (
              filteredProducts.map(p => {
                const active = p.id === selectedProductId;
                const isCounted = p.existingCbb !== '' || p.existingPcs !== '';
                const sc = statusStyle(p.existingStatus);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                      background: active ? '#eef2ff' : 'transparent',
                      borderLeft: `3px solid ${isCounted ? sc.border : 'transparent'}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#4f46e5' : '#475569', fontFamily: 'monospace' }}>{p.material}</span>
                      {isCounted && <span style={{ fontSize: 9, fontWeight: 800, color: sc.color }}>{p.existingStatus}</span>}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.material_desc}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active item counting card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!currentProduct ? (
            <div style={{ ...W, padding: '64px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Package size={36} color="#cbd5e1" />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>No items to audit</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>All items in this brand queue have been counted.</p>
              </div>
              <button onClick={() => { setSearchQuery(''); setHideCounted(false); setIssuesOnly(false); }} style={{ ...btn(), padding: '8px 16px' }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={{ ...W, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Product Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Item {currentIndex + 1} of {filteredProducts.length}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>MRP ₹{currentProduct.mrp}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.3 }}>{currentProduct.material_desc}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace', background: '#eef2ff', padding: '3px 8px', borderRadius: 6 }}>SKU {currentProduct.material}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', background: '#f3f4f6', padding: '3px 8px', borderRadius: 6 }}>1 Case (CBB) = {currentProduct.conversion} PCS</span>
                </div>
              </div>

              {/* Large Touch Input Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cartons (CBB)</label>
                  <input
                    type="text" placeholder="0"
                    value={cbb} onChange={e => setCbb(e.target.value)}
                    style={{ width: '100%', height: 64, border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 28, fontWeight: 800, textAlign: 'center', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => e.target.select()}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4, textAlign: 'center' }}>= {cbbVal * currentProduct.conversion} PCS</span>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Loose (PCS)</label>
                  <input
                    type="text" placeholder="0"
                    value={pcs} onChange={e => setPcs(e.target.value)}
                    style={{ width: '100%', height: 64, border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 28, fontWeight: 800, textAlign: 'center', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => e.target.select()}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 4, textAlign: 'center' }}>Single pieces</span>
                </div>
              </div>

              {/* Calculation Summary Row */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>System Stock Target</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{currentProduct.system_qty_pcs} PCS</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Your Count Total</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {saveStatus === 'saving' && <span style={{ fontSize: 10, color: '#4f46e5', fontWeight: 600 }}>Saving...</span>}
                    {saveStatus === 'saved' && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Saved ✓</span>}
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{totalPhysical} PCS</span>
                  </div>
                </div>

                {/* Variance message banner */}
                {hasInput && liveVariance !== null && (
                  <div style={{
                    marginTop: 4, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: liveStatus === 'Equal' ? '#f0fdf4' : liveStatus === 'Shortage' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${liveStatus === 'Equal' ? '#bbf7d0' : liveStatus === 'Shortage' ? '#fecaca' : '#fde68a'}`,
                    color: liveStatus === 'Equal' ? '#16a34a' : liveStatus === 'Shortage' ? '#dc2626' : '#d97706',
                  }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{liveStatus}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{Math.abs(liveVariance)} PCS</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, margin: 0, opacity: 0.8 }}>Impact</p>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>₹{Math.round(Math.abs(liveVariance * currentProduct.mrp)).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* supervisor details if discrepancy */}
              {hasInput && liveStatus !== 'Equal' && liveStatus !== null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Reason Code</label>
                    <select value={reasonCode} onChange={e => setReasonCode(e.target.value)}
                      style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <option value="">Select reason...</option>
                      <option value="Damaged">Damaged Goods</option>
                      <option value="Expired">Expired Goods</option>
                      <option value="Missing Box">Missing Box / Carton</option>
                      <option value="Wrong Box">Wrong Box Contents</option>
                      <option value="Theft Suspected">Theft Suspected</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Auditor Notes</label>
                    <textarea
                      placeholder="Add supervisor explanation note..."
                      value={notes} onChange={e => setNotes(e.target.value)}
                      style={{ width: '100%', height: 60, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* Prev / Next Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  onClick={handlePrev} disabled={currentIndex <= 0 || saving}
                  style={{ ...btn(false, currentIndex <= 0 || saving), flex: 1, height: 44, justifyContent: 'center' }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  onClick={handleSaveAndNext} disabled={saving}
                  style={{ ...btn(true, saving), flex: 2, height: 44, justifyContent: 'center' }}
                >
                  {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {currentIndex === filteredProducts.length - 1 ? 'Complete Audit' : 'Save & Next'}
                  {!saving && currentIndex < filteredProducts.length - 1 && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .stock-count-layout { display: flex; }
        @media (min-width: 1024px) {
          .skus-list-panel { display: flex !important; }
          .mobile-list-toggle-btn { display: none !important; }
        }
        @media (max-width: 1023px) {
          .skus-list-panel { display: none !important; }
          .mobile-list-toggle-btn { display: inline-block !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

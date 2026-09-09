import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Building2, ArrowRight, XCircle, PackageSearch, Search } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { getBritanniaBrandImage } from '@/utils/brandImageUtils';

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
  const { activeUploadId, filename, clearActiveUpload } = useStockStore();
  const { profile } = useAuth();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Category & Search Filter States
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All Brands');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  const [pendingBrandName, setPendingBrandName] = useState('');
  const [sessionNameInput, setSessionNameInput] = useState('');

  const confirmCloseStockCheck = async () => {
    setShowCloseConfirm(false);
    if (activeUploadId) {
      try {
        await supabase
          .from('stock_count_sessions')
          .update({ status: 'Completed' })
          .eq('upload_id', activeUploadId)
          .eq('status', 'In Progress');
      } catch (e) {
        console.error("Error closing sessions:", e);
      }
    }
    clearActiveUpload();
    navigate('/upload');
  };

  useEffect(() => {
    async function loadBrandSummaries() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }
      try {
        const { data: snaps } = await supabase
          .from('system_stock_snapshots')
          .select('brand')
          .eq('upload_id', activeUploadId);

        const { data: sessions } = await supabase
          .from('stock_count_sessions')
          .select('id, brand, status')
          .eq('upload_id', activeUploadId);

        const { data: counts } = await supabase
          .from('physical_stock_counts')
          .select('session_id');

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

          list.push({
            name,
            totalProducts: total,
            countedProducts: counted,
            status,
            progress,
            sessionId: sess?.id || null
          });
        }
        setBrands(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error('Error loading brand summaries:', e);
      } finally {
        setLoading(false);
      }
    }

    loadBrandSummaries();
  }, [activeUploadId]);

  const handleStart = async (name: string, sessionId: string | null) => {
    if (sessionId) {
      navigate(`/count/${sessionId}`, { state: { brand: name } });
      return;
    }
    setPendingBrandName(name);
    setSessionNameInput(`Count - ${name}`);
    setShowSessionPrompt(true);
  };

  const confirmStartSession = async () => {
    setShowSessionPrompt(false);
    try {
      const sname = sessionNameInput || `Count - ${pendingBrandName}`;
      const { data } = await supabase
        .from('stock_count_sessions')
        .insert({
          upload_id: activeUploadId,
          brand: pendingBrandName,
          session_name: sname,
          status: 'In Progress',
          agency_id: profile?.agency_id
        })
        .select()
        .single();

      if (data) {
        navigate(`/count/${data.id}`, { state: { brand: pendingBrandName } });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading brand categories..." />;
  }

  if (!activeUploadId || brands.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No Stock File Active"
        description="Upload a stock Excel file to begin brand-wise counting"
        actionText="Upload Stock File"
        onAction={() => navigate('/upload')}
      />
    );
  }

  const doneCount = brands.filter(b => b.status === 'Completed').length;
  const inProgressCount = brands.filter(b => b.status === 'In Progress').length;
  const notStartedCount = brands.filter(b => b.status === 'Not Started').length;

  const filteredBrands = brands.filter(b => {
    // 1. Category / Status Filter
    if (selectedCategoryFilter === 'In Progress' && b.status !== 'In Progress') return false;
    if (selectedCategoryFilter === 'Completed' && b.status !== 'Completed') return false;
    if (selectedCategoryFilter === 'Not Started' && b.status !== 'Not Started') return false;

    if (selectedCategoryFilter === 'Biscuits & Bakery') {
      const name = b.name.toUpperCase();
      const isBiscuits = name.includes('BISCUIT') || name.includes('DAY') || name.includes('MARIE') || name.includes('NUTRI') || name.includes('BOURBON') || name.includes('BIKIS') || name.includes('CRACKER') || name.includes('50') || name.includes('TREAT') || name.includes('JIM') || name.includes('NICE') || name.includes('MAGIC') || name.includes('RUSK') || name.includes('TOAST') || name.includes('BAKERY');
      if (!isBiscuits) return false;
    }

    if (selectedCategoryFilter === 'Cakes & Wafers') {
      const name = b.name.toUpperCase();
      const isCake = name.includes('CAKE') || name.includes('WAFER') || name.includes('ROLL') || name.includes('GOBBLE') || name.includes('BROWNIE') || name.includes('MUFFIN');
      if (!isCake) return false;
    }

    if (selectedCategoryFilter === 'Dairy & Drinks') {
      const name = b.name.toUpperCase();
      const isDairy = name.includes('DAIRY') || name.includes('MILK') || name.includes('DRINK') || name.includes('COW') || name.includes('CHEES') || name.includes('BUTTER') || name.includes('GHEE') || name.includes('DAHI') || name.includes('BEVERAGE');
      if (!isDairy) return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return b.name.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Brand-Wise Counting"
        icon={PackageSearch}
        description={`${filename} · ${brands.length} brands · ${doneCount} completed`}
        actions={
          <>
            <button
              onClick={() => setShowCloseConfirm(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <XCircle size={14} /> Close Stock Check
            </button>
            <StatusBadge status="In Progress" customLabel={`${brands.length} Brands`} />
            <StatusBadge status="Completed" customLabel={`${doneCount} Done`} />
          </>
        }
      />

      {/* Search Bar & Category Filter Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Search Box */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Filter by brand name (e.g. Good Day, Marie)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', height: 42, paddingLeft: 42, paddingRight: 14,
              borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#0f172a', fontSize: 13, fontWeight: 600, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Britannia Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {[
            { key: 'All Brands', label: `All Brands (${brands.length})` },
            { key: 'In Progress', label: `In Progress (${inProgressCount})` },
            { key: 'Completed', label: `Completed (${doneCount})` },
            { key: 'Not Started', label: `Not Started (${notStartedCount})` },
            { key: 'Biscuits & Bakery', label: `Biscuits & Bakery` },
            { key: 'Cakes & Wafers', label: `Cakes & Wafers` },
            { key: 'Dairy & Drinks', label: `Dairy & Drinks` },
          ].map(cat => {
            const active = selectedCategoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategoryFilter(cat.key)}
                className={active ? 'brit-pill-active' : 'brit-pill-inactive'}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filteredBrands.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <PackageSearch size={36} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No Brands Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>No brands match your active category filter or search query.</p>
          <button
            onClick={() => { setSelectedCategoryFilter('All Brands'); setSearchQuery(''); }}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#e52321', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase' }}
          >
            Clear Filters & Show All
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
          {filteredBrands.map((brand, i) => {
          const isDone = brand.status === 'Completed';
          const isInProgress = brand.status === 'In Progress';

          const cardBg = isDone ? '#f0fdf4' : '#fff';
          const cardBorder = isDone ? '#bbf7d0' : isInProgress ? '#fecaca' : '#e2e8f0';
          const barColor = isDone ? '#16a34a' : isInProgress ? '#e52321' : '#94a3b8';

          return (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
            >
              <div
                className="brit-card"
                style={{
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: 20,
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Top header inside card with official Britannia Brand Artwork */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div
                    style={{
                      height: 52,
                      padding: '4px 10px',
                      borderRadius: 12,
                      background: '#fff',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      maxWidth: 120,
                    }}
                  >
                    <img
                      src={getBritanniaBrandImage(brand.name)}
                      alt={brand.name}
                      style={{
                        maxHeight: 44,
                        maxWidth: 100,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/brands/logo.webp";
                      }}
                    />
                  </div>
                  <StatusBadge status={brand.status} size="sm" />
                </div>

                {/* Brand name & details */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    {brand.name}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>
                    {brand.countedProducts} / {brand.totalProducts} counted
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{brand.progress}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${brand.progress}%`, background: barColor, borderRadius: 9999, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Start / Resume Button */}
                <button
                  onClick={() => handleStart(brand.name, brand.sessionId)}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    border: isDone ? '1px solid #e2e8f0' : 'none',
                    background: isDone ? '#fff' : '#e52321',
                    color: isDone ? '#475569' : '#fff',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    boxShadow: isDone ? 'none' : '0 4px 12px rgba(229,35,33,0.25)',
                  }}
                >
                  {brand.status === 'Not Started' ? 'Start Count' : isDone ? 'View Results' : 'Resume Count'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          );
        })}
        </div>
      )}

      {/* Confirm Close Modal */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        title="Close Stock Check?"
        description="Are you sure you want to CLOSE the current stock check? Once closed, this session will end, and you will need to upload a new Excel file to start a new check."
        confirmText="Close Session"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmCloseStockCheck}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {/* New Session Prompt Modal */}
      <ConfirmModal
        isOpen={showSessionPrompt}
        title="New Count Session"
        description={
          <>
            Create a new auditing session for brand <strong>{pendingBrandName}</strong>. You can optionally name this session below:
          </>
        }
        promptWord={`Count - ${pendingBrandName}`}
        inputValue={sessionNameInput}
        onInputChange={setSessionNameInput}
        confirmText="Start Session"
        cancelText="Cancel"
        onConfirm={confirmStartSession}
        onCancel={() => setShowSessionPrompt(false)}
      />
    </div>
  );
}

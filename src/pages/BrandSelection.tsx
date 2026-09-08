import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Building2, ArrowRight, XCircle, PackageSearch } from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmModal } from '@/components/common/ConfirmModal';

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
      navigate(`/count/${sessionId}`);
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
        navigate(`/count/${data.id}`);
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

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {brands.map((brand, i) => {
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
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  height: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* Top header inside card */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isDone ? '#f0fdf4' : isInProgress ? '#fef2f2' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={18} color={isDone ? '#16a34a' : isInProgress ? '#e52321' : '#94a3b8'} />
                  </div>
                  <StatusBadge status={brand.status} size="sm" />
                </div>

                {/* Brand name & details */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', textTransform: 'uppercase' }}>
                    {brand.name}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
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

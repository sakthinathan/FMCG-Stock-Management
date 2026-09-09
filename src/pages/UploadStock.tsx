import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, History } from 'lucide-react';
import { parseExcelFile, type ParseResult } from '@/lib/excelParser';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const btn = (primary = true): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
  borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
  background: primary ? '#e52321' : '#fff', color: primary ? '#fff' : '#374151',
  ...(primary ? { boxShadow: '0 4px 12px rgba(229,35,33,0.25)', textTransform: 'uppercase', letterSpacing: '0.02em' } : { border: '1px solid #e2e8f0' }),
  fontFamily: 'inherit',
});

export function UploadStock() {
  const { profile, agency } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const { activeUploadId, setActiveUpload } = useStockStore();

  const currentAgencyId = agency?.id || profile?.agency_id;

  const fetchHistory = async () => {
    if (!currentAgencyId) return;
    const { data } = await supabase
      .from('stock_uploads')
      .select('*')
      .eq('agency_id', currentAgencyId)
      .order('uploaded_at', { ascending: false });
    if (data) setUploadHistory(data);
  };

  useEffect(() => { fetchHistory(); }, [currentAgencyId]);

  const formatStockFileName = (originalName: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const extMatch = originalName.match(/\.(xlsx|xls|csv)$/i);
    const ext = extMatch ? extMatch[0] : '.xlsx';
    return `Stock_MRP_${day}_${month}_${year}_${hours}_${minutes}_${seconds}${ext}`;
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await parseExcelFile(file);
      if (result.products.length === 0) {
        setError('No valid products found.');
        setIsUploading(false);
        return;
      }

      const formattedFileName = formatStockFileName(file.name);

      const { data: uploadData, error: uploadError } = await supabase.from('stock_uploads')
        .insert({ file_name: formattedFileName, total_records: result.products.length, agency_id: currentAgencyId }).select().single();
      if (uploadError) throw uploadError;

      const prevVariances = new Map();
      try {
        if (currentAgencyId) {
          const { data: lastUploads } = await supabase.from('stock_uploads')
            .select('id')
            .eq('agency_id', currentAgencyId)
            .order('uploaded_at', { ascending: false })
            .limit(2);
          if (lastUploads && lastUploads.length > 1) {
            const prevId = lastUploads[1].id;
            const { data: prevSnaps } = await supabase.from('system_stock_snapshots').select('id, material, mrp').eq('upload_id', prevId);
            if (prevSnaps) {
              const { data: prevCounts } = await supabase.from('physical_stock_counts').select('snapshot_id, variance');
              if (prevCounts) {
                const cm = new Map(prevCounts.map(c => [c.snapshot_id, c.variance]));
                prevSnaps.forEach(s => { if (cm.has(s.id)) prevVariances.set(`${s.material}_${s.mrp}`, cm.get(s.id)); });
              }
            }
          }
        }
      } catch {}

      const rows = result.products.map(p => ({
        upload_id: uploadData.id,
        material: p.material,
        material_desc: p.description,
        brand: p.brand,
        mrp: p.mrp,
        good_qty: p.goodQty,
        conversion: p.conversion,
        system_qty_pcs: p.systemQtyPcs,
        prev_variance: prevVariances.get(`${p.material}_${p.mrp}`) || 0,
      }));
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error: snapErr } = await supabase.from('system_stock_snapshots').insert(batch);
        if (snapErr) throw snapErr;
      }

      setParseResult(result);
      setActiveUpload(uploadData.id, formattedFileName, uploadData.uploaded_at);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to process file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Upload System Stock"
        description="Import the latest Excel stock master file to begin reconciliation"
        icon={UploadCloud}
      />

      {/* Drop Zone */}
      <div style={card}>
        <div style={{ padding: '28px 24px' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />

          {!parseResult ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#e52321' : '#e2e8f0'}`,
                borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? '#fef2f2' : '#fafafa',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UploadCloud size={24} color="#e52321" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Click or drag & drop to upload</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Supports .xlsx, .xls, and .csv files</p>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', maxWidth: 380, margin: '0 auto 16px' }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <button style={btn()} disabled={isUploading}>
                {isUploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : 'Select Excel File'}
              </button>
            </div>
          ) : (
            <div style={{ border: '2px solid #bbf7d0', borderRadius: 12, padding: '40px 24px', textAlign: 'center', background: '#f0fdf4' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={26} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>Upload Complete!</h3>
              <p style={{ fontSize: 13, color: '#166534', margin: '0 0 20px' }}>
                <strong>{parseResult.products.length}</strong> products imported · {parseResult.filteredZeroQty} zero-stock records excluded
              </p>
              <button style={btn(false)} onClick={() => { setParseResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                Upload Another File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {uploadHistory.length > 0 && (
        <div style={card}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={16} color="#4f46e5" />
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Upload History</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Select a previous file to switch active snapshot</p>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploadHistory.map(upload => {
              const isActive = activeUploadId === upload.id;
              return (
                <div key={upload.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10, gap: 12,
                  background: isActive ? '#eef2ff' : '#f8fafc',
                  border: `1px solid ${isActive ? '#c7d2fe' : '#e2e8f0'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: isActive ? '#4f46e5' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileSpreadsheet size={16} color={isActive ? '#fff' : '#64748b'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upload.file_name}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{upload.total_records} SKUs · {new Date(upload.uploaded_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isActive ? (
                      <StatusBadge status="Completed" customLabel="Active" />
                    ) : (
                      <button style={{ ...btn(false), padding: '6px 14px', fontSize: 12 }} onClick={() => setActiveUpload(upload.id, upload.file_name, upload.uploaded_at)}>
                        Switch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, History } from 'lucide-react';
import { parseExcelFile, type ParseResult } from '@/lib/excelParser';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const btn = (primary = true): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
  background: primary ? '#4f46e5' : '#fff', color: primary ? '#fff' : '#374151',
  ...(primary ? {} : { border: '1px solid #e2e8f0' }),
});

export function UploadStock() {
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const { activeUploadId, filename: activeFilename, setActiveUpload } = useStockStore();

  const fetchHistory = async () => {
    const { data } = await supabase.from('stock_uploads').select('*').order('uploaded_at', { ascending: false });
    if (data) setUploadHistory(data);
  };

  React.useEffect(() => { fetchHistory(); }, []);

  const processFile = async (file: File) => {
    setIsUploading(true); setError(null);
    try {
      const result = await parseExcelFile(file);
      if (result.products.length === 0) { setError('No valid products found.'); setIsUploading(false); return; }

      const { data: uploadData, error: uploadError } = await supabase.from('stock_uploads')
        .insert({ file_name: file.name, total_records: result.products.length, agency_id: profile?.agency_id }).select().single();
      if (uploadError) throw uploadError;

      const prevVariances = new Map();
      try {
        const { data: lastUploads } = await supabase.from('stock_uploads').select('id').order('uploaded_at', { ascending: false }).limit(2);
        if (lastUploads && lastUploads.length > 1) {
          const prevId = lastUploads[1].id;
          const { data: prevSnaps } = await supabase.from('system_stock_snapshots').select('id, material').eq('upload_id', prevId);
          if (prevSnaps) {
            const { data: prevCounts } = await supabase.from('physical_stock_counts').select('snapshot_id, variance');
            if (prevCounts) {
              const cm = new Map(prevCounts.map(c => [c.snapshot_id, c.variance]));
              prevSnaps.forEach(s => { if (cm.has(s.id)) prevVariances.set(s.material, cm.get(s.id)); });
            }
          }
        }
      } catch {}

      const rows = result.products.map(p => ({
        upload_id: uploadData.id, material: p.material, material_desc: p.description,
        brand: p.brand, mrp: p.mrp, good_qty: p.goodQty, conversion: p.conversion,
        system_qty_pcs: p.systemQtyPcs, prev_variance: prevVariances.get(p.material) || 0,
      }));
      const { error: snapErr } = await supabase.from('system_stock_snapshots').insert(rows);
      if (snapErr) throw snapErr;

      setParseResult(result);
      setActiveUpload(uploadData.id, file.name, uploadData.uploaded_at);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to process file.');
    } finally { setIsUploading(false); }
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
      <div style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UploadCloud size={20} color="#4f46e5" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Upload System Stock</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>Import the latest Excel stock master file to begin reconciliation</p>
        </div>
      </div>

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
                border: `2px dashed ${dragOver ? '#4f46e5' : '#e2e8f0'}`,
                borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? '#eef2ff' : '#fafafa',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UploadCloud size={24} color="#4f46e5" />
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
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#4f46e5', color: '#fff', padding: '4px 10px', borderRadius: 9999 }}>Active</span>
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

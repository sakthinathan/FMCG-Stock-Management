import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, History, ArrowRight, Sparkles } from 'lucide-react';
import { parseExcelFile, type ParseResult } from '@/lib/excelParser';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export function UploadStock() {
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);

  const { activeUploadId, filename: activeFilename, uploadedAt, setActiveUpload, clearActiveUpload } = useStockStore();

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('stock_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (data) setUploadHistory(data);
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    
    try {
      const result = await parseExcelFile(file);
      if (result.products.length === 0) {
        setError("No valid products found in the file.");
        setIsUploading(false);
        return;
      }

      // 1. Create upload record in Supabase
      const { data: uploadData, error: uploadError } = await supabase
        .from('stock_uploads')
        .insert({
          file_name: file.name,
          total_records: result.products.length,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // 1.5 Fetch previous variances
      const prevVariances = new Map();
      try {
        const { data: lastUploads } = await supabase
          .from('stock_uploads')
          .select('id')
          .order('uploaded_at', { ascending: false })
          .limit(2);

        if (lastUploads && lastUploads.length > 1) {
          const prevUploadId = lastUploads[1].id;
          
          const { data: prevSnapshots } = await supabase
            .from('system_stock_snapshots')
            .select('id, material')
            .eq('upload_id', prevUploadId);

          if (prevSnapshots && prevSnapshots.length > 0) {
            const { data: prevCounts } = await supabase
              .from('physical_stock_counts')
              .select('snapshot_id, variance');

            if (prevCounts) {
              const countMap = new Map();
              prevCounts.forEach(c => countMap.set(c.snapshot_id, c.variance));
              
              prevSnapshots.forEach(s => {
                if (countMap.has(s.id)) {
                  prevVariances.set(s.material, countMap.get(s.id));
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch previous variances, continuing anyway", e);
      }

      // 2. Prepare snapshots for bulk insert
      const snapshotRows = result.products.map(p => ({
        upload_id: uploadData.id,
        material: p.material,
        material_desc: p.description,
        brand: p.brand,
        mrp: p.mrp,
        good_qty: p.goodQty,
        conversion: p.conversion,
        system_qty_pcs: p.systemQtyPcs,
        prev_variance: prevVariances.has(p.material) ? prevVariances.get(p.material) : 0,
      }));

      // 3. Bulk insert snapshots
      const { error: snapshotError } = await supabase
        .from('system_stock_snapshots')
        .insert(snapshotRows);

      if (snapshotError) throw snapshotError;

      setParseResult(result);
      setActiveUpload(uploadData.id, file.name, uploadData.uploaded_at);
      fetchHistory();
    } catch (err: any) {
      console.error("Error parsing/uploading file:", err);
      setError(err.message || "Failed to process the Excel file and save to database.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="bg-card  p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Upload System Stock</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Upload the latest inventory spreadsheet export from the Britannia distributor portal.
            </p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Card */}
      <Card className="bg-card border border-border shadow-sm rounded-xl border-border shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          
          {!parseResult ? (
            <div 
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 sm:p-14 text-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer group"
              onClick={triggerFileInput}
            >
              <div className="p-4 rounded-2xl bg-secondary/50 text-indigo-400 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/10 mb-4">
                <UploadCloud className="h-10 w-10" />
              </div>
              <h3 className="text-base font-extrabold text-foreground mb-1">
                Click to browse or drag & drop file
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-6 leading-relaxed">
                Accepts <span className="text-indigo-400 font-semibold">.xlsx</span>, <span className="text-indigo-400 font-semibold">.xls</span>, and <span className="text-indigo-400 font-semibold">.csv</span> files.
              </p>
              
              {error && (
                <div className="flex items-center text-rose-400 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-bold mb-4 max-w-sm">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                disabled={isUploading}
                className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-foreground shadow-lg shadow-indigo-600/30 px-6 h-11"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing & Ingesting...
                  </>
                ) : (
                  "Select Excel File"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-10 text-center">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-black text-emerald-400 mb-1">
                Upload & Ingestion Complete
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-md mb-6 leading-relaxed">
                Successfully processed <strong>{parseResult.products.length} products</strong> into the active audit snapshot. Excluded {parseResult.filteredZeroQty} records with zero stock.
              </p>
              <Button 
                variant="outline" 
                className="rounded-xl font-bold border-border hover:bg-secondary text-foreground"
                onClick={() => {
                  setParseResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Upload Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload History List */}
      {uploadHistory.length > 0 && (
        <Card className="bg-card border border-border shadow-sm rounded-xl border-border rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="bg-card border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-400" />
              <div>
                <CardTitle className="text-lg font-black text-foreground">Upload History</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Select a prior upload session to switch the active snapshot.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3">
              {uploadHistory.map((upload) => {
                const isActive = activeUploadId === upload.id;
                return (
                  <div 
                    key={upload.id} 
                    className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                      isActive 
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' 
                        : 'bg-card border-border hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-indigo-500 text-foreground' : 'bg-secondary text-muted-foreground'}`}>
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-foreground' : 'text-foreground'}`}>
                          {upload.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {upload.total_records} SKUs • {new Date(upload.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {isActive ? (
                        <Badge className="bg-indigo-500 text-foreground font-bold text-xs px-3 py-1 rounded-xl">
                          Active Snapshot
                        </Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl border-border hover:bg-secondary text-muted-foreground font-bold text-xs h-9"
                          onClick={() => setActiveUpload(upload.id, upload.file_name, upload.uploaded_at)}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

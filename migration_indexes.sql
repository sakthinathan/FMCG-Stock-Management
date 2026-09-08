-- Performance Optimization Indexes for FMCG Stock Management System

-- 1. Index on system_stock_snapshots for rapid upload_id and brand filtering
CREATE INDEX IF NOT EXISTS idx_snapshots_upload_brand 
ON system_stock_snapshots(upload_id, brand);

-- 2. Index on system_stock_snapshots for material search
CREATE INDEX IF NOT EXISTS idx_snapshots_material 
ON system_stock_snapshots(upload_id, material);

-- 3. Index on physical_stock_counts for fast session & snapshot joins
CREATE INDEX IF NOT EXISTS idx_counts_session_snapshot 
ON physical_stock_counts(session_id, snapshot_id);

-- 4. Index on physical_stock_counts for variance issue filtering
CREATE INDEX IF NOT EXISTS idx_counts_variance 
ON physical_stock_counts(variance) 
WHERE variance != 0;

-- 5. Multi-tenant RLS Indexing on agency_id
CREATE INDEX IF NOT EXISTS idx_uploads_agency 
ON stock_uploads(agency_id);

CREATE INDEX IF NOT EXISTS idx_sessions_agency 
ON stock_count_sessions(agency_id);

CREATE INDEX IF NOT EXISTS idx_profiles_agency 
ON profiles(agency_id);

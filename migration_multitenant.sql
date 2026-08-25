-- 1. Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Auditor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add agency_id to stock_uploads and stock_count_sessions
ALTER TABLE stock_uploads ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
ALTER TABLE stock_count_sessions ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create default agency so existing data is not orphaned
INSERT INTO agencies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Thulir Agency')
ON CONFLICT (id) DO NOTHING;

-- Map any existing uploads & sessions to default Thulir Agency
UPDATE stock_uploads SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE stock_count_sessions SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;

-- Automatically create profile for any existing user on login, or map manually
-- To make sure existing auth.users are linked to default agency, insert them:
INSERT INTO profiles (id, agency_id, role)
SELECT id, '00000000-0000-0000-0000-000000000001', 'Owner' 
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Setup RLS Policies for Tenant Isolation

-- Agencies Policy
DROP POLICY IF EXISTS "Allow users to read their own agency" ON agencies;
CREATE POLICY "Allow users to read their own agency" ON agencies
    FOR SELECT USING (
        id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    );

-- Profiles Policy
DROP POLICY IF EXISTS "Allow users to read profiles in same agency" ON profiles;
CREATE POLICY "Allow users to read profiles in same agency" ON profiles
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    ) WITH CHECK (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    );

-- Stock Uploads Policy
DROP POLICY IF EXISTS "Allow public all on stock_uploads" ON stock_uploads;
CREATE POLICY "Allow tenant all on stock_uploads" ON stock_uploads
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    ) WITH CHECK (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    );

-- Stock Count Sessions Policy
DROP POLICY IF EXISTS "Allow public all on stock_count_sessions" ON stock_count_sessions;
CREATE POLICY "Allow tenant all on stock_count_sessions" ON stock_count_sessions
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    ) WITH CHECK (
        agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())
    );

-- System Stock Snapshots Policy (Inherited security via upload relation join)
DROP POLICY IF EXISTS "Allow public all on system_stock_snapshots" ON system_stock_snapshots;
CREATE POLICY "Allow tenant read on system_stock_snapshots" ON system_stock_snapshots
    FOR ALL USING (
        upload_id IN (SELECT id FROM stock_uploads WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()))
    ) WITH CHECK (
        upload_id IN (SELECT id FROM stock_uploads WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()))
    );

-- Physical Stock Counts Policy (Inherited security via session relation join)
DROP POLICY IF EXISTS "Allow public all on physical_stock_counts" ON physical_stock_counts;
CREATE POLICY "Allow tenant all on physical_stock_counts" ON physical_stock_counts
    FOR ALL USING (
        session_id IN (SELECT id FROM stock_count_sessions WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()))
    ) WITH CHECK (
        session_id IN (SELECT id FROM stock_count_sessions WHERE agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()))
    );

-- 1. Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aw_code TEXT UNIQUE,
    district TEXT,
    mobile TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if table already existed
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS aw_code TEXT UNIQUE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS mobile TEXT;

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
INSERT INTO agencies (id, name, aw_code, district, mobile)
VALUES ('00000000-0000-0000-0000-000000000001', 'Thulir Agency', 'AW0001', 'Chennai', '9876543210')
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

-- 6. Setup Recursion-Free RLS Policies via Security Definer Helper

-- Create a helper function with SECURITY DEFINER to bypass RLS recursion
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (SELECT agency_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Allow users to read their own agency" ON agencies;
DROP POLICY IF EXISTS "Allow public lookup of agency by aw_code" ON agencies;
DROP POLICY IF EXISTS "Allow authenticated users to create agencies" ON agencies;
DROP POLICY IF EXISTS "Allow anyone to create agencies" ON agencies;

-- Agencies Policies: Allow anyone (anon + auth) to read/lookup agencies by aw_code for login verification
CREATE POLICY "Allow public lookup of agency by aw_code" ON agencies
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anyone to create agencies" ON agencies
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- RPC Function to safely insert new agencies during registration
CREATE OR REPLACE FUNCTION public.create_agency(
    p_agency_name TEXT,
    p_aw_code TEXT,
    p_district TEXT DEFAULT NULL,
    p_mobile TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_agency_id UUID;
BEGIN
    INSERT INTO public.agencies (name, aw_code, district, mobile, logo_url)
    VALUES (p_agency_name, UPPER(p_aw_code), p_district, p_mobile, p_logo_url)
    RETURNING id INTO new_agency_id;

    RETURN new_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_agency(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Profiles Policies
CREATE POLICY "Allow users to select profiles in same agency" ON profiles
    FOR SELECT USING (
        agency_id = get_user_agency_id()
    );

CREATE POLICY "Allow users to write own profile" ON profiles
    FOR ALL USING (
        id = auth.uid()
    ) WITH CHECK (
        id = auth.uid()
    );

-- Stock Uploads Policies
CREATE POLICY "Allow tenant all on stock_uploads" ON stock_uploads
    FOR ALL USING (
        agency_id = get_user_agency_id()
    ) WITH CHECK (
        agency_id = get_user_agency_id()
    );

-- Stock Count Sessions Policies
CREATE POLICY "Allow tenant all on stock_count_sessions" ON stock_count_sessions
    FOR ALL USING (
        agency_id = get_user_agency_id()
    ) WITH CHECK (
        agency_id = get_user_agency_id()
    );

-- System Stock Snapshots Policies
CREATE POLICY "Allow tenant read on system_stock_snapshots" ON system_stock_snapshots
    FOR ALL USING (
        upload_id IN (SELECT id FROM stock_uploads WHERE agency_id = get_user_agency_id())
    ) WITH CHECK (
        upload_id IN (SELECT id FROM stock_uploads WHERE agency_id = get_user_agency_id())
    );

-- Physical Stock Counts Policies
CREATE POLICY "Allow tenant all on physical_stock_counts" ON physical_stock_counts
    FOR ALL USING (
        session_id IN (SELECT id FROM stock_count_sessions WHERE agency_id = get_user_agency_id())
    ) WITH CHECK (
        session_id IN (SELECT id FROM stock_count_sessions WHERE agency_id = get_user_agency_id())
    );

-- 7. Database trigger to automatically create profiles for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'agency_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, agency_id, role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'agency_id')::uuid,
      COALESCE(NEW.raw_user_meta_data->>'role', 'Owner')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

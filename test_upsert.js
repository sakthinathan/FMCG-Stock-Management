import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vjmmrjgywaiyealudpwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbW1yamd5d2FpeWVhbHVkcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODYxNTgsImV4cCI6MjEwMzE2MjE1OH0.Tjqm4gk99RwVrmlXiodvoqHbLbEZyg7GP2EmHU7L8Ys';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Logging in as admin@thuliragency.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@thuliragency.com',
    password: 'Thulir123'
  });

  if (authError) {
    console.error("Login failed:", authError);
    return;
  }
  console.log("Logged in successfully! User ID:", authData.user.id);

  console.log("Fetching first session...");
  const { data: sess, error: e1 } = await supabase.from('stock_count_sessions').select('*').limit(1);
  if (e1) {
    console.error("Session error:", e1);
    return;
  }
  if (!sess || sess.length === 0) {
    console.log("No sessions found.");
    return;
  }
  const session = sess[0];
  console.log("Found session:", session.id, "brand:", session.brand);

  console.log("Fetching snapshot products for session's upload...");
  const { data: snaps, error: e2 } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', session.upload_id).eq('brand', session.brand).limit(1);
  if (e2) {
    console.error("Snapshot error:", e2);
    return;
  }
  if (!snaps || snaps.length === 0) {
    console.log("No snapshots found.");
    return;
  }
  const snap = snaps[0];
  console.log("Found snapshot product:", snap.id, "material:", snap.material);

  console.log("Attempting upsert of physical count...");
  const { data, error } = await supabase
    .from('physical_stock_counts')
    .upsert({
      session_id: session.id,
      snapshot_id: snap.id,
      physical_cbb: 10,
      physical_pcs: 5,
      physical_total_pcs: 10 * snap.conversion + 5,
      variance: 5,
      status: 'Excess',
      notes: 'Test authenticated',
      reason_code: 'Other'
    }, { onConflict: 'session_id,snapshot_id' });

  if (error) {
    console.error("Upsert failed with error:", error);
  } else {
    console.log("Upsert succeeded! Data:", data);
  }
}

test();

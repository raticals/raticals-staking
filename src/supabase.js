const { createClient } = require('@supabase/supabase-js');

// Use service role key for backend — bypasses RLS so snapshot engine can write
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;

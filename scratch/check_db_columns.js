const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // We can't query information_schema easily with anon key usually, 
  // so we'll just try to select one row and see the keys
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('COLUMNS:', data.length > 0 ? Object.keys(data[0]) : 'No data, columns unknown');
  }
}

checkSchema();

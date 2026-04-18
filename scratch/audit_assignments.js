const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditData() {
    console.log('--- STARTING DATA AUDIT ---');
    const { data, count } = await supabase.from('customers').select('id, name, assigned_executive').limit(10);
    console.log('SAMPLE_RECORDS:', JSON.stringify(data, null, 2));
    
    const { data: nulls } = await supabase.from('customers').select('id').is('assigned_executive', null).limit(1);
    console.log('HAS_NULL_ASSIGNMENTS:', !!nulls?.length);
    
    const { data: empty } = await supabase.from('customers').select('id').eq('assigned_executive', '').limit(1);
    console.log('HAS_EMPTY_ASSIGNMENTS:', !!empty?.length);
}

auditData();

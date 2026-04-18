const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = 'c:\\Users\\advai\\Desktop\\thccollection\\.env.local';
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
    const { data, error } = await supabase.from('customers').select('assigned_executive').limit(10);
    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('CUSTOMERS_SAMPLE:', data);
    }
}

checkData();

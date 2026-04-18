const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// 1. Setup Supabase
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function autoProvision() {
    console.log('--- 🚀 STARTING AGENT AUTO-PROVISIONING ---');

    // 2. Get Unique Agents from Excel
    const filePath = 'c:\\Users\\advai\\Desktop\\thccollection\\123.xlsx';
    const workbook = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const rawHeaders = data[0].map(h => h?.toString().trim() || "");
    const execIndex = rawHeaders.indexOf("Executive");
    
    if (execIndex === -1) {
        console.error('ERROR: "Executive" column not found in Excel.');
        return;
    }

    const excelAgents = new Set();
    data.slice(1).forEach(row => {
        if (row[execIndex]) excelAgents.add(row[execIndex].toString().trim());
    });

    console.log(`FOUND ${excelAgents.size} AGENTS IN EXCEL.`);

    // 3. Get Existing Profiles to avoid duplicates
    const { data: existing } = await supabase.from('profiles').select('full_name_excel');
    const existingNames = new Set(existing?.map(p => p.full_name_excel) || []);

    // 4. Create Missing Accounts
    for (const agentName of excelAgents) {
        if (existingNames.has(agentName)) {
            console.log(`SKIPPING: ${agentName} (Already exists)`);
            continue;
        }

        const username = agentName.toLowerCase().replace(/\s/g, '');
        const email = `${username}@thc.com`;
        const password = 'THC2026!'; // User requirement

        console.log(`CREATING: ${agentName} (${email})...`);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: agentName
                }
            }
        });

        if (error) {
            console.error(`FAILED to create ${agentName}:`, error.message);
        } else {
            console.log(`✅ SUCCESS: ${agentName} created.`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('--- ✅ AUTO-PROVISIONING COMPLETE ---');
}

autoProvision();

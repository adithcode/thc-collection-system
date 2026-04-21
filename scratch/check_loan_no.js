const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cfwfoeqwwuouftqnngye.supabase.co';
const supabaseKey = 'sb_publishable_yj65D_NUmD1-Y5tOoh2aXA_ieXCb6Xd';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    if (error.message.includes('column "loan_no" does not exist')) {
        console.log('COLUMN_MISSING: loan_no');
    } else {
        console.error('Error:', error);
    }
  } else {
    console.log('COLUMNS:', data.length > 0 ? Object.keys(data[0]) : 'TABLE_EMPTY_OR_NO_DATA');
    // If empty, we can try to insert a dummy row to see if it fails on columns
    if (data.length === 0) {
        const { error: insErr } = await supabase.from('customers').insert({ name: 'test', phone: 'test', loan_amount: 0, due_date: '2020-01-01', loan_no: 'test' });
        if (insErr && insErr.message.includes('column "loan_no" of relation "customers" does not exist')) {
             console.log('COLUMN_MISSING: loan_no');
        } else if (insErr) {
             console.log('INSERT_ERROR:', insErr.message);
        } else {
             console.log('COLUMN_EXISTS: loan_no (Delete test row now)');
             await supabase.from('customers').delete().eq('name', 'test');
        }
    }
  }
}

checkSchema();

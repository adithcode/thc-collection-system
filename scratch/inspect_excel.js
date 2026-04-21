const XLSX = require('xlsx');

const filePath = 'c:\\Users\\advai\\Desktop\\thccollection\\adith file sample (1).xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
    const headers = data[0];
    console.log('Total Columns:', headers.length);
    headers.forEach((h, i) => {
        console.log(`[${i}] ${h}`);
    });
    
    console.log('\n--- FIRST DATA ROW (SAMPLE 1) ---');
    data[1].forEach((v, i) => {
        if (v !== undefined && v !== '') {
            console.log(`[${i}] ${headers[i]}: ${v}`);
        }
    });
}

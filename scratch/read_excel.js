const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\advai\\Desktop\\thccollection\\123.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const rawHeaders = data[0].map(h => h?.toString().trim() || "");
const execIndex = rawHeaders.indexOf("Executive");

if (execIndex !== -1) {
  console.log('HEADERS:', rawHeaders);
process.exit(0);

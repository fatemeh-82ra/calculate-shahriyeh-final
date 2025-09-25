// fileName: build-data.js

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

// --- Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('🚀 Starting data build process...');

// --- Helper Functions ---
function normalizeText(str) {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

// MODIFIED FUNCTION: This function is now more robust and prevents repetition.
function cleanHeaders(headers) {
    return headers.map(h => {
        if (typeof h !== 'string') return h;
        // 1. Remove any existing "سطح" word and extra spaces to get only the number.
        const justTheNumber = h.replace(/سطح/g, '').trim();
        // 2. Always prepend "سطح" to the clean number.
        return `سطح ${justTheNumber}`;
    });
}

function parseSheet(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length < 2) return {};
    const headers = cleanHeaders(data[0]);
    const parsedData = {};
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const primaryKey = normalizeText(row[0]);
        if (!primaryKey) continue;
        parsedData[primaryKey] = {};
        for (let j = 1; j < headers.length; j++) {
            const secondaryKey = headers[j];
            const amount = row[j];
            if (secondaryKey && amount !== undefined) {
                parsedData[primaryKey][secondaryKey] = amount;
            }
        }
    }
    return parsedData;
}
function parseCurrencySheet_3D(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length < 2) return {};
    const headers = cleanHeaders(data[0]);
    const result = {};
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const fieldGroup = normalizeText(row[0]);
        const degree = normalizeText(row[1]);
        if (!fieldGroup || !degree) continue;
        if (!result[degree]) result[degree] = {};
        if (!result[degree][fieldGroup]) result[degree][fieldGroup] = {};
        for (let j = 2; j < headers.length; j++) {
            const level = headers[j];
            const amount = row[j];
            if (level && amount !== undefined) {
                result[degree][fieldGroup][level] = amount;
            }
        }
    }
    return result;
}
function parseSelfGoverningSheet(sheet) {
    const data = xlsx.utils.sheet_to_json(sheet);
    const result = { 'تهران': {}, 'خارج از تهران': {} };
    const headers = Object.keys(data[0] || {});
    const degreeHeader = headers[0];
    const tehranHeader = headers.find(h => h.includes('تهران'));
    const otherHeader = headers.find(h => h.includes('خارج از استان تهران'));
    data.forEach(row => {
        const degree = normalizeText(row[degreeHeader]);
        if (!degree) return;
        if (tehranHeader && row[tehranHeader] !== undefined) {
            result['تهران'][degree] = row[tehranHeader];
        }
        if (otherHeader && row[otherHeader] !== undefined) {
            result['خارج از تهران'][degree] = row[otherHeader];
        }
    });
    return result;
}

// --- Main Build Logic ---
try {
    const dataPath = path.join(__dirname, 'data');
    const outputPath = path.join(__dirname, 'data.json');
    const allData = { base: {}, variable: {}, currency: {}, selfGoverning: {} };
    const fileExists = (fileName) => fs.existsSync(path.join(dataPath, fileName));

    if (fileExists('شهریه پایه.xlsx')) {
        const baseWb = xlsx.readFile(path.join(dataPath, 'شهریه پایه.xlsx'));
        allData.base = parseSheet(baseWb.Sheets[baseWb.SheetNames[0]]);
    }
    if (fileExists('شهریه ارزی.xlsx')) {
        const currencyWb = xlsx.readFile(path.join(dataPath, 'شهریه ارزی.xlsx'));
        allData.currency = parseCurrencySheet_3D(currencyWb.Sheets[currencyWb.SheetNames[0]]);
    }
    if (fileExists('شهریه خودگردان.xlsx')) {
        const selfWb = xlsx.readFile(path.join(dataPath, 'شهریه خودگردان.xlsx'));
        allData.selfGoverning = parseSelfGoverningSheet(selfWb.Sheets[selfWb.SheetNames[0]]);
    }

    const degreeFiles = {
        'کاردانی پیوسته': 'شهریه  متغیر کاردانی .xlsx',
        'کاردانی ناپیوسته': 'شهریه  متغیر کاردانی .xlsx',
        'کارشناسی پیوسته': 'شهریه متغیر کارشناسی.xlsx',
        'کارشناسی ناپیوسته': 'شهریه متغیر کارشناسی.xlsx',
        'کارشناسی ارشد': 'شهریه متغیر کارشناسی ارشد.xlsx',
        'دکتری تخصصی': 'شهریه متغیر دکتری تخصصی.xlsx'
    };

    for (const [degreeName, fileName] of Object.entries(degreeFiles)) {
        const filePath = path.join(dataPath, fileName);
        if (fs.existsSync(filePath)) {
            allData.variable[degreeName] = {};
            const variableWb = xlsx.readFile(filePath);
            for (const sheetName of variableWb.SheetNames) {
                const unitTypeName = normalizeText(sheetName.replace('شهریه واحد', '').trim());
                allData.variable[degreeName][unitTypeName] = parseSheet(variableWb.Sheets[sheetName]);
            }
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
    console.log(`✅ Data successfully built and saved to ${outputPath}`);

} catch (error) {
    console.error('❌ Error during data build process:', error);
    process.exit(1);
}
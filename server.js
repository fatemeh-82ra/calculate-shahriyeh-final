import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import xlsx from 'xlsx';

// --- Server Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000; // Universal port setup

// --- Helper Functions ---
function normalizeText(str) {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}
// ... (All other helper functions like cleanHeaders, parseSheet, etc. remain the same)
function cleanHeaders(headers) {
    return headers.map(h => {
        if (typeof h !== 'string') return h;
        let cleanH = h.trim();
        if (/^\d/.test(cleanH)) {
            cleanH = `سطح ${cleanH.replace(' سطح', '').trim()}`;
        }
        return cleanH;
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

// --- Middleware & API ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data');
        const allData = { base: {}, variable: {}, currency: {}, selfGoverning: {} };
        const fileExists = (fileName) => fs.existsSync(path.join(dataPath, fileName));

        // The rest of the data reading logic is exactly the same
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
            'کاردانی': 'شهریه  متغیر کاردانی .xlsx',
            'کارشناسی': 'شهریه متغیر کارشناسی.xlsx',
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

        res.status(200).json(allData);

    } catch (error) {
        console.error("Error reading Excel files:", error);
        res.status(500).json({ error: 'Failed to read or process Excel files.' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
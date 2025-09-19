import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// Use 'with' syntax for modern Node.js versions
import data from './data.json' with { type: 'json' };

// --- Server Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// This is crucial for reading the user's selections from POST requests
app.use(express.json());

// --- Helper Functions ---
const formatCurrency = (num) => {
    if (isNaN(num) || num === null) return 'نامشخص';
    // The source data is in thousands of Tomans, so multiply by 1000
    const finalNum = num * 1000;
    return new Intl.NumberFormat('fa-IR').format(finalNum);
};

// --- API Routes for Form A (University) ---

// Endpoint to get the initial list of degrees
app.get('/api/options/degrees', (req, res) => {
    const degrees = Object.keys(data.variable || {});
    res.json(degrees);
});

// Endpoint to get the field groups for a selected degree
app.get('/api/options/field-groups', (req, res) => {
    const { degree } = req.query;
    if (!degree || !data.variable[degree]?.['نظری']) {
        return res.status(404).json([]);
    }
    const fieldGroups = Object.keys(data.variable[degree]['نظری']);
    res.json(fieldGroups);
});

// Endpoint to get the levels for a selected field group
app.get('/api/options/levels', (req, res) => {
    const { fieldGroup } = req.query;
    if (!fieldGroup || !data.base[fieldGroup]) {
        return res.status(404).json([]);
    }
    const levels = Object.keys(data.base[fieldGroup]);
    res.json(levels);
});

// Main calculation endpoint for Form A
app.post('/api/calculate', (req, res) => {
    const { degree, fieldGroup, level, units } = req.body;
    if (!degree || !fieldGroup || !level) {
        return res.status(400).json({ error: 'Missing required selections.' });
    }
    try {
        const baseAmount = parseFloat(String(data.base[fieldGroup]?.[level] || 0).replace(/,/g, ''));
        let variableTotal = 0;
        if (units) {
            for (const unitType in units) {
                const count = parseInt(units[unitType]) || 0;
                if (count > 0) {
                    const costPerUnit = parseFloat(String(data.variable[degree]?.[unitType]?.[fieldGroup]?.[level] || 0).replace(/,/g, ''));
                    variableTotal += count * costPerUnit;
                }
            }
        }
        const total = baseAmount + variableTotal;
        res.status(200).json({
            baseTuition: `${formatCurrency(baseAmount)} تومان`,
            variableTuition: `${formatCurrency(variableTotal)} تومان`,
            totalTuition: `${formatCurrency(total)} تومان`
        });
    } catch (error) {
        console.error("Calculation error:", error);
        res.status(500).json({ error: 'Failed to calculate tuition.' });
    }
});

// --- API Routes for Form B (Self-Governing) ---

app.get('/api/options/locations', (req, res) => {
    res.json(Object.keys(data.selfGoverning || {}));
});

app.get('/api/options/self-governing-degrees', (req, res) => {
    const { location } = req.query;
    if (!location || !data.selfGoverning[location]) {
        return res.status(404).json([]);
    }
    res.json(Object.keys(data.selfGoverning[location]));
});

app.post('/api/calculate-self-governing', (req, res) => {
    const { location, degree } = req.body;
    if (!location || !degree) {
        return res.status(400).json({ error: 'Missing selections.' });
    }
    const amount = data.selfGoverning[location]?.[degree] || 0;
    res.json({
        totalTuition: `${formatCurrency(amount)} تومان`
    });
});

// --- API Routes for Form C (Currency) ---

app.get('/api/options/currency-degrees', (req, res) => {
    res.json(Object.keys(data.currency || {}));
});

app.get('/api/options/currency-field-groups', (req, res) => {
    const { degree } = req.query;
    if (!degree || !data.currency[degree]) {
        return res.status(404).json([]);
    }
    res.json(Object.keys(data.currency[degree]));
});

app.get('/api/options/currency-levels', (req, res) => {
    const { degree, fieldGroup } = req.query;
    if (!degree || !fieldGroup || !data.currency[degree]?.[fieldGroup]) {
        return res.status(404).json([]);
    }
    res.json(Object.keys(data.currency[degree][fieldGroup]));
});

app.post('/api/calculate-currency', (req, res) => {
    const { degree, fieldGroup, level } = req.body;
    if (!degree || !fieldGroup || !level) {
        return res.status(400).json({ error: 'Missing selections.' });
    }
    const amount = data.currency[degree]?.[fieldGroup]?.[level] || 0;
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
    res.json({
        totalTuition: formattedAmount
    });
});

// --- Frontend Route ---
// This should be the LAST route so it doesn't override API routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for serverless environments like Vercel
export default app;
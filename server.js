// fileName: server.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// Use 'with' for modern Node.js versions
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

// --- API Routes for Populating Dropdowns ---

// Endpoint to get the initial list of degrees
app.get('/api/options/degrees', (req, res) => {
    // We send only the list of names (keys), not the entire data structure
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


// --- API Route for Secure Calculation ---

app.post('/api/calculate', (req, res) => {
    // 1. Get user selections from the request
    const { degree, fieldGroup, level, units } = req.body;

    if (!degree || !fieldGroup || !level) {
        return res.status(400).json({ error: 'Missing required selections.' });
    }

    try {
        // 2. Calculate Base Tuition
        const baseAmount = parseFloat(String(data.base[fieldGroup]?.[level] || 0).replace(/,/g, ''));

        // 3. Calculate Variable Tuition based on the units object
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

        // 4. Calculate Total
        const total = baseAmount + variableTotal;

        // 5. Send ONLY the final, formatted results back
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


// --- Frontend Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
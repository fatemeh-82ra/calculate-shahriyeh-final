// fileName: server.js

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// Import the pre-built JSON data
import data from './data.json' with { type: 'json' };

// --- Server Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// --- API Route ---
// Serves the static, pre-built data. This is super fast.
app.get('/api/data', (req, res) => {
    res.status(200).json(data);
});

// --- Frontend Route ---
// Serves the main HTML file on the root path.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for Vercel's serverless environment
export default app;
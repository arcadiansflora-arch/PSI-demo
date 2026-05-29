import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import masterDataRouter from './routes/masterData.js';
import groupDataRouter from './routes/groupData.js';
import calculateRouter from './routes/calculate.js';
import uploadRouter from './routes/upload.js';
import mtdRouter from './routes/mtdData.js';
import regionalRouter from './routes/regional.js';
import adminRouter from './routes/admin.js';
import weeklyRouter from './routes/weekly.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server configuration from environment
const PORT = process.env.PORT || 5000;
const DATA_PATH = process.env.DATA_PATH || '../data';

const app = express();

// CORS configuration - 移到最顶部
app.use(cors());
app.use(express.json());

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'PSI Management System API',
    version: '1.0.0',
    endpoints: {
      masterData: '/api/master-data',
      groupData: '/api/group/:groupName',
      calculate: '/api/calculate/:groupName',
      upload: '/api/upload/:groupName',
      uploadTemplate: '/api/upload/template',
      mtd: '/api/mtd',
      mtdByGroup: '/api/mtd/:groupName',
      regional: {
        summary: '/api/regional/summary',
        monthly: '/api/regional/monthly',
        filters: '/api/regional/filters'
      },
      admin: {
        uploadRecords: '/api/admin/upload-records'
      },
      weekly: {
        report: '/api/weekly/report',
        mosTrend: '/api/weekly/mos-trend/:groupName'
      }
    }
  });
});

// API Routes
app.use('/api/master-data', masterDataRouter);
app.use('/api/group', groupDataRouter);
app.use('/api/calculate', calculateRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/mtd', mtdRouter);
app.use('/api/regional', regionalRouter);
app.use('/api/admin', adminRouter);
app.use('/api/weekly', weeklyRouter);

// Serve static files from data directory
app.use('/data', express.static(join(__dirname, '../data')));

// Global fallback for unmatched API routes
app.use((req, res, next) => {
  // Skip non-API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Catch-all for other unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
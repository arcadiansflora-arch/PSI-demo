import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, '../../data/master-data.json');

// GET all master data
router.get('/', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read master data' });
  }
});

// GET single SKU master data
router.get('/:sku', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    const item = data.find(d => d['SKU（新）'] === req.params.sku);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'SKU not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read master data' });
  }
});

export default router;
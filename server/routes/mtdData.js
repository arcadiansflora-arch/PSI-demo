import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, '../../data/mtd-data.json');

// GET all MTD data
router.get('/', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read MTD data' });
  }
});

// GET MTD data by group
router.get('/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    
    const groupData = data[groupName] || [];
    res.json(groupData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read MTD data' });
  }
});

export default router;
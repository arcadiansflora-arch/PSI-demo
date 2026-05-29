import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');

// GET group data
router.get('/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const filePath = join(dataDir, `${groupName}.json`);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: `Group ${groupName} not found` });
    }
    
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read group data' });
  }
});

// PUT update group data (update single SKU)
router.put('/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const { sku, month, field, value } = req.body;
    const filePath = join(dataDir, `${groupName}.json`);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: `Group ${groupName} not found` });
    }
    
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    // Find SKU
    const skuIndex = data.skus.findIndex(s => s.sku === sku);
    if (skuIndex === -1) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    // Initialize months object if not exists
    if (!data.skus[skuIndex].months[month]) {
      data.skus[skuIndex].months[month] = {};
    }
    
    // Update field
    data.skus[skuIndex].months[month][field] = value;
    
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, data: data.skus[skuIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group data' });
  }
});

// GET list of all groups
router.get('/', (req, res) => {
  try {
    const groups = ['ES', 'IT', 'FR', 'PT'];
    const availableGroups = groups.filter(g => existsSync(join(dataDir, `${g}.json`)));
    res.json(availableGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get groups list' });
  }
});

export default router;
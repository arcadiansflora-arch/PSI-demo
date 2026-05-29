import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { calculateAll, cascadeRecalculate, getMOSStatus } from '../utils/calculations.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');

// POST calculate all fields for a group
router.post('/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const filePath = join(dataDir, `${groupName}.json`);
    
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    // 计算所有派生字段
    const calculatedData = calculateAll(data);
    
    writeFileSync(filePath, JSON.stringify(calculatedData, null, 2), 'utf8');
    res.json({ success: true, data: calculatedData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate data', details: error.message });
  }
});

// POST calculate single SKU with cascade
router.post('/:groupName/:sku', (req, res) => {
  try {
    const { groupName, sku } = req.params;
    const { month } = req.body; // 指定从哪个月开始重算
    const filePath = join(dataDir, `${groupName}.json`);
    
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const skuIndex = data.skus.findIndex(s => s.sku === sku);
    
    if (skuIndex === -1) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    // 级联重算：如果指定了月份，从该月开始；否则重算全部
    if (month) {
      cascadeRecalculate(data, sku, month);
    } else {
      const months = Object.keys(data.skus[skuIndex].months).sort();
      for (let i = 0; i < months.length; i++) {
        cascadeRecalculate(data, sku, months[i]);
      }
    }
    
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, data: data.skus[skuIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate data', details: error.message });
  }
});

// PUT update single cell and cascade recalculate
router.put('/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const { sku, month, field, value } = req.body;
    const filePath = join(dataDir, `${groupName}.json`);
    
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const skuItem = data.skus.find(s => s.sku === sku);
    
    if (!skuItem) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    // 更新单元格值
    if (!skuItem.months[month]) {
      skuItem.months[month] = {};
    }
    skuItem.months[month][field] = value;
    
    // 级联重算：从当前月份开始
    cascadeRecalculate(data, sku, month);
    
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, data: data.skus.find(s => s.sku === sku) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update data', details: error.message });
  }
});

export default router;

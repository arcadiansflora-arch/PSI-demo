import express from 'express';
import multer from 'multer';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as XLSX from 'xlsx';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');

// Configure multer for file upload
const upload = multer({ 
  dest: join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// Download import template - must be BEFORE /:groupName to avoid conflict
router.get('/template', (req, res) => {
  try {
    const template = [
      {
        'SKU（新）': 'Example_SKU_001',
        '月份': '202605',
        'SI': 100,
        'SO': 80,
        '海外仓库存': 50,
        '海外仓在途': 30,
        '代理库存': 20,
        '代理在途': 10,
        '渠道库存': 40,
        '渠道在途': 25,
        'DE/EU Warehouse Buffer': 0
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=psi_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template', details: error.message });
  }
});

// Upload and import data
router.post('/:groupName', upload.single('file'), (req, res) => {
  try {
    const { groupName } = req.params;
    const { importType } = req.body; // 'si', 'so', 'si_so', 'opening', 'all'
    const filePath = join(dataDir, `${groupName}.json`);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Read the uploaded file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Read existing group data
    const groupData = JSON.parse(readFileSync(filePath, 'utf8'));
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Process each row
    for (const row of data) {
      const sku = row['SKU（新）'];
      const month = String(row['月份']);
      
      // Find the SKU in group data
      const skuIndex = groupData.skus.findIndex(s => s.sku === sku);
      if (skuIndex === -1) {
        failCount++;
        errors.push(`SKU ${sku} not found in group data`);
        continue;
      }
      
      // Initialize months object if not exists
      if (!groupData.skus[skuIndex].months[month]) {
        groupData.skus[skuIndex].months[month] = {};
      }
      
      // Import based on type
      switch (importType) {
        case 'si':
        case 'si_so':
        case 'all':
          if (row['SI'] !== undefined) {
            groupData.skus[skuIndex].months[month].si = Number(row['SI']) || 0;
          }
          break;
        case 'so':
        case 'si_so':
        case 'all':
          if (row['SO'] !== undefined) {
            groupData.skus[skuIndex].months[month].so = Number(row['SO']) || 0;
          }
          break;
        case 'opening':
        case 'all':
          // Opening Stock details
          groupData.skus[skuIndex].months[month].openingStockDetails = {
            overseasWarehouseStock: Number(row['海外仓库存']) || 0,
            overseasWarehouseTransit: Number(row['海外仓在途']) || 0,
            agentStock: Number(row['代理库存']) || 0,
            agentTransit: Number(row['代理在途']) || 0,
            channelStock: Number(row['渠道库存']) || 0,
            channelTransit: Number(row['渠道在途']) || 0
          };
          // Calculate total opening stock
          const details = groupData.skus[skuIndex].months[month].openingStockDetails;
          groupData.skus[skuIndex].months[month].openingStock = 
            details.overseasWarehouseStock +
            details.overseasWarehouseTransit +
            details.agentStock +
            details.agentTransit +
            details.channelStock +
            details.channelTransit;
          break;
      }
      
      // DE/EU Warehouse Buffer
      if (importType === 'all' && row['DE/EU Warehouse Buffer'] !== undefined) {
        groupData.skus[skuIndex].months[month].deEuBuffer = Number(row['DE/EU Warehouse Buffer']) || 0;
      }
      
      successCount++;
    }
    
    // Save updated data
    writeFileSync(filePath, JSON.stringify(groupData, null, 2), 'utf8');
    
    res.json({
      success: true,
      summary: {
        total: data.length,
        success: successCount,
        failed: failCount
      },
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

export default router;
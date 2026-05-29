import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { calculateMOS } from '../utils/calculations.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');
const masterDataPath = join(__dirname, '../../data/master-data.json');

// GET regional summary data
router.get('/summary', (req, res) => {
  try {
    const { category, series } = req.query;
    const groups = ['ES', 'IT', 'FR', 'PT'];
    const masterData = JSON.parse(readFileSync(masterDataPath, 'utf8'));
    
    // Collect all SKU data from all groups
    const allData = [];
    
    for (const group of groups) {
      const filePath = join(dataDir, `${group}.json`);
      try {
        const groupData = JSON.parse(readFileSync(filePath, 'utf8'));
        allData.push(...groupData.skus.map(sku => ({
          ...sku,
          group
        })));
      } catch (e) {
        // Group data file doesn't exist, skip
      }
    }
    
    // Filter by category/series if specified
    let filteredData = allData;
    if (category) {
      filteredData = filteredData.filter(sku => {
        const master = masterData.find(m => m['SKU（新）'] === sku.sku);
        return master?.Category === category;
      });
    }
    if (series) {
      filteredData = filteredData.filter(sku => {
        const master = masterData.find(m => m['SKU（新）'] === sku.sku);
        return master?.Series === series;
      });
    }
    
    // Get all months
    const allMonths = new Set();
    filteredData.forEach(sku => {
      Object.keys(sku.months).forEach(m => allMonths.add(m));
    });
    const months = Array.from(allMonths).sort();
    
    // Calculate KPIs
    const currentMonth = months[months.length - 1] || '202605';
    const currentData = filteredData.map(sku => sku.months[currentMonth]).filter(Boolean);
    
    const totalClosingStock = currentData.reduce((sum, d) => sum + (d.closingStock || 0), 0);
    const totalMOS = calculateMOS(totalClosingStock, 
      months.slice(-6).map(m => {
        return filteredData.reduce((sum, sku) => sum + (sku.months[m]?.so || 0), 0);
      })
    );
    
    const overstockCount = currentData.filter(d => d.mos > 3.5).length;
    const oosRiskCount = currentData.filter(d => d.mos < 2.5 && d.mos >= 1).length;
    const almostOOSCount = currentData.filter(d => d.mos < 1).length;
    
    res.json({
      kpis: {
        totalClosingStock,
        totalMOS,
        overstockCount,
        oosRiskCount,
        almostOOSCount
      },
      months
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get regional summary', details: error.message });
  }
});

// GET monthly PSI summary table
router.get('/monthly', (req, res) => {
  try {
    const { category, series } = req.query;
    const groups = ['ES', 'IT', 'FR', 'PT'];
    const masterData = JSON.parse(readFileSync(masterDataPath, 'utf8'));
    
    // Collect all data
    const allData = [];
    
    for (const group of groups) {
      const filePath = join(dataDir, `${group}.json`);
      try {
        const groupData = JSON.parse(readFileSync(filePath, 'utf8'));
        allData.push(...groupData.skus.map(sku => ({
          ...sku,
          group
        })));
      } catch (e) {
        // Skip if file doesn't exist
      }
    }
    
    // Get master info for each SKU
    const enrichedData = allData.map(sku => {
      const master = masterData.find(m => m['SKU（新）'] === sku.sku);
      return {
        ...sku,
        master
      };
    });
    
    // Filter by category/series
    let filteredData = enrichedData;
    if (category) {
      filteredData = filteredData.filter(s => s.master?.Category === category);
    }
    if (series) {
      filteredData = filteredData.filter(s => s.master?.Series === series);
    }
    
    // Get all unique categories and series
    const categories = [...new Set(filteredData.map(s => s.master?.Category).filter(Boolean))];
    const seriesList = [...new Set(filteredData.map(s => s.master?.Series).filter(Boolean))];
    
    // Get all months
    const allMonths = new Set();
    filteredData.forEach(sku => {
      Object.keys(sku.months).forEach(m => allMonths.add(m));
    });
    const months = Array.from(allMonths).sort();
    
    // Calculate summaries by category and series
    const summaries = {};
    
    for (const cat of categories) {
      summaries[cat] = {};
      for (const ser of seriesList) {
        const catSerData = filteredData.filter(s => 
          s.master?.Category === cat && s.master?.Series === ser
        );
        
        if (catSerData.length === 0) continue;
        
        summaries[cat][ser] = {
          skus: catSerData.map(s => s.sku),
          months: {}
        };
        
        for (const month of months) {
          const monthData = catSerData.map(s => s.months[month]).filter(Boolean);
          
          if (monthData.length === 0) continue;
          
          const openingStock = monthData.reduce((sum, d) => sum + (d.openingStock || 0), 0);
          const si = monthData.reduce((sum, d) => sum + (d.si || 0), 0);
          const arrival = monthData.reduce((sum, d) => sum + (d.arrival || 0), 0);
          const so = monthData.reduce((sum, d) => sum + (d.so || 0), 0);
          const closingStock = monthData.reduce((sum, d) => sum + (d.closingStock || 0), 0);
          const deEuBuffer = monthData.reduce((sum, d) => sum + (d.deEuBuffer || 0), 0);
          
          // Calculate MOS for aggregated data
          const futureMonths = months.slice(months.indexOf(month) + 1, months.indexOf(month) + 7);
          const futureSO = futureMonths.reduce((sum, m) => {
            return sum + catSerData.reduce((s, sku) => s + (sku.months[m]?.so || 0), 0);
          }, 0);
          
          const mos = calculateMOS(closingStock, 
            futureMonths.map(m => catSerData.reduce((s, sku) => s + (sku.months[m]?.so || 0), 0))
          );
          
          summaries[cat][ser].months[month] = {
            openingStock,
            si,
            arrival,
            so,
            closingStock,
            deEuBuffer,
            closingStockBuffer: closingStock + deEuBuffer,
            mos
          };
        }
      }
    }
    
    res.json({
      categories,
      seriesList,
      summaries,
      months
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monthly summary', details: error.message });
  }
});

// GET available categories and series for filters
router.get('/filters', (req, res) => {
  try {
    const masterData = JSON.parse(readFileSync(masterDataPath, 'utf8'));
    
    const categories = [...new Set(masterData.map(m => m.Category).filter(Boolean))];
    const series = [...new Set(masterData.map(m => m.Series).filter(Boolean))];
    const bus = [...new Set(masterData.map(m => m.BU).filter(Boolean))];
    
    res.json({ categories, series, bus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get filter options', details: error.message });
  }
});

export default router;
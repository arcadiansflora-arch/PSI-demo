import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 数据文件路径
const getDataPath = (groupName) => path.join(__dirname, `../../data/${groupName}.json`)
const MASTER_DATA_PATH = path.join(__dirname, '../../data/master-data.json')
const MTD_DATA_PATH = path.join(__dirname, '../../data/mtd-data.json')

// 读取 JSON 文件
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
  return null
}

// ============ getWeeklyReport API ============
router.post('/report', (req, res) => {
  try {
    const { groupName, filters = {} } = req.body
    
    // 读取数据
    const groupData = readJsonFile(getDataPath(groupName))
    const masterData = readJsonFile(MASTER_DATA_PATH)
    const mtdData = readJsonFile(MTD_DATA_PATH)
    
    if (!groupData) {
      return res.json({ 
        success: false, 
        message: `Data for ${groupName} not found` 
      })
    }
    
    const { skus = [] } = groupData
    
    // 过滤 SKU
    let filteredSkus = skus
    if (filters.bu && filters.bu.length > 0) {
      filteredSkus = filteredSkus.filter(sku => {
        const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
        return master && filters.bu.includes(master.BU)
      })
    }
    if (filters.category && filters.category.length > 0) {
      filteredSkus = filteredSkus.filter(sku => {
        const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
        return master && filters.category.includes(master.Category)
      })
    }
    if (filters.series && filters.series.length > 0) {
      filteredSkus = filteredSkus.filter(sku => {
        const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
        return master && filters.series.includes(master.Series)
      })
    }
    if (filters.sku && filters.sku.length > 0) {
      filteredSkus = filteredSkus.filter(sku => filters.sku.includes(sku.sku))
    }
    
    // ===== 1. 计算库存概览 =====
    const currentMonth = '202605'
    let totalChannelStock = 0
    let totalAgentStock = 0
    let totalWeightedMos = 0
    let totalClosingStock = 0
    
    const categoryBreakdown = {}
    
    filteredSkus.forEach(sku => {
      const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
      const category = master?.Category || 'Unknown'
      
      // 当前月份 closingStock
      const currentMonthData = sku.months?.[currentMonth] || {}
      const closingStock = currentMonthData.closingStock || 0
      const mos = currentMonthData.mos || 0
      
      totalChannelStock += closingStock
      
      // 代理商库存估算（简化：用渠道库存 * 0.3）
      const agentStock = closingStock * 0.3
      totalAgentStock += agentStock
      
      // 累计用于加权 MOS 计算
      totalClosingStock += closingStock
      totalWeightedMos += mos * closingStock
      
      // 分类拆解
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { channel: 0, agent: 0 }
      }
      categoryBreakdown[category].channel += closingStock
      categoryBreakdown[category].agent += agentStock
    })
    
    // 加权 MOS
    const weightedMos = totalClosingStock > 0 ? totalWeightedMos / totalClosingStock : 0
    
    // ===== 2. 当月 SO 进度 =====
    const currentDate = new Date()
    const currentDay = currentDate.getDate()
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const timeProgress = (currentDay / daysInMonth) * 100
    
    // mtdData 是按 groupName 分组的对象，需要先获取对应组的数据
    const mtdGroupData = mtdData?.[groupName] || []
    const mtdSoData = mtdGroupData.filter(d => d.metric === 'SO') || []
    const currentMonthSoForecast = mtdSoData.reduce((sum, d) => sum + d.monthForecast, 0)
    const currentMonthSoMtd = mtdSoData.reduce((sum, d) => sum + d.mtd, 0)
    const soProgress = currentMonthSoForecast > 0 ? (currentMonthSoMtd / currentMonthSoForecast) * 100 : 0
    const soGap = currentMonthSoMtd - currentMonthSoForecast
    
    // ===== 3. SO 进度异常 =====
    const soAnomalies = []
    filteredSkus.forEach(sku => {
      const currentMonthData = sku.months?.[currentMonth] || {}
      const soForecast = currentMonthData.so || 0
      const mtdSo = mtdSoData.find(d => d.sku === sku.sku)?.mtd || 0
      const skuProgress = soForecast > 0 ? (mtdSo / soForecast) * 100 : 0
      
      const deviation = skuProgress - timeProgress
      
      if (deviation < -20) {
        // Lagging
        soAnomalies.push({
          sku: sku.sku,
          forecast: soForecast,
          actual: mtdSo,
          progress: skuProgress,
          deviation: deviation,
          type: 'lagging',
          suggestion: `SO 完成进度落后时间进度 ${Math.abs(deviation).toFixed(0)}%，建议加快出货`
        })
      } else if (deviation > 20) {
        // Leading
        soAnomalies.push({
          sku: sku.sku,
          forecast: soForecast,
          actual: mtdSo,
          progress: skuProgress,
          deviation: deviation,
          type: 'leading',
          suggestion: `SO 完成进度领先时间进度 ${deviation.toFixed(0)}%，表现优异`
        })
      }
    })
    
    // ===== 4. 风险预警 =====
    const riskAlerts = { shortage: [], overstock: [] }
    
    filteredSkus.forEach(sku => {
      const currentMonthData = sku.months?.[currentMonth] || {}
      const mos = currentMonthData.mos || 0
      const closingStock = currentMonthData.closingStock || 0
      
      // 计算未来需求（简化：使用 SO）
      let futureDemand = 0
      const futureMonths = ['202606', '202607', '202608', '202609', '202610']
      futureMonths.forEach(month => {
        const monthData = sku.months?.[month]
        if (monthData) {
          futureDemand += monthData.so || 0
        }
      })
      
      // 缺货风险判断
      if (mos < 1.5 || (mos < 2.0 && futureDemand > closingStock * 0.8)) {
        riskAlerts.shortage.push({
          sku: sku.sku,
          mos: mos,
          closingStock: closingStock,
          suggestion: `MOS 仅 ${mos.toFixed(1)} 个月，存在缺货风险，建议补充库存`
        })
      }
      
      // 过剩风险判断
      if (mos > 5.0 || (mos > 4.0 && futureDemand < closingStock * 0.5)) {
        riskAlerts.overstock.push({
          sku: sku.sku,
          mos: mos,
          closingStock: closingStock,
          suggestion: `MOS 高达 ${mos.toFixed(1)} 个月，库存过剩风险，建议减少进货`
        })
      }
    })
    
    // ===== 5. 偏差排名 =====
    const deviationRanking = []
    const pastMonths = ['202603', '202604', '202605']
    
    filteredSkus.forEach(sku => {
      let totalDeviation = 0
      let monthCount = 0
      const deviations = []
      
      pastMonths.forEach(month => {
        const mtdRecord = mtdSoData.find(d => d.sku === sku.sku && d.month === month)
        if (mtdRecord && mtdRecord.monthForecast > 0) {
          const deviation = (mtdRecord.mtd - mtdRecord.monthForecast) / mtdRecord.monthForecast * 100
          deviations.push(deviation)
          totalDeviation += deviation
          monthCount++
        }
      })
      
      if (monthCount > 0) {
        const avgDeviation = totalDeviation / monthCount
        
        // 判断趋势
        let trend = 'stable'
        if (deviations.length >= 2) {
          const variance = deviations.reduce((sum, d) => sum + Math.pow(d - avgDeviation, 2), 0) / deviations.length
          if (variance > 100) {
            trend = 'volatile'
          } else if (avgDeviation > 10) {
            trend = 'overestimate'
          } else if (avgDeviation < -10) {
            trend = 'underestimate'
          }
        }
        
        deviationRanking.push({
          sku: sku.sku,
          avgDeviation: avgDeviation,
          trend: trend,
          suggestion: trend === 'overestimate' ? '预测持续高于实际，建议下调预测' :
                      trend === 'underestimate' ? '预测持续低于实际，建议上调预测' :
                      '预测波动较大，建议优化预测模型'
        })
      }
    })
    
    // 按偏差绝对值排序取 Top 10
    deviationRanking.sort((a, b) => Math.abs(b.avgDeviation) - Math.abs(a.avgDeviation))
    const top10Deviations = deviationRanking.slice(0, 10)
    
    // ===== 返回结果 =====
    res.json({
      success: true,
      data: {
        inventoryOverview: {
          channelStock: totalChannelStock,
          agentStock: totalAgentStock,
          weightedMos: weightedMos,
          categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
            category,
            channel: data.channel,
            agent: data.agent
          })),
          soProgress: {
            forecast: currentMonthSoForecast,
            actual: currentMonthSoMtd,
            percent: soProgress,
            gap: soGap,
            timeProgress: timeProgress
          }
        },
        soAnomalies: soAnomalies.sort((a, b) => a.deviation - b.deviation).slice(0, 10),
        riskAlerts: riskAlerts,
        deviationRanking: top10Deviations,
        updatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Weekly report error:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ success: false, message: 'Server error: ' + error.message })
  }
})

// ============ getWeeklyMosTrend API ============
router.get('/mos-trend/:groupName', (req, res) => {
  try {
    const { groupName } = req.params
    const { filters = {} } = req.query
    
    // 读取数据
    const groupData = readJsonFile(getDataPath(groupName))
    const masterData = readJsonFile(MASTER_DATA_PATH)
    
    if (!groupData) {
      return res.json({ 
        success: false, 
        message: `Data for ${groupName} not found` 
      })
    }
    
    const { skus = [] } = groupData
    
    // 时间范围：当前月 + 未来 9 个月
    const months = ['202605', '202606', '202607', '202608', '202609', '202610', '202611', '202612', '202701', '202702']
    
    // 计算每个月的 MOS 趋势
    const overallTrend = []
    const categoryTrends = {}
    
    // 按 Category 分组
    const categories = [...new Set(masterData?.map(m => m.Category).filter(Boolean) || [])]
    categories.forEach(cat => {
      categoryTrends[cat] = []
    })
    
    // 过滤 SKU
    let filteredSkus = skus
    if (filters.bu && filters.bu.length > 0) {
      filteredSkus = filteredSkus.filter(sku => {
        const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
        return master && filters.bu.includes(master.BU)
      })
    }
    if (filters.category && filters.category.length > 0) {
      filteredSkus = filteredSkus.filter(sku => {
        const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
        return master && filters.category.includes(master.Category)
      })
    }
    
    // 计算每个月的整体 MOS
    let currentStock = 0
    months.forEach((month, index) => {
      let totalMos = 0
      let count = 0
      
      filteredSkus.forEach(sku => {
        const monthData = sku.months?.[month]
        if (monthData) {
          const mos = monthData.mos || 0
          const closingStock = monthData.closingStock || 0
          
          totalMos += mos * closingStock
          currentStock = closingStock
          count++
        } else if (index === 0) {
          // 使用当前月份数据估算
          const currentMonthData = sku.months?.['202605']
          if (currentMonthData) {
            const mos = currentMonthData.mos || 0
            const closingStock = currentMonthData.closingStock || 0
            totalMos += mos * closingStock
            currentStock = closingStock
            count++
          }
        }
      })
      
      const avgMos = count > 0 ? totalMos / count : 0
      overallTrend.push({
        month,
        channelMos: avgMos,
        agentMos: avgMos * 0.8 // 代理商 MOS 估算
      })
      
      // 按 Category 计算
      categories.forEach(cat => {
        let catTotalMos = 0
        let catCount = 0
        
        filteredSkus.forEach(sku => {
          const master = masterData?.find(m => m['SKU（新）'] === sku.sku)
          if (master?.Category === cat) {
            const monthData = sku.months?.[month]
            if (monthData) {
              catTotalMos += (monthData.mos || 0)
              catCount++
            }
          }
        })
        
        const catAvgMos = catCount > 0 ? catTotalMos / catCount : 0
        if (!categoryTrends[cat]) categoryTrends[cat] = []
        categoryTrends[cat].push({
          month,
          mos: catAvgMos
        })
      })
    })
    
    res.json({
      success: true,
      data: {
        overall: overallTrend,
        byCategory: Object.entries(categoryTrends).map(([category, trend]) => ({
          category,
          trend
        })),
        months
      }
    })
    
  } catch (error) {
    console.error('MOS trend error:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

export default router
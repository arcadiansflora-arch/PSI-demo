/**
 * 重新生成数据文件中的 Arrival 值
 * 规则：到货 = 上上个月的SI（固定2个月交期延迟）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../../data')
const groups = ['ES', 'IT', 'FR', 'PT']

groups.forEach(groupName => {
  const filePath = path.join(DATA_DIR, `${groupName}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  
  data.skus.forEach(sku => {
    const months = Object.keys(sku.months).sort()
    
    months.forEach((month, i) => {
      const monthData = sku.months[month]
      
      // 计算到货 = 上上个月的SI
      if (i >= 2) {
        const monthMinus2 = months[i - 2]
        const siTwoMonthsAgo = sku.months[monthMinus2]?.si || 0
        monthData.arrival = siTwoMonthsAgo
      } else if (i === 1) {
        // 第二个月：第一个月的SI作为到货
        const monthMinus1 = months[i - 1]
        monthData.arrival = sku.months[monthMinus1]?.si || 0
      } else {
        // 首月无到货
        monthData.arrival = 0
      }
      
      // 重新计算 Closing Stock
      // closingStock = openingStock + arrival - so
      if (monthData.openingStock !== undefined) {
        monthData.closingStock = monthData.openingStock + monthData.arrival - (monthData.so || 0)
        monthData.closingStockBuffer = monthData.closingStock - (monthData.deEuBuffer || 0)
      }
    })
  })
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`✓ 已更新 ${groupName}.json`)
})

console.log('\n所有数据文件的 Arrival 值已重新生成！')

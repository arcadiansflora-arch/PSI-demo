/**
 * PSI Calculation Engine
 * 核心：级联重算 - 每当用户修改某月数据，从该月一直算到最后月
 */

/**
 * 计算 MOS (Months of Supply) - 基于所有未来SO累计消耗
 * @param {number} closingStock - 当前期末库存
 * @param {number[]} futureSOList - 所有未来SO预测值
 * @returns {number} - MOS值，保留一位小数
 */
export function calculateMOS(closingStock, futureSOList) {
  if (!closingStock || closingStock <= 0) return 0;
  if (!futureSOList || futureSOList.length === 0) return 0;
  
  let stock = closingStock;
  let fullMonthsCovered = 0;
  
  for (let i = 0; i < futureSOList.length; i++) {
    const so = futureSOList[i] || 0;
    
    if (so <= 0) {
      // 无销售需求，视为覆盖完整月
      fullMonthsCovered++;
      continue;
    }
    
    if (stock >= so) {
      // 库存足够覆盖本月
      stock -= so;
      fullMonthsCovered++;
    } else {
      // 库存不足以覆盖本月，计算部分月
      return fullMonthsCovered + (stock / so);
    }
  }
  
  // 所有未来SO都被覆盖，计算外推
  const lastSO = futureSOList[futureSOList.length - 1] || 0;
  if (lastSO > 0 && stock > 0) {
    return fullMonthsCovered + (stock / lastSO);
  }
  
  return fullMonthsCovered;
}

/**
 * 计算含缓冲的MOS（使用含缓冲的期末库存）
 */
export function calculateMOSWithBuffer(closingStockBuffer, futureSOList) {
  return calculateMOS(closingStockBuffer, futureSOList);
}

/**
 * 根据MOS值获取库存状态标签
 * >= 3.5: 库存过量 (Overstock)
 * > 2: 健康 (Healthy)  
 * > 1: 缺货风险 (OOS Risk)
 * <= 1: 接近缺货/已缺货 (Almost OOS/OOS)
 */
export function getMOSStatus(mos) {
  if (mos === undefined || mos === null || isNaN(mos)) return '/';
  if (mos >= 3.5) return 'Overstock';
  if (mos > 2) return 'Healthy';
  if (mos > 1) return 'OOS Risk';
  return 'Almost OOS/OOS';
}

// 首月定义 - 202605 之前的月份由系统自动计算，202605及之后可手动编辑
const FIRST_EDITABLE_MONTH = '202605';

/**
 * 计算单个SKU的所有月份数据（级联重算）
 * @param {Object} skuItem - SKU数据对象
 * @param {number} startMonthIndex - 从哪个月份开始重算（索引）
 */
export function calculateSkuCascade(skuItem, startMonthIndex = 0) {
  const months = Object.keys(skuItem.months).sort();
  
  for (let i = startMonthIndex; i < months.length; i++) {
    const month = months[i];
    const monthData = skuItem.months[month];
    
    // 1. 计算 Arrival（到货 = 上上个月的SI，固定2个月交期延迟）
    if (i >= 2) {
      const monthMinus2 = months[i - 2];
      const siTwoMonthsAgo = skuItem.months[monthMinus2]?.si || 0;
      monthData.arrival = siTwoMonthsAgo;
    } else if (i === 1) {
      // 第二个月：第一个月的SI作为到货
      const monthMinus1 = months[i - 1];
      monthData.arrival = skuItem.months[monthMinus1]?.si || 0;
    } else {
      // 首月无到货
      monthData.arrival = 0;
    }
    
    // 2. 计算 Opening Stock（期初库存）
    // 如果月份 >= 202605，则保留用户手动输入的值；否则自动计算
    if (month >= FIRST_EDITABLE_MONTH) {
      // 202605 及之后：如果 openingStock 未定义，设为 0（用户可以手动输入）
      if (monthData.openingStock === undefined) {
        monthData.openingStock = 0;
      }
      // 如果用户已设置 openingStock，保留该值
    } else {
      // 202605 之前的月份：自动计算（期初 = 上月期末）
      const prevMonth = months[i - 1];
      monthData.openingStock = skuItem.months[prevMonth]?.closingStock || 0;
    }
    
    // 3. 计算 Closing Stock（期末库存）
    // 公式：期初 + 到货 - 终端销售
    monthData.closingStock = monthData.openingStock + (monthData.arrival || 0) - (monthData.so || 0);
    
    // 4. 计算 Closing Stock (+Buffer)（含缓冲期末库存）
    // 公式：期末库存 - EU Buffer（Buffer是预留安全库存，需从总库存中扣除）
    monthData.closingStockBuffer = monthData.closingStock - (monthData.deEuBuffer || 0);
    
    // 5. 收集所有未来SO用于MOS计算
    const futureMonths = months.slice(i + 1);
    const futureSOList = futureMonths.map(m => skuItem.months[m]?.so || 0);
    
    // 6. 计算 MOS（使用所有未来SO累计消耗）
    monthData.mos = calculateMOS(monthData.closingStock, futureSOList);
    
    // 7. 计算 MOS (+Buffer)
    monthData.mosBuffer = calculateMOSWithBuffer(monthData.closingStockBuffer, futureSOList);
    
    // 8. 计算 MOS Status
    monthData.mosStatus = getMOSStatus(monthData.mos);
  }
  
  return skuItem;
}

/**
 * 计算所有SKU的所有月份数据
 */
export function calculateAll(data) {
  for (const skuItem of data.skus) {
    calculateSkuCascade(skuItem, 0);
  }
  return data;
}

/**
 * 级联重算：从指定月份开始重算
 * 当用户修改某月数据时调用
 * @param {Object} data - 完整数据对象
 * @param {string} sku - SKU名称
 * @param {string} changedMonth - 被修改的月份
 */
export function cascadeRecalculate(data, sku, changedMonth) {
  const skuItem = data.skus.find(s => s.sku === sku);
  if (!skuItem) return data;
  
  const months = Object.keys(skuItem.months).sort();
  const monthIndex = months.indexOf(changedMonth);
  
  if (monthIndex === -1) return data;
  
  // 从修改的月份开始级联重算
  calculateSkuCascade(skuItem, monthIndex);
  
  return data;
}

/**
 * 应用SI结转逻辑
 * 计划SI与实际SI的差异结转到下月
 */
export function applySiCarryover(skuItem, month) {
  const months = Object.keys(skuItem.months).sort();
  const monthIndex = months.indexOf(month);
  
  if (monthIndex === -1 || monthIndex >= months.length - 1) return skuItem;
  
  const currentMonthData = skuItem.months[month];
  const nextMonthData = skuItem.months[months[monthIndex + 1]];
  
  // 计算结转量 = 计划SI - 实际SI（MTD数据对比）
  const plannedSI = currentMonthData.si || 0;
  const actualSI = currentMonthData.siActual || 0;
  const carryover = plannedSI - actualSI;
  
  // 结转到下月SI
  if (!nextMonthData.siCarryover) {
    nextMonthData.siCarryover = 0;
  }
  nextMonthData.siCarryover += carryover;
  
  return skuItem;
}

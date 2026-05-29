import { useState, useMemo } from 'react'
import { Table, Input, Tag, Tooltip } from 'antd'
import { useLanguage } from '../context/LanguageContext'

function PSITable({ 
  data, 
  masterData, 
  skus, 
  months, 
  dimensions, 
  bufferCollapsed,
  pastMonthsCollapsed,
  onCellUpdate,
  filters 
}) {
  const { t } = useLanguage()
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  
  // 动态获取当前月份作为阈值
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const CURRENT_MONTH = `${currentYear}${currentMonth}`
  
  // 历史月份和未来月份分类（基于当前月份动态判断）
  const pastMonths = months.filter(m => m < CURRENT_MONTH).sort()
  const futureMonths = months.filter(m => m >= CURRENT_MONTH).sort()
  
  // 根据折叠状态决定显示哪些过去月份
  // 默认折叠（不显示历史月份），用户可以展开查看
  const displayedPastMonths = pastMonthsCollapsed ? [] : pastMonths
  
  // 未来月份始终全部显示
  const displayedFutureMonths = futureMonths
  
  // 合并显示的月份（历史在前，未来在后）
  const displayedMonths = [...displayedPastMonths, ...displayedFutureMonths]
  
  const getMasterForSku = (sku) => {
    return masterData.find(m => m['SKU（新）'] === sku) || {}
  }
  
  const getCellValue = (sku, month, field) => {
    const skuData = data?.skus?.find(s => s.sku === sku)
    return skuData?.months?.[month]?.[field]
  }
  
  const getMosStatusConfig = (status) => {
    const config = {
      'Overstock': { color: 'orange', background: '#fff2e8' },
      'Healthy': { color: 'green', background: '#f6ffed' },
      'OOS Risk': { color: 'gold', background: '#fff1b8' },
      'Almost OOS/OOS': { color: 'red', background: '#fff1f0' },
      '库存过高': { color: 'orange', background: '#fff2e8' },
      '健康': { color: 'green', background: '#f6ffed' },
      '缺货风险': { color: 'gold', background: '#fff1b8' },
      '即将缺货/缺货': { color: 'red', background: '#fff1f0' },
      '/': { color: 'gray', background: '#f5f5f5' }
    }
    return config[status] || config['/']
  }
  
  const handleCellClick = (sku, month, field, currentValue, isEditable) => {
    if (!isEditable) return
    setEditingCell({ sku, month, field })
    setEditValue(String(currentValue || ''))
  }
  
  const handleInputChange = (e) => {
    setEditValue(e.target.value)
  }
  
  const handleInputBlur = () => {
    if (editingCell && editValue !== '') {
      const numValue = parseFloat(editValue)
      if (!isNaN(numValue)) {
        onCellUpdate(editingCell.sku, editingCell.month, editingCell.field, numValue)
      }
    }
    setEditingCell(null)
    setEditValue('')
  }
  
  // TAB 键导航 - 移动到右侧单元格
  const handleKeyDown = (e, currentSku, currentMonth, currentField) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      
      // 保存当前编辑
      if (editValue !== '') {
        const numValue = parseFloat(editValue)
        if (!isNaN(numValue)) {
          onCellUpdate(editingCell.sku, editingCell.month, editingCell.field, numValue)
        }
      }
      
      // 找到下一个可编辑单元格
      const currentMonthIndex = displayedMonths.indexOf(currentMonth)
      const editableDimensions = filteredDimensions.filter(d => d.editable)
      const currentDimIndex = editableDimensions.findIndex(d => d.key === currentField)
      
      let nextMonthIndex = currentMonthIndex + 1
      let nextField = currentField
      
      // 如果是最后一个月份，尝试下一行
      if (nextMonthIndex >= displayedMonths.length) {
        nextMonthIndex = 0
        // 找下一个可编辑维度
        if (currentDimIndex < editableDimensions.length - 1) {
          nextField = editableDimensions[currentDimIndex + 1].key
        } else {
          // 已经是最后一个了，保持当前状态
          setEditingCell(null)
          setEditValue('')
          return
        }
      }
      
      const nextMonth = displayedMonths[nextMonthIndex]
      setEditingCell({ sku: currentSku, month: nextMonth, field: nextField })
      setEditValue(String(getCellValue(currentSku, nextMonth, nextField) || ''))
    } else if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }
  
  const filteredDimensions = dimensions.filter(d => 
    filters.psiDimension.includes(d.key)
  )
  
  const isBufferDimension = (key) => {
    return ['deEuBuffer', 'closingStockBuffer', 'mosBuffer'].includes(key)
  }

  // 构建表格数据 - 带纵向合并信息
  const tableData = useMemo(() => {
    const result = []
    
    skus.forEach((skuItem) => {
      const master = getMasterForSku(skuItem.sku)
      
      // 过滤后的维度
      const visibleDimensions = filteredDimensions.filter(dim => {
        if (!bufferCollapsed) return true
        return !isBufferDimension(dim.key)
      })
      
      const rowCount = visibleDimensions.length
      
      // 为每个维度创建行
      visibleDimensions.forEach((dim, index) => {
        const row = {
          key: `${skuItem.sku}-${dim.key}`,
          sku: skuItem.sku,
          bu: master.BU || '',
          category: master.Category || '',
          series: master.Series || '',
          materialCode: master['物料编码'] || '',
          dimension: t(`dimensions.${dim.key}`),
          dimensionKey: dim.key,
          isBufferRow: isBufferDimension(dim.key),
          rowSpan: index === 0 ? rowCount : 0
        }
        
        // 为显示的月份添加数据
        displayedMonths.forEach(month => {
          const value = getCellValue(skuItem.sku, month, dim.key)
          row[month] = value
        })
        
        result.push(row)
      })
    })
    
    return result
  }, [skus, filteredDimensions, displayedMonths, data, masterData, bufferCollapsed, t])
  
  // 固定列（左侧 - 冻结）
  const fixedColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      fixed: 'left',
      render: (value, record) => {
        if (record.rowSpan === 0) return null
        return <span style={{ fontWeight: 600 }}>{value}</span>
      }
    },
    {
      title: 'BU',
      dataIndex: 'bu',
      key: 'bu',
      width: 80,
      fixed: 'left',
      render: (value, record) => {
        if (record.rowSpan === 0) return null
        return value || '-'
      }
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      fixed: 'left',
      render: (value, record) => {
        if (record.rowSpan === 0) return null
        return value || '-'
      }
    },
    {
      title: 'Series',
      dataIndex: 'series',
      key: 'series',
      width: 100,
      fixed: 'left',
      render: (value, record) => {
        if (record.rowSpan === 0) return null
        return value || '-'
      }
    },
    {
      title: 'Material Code',
      dataIndex: 'materialCode',
      key: 'materialCode',
      width: 120,
      fixed: 'left',
      render: (value, record) => {
        if (record.rowSpan === 0) return null
        return value || '-'
      }
    },
    {
      title: 'PSI Dimension',
      dataIndex: 'dimension',
      key: 'dimension',
      width: 150,
      fixed: 'left',
      render: (value, record) => (
        <span style={{ 
          color: record.isBufferRow ? '#1890ff' : '#333',
          fontWeight: record.isBufferRow ? 500 : 400
        }}>
          {value}
        </span>
      )
    }
  ]
  
  // 月份列
  const monthColumns = displayedMonths.map(month => ({
    title: month,
    dataIndex: month,
    key: month,
    width: 100,
    align: 'center',
    render: (value, record) => {
      const isMosStatus = record.dimensionKey === 'mosStatus'
      
      if (isMosStatus && value) {
        const statusConfig = getMosStatusConfig(value)
        return (
          <Tag 
            style={{ 
              background: statusConfig.background, 
              color: statusConfig.color,
              border: 'none'
            }}
          >
            {value}
          </Tag>
        )
      }
      
      // 直接从 dimensions 数组中查找，而不是从 filteredDimensions
      const dim = dimensions.find(d => d.key === record.dimensionKey)
      const isEditable = dim?.editable || false
      
      let displayValue = '-'
      if (value !== undefined && value !== null) {
        if (record.dimensionKey === 'mos' || record.dimensionKey === 'mosBuffer') {
          displayValue = typeof value === 'number' ? value.toFixed(1) : value
        } else {
          displayValue = typeof value === 'number' ? value.toLocaleString() : value
        }
      }
      
      if (isEditingCell(record, month)) {
        return (
          <Input
            autoFocus
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => handleKeyDown(e, record.sku, month, record.dimensionKey)}
            style={{ width: '100%', textAlign: 'center' }}
            size="small"
          />
        )
      }
      
      return (
        <div
          onClick={() => handleCellClick(record.sku, month, record.dimensionKey, value, isEditable)}
          style={{
            cursor: isEditable ? 'pointer' : 'default',
            textAlign: 'center',
            padding: '4px',
            background: isEditable ? '#fafafa' : 'transparent',
            borderRadius: 4,
            border: isEditable ? '1px dashed #ccc' : 'none'
          }}
        >
          <Tooltip title={isEditable ? '点击编辑' : ''}>
            {displayValue}
          </Tooltip>
        </div>
      )
    }
  }))
  
  const isEditingCell = (record, month) => {
    return editingCell?.sku === record.sku && 
           editingCell?.month === month && 
           editingCell?.field === record.dimensionKey
  }
  
  // 检查是否应该显示某个维度
  const shouldShowDimension = (dimKey) => {
    // 首先检查是否在 filters.psiDimension 中
    if (!filters.psiDimension.includes(dimKey)) return false
    // 然后检查 buffer 状态
    if (bufferCollapsed && isBufferDimension(dimKey)) return false
    return true
  }
  
  const filteredTableData = tableData.filter(row => shouldShowDimension(row.dimensionKey))
  
  const columns = [...fixedColumns, ...monthColumns]
  
  if (filteredTableData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
        暂无数据
      </div>
    )
  }
  
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Table
        columns={columns}
        dataSource={filteredTableData}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
        style={{ height: '100%' }}
      />
    </div>
  )
}

export default PSITable
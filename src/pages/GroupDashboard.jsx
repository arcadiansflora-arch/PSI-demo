import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Select, Button, Space, message, Tabs, Progress, Badge, Dropdown, Modal
} from 'antd'
import { 
  UploadOutlined, DownloadOutlined, ReloadOutlined, SettingOutlined,
  RightOutlined, LeftOutlined, DownOutlined, WarningOutlined
} from '@ant-design/icons'
import { 
  getGroupData, updateGroupData, calculateGroup, getMasterData, 
  getMtdData, uploadFile, getUploadTemplate 
} from '../api/client'
import PSITable from '../components/PSITable'
import UploadModal from '../components/UploadModal'
import WeeklyReport from './WeeklyReport'
import { useLanguage } from '../context/LanguageContext'

const PSI_DIMENSIONS = [
  { key: 'openingStock', label: 'Opening Stock', editable: true },
  { key: 'si', label: 'SI', editable: true },
  { key: 'arrival', label: 'Arrival', editable: false },
  { key: 'so', label: 'SO', editable: true },
  { key: 'closingStock', label: 'Closing Stock', editable: false },
  { key: 'mos', label: 'MOS', editable: false },
  { key: 'mosStatus', label: 'MOS Status', editable: false },
  { key: 'deEuBuffer', label: 'DE/EU Warehouse Buffer', editable: true },
  { key: 'closingStockBuffer', label: 'Closing Stock (+Buffer)', editable: false },
  { key: 'mosBuffer', label: 'MOS (+Buffer)', editable: false }
]

// 品牌名称
const BRAND_NAME = 'Clasper'

// 业务组选项
const GROUP_OPTIONS = [
  { value: 'ES', label: 'Spain (ES)' },
  { value: 'IT', label: 'Italy (IT)' },
  { value: 'FR', label: 'France (FR)' },
  { value: 'PT', label: 'Portugal (PT)' }
]

function GroupDashboard() {
  const { groupName: urlGroupName } = useParams()
  const groupName = urlGroupName || 'ES'
  const { t } = useLanguage()
  
  // 状态
  const [data, setData] = useState(null)
  const [masterData, setMasterData] = useState([])
  const [mtdData, setMtdData] = useState([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [skuModalVisible, setSkuModalVisible] = useState(false)
  
  // 侧边栏折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  
  // Buffer 展开/收起
  const [bufferCollapsed, setBufferCollapsed] = useState(true)
  
  // 历史月份折叠状态（默认折叠，点击展开）
  const [pastMonthsCollapsed, setPastMonthsCollapsed] = useState(true)
  
  // 筛选器
  const [filters, setFilters] = useState({
    bu: [],
    category: [],
    series: [],
    sku: [],
    psiDimension: PSI_DIMENSIONS.map(d => d.key)
  })

  useEffect(() => {
    loadData()
  }, [groupName])

  const loadData = async () => {
    setLoading(true)
    try {
      const [groupRes, masterRes, mtdRes] = await Promise.all([
        getGroupData(groupName),
        getMasterData(),
        getMtdData(groupName)
      ])
      
      setData(groupRes.data)
      setMasterData(masterRes.data)
      setMtdData(mtdRes.data)
      
      await handleCalculate()
    } catch (error) {
      message.error(t('messages.loadFailed'))
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const res = await calculateGroup(groupName)
      setData(res.data.data)
      message.success(t('messages.calculationsCompleted'))
    } catch (error) {
      message.error(t('messages.loadFailed'))
      console.error(error)
    } finally {
      setCalculating(false)
    }
  }

  const handleCellUpdate = async (sku, month, field, value) => {
    try {
      await updateGroupData(groupName, { sku, month, field, value })
      
      setData(prev => {
        const newData = { ...prev }
        const skuIndex = newData.skus.findIndex(s => s.sku === sku)
        if (skuIndex !== -1) {
          if (!newData.skus[skuIndex].months[month]) {
            newData.skus[skuIndex].months[month] = {}
          }
          newData.skus[skuIndex].months[month][field] = value
        }
        return newData
      })
      
      await handleCalculate()
    } catch (error) {
      message.error(t('messages.saveFailed'))
      console.error(error)
    }
  }

  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }))
  }

  const handleFileUpload = async (file, importType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('importType', importType)
    
    try {
      const res = await uploadFile(groupName, formData)
      if (res.data.success) {
        message.success(t('messages.importSuccess'))
        await loadData()
      }
    } catch (error) {
      message.error(t('messages.importFailed'))
      console.error(error)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await getUploadTemplate()
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'psi_import_template.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      message.error(t('messages.importFailed'))
      console.error(error)
    }
  }

  // 导出菜单
  const exportMenuItems = [
    { key: 'current', label: t('buttons.exportCurrent') },
    { key: 'all', label: t('buttons.exportAll') }
  ]

  const handleExport = async (key) => {
    message.info('Export feature coming soon')
  }

  // 获取筛选后的 SKU
  const getFilteredSkus = () => {
    if (!data || !data.skus) return []
    
    return data.skus.filter(sku => {
      const master = masterData.find(m => m['SKU（新）'] === sku.sku)
      if (!master) return true
      
      if (filters.bu.length && !filters.bu.includes(master.BU)) return false
      if (filters.category.length && !filters.category.includes(master.Category)) return false
      if (filters.series.length && !filters.series.includes(master.Series)) return false
      if (filters.sku.length && !filters.sku.includes(sku.sku)) return false
      
      return true
    })
  }

  // 获取所有月份（生成完整范围：202411~202612）
  const getAllMonths = () => {
    const months = []
    
    // 生成 202411 ~ 202612 的完整月份范围
    for (let year = 2024; year <= 2026; year++) {
      const startMonth = year === 2024 ? 11 : 1
      const endMonth = year === 2026 ? 12 : 12
      
      for (let month = startMonth; month <= endMonth; month++) {
        const monthStr = `${year}${String(month).padStart(2, '0')}`
        // 只保留 202411 之后的月份
        if (monthStr >= '202411') {
          months.push(monthStr)
        }
      }
    }
    
    return months
  }

  // 获取筛选选项
  const filterOptions = {
    bu: [...new Set(masterData.map(m => m.BU).filter(Boolean))],
    category: [...new Set(masterData.map(m => m.Category).filter(Boolean))],
    series: [...new Set(masterData.map(m => m.Series).filter(Boolean))],
    sku: data?.skus?.map(s => s.sku) || []
  }

  const filteredSkus = getFilteredSkus()
  const allMonths = getAllMonths()

  // MTD 汇总计算
  const getMtdSummary = () => {
    if (!mtdData || mtdData.length === 0) return null
    
    const siData = mtdData.filter(d => d.metric === 'SI')
    const soData = mtdData.filter(d => d.metric === 'SO')
    
    const totalSiForecast = siData.reduce((sum, d) => sum + d.monthForecast, 0)
    const totalSiMtd = siData.reduce((sum, d) => sum + d.mtd, 0)
    const totalSoForecast = soData.reduce((sum, d) => sum + d.monthForecast, 0)
    const totalSoMtd = soData.reduce((sum, d) => sum + d.mtd, 0)
    
    return {
      si: {
        forecast: totalSiForecast,
        actual: totalSiMtd,
        gap: totalSiMtd - totalSiForecast,
        percent: totalSiForecast ? ((totalSiMtd / totalSiForecast) * 100).toFixed(0) : 0
      },
      so: {
        forecast: totalSoForecast,
        actual: totalSoMtd,
        gap: totalSoMtd - totalSoForecast,
        percent: totalSoForecast ? ((totalSoMtd / totalSoForecast) * 100).toFixed(0) : 0
      }
    }
  }

  const mtdSummary = getMtdSummary()

  // Tabs 配置
  const tabItems = [
    {
      key: 'psi',
      label: 'PSI 数据',
      children: (
        <div style={{ display: 'flex', gap: 12, height: '100%' }}>
          {/* 左栏 - 主数据表格 */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 表格操作条 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>PSI 数据</span>
              <Space size="small">
                <Button 
                  type="text" 
                  size="small"
                  onClick={() => setPastMonthsCollapsed(!pastMonthsCollapsed)}
                  icon={pastMonthsCollapsed ? <RightOutlined /> : <DownOutlined />}
                >
                  {pastMonthsCollapsed ? '展开历史月份' : '折叠历史月份'}
                </Button>
                <Button 
                  type="text" 
                  size="small"
                  onClick={() => setBufferCollapsed(!bufferCollapsed)}
                  icon={bufferCollapsed ? <RightOutlined /> : <DownOutlined />}
                >
                  {bufferCollapsed ? '展开 Buffer' : '收起 Buffer'}
                </Button>
              </Space>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto' }}>
              <PSITable
                data={data}
                masterData={masterData}
                skus={filteredSkus}
                months={allMonths}
                dimensions={PSI_DIMENSIONS}
                bufferCollapsed={bufferCollapsed}
                pastMonthsCollapsed={pastMonthsCollapsed}
                onCellUpdate={handleCellUpdate}
                filters={filters}
              />
            </div>
          </div>
          
          {/* 右栏 - MTD 进度 */}
          {!sidebarCollapsed && (
            <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* SI 进度卡片 */}
              {mtdSummary && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>SI 进度</span>
                    <Badge 
                      status={parseInt(mtdSummary.si.percent) >= 50 ? 'success' : 'warning'} 
                      text={parseInt(mtdSummary.si.percent) >= 50 ? 'On Track' : 'Lagging'} 
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Progress 
                      percent={parseInt(mtdSummary.si.percent)} 
                      size="small" 
                      strokeColor={parseInt(mtdSummary.si.percent) >= 50 ? '#52c41a' : '#faad14'}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>实际: <strong>{mtdSummary.si.actual.toLocaleString()}</strong></span>
                    <span>目标: <strong>{mtdSummary.si.forecast.toLocaleString()}</strong></span>
                  </div>
                </div>
              )}
              
              {/* SO 进度卡片 */}
              {mtdSummary && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>SO 进度</span>
                    <Badge 
                      status={parseInt(mtdSummary.so.percent) >= 50 ? 'success' : 'warning'} 
                      text={parseInt(mtdSummary.so.percent) >= 50 ? 'On Track' : 'Lagging'} 
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Progress 
                      percent={parseInt(mtdSummary.so.percent)} 
                      size="small" 
                      strokeColor={parseInt(mtdSummary.so.percent) >= 50 ? '#52c41a' : '#faad14'}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>实际: <strong>{mtdSummary.so.actual.toLocaleString()}</strong></span>
                    <span>目标: <strong>{mtdSummary.so.forecast.toLocaleString()}</strong></span>
                  </div>
                </div>
              )}
              
              {/* SI 结转预警 */}
              {mtdSummary && mtdSummary.si.gap > 0 && (
                <div style={{ background: '#fff7e6', borderRadius: 12, padding: 16, border: '1px solid #ffd591' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fa8c16', marginBottom: 8 }}>
                    <WarningOutlined />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>SI 结转预警</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    有 <span style={{ fontWeight: 600, color: '#fa8c16' }}>{mtdSummary.si.gap.toLocaleString()}</span> 需要结转
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 侧边栏折叠按钮 */}
          <Button 
            type="text"
            size="small"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            icon={sidebarCollapsed ? <LeftOutlined /> : <RightOutlined />}
            style={{ 
              height: 'fit-content',
              alignSelf: 'center'
            }}
          >
            MTD
          </Button>
        </div>
      )
    },
    {
      key: 'weekly',
      label: '周报',
      children: (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, height: '100%', overflow: 'auto' }}>
          <WeeklyReport groupName={groupName} />
        </div>
      )
    }
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 16, background: '#f5f5f5', gap: 12, overflow: 'hidden' }}>
      {/* 1. 顶部标题栏 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* 品牌标题 */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.5px', color: '#333' }}>
              PSI Simulation
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: -2 }}>— {BRAND_NAME}</div>
          </div>
          
          {/* 业务组选择器 */}
          <Select
            value={groupName}
            onChange={(value) => window.location.href = `/group/${value}`}
            options={GROUP_OPTIONS}
            style={{ width: 150 }}
          />
        </div>
        
        {/* 管理 SKU 按钮 */}
        <Button 
          type="primary"
          icon={<SettingOutlined />}
          onClick={() => setSkuModalVisible(true)}
          style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 500 }}
        >
          管理 SKU
        </Button>
      </div>
      
      {/* 2. 筛选操作栏 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左侧筛选器 */}
          <Space size="middle">
            <Select
              placeholder="BU"
              mode="multiple"
              allowClear
              style={{ width: 110 }}
              options={filterOptions.bu.map(b => ({ value: b, label: b }))}
              onChange={(val) => handleFilterChange('bu', val)}
            />
            <Select
              placeholder="Category"
              mode="multiple"
              allowClear
              style={{ width: 130 }}
              options={filterOptions.category.map(c => ({ value: c, label: c }))}
              onChange={(val) => handleFilterChange('category', val)}
            />
            <Select
              placeholder="Series"
              mode="multiple"
              allowClear
              style={{ width: 110 }}
              options={filterOptions.series.map(s => ({ value: s, label: s }))}
              onChange={(val) => handleFilterChange('series', val)}
            />
            <Select
              placeholder="SKU"
              mode="multiple"
              allowClear
              showSearch
              filterOption={(input, option) => 
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: 160 }}
              options={filterOptions.sku.map(s => ({ value: s, label: s }))}
              onChange={(val) => handleFilterChange('sku', val)}
            />
          </Space>
          
          {/* 右侧操作 */}
          <Space size="middle">
            <Button 
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              {t('buttons.importData')}
            </Button>
            <Dropdown 
              menu={{ 
                items: exportMenuItems,
                onClick: ({ key }) => handleExport(key)
              }}
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleCalculate}
              loading={calculating}
            >
              {t('buttons.recalculate')}
            </Button>
          </Space>
        </div>
      </div>
      
      {/* 3. 主内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Tabs 
          items={tabItems} 
          defaultActiveKey="psi"
        />
      </div>
      
      {/* 弹窗 */}
      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onUpload={handleFileUpload}
      />
      
      <Modal
        title="管理 SKU"
        open={skuModalVisible}
        onCancel={() => setSkuModalVisible(false)}
        footer={null}
        width={800}
      >
        <p style={{ color: '#999' }}>SKU 管理功能开发中...</p>
      </Modal>
    </div>
  )
}

export default GroupDashboard
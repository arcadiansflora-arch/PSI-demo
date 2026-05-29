import { useState, useEffect } from 'react'
import { Card, Row, Col, Select, Statistic, Table, Tag, Spin } from 'antd'
import { getRegionalSummary, getMonthlySummary, getRegionalFilters } from '../api/client'

function RegionalDashboard() {
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [monthlyData, setMonthlyData] = useState(null)
  const [filterOptions, setFilterOptions] = useState({ categories: [], series: [], bus: [] })
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSeries, setSelectedSeries] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadData()
  }, [selectedCategory, selectedSeries])

  const loadData = async () => {
    setLoading(true)
    try {
      const [summaryRes, monthlyRes, filtersRes] = await Promise.all([
        getRegionalSummary({ 
          category: selectedCategory,
          series: selectedSeries 
        }),
        getMonthlySummary({ 
          category: selectedCategory,
          series: selectedSeries 
        }),
        getRegionalFilters()
      ])
      
      setSummaryData(summaryRes.data)
      setMonthlyData(monthlyRes.data)
      setFilterOptions({
        categories: filtersRes.data.categories,
        series: filtersRes.data.series,
        bus: filtersRes.data.bus
      })
    } catch (error) {
      console.error('Failed to load regional data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getKpiClass = (value, type) => {
    if (type === 'mos') {
      if (value > 3.5) return 'warning'
      if (value >= 2.5) return 'success'
      return 'danger'
    }
    if (type === 'overstock' || type === 'oos') {
      if (value > 5) return 'warning'
      return ''
    }
    return ''
  }

  // Prepare table data for monthly summary
  const getTableData = () => {
    if (!monthlyData || !monthlyData.summaries) return []
    
    const tableRows = []
    
    for (const category of monthlyData.categories) {
      for (const series of monthlyData.seriesList) {
        const catSeriesData = monthlyData.summaries[category]?.[series]
        if (!catSeriesData) continue
        
        const months = monthlyData.months || []
        if (months.length === 0) continue
        
        const lastMonth = months[months.length - 1]
        const lastMonthData = catSeriesData.months[lastMonth] || {}
        
        tableRows.push({
          key: `${category}-${series}`,
          category,
          series,
          skus: catSeriesData.skus?.length || 0,
          openingStock: lastMonthData.openingStock || 0,
          closingStock: lastMonthData.closingStock || 0,
          mos: lastMonthData.mos?.toFixed(1) || 0,
          mosStatus: getMosStatusLabel(lastMonthData.mos)
        })
      }
    }
    
    return tableRows
  }

  const getMosStatusLabel = (mos) => {
    if (mos === undefined || mos === null) return '/'
    if (mos > 3.5) return 'Overstock'
    if (mos >= 2.5) return 'Healthy'
    if (mos >= 1) return 'OOS Risk'
    return 'Almost OOS/OOS'
  }

  const getMosStatusColor = (status) => {
    switch (status) {
      case 'Overstock': return 'orange'
      case 'Healthy': return 'green'
      case 'OOS Risk': return 'gold'
      case 'Almost OOS/OOS': return 'red'
      default: return 'default'
    }
  }

  const columns = [
    { title: 'Category', dataIndex: 'category', key: 'category', fixed: 'left' },
    { title: 'Series', dataIndex: 'series', key: 'series', fixed: 'left' },
    { title: 'SKU Count', dataIndex: 'skus', key: 'skus', width: 100 },
    { 
      title: 'Opening Stock', 
      dataIndex: 'openingStock', 
      key: 'openingStock',
      width: 130,
      render: (val) => val.toLocaleString()
    },
    { 
      title: 'Closing Stock', 
      dataIndex: 'closingStock', 
      key: 'closingStock',
      width: 130,
      render: (val) => val.toLocaleString()
    },
    { 
      title: 'MOS', 
      dataIndex: 'mos', 
      key: 'mos',
      width: 100,
      render: (val) => parseFloat(val).toFixed(1)
    },
    { 
      title: 'Status', 
      dataIndex: 'mosStatus', 
      key: 'mosStatus',
      width: 130,
      render: (status) => (
        <Tag color={getMosStatusColor(status)}>{status}</Tag>
      )
    }
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Regional Dashboard</h2>
      
      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Filter by Category</div>
            <Select
              placeholder="All Categories"
              style={{ width: '100%' }}
              allowClear
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={filterOptions.categories.map(c => ({ value: c, label: c }))}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Filter by Series</div>
            <Select
              placeholder="All Series"
              style={{ width: '100%' }}
              allowClear
              value={selectedSeries}
              onChange={setSelectedSeries}
              options={filterOptions.series.map(s => ({ value: s, label: s }))}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Actions</div>
            <Select
              placeholder="Select Group"
              style={{ width: '100%' }}
              options={[
                { value: 'ES', label: 'Spain (ES)' },
                { value: 'IT', label: 'Italy (IT)' },
                { value: 'FR', label: 'France (FR)' },
                { value: 'PT', label: 'Portugal (PT)' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {/* KPI Dashboard */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card className={getKpiClass(summaryData?.kpis?.totalClosingStock, 'stock')}>
              <Statistic 
                title="Total Closing Stock" 
                value={summaryData?.kpis?.totalClosingStock || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className={getKpiClass(summaryData?.kpis?.totalMOS, 'mos')}>
              <Statistic 
                title="Average MOS" 
                value={(summaryData?.kpis?.totalMOS || 0).toFixed(1)}
                valueStyle={{ 
                  color: summaryData?.kpis?.totalMOS > 3.5 ? '#faad14' : 
                         summaryData?.kpis?.totalMOS >= 2.5 ? '#52c41a' : '#ff4d4f' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="warning">
              <Statistic 
                title="Overstock SKU Count" 
                value={summaryData?.kpis?.overstockCount || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="danger">
              <Statistic 
                title="OOS Risk / Almost OOS" 
                value={(summaryData?.kpis?.oosRiskCount || 0) + (summaryData?.kpis?.almostOOSCount || 0)}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Monthly Summary Table */}
        <Card title="Monthly PSI Summary by Category/Series">
          <Table
            columns={columns}
            dataSource={getTableData()}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </Spin>
    </div>
  )
}

export default RegionalDashboard
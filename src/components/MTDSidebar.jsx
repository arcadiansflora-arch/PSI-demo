import { useState } from 'react'
import { Card, Table, Tag, Select, Space } from 'antd'
import { useLanguage } from '../context/LanguageContext'

function MTDSidebar({ data, groupName }) {
  const { t } = useLanguage()
  const [metricFilter, setMetricFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [sortOrder, setSortOrder] = useState(null)

  // Filter data based on selected filters
  const filteredData = data?.filter(item => {
    if (metricFilter && item.metric !== metricFilter) return false
    if (statusFilter && item.status !== statusFilter) return false
    return true
  }) || []

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOrder === 'asc') {
      return (a.monthForecast - a.mtd) - (b.monthForecast - b.mtd)
    } else if (sortOrder === 'desc') {
      return (b.monthForecast - b.mtd) - (a.monthForecast - a.mtd)
    }
    return 0
  })

  const columns = [
    {
      title: t('table.sku'),
      dataIndex: 'sku',
      key: 'sku',
      width: 90,
      ellipsis: true
    },
    {
      title: 'Metric',
      dataIndex: 'metric',
      key: 'metric',
      width: 60,
      render: (text) => (
        <Tag color={text === 'SI' ? 'blue' : 'green'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Forecast',
      dataIndex: 'monthForecast',
      key: 'monthForecast',
      width: 70,
      align: 'right',
      render: (val) => val?.toLocaleString()
    },
    {
      title: 'MTD',
      dataIndex: 'mtd',
      key: 'mtd',
      width: 70,
      align: 'right',
      render: (val) => val?.toLocaleString()
    },
    {
      title: 'MTD%',
      key: 'mtdPercent',
      width: 60,
      align: 'right',
      render: (_, record) => {
        if (!record.monthForecast) return '-'
        const percent = ((record.mtd / record.monthForecast) * 100).toFixed(0)
        return `${percent}%`
      }
    },
    {
      title: 'Gap',
      dataIndex: 'gap',
      key: 'gap',
      width: 60,
      align: 'right',
      render: (val) => (
        <span style={{ color: val < 0 ? '#ff4d4f' : '#52c41a' }}>
          {val?.toLocaleString()}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (text) => (
        <Tag color={text === 'On Track' ? 'success' : 'warning'}>
          {text === 'On Track' ? 'On Track' : 'Lagging'}
        </Tag>
      )
    }
  ]

  // Calculate summary
  const getSummary = () => {
    if (!data || data.length === 0) return null
    
    const siData = data.filter(d => d.metric === 'SI')
    const soData = data.filter(d => d.metric === 'SO')
    
    const totalSiForecast = siData.reduce((sum, d) => sum + d.monthForecast, 0)
    const totalSiMtd = siData.reduce((sum, d) => sum + d.mtd, 0)
    const totalSoForecast = soData.reduce((sum, d) => sum + d.monthForecast, 0)
    const totalSoMtd = soData.reduce((sum, d) => sum + d.mtd, 0)
    
    return {
      totalSiForecast,
      totalSiMtd,
      totalSoForecast,
      totalSoMtd,
      siPercent: totalSiForecast ? ((totalSiMtd / totalSiForecast) * 100).toFixed(0) : 0,
      soPercent: totalSoForecast ? ((totalSoMtd / totalSoForecast) * 100).toFixed(0) : 0,
      onTrackCount: data.filter(d => d.status === 'On Track').length,
      laggingCount: data.filter(d => d.status === 'Lagging').length
    }
  }

  const summary = getSummary()

  return (
    <Card 
      className="mtd-sidebar"
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t('mtd.mtdProgress')}</div>
          <div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>MTD Progress</div>
        </div>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* Summary Section */}
      {summary && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#666' }}>SI {t('mtd.progress')}:</span>
            <span style={{ fontWeight: 600 }}>
              {summary.totalSiMtd.toLocaleString()} / {summary.totalSiForecast.toLocaleString()}
              <span style={{ color: '#1890ff', marginLeft: 4 }}>({summary.siPercent}%)</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#666' }}>SO {t('mtd.progress')}:</span>
            <span style={{ fontWeight: 600 }}>
              {summary.totalSoMtd.toLocaleString()} / {summary.totalSoForecast.toLocaleString()}
              <span style={{ color: '#52c41a', marginLeft: 4 }}>({summary.soPercent}%)</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#52c41a' }}>
              {t('mtd.actual')}: {summary.onTrackCount}
            </span>
            <span style={{ fontSize: 11, color: '#faad14' }}>
              {t('mtd.target')}: {summary.laggingCount}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
        <Select
          placeholder="Filter by Metric"
          allowClear
          style={{ width: '100%' }}
          onChange={setMetricFilter}
          size="small"
          options={[
            { value: 'SI', label: 'SI' },
            { value: 'SO', label: 'SO' }
          ]}
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: '100%' }}
          onChange={setStatusFilter}
          size="small"
          options={[
            { value: 'On Track', label: 'On Track' },
            { value: 'Lagging', label: 'Lagging' }
          ]}
        />
      </Space>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={sortedData}
        rowKey="sku"
        size="small"
        pagination={false}
        scroll={{ y: 300 }}
      />
    </Card>
  )
}

export default MTDSidebar
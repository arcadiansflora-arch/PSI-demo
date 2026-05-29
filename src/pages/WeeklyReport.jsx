import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress, Table, Tag, Button, Spin, Empty, List, Badge, Alert, message } from 'antd'
import { ReloadOutlined, WarningOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { getWeeklyReport, getWeeklyMosTrend } from '../api/client'

// MOS 状态颜色
const getMosColor = (mos) => {
  if (mos < 1.5) return '#f5222d'
  if (mos < 2.0) return '#faad14'
  if (mos < 4.0) return '#52c41a'
  return '#fa8c16'
}

// 趋势图标
const TrendIcon = ({ type }) => {
  if (type === 'overestimate') return <ArrowUpOutlined style={{ color: '#f5222d' }} />
  if (type === 'underestimate') return <ArrowDownOutlined style={{ color: '#52c41a' }} />
  return <span style={{ color: '#999' }}>~</span>
}

function WeeklyReport({ groupName = 'ES' }) {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState(null)
  const [mosTrend, setMosTrend] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [groupName])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 并行请求两个 API
      const [reportRes, trendRes] = await Promise.all([
        getWeeklyReport(groupName, {}),
        getWeeklyMosTrend(groupName, {})
      ])
      
      console.log('Weekly report response:', reportRes.data)
      console.log('MOS trend response:', trendRes.data)
      
      if (reportRes.data?.success) {
        setReportData(reportRes.data.data)
        if (reportRes.data.data?.updatedAt) {
          setLastUpdated(new Date(reportRes.data.data.updatedAt))
        }
      } else {
        setError(reportRes.data?.message || 'API返回数据格式错误: ' + JSON.stringify(reportRes.data))
      }
      
      if (trendRes.data?.success) {
        setMosTrend(trendRes.data.data)
      }
    } catch (error) {
      console.error('Failed to load weekly report:', error)
      const errorMessage = error.response?.data?.message || error.message || '未知错误'
      setError('加载失败: ' + errorMessage)
      message.error('加载周报数据失败: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载周报数据..." />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadData}>
            重试
          </Button>
        }
      />
    )
  }

  if (!reportData) {
    return <Empty description="暂无周报数据" />
  }

  const { inventoryOverview, soAnomalies, riskAlerts, deviationRanking } = reportData

  // 列定义
  const soAnomalyColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120
    },
    {
      title: '预测',
      dataIndex: 'forecast',
      key: 'forecast',
      width: 100,
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '实际',
      dataIndex: 'actual',
      key: 'actual',
      width: 100,
      render: (val) => val?.toLocaleString() || '-'
    },
    {
      title: '完成率',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (val) => `${val?.toFixed(0)}%`
    },
    {
      title: '状态',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val) => (
        <Tag color={val === 'lagging' ? 'red' : 'green'}>
          {val === 'lagging' ? '滞后' : '领先'}
        </Tag>
      )
    },
    {
      title: '行动建议',
      dataIndex: 'suggestion',
      key: 'suggestion'
    }
  ]

  const deviationColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120
    },
    {
      title: '平均偏差',
      dataIndex: 'avgDeviation',
      key: 'avgDeviation',
      width: 120,
      render: (val) => (
        <span style={{ 
          color: val > 0 ? '#f5222d' : '#52c41a',
          fontWeight: 600 
        }}>
          {val > 0 ? '+' : ''}{val?.toFixed(1)}%
        </span>
      )
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      width: 100,
      render: (val) => {
        const config = {
          overestimate: { color: 'red', label: '高估' },
          underestimate: { color: 'green', label: '低估' },
          volatile: { color: 'orange', label: '波动' },
          stable: { color: 'default', label: '稳定' }
        }
        const c = config[val] || config.stable
        return <Tag color={c.color}>{c.label}</Tag>
      }
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion'
    }
  ]

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* 操作条 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        padding: '12px 16px',
        background: '#fff',
        borderRadius: 8
      }}>
        <div>
          <span style={{ color: '#666', marginRight: 8 }}>数据更新时间：</span>
          <span style={{ fontWeight: 500 }}>
            {lastUpdated ? lastUpdated.toLocaleString('zh-CN') : '-'}
          </span>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadData}
        >
          刷新数据
        </Button>
      </div>

      {/* 1. 库存概览卡片 */}
      <Card 
        title="库存概览" 
        style={{ marginBottom: 16 }}
        extra={
          <span style={{ color: '#666', fontSize: 12 }}>
            时间进度: {inventoryOverview.soProgress.timeProgress?.toFixed(0)}%
          </span>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="渠道总库存" 
              value={inventoryOverview.channelStock} 
              formatter={(val) => val?.toLocaleString()}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="代理商总库存" 
              value={inventoryOverview.agentStock} 
              formatter={(val) => val?.toLocaleString()}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="加权 MOS" 
              value={inventoryOverview.weightedMos} 
              precision={1}
              suffix="个月"
              valueStyle={{ color: getMosColor(inventoryOverview.weightedMos) }}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#666' }}>当月 SO 进度</span>
            </div>
            <Progress 
              percent={Math.min(inventoryOverview.soProgress.percent, 100)} 
              status={inventoryOverview.soProgress.gap < 0 ? 'exception' : 'success'}
              format={(p) => `${p}%`}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              差额: {inventoryOverview.soProgress.gap > 0 ? '+' : ''}{inventoryOverview.soProgress.gap?.toLocaleString()}
            </div>
          </Col>
        </Row>

        {/* 分类明细 */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>分类拆解</h4>
          <Row gutter={16}>
            {inventoryOverview.categoryBreakdown?.map((item) => (
              <Col span={6} key={item.category}>
                <Card size="small">
                  <Statistic 
                    title={item.category} 
                    value={item.channel} 
                    formatter={(val) => val?.toLocaleString()}
                    valueStyle={{ fontSize: 18 }}
                  />
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    代理商: {item.agent?.toLocaleString()}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Card>

      {/* 2. SO 进度异常卡片 */}
      <Card 
        title="SO 进度异常" 
        style={{ marginBottom: 16 }}
        extra={
          <Badge 
            count={soAnomalies.length} 
            style={{ backgroundColor: '#f5222d' }}
          />
        }
      >
        {soAnomalies.length > 0 ? (
          <Table 
            columns={soAnomalyColumns} 
            dataSource={soAnomalies} 
            rowKey="sku"
            pagination={false}
            size="small"
          />
        ) : (
          <Empty description="暂无异常" />
        )}
      </Card>

      {/* 3. 风险预警卡片 */}
      <Card 
        title="风险预警" 
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Card 
              size="small" 
              title={
                <span style={{ color: '#f5222d' }}>
                  <WarningOutlined /> 缺货风险
                </span>
              }
              extra={<Badge count={riskAlerts.shortage.length} />}
            >
              {riskAlerts.shortage?.length > 0 ? (
                <List
                  size="small"
                  dataSource={riskAlerts.shortage}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            {item.sku} 
                            <Tag color="red" style={{ marginLeft: 8 }}>
                              MOS: {item.mos?.toFixed(1)}
                            </Tag>
                          </span>
                        }
                        description={item.suggestion}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无缺货风险" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              size="small" 
              title={
                <span style={{ color: '#fa8c16' }}>
                  <WarningOutlined /> 过剩风险
                </span>
              }
              extra={<Badge count={riskAlerts.overstock.length} />}
            >
              {riskAlerts.overstock?.length > 0 ? (
                <List
                  size="small"
                  dataSource={riskAlerts.overstock}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            {item.sku} 
                            <Tag color="orange" style={{ marginLeft: 8 }}>
                              MOS: {item.mos?.toFixed(1)}
                            </Tag>
                          </span>
                        }
                        description={item.suggestion}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="暂无过剩风险" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 4. 偏差排名卡片 */}
      <Card 
        title="偏差排名 Top 10" 
        extra={
          <span style={{ color: '#666', fontSize: 12 }}>
            统计周期：近3个月
          </span>
        }
      >
        {deviationRanking.length > 0 ? (
          <Table 
            columns={deviationColumns} 
            dataSource={deviationRanking} 
            rowKey="sku"
            pagination={false}
            size="small"
          />
        ) : (
          <Empty description="暂无偏差数据" />
        )}
      </Card>
    </div>
  )
}

export default WeeklyReport
import { useState, useEffect } from 'react'
import { 
  Layout, Menu, Table, Button, Space, Modal, Form, Input, Select, 
  Upload, message, Tag, Card, Row, Col, Statistic, Dropdown
} from 'antd'
import { 
  SettingOutlined, DatabaseOutlined, FileOutlined, HistoryOutlined,
  PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined, DownloadOutlined
} from '@ant-design/icons'
import { useLanguage } from '../context/LanguageContext'
import axios from 'axios'

const { Header, Sider, Content } = Layout
const { confirm } = Modal

function AdminDashboard() {
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [uploadRecords, setUploadRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [recordModalVisible, setRecordModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)

  useEffect(() => {
    loadUploadRecords()
  }, [])

  const loadUploadRecords = async () => {
    setLoading(true)
    try {
      const res = await axios.get('http://localhost:5000/api/admin/upload-records')
      setUploadRecords(res.data.records || [])
    } catch (error) {
      console.error('Failed to load records:', error)
      // 使用模拟数据
      setUploadRecords([
        {
          id: 1,
          groupName: 'ES',
          fileName: 'ES_data_202605.xlsx',
          uploadedAt: '2026-05-27 10:30:00',
          uploadedBy: 'Admin',
          fileSize: '2.5 MB',
          status: 'success'
        },
        {
          id: 2,
          groupName: 'IT',
          fileName: 'IT_data_202605.xlsx',
          uploadedAt: '2026-05-27 09:15:00',
          uploadedBy: 'Admin',
          fileSize: '1.8 MB',
          status: 'success'
        },
        {
          id: 3,
          groupName: 'FR',
          fileName: 'FR_data_202605.xlsx',
          uploadedAt: '2026-05-26 14:20:00',
          uploadedBy: 'Admin',
          fileSize: '2.1 MB',
          status: 'success'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    { key: 'dashboard', icon: <SettingOutlined />, label: '仪表盘' },
    { key: 'groups', icon: <DatabaseOutlined />, label: '业务组管理' },
    { key: 'skus', icon: <DatabaseOutlined />, label: 'SKU 主数据' },
    { key: 'materials', icon: <FileOutlined />, label: '物料编码' },
    { key: 'records', icon: <HistoryOutlined />, label: '数据档案' }
  ]

  const recordColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '业务组',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 100,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName'
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 180
    },
    {
      title: '上传人',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 100
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text) => (
        <Tag color={text === 'success' ? 'green' : 'red'}>
          {text === 'success' ? '成功' : '失败'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  const handleDownload = (record) => {
    message.info(`下载文件: ${record.fileName}`)
    // TODO: 实现下载功能
  }

  const handleDelete = (record) => {
    confirm({
      title: '确认删除',
      content: `确定要删除档案 "${record.fileName}" 吗？`,
      onOk: () => {
        setUploadRecords(prev => prev.filter(r => r.id !== record.id))
        message.success('删除成功')
      }
    })
  }

  const renderDashboard = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="业务组总数" value={4} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="SKU 总数" value={156} prefix={<FileOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="档案总数" value={uploadRecords.length} prefix={<HistoryOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月上传" value={12} prefix={<UploadOutlined />} />
          </Card>
        </Col>
      </Row>
      
      <Card title="最近上传">
        <Table 
          columns={recordColumns} 
          dataSource={uploadRecords.slice(0, 5)} 
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )

  const renderGroups = () => (
    <Card 
      title="业务组管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          添加业务组
        </Button>
      }
    >
      <Table 
        columns={[
          { title: 'ID', dataIndex: 'id', key: 'id' },
          { 
            title: '业务组名称', 
            dataIndex: 'groupName', 
            key: 'groupName',
            render: (text) => <Tag color="blue">{text}</Tag>
          },
          { 
            title: 'SKU 数量', 
            dataIndex: 'skuCount', 
            key: 'skuCount',
            render: () => Math.floor(Math.random() * 50) + 10
          },
          { title: '状态', dataIndex: 'status', key: 'status', render: () => <Tag color="green">启用</Tag> },
          {
            title: '操作',
            key: 'action',
            render: () => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Space>
            )
          }
        ]}
        dataSource={[
          { id: 1, groupName: 'ES', status: 'active' },
          { id: 2, groupName: 'IT', status: 'active' },
          { id: 3, groupName: 'FR', status: 'active' },
          { id: 4, groupName: 'PT', status: 'active' }
        ]}
        rowKey="id"
        pagination={false}
      />
    </Card>
  )

  const renderSkus = () => (
    <Card 
      title="SKU 主数据管理"
      extra={
        <Space>
          <Upload showUploadList={false}>
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>
          <Button icon={<DownloadOutlined />}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />}>添加 SKU</Button>
        </Space>
      }
    >
      <Table 
        columns={[
          { title: 'SKU 代码', dataIndex: 'sku', key: 'sku', width: 150 },
          { title: 'BU', dataIndex: 'bu', key: 'bu', width: 100 },
          { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
          { title: 'Series', dataIndex: 'series', key: 'series', width: 100 },
          { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 120 },
          { 
            title: '状态', 
            dataIndex: 'status', 
            key: 'status', 
            width: 80,
            render: () => <Tag color="green">启用</Tag>
          },
          {
            title: '操作',
            key: 'action',
            width: 120,
            render: () => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
              </Space>
            )
          }
        ]}
        dataSource={[
          { id: 1, sku: 'SKU001', bu: 'BU1', category: 'Category A', series: 'Series X', materialCode: 'MAT001', status: 'active' },
          { id: 2, sku: 'SKU002', bu: 'BU1', category: 'Category B', series: 'Series Y', materialCode: 'MAT002', status: 'active' },
          { id: 3, sku: 'SKU003', bu: 'BU2', category: 'Category A', series: 'Series Z', materialCode: 'MAT003', status: 'active' }
        ]}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </Card>
  )

  const renderMaterials = () => (
    <Card 
      title="物料编码管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          添加物料编码
        </Button>
      }
    >
      <Table 
        columns={[
          { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 150 },
          { title: '物料名称', dataIndex: 'materialName', key: 'materialName' },
          { title: '规格', dataIndex: 'spec', key: 'spec', width: 150 },
          { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
          {
            title: '操作',
            key: 'action',
            width: 120,
            render: () => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Space>
            )
          }
        ]}
        dataSource={[
          { id: 1, materialCode: 'MAT001', materialName: '物料 A', spec: '规格 A', unit: '个' },
          { id: 2, materialCode: 'MAT002', materialName: '物料 B', spec: '规格 B', unit: '件' },
          { id: 3, materialCode: 'MAT003', materialName: '物料 C', spec: '规格 C', unit: '箱' }
        ]}
        rowKey="id"
        pagination={false}
      />
    </Card>
  )

  const renderRecords = () => (
    <Card 
      title="数据档案管理"
      extra={
        <Button icon={<UploadOutlined />}>
          上传新文件
        </Button>
      }
    >
      <Table 
        columns={recordColumns} 
        dataSource={uploadRecords} 
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  )

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return renderDashboard()
      case 'groups':
        return renderGroups()
      case 'skus':
        return renderSkus()
      case 'materials':
        return renderMaterials()
      case 'records':
        return renderRecords()
      default:
        return renderDashboard()
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold' }}>
          {collapsed ? 'PSI' : 'PSI 管理后台'}
        </div>
        <Menu 
          mode="inline" 
          selectedKeys={[activeMenu]} 
          items={menuItems}
          onClick={({ key }) => setActiveMenu(key)}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminDashboard
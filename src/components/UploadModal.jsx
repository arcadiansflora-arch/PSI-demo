import { useState } from 'react'
import { Modal, Upload, Button, Select, Space, message, Alert } from 'antd'
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons'

const { Dragger } = Upload

function UploadModal({ visible, onClose, onUpload }) {
  const [file, setFile] = useState(null)
  const [importType, setImportType] = useState('si_so')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (info) => {
    const file = info.file.originFileObj || info.file
    setFile(file)
  }

  const handleUpload = async () => {
    if (!file) {
      message.warning('Please select a file')
      return
    }
    
    setUploading(true)
    try {
      await onUpload(file, importType)
      setFile(null)
      setImportType('si_so')
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setImportType('si_so')
    onClose()
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    beforeUpload: () => false, // Prevent auto upload
    onChange: handleFileChange,
    fileList: file ? [file] : []
  }

  return (
    <Modal
      title="Import Data from Excel/CSV"
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button 
          key="upload" 
          type="primary" 
          icon={<UploadOutlined />}
          loading={uploading}
          disabled={!file}
          onClick={handleUpload}
        >
          Upload
        </Button>
      ]}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Import Type</div>
        <Select
          value={importType}
          onChange={setImportType}
          style={{ width: '100%' }}
          options={[
            { value: 'si', label: 'SI Only' },
            { value: 'so', label: 'SO Only' },
            { value: 'si_so', label: 'SI + SO' },
            { value: 'opening', label: 'Opening Stock Details' },
            { value: 'all', label: 'All Fields' }
          ]}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Click or drag Excel/CSV file to upload</p>
          <p className="ant-upload-hint">
            Supported formats: .xlsx, .xls, .csv
          </p>
        </Dragger>
      </div>

      {file && (
        <Alert
          message={`Selected file: ${file.name}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ fontSize: 12, color: '#666' }}>
        <strong>Template columns:</strong>
        <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
          SKU（新）, 月份, SI, SO, 海外仓库存, 海外仓在途, 代理库存, 代理在途, 渠道库存, 渠道在途, DE/EU Warehouse Buffer
        </div>
      </div>
    </Modal>
  )
}

export default UploadModal
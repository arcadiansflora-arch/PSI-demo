import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 数据文件路径
const UPLOAD_RECORDS_FILE = path.join(__dirname, '../data/upload-records.json')

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 初始化上传记录文件
if (!fs.existsSync(UPLOAD_RECORDS_FILE)) {
  fs.writeFileSync(UPLOAD_RECORDS_FILE, '[]')
}

// 获取所有上传记录
router.get('/upload-records', (req, res) => {
  try {
    const records = JSON.parse(fs.readFileSync(UPLOAD_RECORDS_FILE, 'utf-8'))
    res.json({ success: true, records })
  } catch (error) {
    console.error('Error reading upload records:', error)
    res.json({ success: true, records: [] })
  }
})

// 添加上传记录
router.post('/upload-records', (req, res) => {
  try {
    const { groupName, fileName, filePath, fileSize, uploadedBy } = req.body
    
    const records = JSON.parse(fs.readFileSync(UPLOAD_RECORDS_FILE, 'utf-8') || '[]')
    
    const newRecord = {
      id: Date.now(),
      groupName,
      fileName,
      filePath,
      fileSize,
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      uploadedBy: uploadedBy || 'Admin',
      status: 'success'
    }
    
    records.unshift(newRecord) // 添加到数组开头
    
    fs.writeFileSync(UPLOAD_RECORDS_FILE, JSON.stringify(records, null, 2))
    
    res.json({ success: true, record: newRecord })
  } catch (error) {
    console.error('Error saving upload record:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 删除上传记录
router.delete('/upload-records/:id', (req, res) => {
  try {
    const { id } = req.params
    const records = JSON.parse(fs.readFileSync(UPLOAD_RECORDS_FILE, 'utf-8') || '[]')
    
    const filteredRecords = records.filter(r => r.id !== parseInt(id))
    
    fs.writeFileSync(UPLOAD_RECORDS_FILE, JSON.stringify(filteredRecords, null, 2))
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting upload record:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 下载上传记录中的文件
router.get('/upload-records/:id/download', (req, res) => {
  try {
    const { id } = req.params
    const records = JSON.parse(fs.readFileSync(UPLOAD_RECORDS_FILE, 'utf-8') || '[]')
    
    const record = records.find(r => r.id === parseInt(id))
    
    if (!record || !record.filePath) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }
    
    const filePath = path.join(__dirname, '../../', record.filePath)
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, record.fileName)
    } else {
      res.status(404).json({ success: false, message: '文件不存在' })
    }
  } catch (error) {
    console.error('Error downloading file:', error)
    res.status(500).json({ success: false, message: '下载失败' })
  }
})

export default router
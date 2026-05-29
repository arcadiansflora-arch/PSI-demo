import axios from 'axios'

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`
})

// Master Data API
export const getMasterData = () => api.get('/master-data')
export const getMasterDataBySku = (sku) => api.get(`/master-data/${sku}`)

// Group Data API
export const getGroupData = (groupName) => api.get(`/group/${groupName}`)
export const updateGroupData = (groupName, data) => api.put(`/group/${groupName}`, data)

// Calculate API
export const calculateGroup = (groupName) => api.post(`/calculate/${groupName}`)
export const calculateSku = (groupName, sku) => api.post(`/calculate/${groupName}/${sku}`)

// Upload API
export const uploadFile = (groupName, formData) => 
  api.post(`/upload/${groupName}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const getUploadTemplate = () => 
  api.get('/upload/template', { 
    baseURL: `${API_BASE_URL}/api`,
    responseType: 'blob' 
  })

// MTD Data API
export const getMtdData = (groupName) => api.get(`/mtd/${groupName}`)
export const getAllMtdData = () => api.get('/mtd')

// Regional API
export const getRegionalSummary = (params) => api.get('/regional/summary', { params })
export const getMonthlySummary = (params) => api.get('/regional/monthly', { params })
export const getRegionalFilters = () => api.get('/regional/filters')

// Weekly Report API
export const getWeeklyReport = (groupName, filters) => 
  api.post('/weekly/report', { groupName, filters })
export const getWeeklyMosTrend = (groupName, filters) => 
  api.get(`/weekly/mos-trend/${groupName}`, { params: filters })

export default api
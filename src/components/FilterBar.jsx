import { Select, Space, Button, Checkbox, Tag } from 'antd'
import { FilterOutlined, ClearOutlined } from '@ant-design/icons'

function FilterBar({ filters, filterOptions, onFilterChange, psiDimensions }) {
  const handlePsiDimensionChange = (checkedValues) => {
    onFilterChange('psiDimension', checkedValues)
  }

  const clearAllFilters = () => {
    onFilterChange('bu', [])
    onFilterChange('category', [])
    onFilterChange('series', [])
    onFilterChange('sku', [])
    onFilterChange('psiDimension', psiDimensions.map(d => d.key))
  }

  const hasActiveFilters = 
    filters.bu.length > 0 ||
    filters.category.length > 0 ||
    filters.series.length > 0 ||
    filters.sku.length > 0 ||
    filters.psiDimension.length !== psiDimensions.length

  return (
    <div className="filter-bar" style={{ marginBottom: 16 }}>
      <Space wrap size="middle">
        {/* BU Filter */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>BU</div>
          <Select
            mode="multiple"
            placeholder="Select BU"
            style={{ minWidth: 150 }}
            value={filters.bu}
            onChange={(values) => onFilterChange('bu', values)}
            allowClear
            maxTagCount={1}
            options={filterOptions.bu.map(b => ({ value: b, label: b }))}
          />
        </div>

        {/* Category Filter */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>Category</div>
          <Select
            mode="multiple"
            placeholder="Select Category"
            style={{ minWidth: 150 }}
            value={filters.category}
            onChange={(values) => onFilterChange('category', values)}
            allowClear
            maxTagCount={1}
            options={filterOptions.category.map(c => ({ value: c, label: c }))}
          />
        </div>

        {/* Series Filter */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>Series</div>
          <Select
            mode="multiple"
            placeholder="Select Series"
            style={{ minWidth: 150 }}
            value={filters.series}
            onChange={(values) => onFilterChange('series', values)}
            allowClear
            maxTagCount={1}
            options={filterOptions.series.map(s => ({ value: s, label: s }))}
          />
        </div>

        {/* SKU Filter */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>SKU</div>
          <Select
            mode="multiple"
            placeholder="Select SKU"
            style={{ minWidth: 180 }}
            value={filters.sku}
            onChange={(values) => onFilterChange('sku', values)}
            allowClear
            maxTagCount={1}
            options={filterOptions.sku.map(s => ({ value: s, label: s }))}
          />
        </div>

        {/* PSI Dimension Filter */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>PSI Dimensions</div>
          <Checkbox.Group
            value={filters.psiDimension}
            onChange={handlePsiDimensionChange}
            options={psiDimensions.map(d => ({ value: d.key, label: d.label }))}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div style={{ alignSelf: 'flex-end' }}>
            <Button 
              icon={<ClearOutlined />} 
              onClick={clearAllFilters}
              size="small"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Space>
    </div>
  )
}

export default FilterBar
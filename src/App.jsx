import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Select } from 'antd'
import GroupDashboard from './pages/GroupDashboard'
import RegionalDashboard from './pages/RegionalDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { LanguageProvider, useLanguage } from './context/LanguageContext'

const { Header, Content } = Layout
const { Sider } = Layout

// 语言切换组件
function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  
  return (
    <Select
      value={language}
      onChange={setLanguage}
      size="small"
      style={{ width: 80 }}
      options={[
        { value: 'zh', label: '中文' },
        { value: 'en', label: 'EN' }
      ]}
    />
  )
}

function AppLayout() {
  const location = useLocation()
  const { t } = useLanguage()

  const menuItems = [
    { key: '/group/ES', label: <Link to="/group/ES">{t('nav.spain')}</Link> },
    { key: '/group/IT', label: <Link to="/group/IT">{t('nav.italy')}</Link> },
    { key: '/group/FR', label: <Link to="/group/FR">{t('nav.france')}</Link> },
    { key: '/group/PT', label: <Link to="/group/PT">{t('nav.portugal')}</Link> },
    { key: '/regional', label: <Link to="/regional">{t('nav.regionalDashboard')}</Link> },
    { key: '/admin', label: <Link to="/admin">管理后台</Link> }
  ]

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/group')) {
      return location.pathname
    }
    if (location.pathname === '/regional') {
      return '/regional'
    }
    if (location.pathname === '/admin') {
      return '/admin'
    }
    return '/group/ES'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px'
      }}>
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginRight: '48px' }}>
          {t('app.title')}
        </div>
        <div style={{ color: '#fff' }}>
          <LanguageSwitcher />
        </div>
      </Header>
      <Layout>
        <Sider 
          width={200} 
          style={{ 
            background: '#fff',
            borderRight: '1px solid #e8e8e8'
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content>
            <Routes>
              <Route path="/" element={<GroupDashboard groupName="ES" />} />
              <Route path="/group/:groupName" element={<GroupDashboard />} />
              <Route path="/regional" element={<RegionalDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppLayout />
    </LanguageProvider>
  )
}

export default App
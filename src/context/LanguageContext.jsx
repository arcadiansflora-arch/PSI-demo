import { createContext, useContext, useState, useEffect } from 'react'
import zhTranslations from '../locales/zh.json'
import enTranslations from '../locales/en.json'

const translations = {
  zh: zhTranslations,
  en: enTranslations
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // 从 localStorage 获取保存的语言设置
    const saved = localStorage.getItem('psi-language')
    return saved || 'zh'
  })

  useEffect(() => {
    // 保存语言设置到 localStorage
    localStorage.setItem('psi-language', language)
  }, [language])

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[language]
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // 如果找不到翻译，返回 key 本身
      }
    }
    return value || key
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh')
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
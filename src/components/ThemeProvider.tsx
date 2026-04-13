'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'middle'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isMounted, setIsMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const initialTheme = saved || 'light'
    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setIsMounted(true)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const applyTheme = (t: Theme) => {
    const root = document.documentElement

    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-middle')

    // Apply CSS variables
    if (t === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f3f4f6')
      root.style.setProperty('--text-primary', '#000000')
      root.style.setProperty('--text-secondary', '#6b7280')
      root.classList.add('theme-light')
    } else if (t === 'dark') {
      root.style.setProperty('--bg-primary', '#030712')
      root.style.setProperty('--bg-secondary', '#111827')
      root.style.setProperty('--text-primary', '#f3f4f6')
      root.style.setProperty('--text-secondary', '#d1d5db')
      root.classList.add('theme-dark')
    } else if (t === 'middle') {
      root.style.setProperty('--bg-primary', '#1e293b')
      root.style.setProperty('--bg-secondary', '#0f172a')
      root.style.setProperty('--text-primary', '#f1f5f9')
      root.style.setProperty('--text-secondary', '#cbd5e1')
      root.classList.add('theme-middle')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

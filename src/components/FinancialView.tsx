'use client'
import { useState } from 'react'

type FinTab = 'dashboard' | 'old_table'

const TABS: { key: FinTab; label: string }[] = [
  { key: 'old_table', label: 'ראשית' },
  { key: 'dashboard', label: 'דשבורד' },
]
export function FinancialView() {
  const [activeTab, setActiveTab] = useState<FinTab>('old_table')

  return (
    <div className="flex flex-col h-full bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">פיננסי</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול הכנסות, הוצאות ודוחות</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">מודול פיננסי בבנייה</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">דוחות הכנסות, הוצאות ונתונים פיננסיים יוצגו כאן בקרוב</p>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4">
            {[
              { label: 'הכנסות', icon: '↑', color: 'bg-emerald-50 text-emerald-600' },
              { label: 'הוצאות', icon: '↓', color: 'bg-red-50 text-red-500' },
              { label: 'דוחות', icon: '▦', color: 'bg-indigo-50 text-indigo-600' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-5 ${item.color} flex flex-col items-center gap-2 opacity-50`}>
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'old_table' && (
        <div className="flex-1 flex flex-col min-h-0">
          <iframe
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vTbSGGOVXESrSzFqHyFXdGNbpW_s7O6AVR8JF8MLzSXsLpJ5XCv3syW038Vp0pIapEWfYJ35hDXH_GJ/pubhtml?gid=584902190&widget=true&headers=false"
            className="flex-1 w-full border-0"
            title="טבלה ישנה"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
